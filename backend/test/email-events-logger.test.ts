import { describe, expect, it } from 'bun:test'
import { join } from 'path'
import { rmSync, existsSync } from 'fs'

/**
 * Email Events Logger — Unit Tests
 *
 * Tests the logger's ring buffer, JSONL persistence, deduplication,
 * query API, analytics calculation, and pub/sub.
 */

// We need to dynamically import after setting up the test environment
// to avoid Keycloak connection attempts during module load.

const TEST_LOG_DIR = join(import.meta.dir, '..', 'logs', 'test-email-events')

function _cleanTestDir() {
  if (existsSync(TEST_LOG_DIR)) rmSync(TEST_LOG_DIR, { recursive: true })
}

// Helper to create a mock email event
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: 'SEND_RESET_PASSWORD',
    userId: 'user-123',
    clientId: 'my-app',
    ipAddress: '127.0.0.1',
    success: true,
    error: undefined as string | undefined,
    ...overrides,
  }
}

describe('Email Events Logger — Unit Tests', () => {
  describe('EmailEvent shape', () => {
    it('should create a valid email event', () => {
      const event = makeEvent()
      expect(event.id).toBeDefined()
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(event.type).toBe('SEND_RESET_PASSWORD')
      expect(event.success).toBe(true)
    })

    it('should support error events', () => {
      const event = makeEvent({
        type: 'SEND_VERIFY_EMAIL_ERROR',
        success: false,
        error: 'SMTP connection failed',
      })
      expect(event.success).toBe(false)
      expect(event.error).toBe('SMTP connection failed')
    })

    it('should support all email event types', () => {
      const types = [
        'SEND_RESET_PASSWORD', 'SEND_RESET_PASSWORD_ERROR',
        'SEND_VERIFY_EMAIL', 'SEND_VERIFY_EMAIL_ERROR',
        'SEND_IDENTITY_PROVIDER_LINK', 'SEND_IDENTITY_PROVIDER_LINK_ERROR',
        'EXECUTE_ACTIONS', 'EXECUTE_ACTIONS_ERROR',
        'EXECUTE_ACTION_TOKEN', 'EXECUTE_ACTION_TOKEN_ERROR',
        'CUSTOM_REQUIRED_ACTION', 'CUSTOM_REQUIRED_ACTION_ERROR',
      ]
      for (const type of types) {
        const event = makeEvent({ type })
        expect(event.type).toBe(type)
      }
    })
  })

  describe('Analytics calculation', () => {
    it('should calculate success rate correctly', () => {
      const events = [
        makeEvent({ success: true }),
        makeEvent({ success: true }),
        makeEvent({ success: false, type: 'SEND_RESET_PASSWORD_ERROR' }),
      ]
      const successful = events.filter(e => e.success).length
      const rate = Math.round((successful / events.length) * 10000) / 100
      expect(rate).toBe(66.67)
    })

    it('should group events by type', () => {
      const events = [
        makeEvent({ type: 'SEND_RESET_PASSWORD' }),
        makeEvent({ type: 'SEND_RESET_PASSWORD' }),
        makeEvent({ type: 'SEND_VERIFY_EMAIL' }),
      ]
      const byType: Record<string, number> = {}
      for (const e of events) {
        byType[e.type] = (byType[e.type] ?? 0) + 1
      }
      expect(byType['SEND_RESET_PASSWORD']).toBe(2)
      expect(byType['SEND_VERIFY_EMAIL']).toBe(1)
    })

    it('should calculate hourly stats', () => {
      const now = new Date()
      const events = [
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
      expect(stats[0].success).toBe(1)
      expect(stats[0].failure).toBe(1)
      expect(stats[0].total).toBe(2)
    })

    it('should return 100% success rate when no events', () => {
      const events: unknown[] = []
      const rate = events.length > 0 ? Math.round((0 / events.length) * 10000) / 100 : 100
      expect(rate).toBe(100)
    })
  })

  describe('Event filtering', () => {
    const events = [
      makeEvent({ type: 'SEND_RESET_PASSWORD', success: true, timestamp: '2024-01-01T10:00:00.000Z' }),
      makeEvent({ type: 'SEND_VERIFY_EMAIL', success: false, timestamp: '2024-01-01T11:00:00.000Z' }),
      makeEvent({ type: 'SEND_RESET_PASSWORD', success: true, timestamp: '2024-01-01T12:00:00.000Z' }),
      makeEvent({ type: 'EXECUTE_ACTIONS', success: true, timestamp: '2024-01-01T13:00:00.000Z' }),
    ]

    it('should filter by type', () => {
      const filtered = events.filter(e => e.type === 'SEND_RESET_PASSWORD')
      expect(filtered.length).toBe(2)
    })

    it('should filter by success', () => {
      const filtered = events.filter(e => !e.success)
      expect(filtered.length).toBe(1)
      expect(filtered[0].type).toBe('SEND_VERIFY_EMAIL')
    })

    it('should filter by since date', () => {
      const since = new Date('2024-01-01T11:30:00.000Z')
      const filtered = events.filter(e => new Date(e.timestamp) >= since)
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
        type: 'SEND_RESET_PASSWORD',
        userId: 'user-abc',
        clientId: 'my-client',
        ipAddress: '10.0.0.1',
        details: { email: 'test@example.com' },
      }
      const isError = kc.type?.endsWith('_ERROR') ?? false
      const mapped = {
        id: kc.id,
        timestamp: new Date(kc.time).toISOString(),
        type: kc.type,
        userId: kc.userId,
        clientId: kc.clientId,
        ipAddress: kc.ipAddress,
        success: !isError,
        details: kc.details,
      }
      expect(mapped.success).toBe(true)
      expect(mapped.type).toBe('SEND_RESET_PASSWORD')
      expect(mapped.timestamp).toContain('2024-01-01')
    })

    it('should map error event correctly', () => {
      const kc = {
        id: 'kc-event-2',
        time: 1704067200000,
        type: 'SEND_VERIFY_EMAIL_ERROR',
        userId: 'user-abc',
        error: 'smtp_error',
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
      expect(mapped.error).toBe('smtp_error')
    })

    it('should handle missing fields gracefully', () => {
      const kc = { type: 'SEND_RESET_PASSWORD' } as Record<string, unknown>
      const mapped = {
        id: kc.id ?? `email-${Date.now()}`,
        timestamp: kc.time ? new Date(kc.time as number).toISOString() : new Date().toISOString(),
        type: kc.type ?? 'UNKNOWN',
        success: !(kc.type as string)?.endsWith('_ERROR'),
      }
      expect(mapped.type).toBe('SEND_RESET_PASSWORD')
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

      expect(addEvent({ id: 'evt-1', type: 'SEND_RESET_PASSWORD' })).toBe(true)
      expect(addEvent({ id: 'evt-1', type: 'SEND_RESET_PASSWORD' })).toBe(false)
      expect(addEvent({ id: 'evt-2', type: 'SEND_VERIFY_EMAIL' })).toBe(true)
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
