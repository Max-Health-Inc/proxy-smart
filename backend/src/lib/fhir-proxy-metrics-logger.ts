/**
 * FHIR Proxy Metrics Logger
 *
 * Tracks every proxied FHIR request (status code, latency, resource type,
 * server, client, 429s / errors). Follows the same pub/sub + ring buffer +
 * JSONL persistence pattern used by OAuthMetricsLogger and FhirHealthLogger.
 */

import { appendFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'

// ─── Types ───────────────────────────────────────────────────────

export interface FhirProxyEvent {
  id: string
  timestamp: string
  serverName: string
  method: string
  resourcePath: string
  resourceType: string
  statusCode: number
  responseTimeMs: number
  clientId?: string
  userId?: string
  username?: string
  error?: string
}

export interface FhirProxyAnalytics {
  totalRequests: number
  successCount: number
  errorCount: number
  rateLimitCount: number
  successRate: number
  avgResponseTimeMs: number
  requestsByStatus: Record<number, number>
  requestsByServer: Record<string, number>
  requestsByResource: Record<string, number>
  recentErrors: FhirProxyEvent[]
  hourlyStats: Array<{
    hour: string
    total: number
    success: number
    errors: number
    rateLimited: number
    avgMs: number
  }>
}

// ─── Logger class ────────────────────────────────────────────────

const MAX_MEMORY_EVENTS = 2000
const ANALYTICS_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

class FhirProxyMetricsLogger {
  private readonly logDir: string
  private readonly eventsFile: string
  private events: FhirProxyEvent[] = []
  private subscribers = new Set<(event: FhirProxyEvent) => void>()
  private analyticsSubscribers = new Set<(analytics: FhirProxyAnalytics) => void>()
  private initialized = false

  constructor() {
    this.logDir = join(process.cwd(), 'logs', 'fhir-proxy-metrics')
    this.eventsFile = join(this.logDir, 'fhir-proxy-events.jsonl')
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true })
    }
    await this.loadRecentEvents()
    this.initialized = true
    logger.fhir.info('FHIR proxy metrics logger initialized', { eventsLoaded: this.events.length })
  }

  // ─── Record a proxied request ──────────────────────────────

  async logRequest(data: Omit<FhirProxyEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: FhirProxyEvent = {
      ...data,
      id: `fhir-px-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }

    // Ring buffer
    this.events.unshift(event)
    if (this.events.length > MAX_MEMORY_EVENTS) {
      this.events.length = MAX_MEMORY_EVENTS
    }

    // Persist
    try {
      await appendFile(this.eventsFile, JSON.stringify(event) + '\n', 'utf8')
    } catch (e) {
      logger.fhir.error('Failed to persist FHIR proxy event', { error: String(e) })
    }

    // Notify real-time subscribers
    for (const cb of this.subscribers) {
      try { cb(event) } catch { /* swallow */ }
    }

    // Push updated analytics
    const analytics = this.getAnalytics()
    for (const cb of this.analyticsSubscribers) {
      try { cb(analytics) } catch { /* swallow */ }
    }

    // Log 429s and 5xx at warn level
    if (event.statusCode === 429) {
      logger.fhir.warn('FHIR proxy 429 rate limited', { server: event.serverName, path: event.resourcePath })
    } else if (event.statusCode >= 500) {
      logger.fhir.warn('FHIR proxy server error', { server: event.serverName, status: event.statusCode, path: event.resourcePath })
    }
  }

  // ─── Query API ────────────────────────────────────────────

  getRecentEvents(opts?: {
    limit?: number
    serverName?: string
    statusCode?: number
    since?: Date
  }): FhirProxyEvent[] {
    let result = [...this.events]
    if (opts?.serverName) result = result.filter(e => e.serverName === opts.serverName)
    if (opts?.statusCode) result = result.filter(e => e.statusCode === opts.statusCode)
    if (opts?.since) {
      const since = opts.since.getTime()
      result = result.filter(e => new Date(e.timestamp).getTime() >= since)
    }
    if (opts?.limit) result = result.slice(0, opts.limit)
    return result
  }

  getAnalytics(): FhirProxyAnalytics {
    const cutoff = Date.now() - ANALYTICS_WINDOW_MS
    const recent = this.events.filter(e => new Date(e.timestamp).getTime() >= cutoff)

    const totalRequests = recent.length
    const successCount = recent.filter(e => e.statusCode >= 200 && e.statusCode < 400).length
    const errorCount = recent.filter(e => e.statusCode >= 400).length
    const rateLimitCount = recent.filter(e => e.statusCode === 429).length
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0
    const totalMs = recent.reduce((s, e) => s + e.responseTimeMs, 0)
    const avgResponseTimeMs = totalRequests > 0 ? Math.round(totalMs / totalRequests) : 0

    // Group by status code
    const requestsByStatus: Record<number, number> = {}
    for (const e of recent) {
      requestsByStatus[e.statusCode] = (requestsByStatus[e.statusCode] || 0) + 1
    }

    // Group by server
    const requestsByServer: Record<string, number> = {}
    for (const e of recent) {
      requestsByServer[e.serverName] = (requestsByServer[e.serverName] || 0) + 1
    }

    // Group by resource type
    const requestsByResource: Record<string, number> = {}
    for (const e of recent) {
      if (e.resourceType) {
        requestsByResource[e.resourceType] = (requestsByResource[e.resourceType] || 0) + 1
      }
    }

    // Recent errors (last 20)
    const recentErrors = recent.filter(e => e.statusCode >= 400).slice(0, 20)

    // Hourly stats
    const hourlyMap = new Map<string, { total: number; success: number; errors: number; rateLimited: number; totalMs: number }>()
    for (const e of recent) {
      const hour = e.timestamp.slice(0, 13) + ':00:00' // YYYY-MM-DDTHH:00:00
      let bucket = hourlyMap.get(hour)
      if (!bucket) { bucket = { total: 0, success: 0, errors: 0, rateLimited: 0, totalMs: 0 }; hourlyMap.set(hour, bucket) }
      bucket.total++
      bucket.totalMs += e.responseTimeMs
      if (e.statusCode >= 200 && e.statusCode < 400) bucket.success++
      if (e.statusCode >= 400) bucket.errors++
      if (e.statusCode === 429) bucket.rateLimited++
    }

    const hourlyStats = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, b]) => ({
        hour,
        total: b.total,
        success: b.success,
        errors: b.errors,
        rateLimited: b.rateLimited,
        avgMs: Math.round(b.totalMs / b.total),
      }))

    return {
      totalRequests,
      successCount,
      errorCount,
      rateLimitCount,
      successRate,
      avgResponseTimeMs,
      requestsByStatus,
      requestsByServer,
      requestsByResource,
      recentErrors,
      hourlyStats,
    }
  }

  // ─── Pub/Sub ──────────────────────────────────────────────

  subscribeToEvents(cb: (event: FhirProxyEvent) => void): () => void {
    this.subscribers.add(cb)
    return () => { this.subscribers.delete(cb) }
  }

  subscribeToAnalytics(cb: (analytics: FhirProxyAnalytics) => void): () => void {
    this.analyticsSubscribers.add(cb)
    return () => { this.analyticsSubscribers.delete(cb) }
  }

  // ─── Load persisted data ───────────────────────────────────

  private async loadRecentEvents(): Promise<void> {
    if (!existsSync(this.eventsFile)) return
    try {
      const raw = await readFile(this.eventsFile, 'utf8')
      const lines = raw.trim().split('\n').filter(Boolean)
      const start = Math.max(0, lines.length - MAX_MEMORY_EVENTS)
      for (let i = start; i < lines.length; i++) {
        try { this.events.push(JSON.parse(lines[i])) } catch { /* skip corrupt */ }
      }
      this.events.reverse() // most recent first
    } catch { /* file may not exist yet */ }
  }
}

// Singleton
export const fhirProxyMetricsLogger = new FhirProxyMetricsLogger()
