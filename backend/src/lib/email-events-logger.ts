/**
 * Email Events Logger
 *
 * Periodically polls Keycloak's admin events API for email-related events
 * (SEND_RESET_PASSWORD, SEND_VERIFY_EMAIL, EXECUTE_ACTIONS, etc.),
 * persists them to JSONL, and exposes an in-memory ring buffer + pub/sub
 * so the monitoring UI can subscribe to real-time updates.
 *
 * Uses client_credentials auth for background polling (no user token needed).
 */

import { appendFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'
import { config } from '../config'

// ─── Types ───────────────────────────────────────────────────────

/** Keycloak EventRepresentation shape */
interface KeycloakEvent {
  id?: string
  time?: number
  type?: string
  realmId?: string
  clientId?: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  error?: string
  details?: Record<string, string>
}

export interface EmailEvent {
  id: string
  timestamp: string
  type: string
  userId?: string
  clientId?: string
  ipAddress?: string
  error?: string
  success: boolean
  details?: Record<string, string>
}

export interface EmailAnalytics {
  totalEvents: number
  successRate: number
  eventsByType: Record<string, number>
  recentErrors: EmailEvent[]
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>
  timestamp: string
}

// Email event types we're interested in
const EMAIL_EVENT_TYPES = [
  'SEND_RESET_PASSWORD', 'SEND_RESET_PASSWORD_ERROR',
  'SEND_VERIFY_EMAIL', 'SEND_VERIFY_EMAIL_ERROR',
  'SEND_IDENTITY_PROVIDER_LINK', 'SEND_IDENTITY_PROVIDER_LINK_ERROR',
  'EXECUTE_ACTIONS', 'EXECUTE_ACTIONS_ERROR',
  'EXECUTE_ACTION_TOKEN', 'EXECUTE_ACTION_TOKEN_ERROR',
  'CUSTOM_REQUIRED_ACTION', 'CUSTOM_REQUIRED_ACTION_ERROR',
]

// ─── Logger class ────────────────────────────────────────────────

const RING_BUFFER_SIZE = 1000
const DEFAULT_POLL_INTERVAL_MS = 60_000 // 1 minute

class EmailEventsLogger {
  private readonly logDir: string
  private readonly eventsFile: string
  private events: EmailEvent[] = []
  private analytics: EmailAnalytics | null = null
  private subscribers = new Set<(event: EmailEvent) => void>()
  private analyticsSubscribers = new Set<(analytics: EmailAnalytics) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private initialized = false
  /** Epoch ms of the most recent event we've seen — used for incremental polling */
  private lastPollTimestamp = 0

  constructor() {
    this.logDir = join(process.cwd(), 'logs', 'email-events')
    this.eventsFile = join(this.logDir, 'email-events.jsonl')
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return

    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true })
    }

    await this.loadRecentEvents()
    this.recalculateAnalytics()
    this.initialized = true
    logger.email.info('Email events logger initialized', { eventsLoaded: this.events.length })
  }

  start(intervalMs = DEFAULT_POLL_INTERVAL_MS): void {
    if (this.timer) return
    // Poll immediately then schedule
    this.pollKeycloakEvents()
    this.timer = setInterval(() => this.pollKeycloakEvents(), intervalMs)
    logger.email.info('Email events poller started', { intervalMs })
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // ─── Keycloak polling ──────────────────────────────────────

  private async pollKeycloakEvents(): Promise<void> {
    if (!config.keycloak.isConfigured || !config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
      return
    }

    try {
      const token = await this.getAdminToken()
      if (!token) return

      // Build query params — only fetch email-related event types since last poll
      const params = new URLSearchParams()
      for (const t of EMAIL_EVENT_TYPES) {
        params.append('type', t)
      }
      if (this.lastPollTimestamp > 0) {
        params.set('dateFrom', String(this.lastPollTimestamp + 1))
      }
      params.set('max', '500')
      params.set('direction', 'desc')

      const url = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/events?${params.toString()}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        logger.email.warn('Failed to fetch Keycloak email events', { status: res.status })
        return
      }

      const kcEvents: KeycloakEvent[] = await res.json()
      if (kcEvents.length === 0) return

      // Process in chronological order (API returns desc, reverse to asc)
      const sorted = [...kcEvents].reverse()
      for (const kc of sorted) {
        const event = this.mapKeycloakEvent(kc)
        await this.persistEvent(event)
      }

      // Update poll cursor
      const maxTime = Math.max(...kcEvents.map(e => e.time ?? 0))
      if (maxTime > this.lastPollTimestamp) {
        this.lastPollTimestamp = maxTime
      }

      this.recalculateAnalytics()

      logger.email.debug('Polled email events from Keycloak', { count: kcEvents.length })
    } catch (error) {
      logger.email.error('Error polling Keycloak email events', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async getAdminToken(): Promise<string | null> {
    try {
      const tokenUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.keycloak.adminClientId!,
          client_secret: config.keycloak.adminClientSecret!,
        }),
      })

      if (!res.ok) {
        logger.email.warn('Failed to obtain admin token for email events polling', { status: res.status })
        return null
      }

      const data = await res.json() as { access_token: string }
      return data.access_token
    } catch (error) {
      logger.email.error('Error obtaining admin token', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private mapKeycloakEvent(kc: KeycloakEvent): EmailEvent {
    const isError = kc.type?.endsWith('_ERROR') ?? false
    return {
      id: kc.id ?? `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: kc.time ? new Date(kc.time).toISOString() : new Date().toISOString(),
      type: kc.type ?? 'UNKNOWN',
      userId: kc.userId,
      clientId: kc.clientId,
      ipAddress: kc.ipAddress,
      error: kc.error,
      success: !isError && !kc.error,
      details: kc.details,
    }
  }

  // ─── Persistence ───────────────────────────────────────────

  private async persistEvent(event: EmailEvent): Promise<void> {
    // Deduplicate — skip if we already have this event id
    if (this.events.some(e => e.id === event.id)) return

    this.events.unshift(event)
    if (this.events.length > RING_BUFFER_SIZE) {
      this.events.length = RING_BUFFER_SIZE
    }

    try {
      await appendFile(this.eventsFile, JSON.stringify(event) + '\n', 'utf8')
    } catch (e) {
      logger.email.error('Failed to append email event to log', { error: String(e) })
    }

    // Notify subscribers
    for (const cb of this.subscribers) {
      try { cb(event) } catch { /* swallow */ }
    }
  }

  // ─── Load persisted data ───────────────────────────────────

  private async loadRecentEvents(): Promise<void> {
    if (!existsSync(this.eventsFile)) return
    try {
      const raw = await readFile(this.eventsFile, 'utf8')
      const lines = raw.trim().split('\n').filter(Boolean)
      const start = Math.max(0, lines.length - RING_BUFFER_SIZE)
      for (let i = start; i < lines.length; i++) {
        try {
          this.events.push(JSON.parse(lines[i]))
        } catch { /* skip corrupt lines */ }
      }
      // Most recent first
      this.events.reverse()

      // Set poll cursor to the most recent event
      if (this.events.length > 0) {
        const latest = new Date(this.events[0].timestamp).getTime()
        if (latest > this.lastPollTimestamp) this.lastPollTimestamp = latest
      }
    } catch { /* file may not exist yet */ }
  }

  // ─── Query API ────────────────────────────────────────────

  getRecentEvents(opts?: {
    limit?: number
    type?: string
    success?: boolean
    since?: Date
  }): EmailEvent[] {
    let result = [...this.events]
    if (opts?.type && opts.type !== 'all') result = result.filter(e => e.type === opts.type)
    if (opts?.success !== undefined) result = result.filter(e => e.success === opts.success)
    if (opts?.since) {
      const since = opts.since.getTime()
      result = result.filter(e => new Date(e.timestamp).getTime() >= since)
    }
    if (opts?.limit) result = result.slice(0, opts.limit)
    return result
  }

  getAnalytics(): EmailAnalytics | null {
    return this.analytics
  }

  // ─── Subscriptions ────────────────────────────────────────

  subscribe(cb: (event: EmailEvent) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  subscribeAnalytics(cb: (analytics: EmailAnalytics) => void): () => void {
    this.analyticsSubscribers.add(cb)
    return () => this.analyticsSubscribers.delete(cb)
  }

  // ─── Analytics calc ───────────────────────────────────────

  private recalculateAnalytics(): void {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent = this.events.filter(e => new Date(e.timestamp) >= last24h)

      const successful = recent.filter(e => e.success).length
      const eventsByType: Record<string, number> = {}
      for (const e of recent) {
        eventsByType[e.type] = (eventsByType[e.type] ?? 0) + 1
      }

      // Hourly stats
      const hourBuckets = new Map<string, { success: number; failure: number }>()
      for (const e of recent) {
        const hour = new Date(e.timestamp).toISOString().slice(0, 13) + ':00:00.000Z'
        let bucket = hourBuckets.get(hour)
        if (!bucket) { bucket = { success: 0, failure: 0 }; hourBuckets.set(hour, bucket) }
        if (e.success) bucket.success++
        else bucket.failure++
      }
      const hourlyStats = Array.from(hourBuckets.entries())
        .map(([hour, s]) => ({ hour, ...s, total: s.success + s.failure }))
        .sort((a, b) => a.hour.localeCompare(b.hour))

      const recentErrors = recent.filter(e => !e.success).slice(0, 20)

      this.analytics = {
        totalEvents: recent.length,
        successRate: recent.length > 0 ? Math.round((successful / recent.length) * 10000) / 100 : 100,
        eventsByType,
        recentErrors,
        hourlyStats,
        timestamp: now.toISOString(),
      }

      // Notify analytics subscribers
      for (const cb of this.analyticsSubscribers) {
        try { cb(this.analytics) } catch { /* swallow */ }
      }
    } catch (error) {
      logger.email.error('Failed to recalculate email analytics', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// ─── Singleton export ───────────────────────────────────────────

export const emailEventsLogger = new EmailEventsLogger()
