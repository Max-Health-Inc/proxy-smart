// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Shared BaseEventsLogger test suite.
 *
 * The auth and email logger suites used to be the same assertions twice over,
 * written against inline reimplementations of the logger rather than against the
 * logger. This drives the real class: a concrete subclass over a temp log dir
 * exercises loading, the ring buffer, the query API, analytics and pub/sub, and
 * each logger contributes its own Keycloak mapper to the mapping cases.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { join } from 'path'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import {
  BaseEventsLogger,
  RING_BUFFER_SIZE,
  type BaseAnalytics,
  type BaseEvent,
  type KeycloakEvent,
} from '../../src/lib/base-events-logger'

interface TestEvent extends BaseEvent {
  clientId?: string
  userId?: string
}

interface TestAnalytics extends BaseAnalytics {
  topClients: Array<{ clientId: string; count: number }>
}

/** Concrete logger over a disposable directory, so the real load path runs. */
class HarnessLogger extends BaseEventsLogger<TestEvent, TestAnalytics> {
  constructor(subdir: string) {
    super({
      logSubdir: subdir,
      logFilename: 'events.jsonl',
      eventTypes: ['LOGIN', 'LOGIN_ERROR'],
      logChannel: 'auth',
      idPrefix: 'test',
      mapEvent: (kc: KeycloakEvent): TestEvent => ({
        id: kc.id ?? 'generated',
        timestamp: new Date(kc.time ?? 0).toISOString(),
        type: kc.type ?? 'UNKNOWN',
        success: !(kc.type?.endsWith('_ERROR') ?? false),
      }),
    })
  }

  protected computeAnalytics(recent: TestEvent[]): TestAnalytics {
    const counts = new Map<string, number>()
    for (const e of recent) {
      if (e.clientId) counts.set(e.clientId, (counts.get(e.clientId) ?? 0) + 1)
    }
    return {
      ...this.computeBaseAnalytics(recent),
      topClients: Array.from(counts.entries())
        .map(([clientId, count]) => ({ clientId, count }))
        .sort((a, b) => b.count - a.count),
    }
  }
}

function event(overrides: Partial<TestEvent> = {}): TestEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    type: 'LOGIN',
    success: true,
    ...overrides,
  }
}

/** Seed a JSONL log the way the poller would have written it, newest last. */
function seed(dir: string, events: TestEvent[]): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8')
}

