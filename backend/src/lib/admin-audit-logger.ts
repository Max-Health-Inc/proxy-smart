/**
 * Admin Audit Logger
 *
 * Persists every admin‑route mutation (create / update / delete / action) to a
 * JSONL file and keeps an in‑memory ring buffer for the last 1 000 events.
 *
 * Follows the same singleton + subscriber pattern as OAuthMetricsLogger and
 * ConsentMetricsLogger so the admin dashboard can show a real‑time feed and
 * aggregated analytics via SSE / WebSocket.
 */

import { appendFile, mkdir } from 'fs/promises'
import { existsSync, createReadStream } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'
import { logger } from './logger'

// ─── Event shape ─────────────────────────────────────────────────────

export interface AdminAuditEvent {
  id: string
  timestamp: string
  /** Actor identity extracted from the JWT */
  actor: {
    sub: string
    username?: string
    email?: string
  }
  /** HTTP method that triggered the action */
  method: string
  /** Route path (e.g. /admin/smart-apps/my-client) */
  path: string
  /** High‑level action tag */
  action: 'create' | 'update' | 'delete' | 'action' | 'read'
  /** Resource domain (smart-apps, healthcare-users, roles, …) */
  resource: string
  /** Optional resource identifier (clientId, userId, roleName, …) */
  resourceId?: string
  /** HTTP status code of the response */
  statusCode: number
  /** Whether the request succeeded (2xx) */
  success: boolean
  /** Duration in ms */
  durationMs: number
  /** IP address of the caller */
  ipAddress?: string
  /** Optional summary / description */
  detail?: string
}

// ─── Analytics shape ─────────────────────────────────────────────────

export interface AdminAuditAnalytics {
  totalActions: number
  successRate: number
  actionsByType: Record<string, number>
  actionsByResource: Record<string, number>
  topActors: Array<{ username: string; count: number }>
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>
  recentFailures: AdminAuditEvent[]
}

// ─── Logger class ────────────────────────────────────────────────────

const RING_BUFFER_SIZE = 1000
const LOAD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

class AdminAuditLogger {
  private readonly logDir: string
  private readonly eventsFile: string
  private events: AdminAuditEvent[] = []
  private analytics: AdminAuditAnalytics | null = null
  private subscribers = new Set<(event: AdminAuditEvent) => void>()
  private analyticsSubscribers = new Set<(analytics: AdminAuditAnalytics) => void>()
  private isInitialized = false

