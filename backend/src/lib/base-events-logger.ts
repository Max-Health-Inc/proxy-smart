/**
 * Base Events Logger
 *
 * Generic event logger that provides the shared infrastructure for all
 * Keycloak event pollers (auth, email, etc.):
 *  - JSONL persistence
 *  - In-memory ring buffer
 *  - Pub/sub for events & analytics
 *  - Incremental Keycloak polling via client_credentials
 *  - Hourly-bucketed analytics calculation
 *
 * Subclasses provide:
 *  - Event types to poll
 *  - Event mapping (Keycloak → domain event)
 *  - Analytics calculation (domain-specific aggregations)
 *  - Logger channel name
 */

import { appendFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'
import { config } from '../config'

// ─── Types ───────────────────────────────────────────────────────

/** Keycloak EventRepresentation shape */
export interface KeycloakEvent {
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

/** Minimum shape every domain event must have */
export interface BaseEvent {
  id: string
  timestamp: string
  type: string
  success: boolean
}

/** Minimum shape every analytics object must have */
export interface BaseAnalytics {
  totalEvents: number
  successRate: number
  eventsByType: Record<string, number>
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>
  timestamp: string
}

// ─── Configuration ───────────────────────────────────────────────

export interface EventLoggerConfig<TEvent extends BaseEvent> {
  /** Subdirectory name under logs/ (e.g. 'auth-events', 'email-events') */
  logSubdir: string
  /** JSONL filename (e.g. 'auth-events.jsonl') */
  logFilename: string
  /** Keycloak event types to poll */
  eventTypes: string[]
  /** Logger channel for log messages */
  logChannel: keyof typeof logger
  /** Map a Keycloak event to a domain event */
  mapEvent: (kc: KeycloakEvent) => TEvent
  /** ID prefix for generated IDs (e.g. 'auth', 'email') */
  idPrefix: string
}

// ─── Base class ──────────────────────────────────────────────────

const RING_BUFFER_SIZE = 1000
const DEFAULT_POLL_INTERVAL_MS = 60_000

export abstract class BaseEventsLogger<
  TEvent extends BaseEvent,
  TAnalytics extends BaseAnalytics,
> {
  protected readonly logDir: string
  protected readonly eventsFile: string
  protected events: TEvent[] = []
  protected analytics: TAnalytics | null = null
  protected subscribers = new Set<(event: TEvent) => void>()
  protected analyticsSubscribers = new Set<(analytics: TAnalytics) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private initialized = false
  private lastPollTimestamp = 0

  constructor(protected readonly cfg: EventLoggerConfig<TEvent>) {
    this.logDir = join(process.cwd(), 'logs', cfg.logSubdir)
    this.eventsFile = join(this.logDir, cfg.logFilename)
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
    this.log('info', `${this.cfg.idPrefix} events logger initialized`, { eventsLoaded: this.events.length })
  }

  start(intervalMs = DEFAULT_POLL_INTERVAL_MS): void {
    if (this.timer) return
    this.pollKeycloakEvents()
    this.timer = setInterval(() => this.pollKeycloakEvents(), intervalMs)
    this.log('info', `${this.cfg.idPrefix} events poller started`, { intervalMs })
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

      const params = new URLSearchParams()
      for (const t of this.cfg.eventTypes) {
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
        this.log('warn', `Failed to fetch Keycloak ${this.cfg.idPrefix} events`, { status: res.status })
        return
      }

      const kcEvents: KeycloakEvent[] = await res.json()
      if (kcEvents.length === 0) return

      const sorted = [...kcEvents].reverse()
      for (const kc of sorted) {
        const event = this.cfg.mapEvent(kc)
        await this.persistEvent(event)
      }

      const maxTime = Math.max(...kcEvents.map(e => e.time ?? 0))
      if (maxTime > this.lastPollTimestamp) {
        this.lastPollTimestamp = maxTime
      }

      this.recalculateAnalytics()
      this.log('debug', `Polled ${this.cfg.idPrefix} events from Keycloak`, { count: kcEvents.length })
    } catch (error) {
      this.log('error', `Error polling Keycloak ${this.cfg.idPrefix} events`, {
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
        this.log('warn', `Failed to obtain admin token for ${this.cfg.idPrefix} events polling`, { status: res.status })
        return null
      }

      const data = await res.json() as { access_token: string }
      return data.access_token
    } catch (error) {
      this.log('error', 'Error obtaining admin token', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  // ─── Persistence ───────────────────────────────────────────

  private async persistEvent(event: TEvent): Promise<void> {
    if (this.events.some(e => e.id === event.id)) return

    this.events.unshift(event)
    if (this.events.length > RING_BUFFER_SIZE) {
      this.events.length = RING_BUFFER_SIZE
    }

    try {
      await appendFile(this.eventsFile, JSON.stringify(event) + '\n', 'utf8')
    } catch (e) {
      this.log('error', `Failed to append ${this.cfg.idPrefix} event to log`, { error: String(e) })
    }

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
      this.events.reverse()

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
  }): TEvent[] {
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

  getAnalytics(): TAnalytics | null {
    return this.analytics
  }

  // ─── Subscriptions ────────────────────────────────────────

  subscribe(cb: (event: TEvent) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  subscribeAnalytics(cb: (analytics: TAnalytics) => void): () => void {
    this.analyticsSubscribers.add(cb)
    return () => this.analyticsSubscribers.delete(cb)
  }

  // ─── Analytics ────────────────────────────────────────────

  /**
   * Subclasses override this to add domain-specific analytics fields.
   * The base implementation provides hourly stats, eventsByType, successRate.
   */
  protected abstract computeAnalytics(recentEvents: TEvent[]): TAnalytics

  private recalculateAnalytics(): void {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent = this.events.filter(e => new Date(e.timestamp) >= last24h)

      this.analytics = this.computeAnalytics(recent)

      for (const cb of this.analyticsSubscribers) {
        try { cb(this.analytics) } catch { /* swallow */ }
      }
    } catch (error) {
      this.log('error', `Failed to recalculate ${this.cfg.idPrefix} analytics`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  /** Compute base analytics fields shared by all event loggers */
  protected computeBaseAnalytics(recent: TEvent[]): BaseAnalytics {
    const successful = recent.filter(e => e.success).length
    const eventsByType: Record<string, number> = {}
    for (const e of recent) {
      eventsByType[e.type] = (eventsByType[e.type] ?? 0) + 1
    }

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

    return {
      totalEvents: recent.length,
      successRate: recent.length > 0 ? Math.round((successful / recent.length) * 10000) / 100 : 100,
      eventsByType,
      hourlyStats,
      timestamp: new Date().toISOString(),
    }
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>): void {
    const channel = logger[this.cfg.logChannel]
    if (channel && typeof channel === 'object' && level in channel) {
      (channel as Record<string, (msg: string, meta?: Record<string, unknown>) => void>)[level](message, meta)
    }
  }
}
