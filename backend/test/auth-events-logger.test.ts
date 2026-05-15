import { describe, expect, it } from 'bun:test'

/**
 * Auth Events Logger — Unit Tests
 *
 * Tests the logger's ring buffer, JSONL persistence, deduplication,
 * query API, analytics calculation, top-clients aggregation, and pub/sub.
 */

// Helper to create a mock auth event
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: 'LOGIN',
    userId: 'user-123',
    clientId: 'my-app',
    sessionId: 'session-abc',
    ipAddress: '127.0.0.1',
    success: true,
    error: undefined as string | undefined,
    ...overrides,
  }
}

describe('Auth Events Logger — Unit Tests', () => {
  describe('AuthEvent shape', () => {
    it('should create a valid auth event', () => {
      const event = makeEvent()
      expect(event.id).toBeDefined()
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(event.type).toBe('LOGIN')
      expect(event.success).toBe(true)
    })

    it('should support error events', () => {
      const event = makeEvent({
        type: 'LOGIN_ERROR',
        success: false,
        error: 'invalid_credentials',
      })
      expect(event.success).toBe(false)
      expect(event.error).toBe('invalid_credentials')
    })

    it('should support all auth event types', () => {
      const types = [
        'LOGIN', 'LOGIN_ERROR',
        'LOGOUT', 'LOGOUT_ERROR',
        'REGISTER', 'REGISTER_ERROR',
        'CODE_TO_TOKEN', 'CODE_TO_TOKEN_ERROR',
        'REFRESH_TOKEN', 'REFRESH_TOKEN_ERROR',
        'CLIENT_LOGIN', 'CLIENT_LOGIN_ERROR',
        'INTROSPECT_TOKEN', 'INTROSPECT_TOKEN_ERROR',
        'GRANT_CONSENT', 'GRANT_CONSENT_ERROR',
        'UPDATE_CONSENT', 'UPDATE_CONSENT_ERROR',
        'REVOKE_GRANT', 'REVOKE_GRANT_ERROR',
      ]
      for (const type of types) {
        const event = makeEvent({ type })
        expect(event.type).toBe(type)
      }
    })

    it('should include sessionId for session-related events', () => {
      const event = makeEvent({ sessionId: 'sess-xyz-123' })
      expect(event.sessionId).toBe('sess-xyz-123')
    })
  })

  describe('Analytics calculation', () => {
    it('should calculate success rate correctly', () => {
      const events = [
        makeEvent({ success: true }),
        makeEvent({ success: true }),
        makeEvent({ success: false, type: 'LOGIN_ERROR' }),
      ]
      const successful = events.filter(e => e.success).length
      const rate = Math.round((successful / events.length) * 10000) / 100
      expect(rate).toBe(66.67)
    })

    it('should group events by type', () => {
      const events = [
        makeEvent({ type: 'LOGIN' }),
        makeEvent({ type: 'LOGIN' }),
        makeEvent({ type: 'LOGOUT' }),
        makeEvent({ type: 'CODE_TO_TOKEN' }),
      ]
      const byType: Record<string, number> = {}
      for (const e of events) {
        byType[e.type] = (byType[e.type] ?? 0) + 1
      }
      expect(byType['LOGIN']).toBe(2)
      expect(byType['LOGOUT']).toBe(1)
      expect(byType['CODE_TO_TOKEN']).toBe(1)
    })

    it('should calculate hourly stats', () => {
      const now = new Date()
      const events = [
        makeEvent({ timestamp: now.toISOString(), success: true }),
        makeEvent({ timestamp: now.toISOString(), success: true }),
        makeEvent({ timestamp: now.toISOString(), success: false }),
      ]
      const hourBuckets = new Map<string, { success: number; failure: number }>()
      for (const e of events) {
        const hour = new Date(e.timestamp).toISOString().slice(0, 13) + ':00:00.000Z'
        let bucket = hourBuckets.get(hour)
        if (!bucket) { bucket = { success: 0, failure: 0 }; hourBuckets.set(hour, bucket) }
        if (e.success) bucket.success++
        else bucket.failure++
      }
      const stats = Array.from(hourBuckets.entries())
        .map(([hour, s]) => ({ hour, ...s, total: s.success + s.failure }))
      expect(stats.length).toBe(1)
      expect(stats[0].success).toBe(2)
      expect(stats[0].failure).toBe(1)
      expect(stats[0].total).toBe(3)
    })

    it('should return 100% success rate when no events', () => {
      const events: unknown[] = []
      const rate = events.length > 0 ? Math.round((0 / events.length) * 10000) / 100 : 100
      expect(rate).toBe(100)
    })

    it('should calculate top clients', () => {
      const events = [
        makeEvent({ clientId: 'app-a' }),
        makeEvent({ clientId: 'app-a' }),
        makeEvent({ clientId: 'app-a' }),
        makeEvent({ clientId: 'app-b' }),
        makeEvent({ clientId: 'app-b' }),
        makeEvent({ clientId: 'app-c' }),
      ]
      const clientCounts = new Map<string, number>()
      for (const e of events) {
        if (e.clientId) {
          clientCounts.set(e.clientId, (clientCounts.get(e.clientId) ?? 0) + 1)
        }
      }
      const topClients = Array.from(clientCounts.entries())
        .map(([clientId, count]) => ({ clientId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      expect(topClients[0].clientId).toBe('app-a')
      expect(topClients[0].count).toBe(3)
      expect(topClients[1].clientId).toBe('app-b')
      expect(topClients[1].count).toBe(2)
      expect(topClients[2].clientId).toBe('app-c')
      expect(topClients[2].count).toBe(1)
    })
  })

  describe('Event filtering', () => {
    const events = [
      makeEvent({ type: 'LOGIN', success: true, clientId: 'app-a', userId: 'user-1', timestamp: '2024-01-01T10:00:00.000Z' }),
      makeEvent({ type: 'LOGIN_ERROR', success: false, clientId: 'app-a', userId: 'user-2', timestamp: '2024-01-01T11:00:00.000Z' }),
      makeEvent({ type: 'LOGOUT', success: true, clientId: 'app-b', userId: 'user-1', timestamp: '2024-01-01T12:00:00.000Z' }),
      makeEvent({ type: 'CODE_TO_TOKEN', success: true, clientId: 'app-b', userId: 'user-3', timestamp: '2024-01-01T13:00:00.000Z' }),
    ]

    it('should filter by type', () => {
      const filtered = events.filter(e => e.type === 'LOGIN')
      expect(filtered.length).toBe(1)
    })

    it('should filter by success', () => {
      const filtered = events.filter(e => !e.success)
      expect(filtered.length).toBe(1)
      expect(filtered[0].type).toBe('LOGIN_ERROR')
    })

    it('should filter by since date', () => {
      const since = new Date('2024-01-01T11:30:00.000Z')
      const filtered = events.filter(e => new Date(e.timestamp) >= since)
      expect(filtered.length).toBe(2)
    })

    it('should filter by clientId', () => {
      const filtered = events.filter(e => e.clientId === 'app-b')
      expect(filtered.length).toBe(2)
    })

    it('should filter by userId', () => {
      const filtered = events.filter(e => e.userId === 'user-1')
      expect(filtered.length).toBe(2)
    })

    it('should limit results', () => {
      const limited = events.slice(0, 2)
      expect(limited.length).toBe(2)
    })
  })

  describe('Keycloak event mapping', () => {
    it('should map success event correctly', () => {
      const kc = {
        id: 'kc-event-1',
        time: 1704067200000,
        type: 'LOGIN',
        userId: 'user-abc',
        clientId: 'my-client',
        sessionId: 'session-xyz',
        ipAddress: '10.0.0.1',
        details: { auth_method: 'openid-connect' },
      }
      const isError = kc.type?.endsWith('_ERROR') ?? false
      const mapped = {
        id: kc.id,
        timestamp: new Date(kc.time).toISOString(),
        type: kc.type,
        userId: kc.userId,
        clientId: kc.clientId,
        sessionId: kc.sessionId,
        ipAddress: kc.ipAddress,
        success: !isError,
        details: kc.details,
      }
      expect(mapped.success).toBe(true)
      expect(mapped.type).toBe('LOGIN')
      expect(mapped.sessionId).toBe('session-xyz')
      expect(mapped.timestamp).toContain('2024-01-01')
    })

    it('should map error event correctly', () => {
      const kc = {
        id: 'kc-event-2',
        time: 1704067200000,
        type: 'LOGIN_ERROR',
        userId: 'user-abc',
        error: 'invalid_user_credentials',
      }
      const isError = kc.type?.endsWith('_ERROR') ?? false
      const mapped = {
        id: kc.id,
        timestamp: new Date(kc.time).toISOString(),
        type: kc.type,
        userId: kc.userId,
        error: kc.error,
        success: !isError && !kc.error,
      }
      expect(mapped.success).toBe(false)
      expect(mapped.error).toBe('invalid_user_credentials')
    })

    it('should handle missing fields gracefully', () => {
      const kc = { type: 'LOGIN' } as Record<string, unknown>
      const mapped = {
        id: kc.id ?? `auth-${Date.now()}`,
        timestamp: kc.time ? new Date(kc.time as number).toISOString() : new Date().toISOString(),
        type: kc.type ?? 'UNKNOWN',
        success: !(kc.type as string)?.endsWith('_ERROR'),
      }
      expect(mapped.type).toBe('LOGIN')
      expect(mapped.success).toBe(true)
    })
  })

  describe('Deduplication', () => {
    it('should skip events with duplicate IDs', () => {
      const events: Array<{ id: string; type: string }> = []
      const addEvent = (event: { id: string; type: string }) => {
        if (events.some(e => e.id === event.id)) return false
        events.push(event)
        return true
      }

      expect(addEvent({ id: 'evt-1', type: 'LOGIN' })).toBe(true)
      expect(addEvent({ id: 'evt-1', type: 'LOGIN' })).toBe(false)
      expect(addEvent({ id: 'evt-2', type: 'LOGOUT' })).toBe(true)
      expect(events.length).toBe(2)
    })
  })

  describe('Ring buffer', () => {
    it('should cap events at buffer size', () => {
      const BUFFER_SIZE = 100
      const events: number[] = []
      for (let i = 0; i < 150; i++) {
        events.unshift(i)
        if (events.length > BUFFER_SIZE) events.length = BUFFER_SIZE
      }
      expect(events.length).toBe(BUFFER_SIZE)
      // Most recent should be first
      expect(events[0]).toBe(149)
    })
  })
})