/** Shared machinery: everything BaseEventsLogger does for every logger. */
export function runBaseEventsLoggerSuite(): void {
  describe('BaseEventsLogger', () => {
    let dir: string
    let subdir: string

    beforeEach(() => {
      subdir = `test-events-${Math.random().toString(36).slice(2, 10)}`
      dir = join(process.cwd(), 'logs', subdir)
    })

    afterEach(() => {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    })

    describe('loading persisted events', () => {
      it('loads events from the JSONL log, newest first', async () => {
        seed(dir, [
          event({ id: 'old', timestamp: '2024-01-01T10:00:00.000Z' }),
          event({ id: 'new', timestamp: '2024-01-01T12:00:00.000Z' }),
        ])
        const log = new HarnessLogger(subdir)
        await log.initialize()

        const events = log.getRecentEvents()
        expect(events.length).toBe(2)
        expect(events[0].id).toBe('new')
      })

      it('skips corrupt lines rather than failing the load', async () => {
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'events.jsonl'), `${JSON.stringify(event({ id: 'good' }))}\nnot-json\n`, 'utf8')
        const log = new HarnessLogger(subdir)
        await log.initialize()

        expect(log.getRecentEvents().map(e => e.id)).toEqual(['good'])
      })

      it('starts empty when no log file exists', async () => {
        const log = new HarnessLogger(subdir)
        await log.initialize()
        expect(log.getRecentEvents()).toEqual([])
      })

      it('caps the ring buffer at its size', async () => {
        seed(dir, Array.from({ length: RING_BUFFER_SIZE + 50 }, (_, i) =>
          event({ id: `evt-${i}`, timestamp: new Date(Date.now() + i * 1000).toISOString() })))
        const log = new HarnessLogger(subdir)
        await log.initialize()

        expect(log.getRecentEvents().length).toBe(RING_BUFFER_SIZE)
      })
    })

    describe('query API', () => {
      let log: HarnessLogger

      beforeEach(async () => {
        seed(dir, [
          event({ id: 'a', type: 'LOGIN', success: true, timestamp: '2024-01-01T10:00:00.000Z' }),
          event({ id: 'b', type: 'LOGIN_ERROR', success: false, timestamp: '2024-01-01T11:00:00.000Z' }),
          event({ id: 'c', type: 'LOGIN', success: true, timestamp: '2024-01-01T12:00:00.000Z' }),
        ])
        log = new HarnessLogger(subdir)
        await log.initialize()
      })

      it('filters by type', () => {
        expect(log.getRecentEvents({ type: 'LOGIN' }).length).toBe(2)
      })

      it('treats type "all" as no filter', () => {
        expect(log.getRecentEvents({ type: 'all' }).length).toBe(3)
      })

      it('filters by success', () => {
        const failed = log.getRecentEvents({ success: false })
        expect(failed.length).toBe(1)
        expect(failed[0].id).toBe('b')
      })

      it('filters by since', () => {
        expect(log.getRecentEvents({ since: new Date('2024-01-01T10:30:00.000Z') }).length).toBe(2)
      })

      it('limits results', () => {
        expect(log.getRecentEvents({ limit: 2 }).length).toBe(2)
      })

      it('returns a copy, so callers cannot mutate the buffer', () => {
        log.getRecentEvents().push(event({ id: 'injected' }))
        expect(log.getRecentEvents().some(e => e.id === 'injected')).toBe(false)
      })
    })

    describe('analytics', () => {
      it('computes success rate, counts by type and hourly buckets', async () => {
        const now = new Date().toISOString()
        seed(dir, [
          event({ type: 'LOGIN', success: true, timestamp: now }),
          event({ type: 'LOGIN', success: true, timestamp: now }),
          event({ type: 'LOGIN_ERROR', success: false, timestamp: now }),
        ])
        const log = new HarnessLogger(subdir)
        await log.initialize()

        const analytics = log.getAnalytics()
        expect(analytics).not.toBeNull()
        expect(analytics!.totalEvents).toBe(3)
        expect(analytics!.successRate).toBe(66.67)
        expect(analytics!.eventsByType['LOGIN']).toBe(2)
        expect(analytics!.eventsByType['LOGIN_ERROR']).toBe(1)
        expect(analytics!.hourlyStats.length).toBe(1)
        expect(analytics!.hourlyStats[0]).toMatchObject({ success: 2, failure: 1, total: 3 })
      })

      it('reports 100% success rate when there are no events', async () => {
        const log = new HarnessLogger(subdir)
        await log.initialize()
        expect(log.getAnalytics()!.successRate).toBe(100)
      })

      it('counts only the last 24 hours', async () => {
        seed(dir, [
          event({ timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }),
          event({ timestamp: new Date().toISOString() }),
        ])
        const log = new HarnessLogger(subdir)
        await log.initialize()

        expect(log.getAnalytics()!.totalEvents).toBe(1)
      })

      it('ranks top clients by event count', async () => {
        const now = new Date().toISOString()
        seed(dir, [
          event({ clientId: 'app-a', timestamp: now }),
          event({ clientId: 'app-a', timestamp: now }),
          event({ clientId: 'app-a', timestamp: now }),
          event({ clientId: 'app-b', timestamp: now }),
          event({ clientId: 'app-b', timestamp: now }),
          event({ clientId: 'app-c', timestamp: now }),
        ])
        const log = new HarnessLogger(subdir)
        await log.initialize()

        expect(log.getAnalytics()!.topClients).toEqual([
          { clientId: 'app-a', count: 3 },
          { clientId: 'app-b', count: 2 },
          { clientId: 'app-c', count: 1 },
        ])
      })
    })

    describe('subscriptions', () => {
      it('stops delivering analytics after unsubscribe', async () => {
        const log = new HarnessLogger(subdir)
        let calls = 0
        const unsubscribe = log.subscribeAnalytics(() => { calls++ })

        await log.initialize()
        const afterInit = calls
        expect(afterInit).toBeGreaterThan(0)

        unsubscribe()
        const second = new HarnessLogger(subdir)
        await second.initialize()
        expect(calls).toBe(afterInit)
      })

      it('hands back a working unsubscribe for events', () => {
        const log = new HarnessLogger(subdir)
        const unsubscribe = log.subscribe(() => {})
        expect(typeof unsubscribe).toBe('function')
        expect(() => unsubscribe()).not.toThrow()
      })
    })
  })
}

/** Per-logger cases: the Keycloak mapping each concrete logger contributes. */
export interface MapperSuiteConfig<T extends BaseEvent> {
  name: string
  mapEvent: (kc: KeycloakEvent) => T
  successType: string
  errorType: string
  /** Every event type this logger polls for */
  eventTypes: string[]
}

export function runKeycloakMapperSuite<T extends BaseEvent>(cfg: MapperSuiteConfig<T>): void {
  describe(`${cfg.name} — Keycloak event mapping`, () => {
    it('maps a success event', () => {
      const mapped = cfg.mapEvent({
        id: 'kc-1',
        time: 1704067200000,
        type: cfg.successType,
        userId: 'user-abc',
        clientId: 'my-client',
        ipAddress: '10.0.0.1',
        details: { auth_method: 'openid-connect' },
      })

      expect(mapped.id).toBe('kc-1')
      expect(mapped.type).toBe(cfg.successType)
      expect(mapped.success).toBe(true)
      expect(mapped.timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('maps an _ERROR type to a failure', () => {
      const mapped = cfg.mapEvent({ id: 'kc-2', time: 1704067200000, type: cfg.errorType })
      expect(mapped.success).toBe(false)
    })

    it('treats an error string as a failure even on a success type', () => {
      const mapped = cfg.mapEvent({ id: 'kc-3', type: cfg.successType, error: 'invalid_user_credentials' })
      expect(mapped.success).toBe(false)
    })

    it('generates an id and timestamp when Keycloak omits them', () => {
      const mapped = cfg.mapEvent({ type: cfg.successType })
      expect(mapped.id).toBeTruthy()
      expect(mapped.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('falls back to UNKNOWN for a typeless event', () => {
      expect(cfg.mapEvent({ id: 'kc-4' }).type).toBe('UNKNOWN')
    })

    it('classifies every polled type consistently with its name', () => {
      for (const type of cfg.eventTypes) {
        expect(cfg.mapEvent({ id: `kc-${type}`, type }).success).toBe(!type.endsWith('_ERROR'))
      }
    })
  })
}
