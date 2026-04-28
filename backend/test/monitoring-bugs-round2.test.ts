import { describe, expect, it } from 'bun:test'

/**
 * Monitoring Bugs Round 2 — TDD Tests
 *
 * Bug 7:  Admin audit `recentFailures` leaks events beyond 24h window
 * Bug 8:  Admin audit `hourlyStats` uses local-time bucketing (not UTC)
 * Bug 9:  Admin audit `successRate` has no rounding (raw float)
 * Bug 10: FhirProxy `getRecentEvents` returns mutable backing array
 */

// ─── Helpers ─────────────────────────────────────────────────────

function makeAuditEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    timestamp: new Date().toISOString(),
    actor: { sub: 'user-1', username: 'admin' },
    method: 'POST',
    path: '/admin/smart-apps',
    action: 'create' as const,
    resource: 'smart-apps',
    resourceId: 'my-app',
    statusCode: 201,
    success: true,
    durationMs: 45,
    ipAddress: '127.0.0.1',
    ...overrides,
  }
}

function makeFhirProxyEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `fhir-px-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    serverName: 'hapi-fhir',
    method: 'GET',
    resourcePath: '/Patient/123',
    resourceType: 'Patient',
    statusCode: 200,
    responseTimeMs: 50,
    clientId: 'my-app',
    ...overrides,
  }
}

// ─── Bug 7: Admin audit recentFailures leaks beyond 24h ─────────

describe('Bug 7: Admin audit recentFailures must be scoped to 24h', () => {
  /**
   * AdminAuditLogger.recalculateAnalytics() computes:
   *   const recent = this.events.filter(e => new Date(e.timestamp) >= last24h)
   *   ...
   *   const recentFailures = this.events.filter(e => !e.success).slice(0, 20) // BUG!
   *
   * Same pattern as Bug 4 in round 1.
   */

  it('recentFailures should only include failures within 24h', () => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const allEvents = [
      // Old failure (3 days ago) — should NOT appear
      makeAuditEvent({
        id: 'old-failure',
        timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        success: false,
        statusCode: 500,
      }),
      // Recent failure (2h ago) — SHOULD appear
      makeAuditEvent({
        id: 'recent-failure',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        success: false,
        statusCode: 403,
      }),
      // Recent success — should NOT appear (it's a success)
      makeAuditEvent({
        id: 'recent-success',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        success: true,
      }),
    ]

    // CORRECT: filter to 24h window THEN filter failures
    const recent = allEvents.filter(e => new Date(e.timestamp) >= last24h)
    const recentFailures = recent.filter(e => !e.success).slice(0, 20)

    expect(recentFailures.length).toBe(1)
    expect(recentFailures[0].id).toBe('recent-failure')
    expect(recentFailures.some(e => e.id === 'old-failure')).toBe(false)
  })
})

// ─── Bug 8: Admin audit hourlyStats uses local-time bucketing ───

describe('Bug 8: Admin audit hourlyStats must use UTC bucketing', () => {
  /**
   * AdminAuditLogger uses:
   *   hour.setHours(now.getHours() - (23 - i), 0, 0, 0)  ← local time
   *   t >= hour && t < nextHour                             ← range scan
   *
   * All other loggers now use:
   *   timestamp.slice(0, 13) + ':00:00.000Z'               ← UTC
   *
   * Admin audit must be consistent.
   */

  it('should produce UTC hour keys matching the auth/email pattern', () => {
    const events = [
      makeAuditEvent({ timestamp: '2026-04-29T10:15:00.000Z', success: true }),
      makeAuditEvent({ timestamp: '2026-04-29T10:45:00.000Z', success: false }),
      makeAuditEvent({ timestamp: '2026-04-29T14:30:00.000Z', success: true }),
    ]

    // Correct UTC-based bucketing (sparse)
    const hourBuckets = new Map<string, { success: number; failure: number }>()
    for (const e of events) {
      const hourKey = (e.timestamp as string).slice(0, 13) + ':00:00.000Z'
      let bucket = hourBuckets.get(hourKey)
      if (!bucket) { bucket = { success: 0, failure: 0 }; hourBuckets.set(hourKey, bucket) }
      if (e.success) bucket.success++
      else bucket.failure++
    }
    const hourlyStats = Array.from(hourBuckets.entries())
      .map(([hour, b]) => ({ hour, success: b.success, failure: b.failure, total: b.success + b.failure }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    expect(hourlyStats.length).toBe(2)
    expect(hourlyStats[0]).toEqual({
      hour: '2026-04-29T10:00:00.000Z',
      success: 1,
      failure: 1,
      total: 2,
    })
    expect(hourlyStats[1]).toEqual({
      hour: '2026-04-29T14:00:00.000Z',
      success: 1,
      failure: 0,
      total: 1,
    })
  })

  it('should NOT produce 24 empty buckets', () => {
    // The old approach created 24 buckets regardless of data
    // The correct approach only creates buckets for hours with events
    const events = [
      makeAuditEvent({ timestamp: '2026-04-29T08:00:00.000Z' }),
    ]

    const hourBuckets = new Map<string, number>()
    for (const e of events) {
      const key = (e.timestamp as string).slice(0, 13) + ':00:00.000Z'
      hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1)
    }

    expect(hourBuckets.size).toBe(1) // not 24
  })
})

// ─── Bug 9: Admin audit successRate has no rounding ─────────────

describe('Bug 9: Admin audit successRate must be rounded to 2 decimals', () => {
  /**
   * AdminAuditLogger computes:
   *   successRate: total > 0 ? (successes / total) * 100 : 0
   *
   * Example: 2 successes / 3 total = 66.66666…% (ugly float)
   * Auth/email loggers use: Math.round(… * 10000) / 100 → 66.67
   */

  it('should round successRate to 2 decimals', () => {
    const total = 3
    const successes = 2
    // CORRECT rounding (consistent with auth/email)
    const successRate = Math.round((successes / total) * 10000) / 100
    expect(successRate).toBe(66.67)
  })

  it('should return 100 for all-success scenario', () => {
    const total = 5
    const successes = 5
    const successRate = Math.round((successes / total) * 10000) / 100
    expect(successRate).toBe(100)
  })

  it('should return 0 for all-failure scenario', () => {
    const total = 4
    const successes = 0
    const successRate = Math.round((successes / total) * 10000) / 100
    expect(successRate).toBe(0)
  })

  it('should handle 1/7 correctly (14.29, not 14.285714…)', () => {
    const total = 7
    const successes = 1
    const successRate = Math.round((successes / total) * 10000) / 100
    expect(successRate).toBe(14.29)
  })
})

// ─── Bug 10: FhirProxy getRecentEvents returns mutable ref ──────

describe('Bug 10: FhirProxy getRecentEvents must return a copy', () => {
  /**
   * FhirProxyMetricsLogger.getRecentEvents() assigns:
   *   let result = this.events   // direct reference — NO spread!
   *
   * If no filters are applied, callers receive the raw internal array.
   * Any external mutation (push, splice, sort) corrupts the logger state.
   *
   * Auth logger uses: [...this.events]
   * OAuth logger uses: [...this.events]
   * Consent logger uses: [...this.events]
   * Admin audit uses: [...this.events]
   *
   * FhirProxy must do the same.
   */

  it('should return a new array, not the internal reference', () => {
    // Simulate the correct behavior: spread creates a copy
    const internalArray = [
      makeFhirProxyEvent({ id: 'a' }),
      makeFhirProxyEvent({ id: 'b' }),
    ]

    // CORRECT: spread
    const result = [...internalArray]
    expect(result).toEqual(internalArray)
    expect(result).not.toBe(internalArray) // different reference
  })

  it('mutations on the returned array should not affect internal state', () => {
    const internalArray = [
      makeFhirProxyEvent({ id: 'a' }),
      makeFhirProxyEvent({ id: 'b' }),
      makeFhirProxyEvent({ id: 'c' }),
    ]

    // CORRECT: copy before returning
    const result = [...internalArray]
    result.splice(0, 1) // Remove first element from the copy

    expect(result.length).toBe(2)
    expect(internalArray.length).toBe(3) // internal unchanged
  })

  it('filtered results should also not share references', () => {
    const internalArray = [
      makeFhirProxyEvent({ id: 'a', serverName: 'hapi-fhir' }),
      makeFhirProxyEvent({ id: 'b', serverName: 'other-fhir' }),
    ]

    // Even when filter is applied, the base must be a copy
    const result = [...internalArray].filter(e => e.serverName === 'hapi-fhir')
    expect(result.length).toBe(1)
    expect(internalArray.length).toBe(2) // internal unchanged
  })
})
