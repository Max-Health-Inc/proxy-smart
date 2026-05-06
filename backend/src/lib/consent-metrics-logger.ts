/**
 * Consent Metrics Logger
 *
 * Persists consent (and IAL) decisions to a JSONL file and keeps an in-memory
 * ring buffer for the last 1000 events.  Follows the same singleton + subscriber
 * pattern as OAuthMetricsLogger so the admin dashboard can show a real-time feed
 * and analytics.
 */

import { writeFile, appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createReadStream } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'
import { logger } from './logger'

// ─── Event type ──────────────────────────────────────────────────────

export interface ConsentDecisionEvent {
  id: string
  timestamp: string
  decision: 'permit' | 'deny'
  enforced: boolean
  mode: 'enforce' | 'audit-only' | 'disabled'
  consentId: string | null
  patientId: string | null
  clientId: string
  userId: string | null
  username: string | null
  resourceType: string | null
  resourcePath: string
  serverName: string
  method: string
  reason: string
  cached: boolean
  checkDurationMs: number
  // IAL fields (optional — only present for combined checks)
  ial?: {
    allowed: boolean
    actualLevel: string | null
    requiredLevel: string
    isSensitiveResource: boolean
  } | null
}

// ─── Analytics shape ────────────────────────────────────────────────

export interface ConsentAnalytics {
  totalDecisions: number
  permitRate: number
  denyRate: number
  averageCheckDuration: number
  cacheHitRate: number
  decisionsByMode: Record<string, number>
  decisionsByResourceType: Record<string, { permit: number; deny: number }>
  topDeniedClients: Array<{ clientId: string; denyCount: number }>
  topDeniedPatients: Array<{ patientId: string; denyCount: number }>
  hourlyStats: Array<{
    hour: string
    permit: number
    deny: number
    total: number
  }>
}

// ─── Logger class ───────────────────────────────────────────────────

class ConsentMetricsLogger {
  private readonly logDir: string
  private readonly eventsFile: string
  private readonly analyticsFile: string
  private events: ConsentDecisionEvent[] = []
  private analytics: ConsentAnalytics | null = null
  private subscribers = new Set<(event: ConsentDecisionEvent) => void>()
  private analyticsSubscribers = new Set<(analytics: ConsentAnalytics) => void>()
  private isInitialized = false