  constructor() {
    this.logDir = join(process.cwd(), 'logs', 'admin-audit')
    this.eventsFile = join(this.logDir, 'admin-audit.jsonl')
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true })
        logger.admin.info('Created admin audit log directory', { dir: this.logDir })
      }

      await this.loadRecentEvents()
      this.recalculateAnalytics()
      this.isInitialized = true
      logger.admin.info('Admin audit logger initialized successfully')
    } catch (error) {
      logger.admin.error('Failed to initialize admin audit logger', { error })
      throw error
    }
  }

  // ─── Write ──────────────────────────────────────────────────────

  async log(event: Omit<AdminAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const full: AdminAuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString(),
    }

    try {
      // Ring buffer
      this.events.unshift(full)
      if (this.events.length > RING_BUFFER_SIZE) {
        this.events = this.events.slice(0, RING_BUFFER_SIZE)
      }

      // Persist
      await appendFile(this.eventsFile, JSON.stringify(full) + '\n')

      // Notify subscribers
      for (const cb of this.subscribers) {
        try { cb(full) } catch { /* subscriber errors must not break the logger */ }
      }

      // Refresh analytics
      this.recalculateAnalytics()

      logger.admin.debug('Admin audit event logged', {
        eventId: full.id,
        action: full.action,
        resource: full.resource,
        actor: full.actor.username ?? full.actor.sub,
      })
    } catch (error) {
      logger.admin.error('Failed to persist admin audit event', { error, event: full })
    }
  }

  // ─── Read ───────────────────────────────────────────────────────

  getRecentEvents(options?: {
    limit?: number
    action?: string
    resource?: string
    actor?: string
    success?: boolean
    since?: Date
  }): AdminAuditEvent[] {
    let filtered = [...this.events]

    if (options?.action && options.action !== 'all') {
      filtered = filtered.filter(e => e.action === options.action)
    }
    if (options?.resource && options.resource !== 'all') {
      filtered = filtered.filter(e => e.resource === options.resource)
    }
    if (options?.actor) {
      const q = options.actor.toLowerCase()
      filtered = filtered.filter(e =>
        (e.actor.username?.toLowerCase().includes(q)) ||
        e.actor.sub.toLowerCase().includes(q) ||
        (e.actor.email?.toLowerCase().includes(q))
      )
    }
    if (options?.success !== undefined) {
      filtered = filtered.filter(e => e.success === options.success)
    }
    if (options?.since) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= options.since!)
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }
    return filtered
  }

  getAnalytics(): AdminAuditAnalytics | null {
    return this.analytics
  }

  // ─── Subscriptions ─────────────────────────────────────────────

  subscribe(cb: (event: AdminAuditEvent) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  subscribeAnalytics(cb: (analytics: AdminAuditAnalytics) => void): () => void {
    this.analyticsSubscribers.add(cb)
    return () => this.analyticsSubscribers.delete(cb)
  }

  // ─── Analytics calc ─────────────────────────────────────────────

  private recalculateAnalytics(): void {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent = this.events.filter(e => new Date(e.timestamp) >= last24h)

      const total = recent.length
      const successes = recent.filter(e => e.success).length

      // Actions by type
      const actionsByType: Record<string, number> = {}
      const actionsByResource: Record<string, number> = {}
      const actorCounts = new Map<string, number>()

      for (const e of recent) {
        actionsByType[e.action] = (actionsByType[e.action] || 0) + 1
        actionsByResource[e.resource] = (actionsByResource[e.resource] || 0) + 1
        const name = e.actor.username ?? e.actor.sub
        actorCounts.set(name, (actorCounts.get(name) || 0) + 1)
      }

      const topActors = Array.from(actorCounts.entries())
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Hourly — sparse UTC-based bucketing (consistent with auth/email/fhir-proxy/oauth/consent)
      const hourBuckets = new Map<string, { success: number; failure: number }>()
      for (const e of recent) {
        const hourKey = e.timestamp.slice(0, 13) + ':00:00.000Z'
        let bucket = hourBuckets.get(hourKey)
        if (!bucket) { bucket = { success: 0, failure: 0 }; hourBuckets.set(hourKey, bucket) }
        if (e.success) bucket.success++
        else bucket.failure++
      }
      const hourlyStats = Array.from(hourBuckets.entries())
        .map(([hour, b]) => ({ hour, success: b.success, failure: b.failure, total: b.success + b.failure }))
        .sort((a, b) => a.hour.localeCompare(b.hour))

      const recentFailures = recent.filter(e => !e.success).slice(0, 20)

      this.analytics = {
        totalActions: total,
        successRate: total > 0 ? Math.round((successes / total) * 10000) / 100 : 0,
        actionsByType,
        actionsByResource,
        topActors,
        hourlyStats,
        recentFailures,
      }

      // Push to analytics subscribers
      for (const cb of this.analyticsSubscribers) {
        try { cb(this.analytics) } catch { /* ignore */ }
      }
    } catch (error) {
      logger.admin.error('Failed to recalculate admin audit analytics', { error })
    }
  }

  // ─── Bootstrap from disk ────────────────────────────────────────

  private async loadRecentEvents(): Promise<void> {
    if (!existsSync(this.eventsFile)) return

    const cutoff = new Date(Date.now() - LOAD_WINDOW_MS)
    const loaded: AdminAuditEvent[] = []

    const rl = createInterface({ input: createReadStream(this.eventsFile), crlfDelay: Infinity })

    for await (const line of rl) {
      if (!line.trim()) continue
      try {
        const event: AdminAuditEvent = JSON.parse(line)
        if (new Date(event.timestamp) >= cutoff) {
          loaded.push(event)
        }
      } catch { /* skip malformed lines */ }
    }

    // Most recent first, cap at ring buffer size
    this.events = loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, RING_BUFFER_SIZE)
    logger.admin.info(`Loaded ${this.events.length} recent admin audit events from disk`)
  }
}

// Singleton
export const adminAuditLogger = new AdminAuditLogger()