  constructor() {
    this.logDir = join(process.cwd(), 'logs', 'consent-metrics')
    this.eventsFile = join(this.logDir, 'consent-events.jsonl')
    this.analyticsFile = join(this.logDir, 'consent-analytics.json')
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true })
        logger.consent.info('Created consent metrics log directory', { dir: this.logDir })
      }

      await this.loadRecentEvents()
      await this.calculateAnalytics()

      this.isInitialized = true
      logger.consent.info('Consent metrics logger initialized successfully')
    } catch (error) {
      logger.consent.error('Failed to initialize consent metrics logger', { error })
      throw error
    }
  }

  // ─── Logging ────────────────────────────────────────────────────

  async logDecision(event: Omit<ConsentDecisionEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: ConsentDecisionEvent = {
      ...event,
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    try {
      this.events.unshift(fullEvent)
      if (this.events.length > 1000) {
        this.events = this.events.slice(0, 1000)
      }

      const logLine = JSON.stringify(fullEvent) + '\n'
      await appendFile(this.eventsFile, logLine)

      this.subscribers.forEach(cb => {
        try { cb(fullEvent) } catch (e) {
          logger.consent.error('Error in consent event subscriber', { error: e })
        }
      })

      await this.calculateAnalytics()
    } catch (error) {
      logger.consent.error('Failed to log consent decision', { error, event: fullEvent })
    }
  }

  // ─── Subscriptions ─────────────────────────────────────────────

  subscribeToEvents(cb: (event: ConsentDecisionEvent) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  subscribeToAnalytics(cb: (analytics: ConsentAnalytics) => void): () => void {
    this.analyticsSubscribers.add(cb)
    return () => this.analyticsSubscribers.delete(cb)
  }

  // ─── Queries ───────────────────────────────────────────────────

  getRecentEvents(options?: {
    limit?: number
    decision?: string
    clientId?: string
    patientId?: string
    resourceType?: string
    since?: Date
  }): ConsentDecisionEvent[] {
    let filtered = [...this.events]

    if (options?.decision && options.decision !== 'all') {
      filtered = filtered.filter(e => e.decision === options.decision)
    }
    if (options?.clientId) {
      filtered = filtered.filter(e => e.clientId === options.clientId)
    }
    if (options?.patientId) {
      filtered = filtered.filter(e => e.patientId === options.patientId)
    }
    if (options?.resourceType && options.resourceType !== 'all') {
      filtered = filtered.filter(e => e.resourceType === options.resourceType)
    }
    if (options?.since) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= options.since!)
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  getAnalytics(): ConsentAnalytics | null {
    return this.analytics
  }

  // ─── Analytics calculation ─────────────────────────────────────

  private async calculateAnalytics(): Promise<void> {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent = this.events.filter(e => new Date(e.timestamp) >= last24h)

      const totalDecisions = recent.length
      const permits = recent.filter(e => e.decision === 'permit').length
      const denies = recent.filter(e => e.decision === 'deny').length
      const cached = recent.filter(e => e.cached).length
      const totalDuration = recent.reduce((s, e) => s + e.checkDurationMs, 0)

      // Decisions by mode
      const decisionsByMode: Record<string, number> = {}
      recent.forEach(e => {
        decisionsByMode[e.mode] = (decisionsByMode[e.mode] || 0) + 1
      })

      // Decisions by resource type
      const decisionsByResourceType: Record<string, { permit: number; deny: number }> = {}
      recent.forEach(e => {
        const rt = e.resourceType || 'unknown'
        if (!decisionsByResourceType[rt]) decisionsByResourceType[rt] = { permit: 0, deny: 0 }
        decisionsByResourceType[rt][e.decision]++
      })

      // Top denied clients
      const denyByClient = new Map<string, number>()
      recent.filter(e => e.decision === 'deny').forEach(e => {
        denyByClient.set(e.clientId, (denyByClient.get(e.clientId) || 0) + 1)
      })
      const topDeniedClients = [...denyByClient.entries()]
        .map(([clientId, denyCount]) => ({ clientId, denyCount }))
        .sort((a, b) => b.denyCount - a.denyCount)
        .slice(0, 10)

      // Top denied patients
      const denyByPatient = new Map<string, number>()
      recent.filter(e => e.decision === 'deny' && e.patientId).forEach(e => {
        denyByPatient.set(e.patientId!, (denyByPatient.get(e.patientId!) || 0) + 1)
      })
      const topDeniedPatients = [...denyByPatient.entries()]
        .map(([patientId, denyCount]) => ({ patientId, denyCount }))
        .sort((a, b) => b.denyCount - a.denyCount)
        .slice(0, 10)

      // Hourly stats — sparse UTC-based bucketing (consistent with auth/email/fhir-proxy)
      const hourBuckets = new Map<string, { permit: number; deny: number }>()
      for (const e of recent) {
        const hourKey = e.timestamp.slice(0, 13) + ':00:00.000Z'
        let bucket = hourBuckets.get(hourKey)
        if (!bucket) { bucket = { permit: 0, deny: 0 }; hourBuckets.set(hourKey, bucket) }
        if (e.decision === 'permit') bucket.permit++
        else bucket.deny++
      }
      const hourlyStats = Array.from(hourBuckets.entries())
        .map(([hour, b]) => ({ hour, permit: b.permit, deny: b.deny, total: b.permit + b.deny }))
        .sort((a, b) => a.hour.localeCompare(b.hour))

      this.analytics = {
        totalDecisions,
        permitRate: totalDecisions > 0 ? (permits / totalDecisions) * 100 : 0,
        denyRate: totalDecisions > 0 ? (denies / totalDecisions) * 100 : 0,
        averageCheckDuration: totalDecisions > 0 ? totalDuration / totalDecisions : 0,
        cacheHitRate: totalDecisions > 0 ? (cached / totalDecisions) * 100 : 0,
        decisionsByMode,
        decisionsByResourceType,
        topDeniedClients,
        topDeniedPatients,
        hourlyStats,
      }

      await writeFile(this.analyticsFile, JSON.stringify(this.analytics, null, 2))

      this.analyticsSubscribers.forEach(cb => {
        try { cb(this.analytics!) } catch (e) {
          logger.consent.error('Error in consent analytics subscriber', { error: e })
        }
      })
    } catch (error) {
      logger.consent.error('Failed to calculate consent analytics', { error })
    }
  }

  // ─── Persistence ───────────────────────────────────────────────

  private async loadRecentEvents(): Promise<void> {
    try {
      if (!existsSync(this.eventsFile)) return

      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      const events: ConsentDecisionEvent[] = []

      const stream = createReadStream(this.eventsFile, { encoding: 'utf-8' })
      const rl = createInterface({ input: stream, crlfDelay: Infinity })

      for await (const line of rl) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed) as ConsentDecisionEvent
          const ts = Date.parse(parsed.timestamp)
          if (Number.isFinite(ts) && ts >= cutoff) events.push(parsed)
        } catch { /* skip malformed lines */ }
      }

      this.events = events
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(0, 1000)

      logger.consent.info('Consent events loaded from persistence', {
        restoredEvents: this.events.length,
      })
    } catch (error) {
      logger.consent.error('Failed to load recent consent events', { error })
    }
  }
}

// ─── Singleton export ────────────────────────────────────────────────

export const consentMetricsLogger = new ConsentMetricsLogger()
