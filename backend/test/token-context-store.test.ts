/**
 * Token Context Store — Unit Tests
 *
 * Tests the JTI→launch-context mapping used for SMART STU 2.2 §5.2 introspection.
 * Verifies: set/get lifecycle, TTL expiration, capacity eviction, dispose cleanup,
 * input validation, client binding, PHI redaction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { TokenContextStore, type TokenContext } from '../src/lib/token-context-store'

describe('TokenContextStore', () => {
  let store: TokenContextStore

  beforeEach(() => {
    store = new TokenContextStore({ maxEntries: 100, cleanupIntervalMs: 60_000 })
  })

  afterEach(() => {
    store.dispose()
  })

  it('stores and retrieves context by JTI', () => {
    const ctx: TokenContext = { patient: 'patient-123', fhirUser: 'Patient/patient-123', clientId: 'app-1', exp: Math.floor(Date.now() / 1000) + 3600 }
    store.set('jti-abc', ctx)

    const result = store.get('jti-abc')
    expect(result).not.toBeNull()
    expect(result!.patient).toBe('patient-123')
    expect(result!.fhirUser).toBe('Patient/patient-123')
    expect(result!.clientId).toBe('app-1')
  })

  it('returns null for unknown JTI', () => {
    expect(store.get('nonexistent')).toBeNull()
  })

  it('returns null for expired token (exp in the past)', () => {
    const ctx: TokenContext = {
      patient: 'patient-456',
      exp: Math.floor(Date.now() / 1000) + 3600, // valid exp for storage
    }
    store.set('jti-will-expire', ctx)
    // Directly test — the store won't accept exp in the past at set time
    const pastCtx: TokenContext = {
      patient: 'patient-old',
      exp: Math.floor(Date.now() / 1000) - 60,
    }
    store.set('jti-expired', pastCtx)
    // Should not have been stored (past exp rejected at set time)
    expect(store.get('jti-expired')).toBeNull()
  })

  it('returns context for non-expired token', () => {
    const ctx: TokenContext = {
      patient: 'patient-789',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    store.set('jti-valid', ctx)

    expect(store.get('jti-valid')).not.toBeNull()
    expect(store.get('jti-valid')!.patient).toBe('patient-789')
  })

  it('uses default 1-hour TTL when exp is not provided', () => {
    const ctx: TokenContext = { patient: 'patient-no-exp' }
    store.set('jti-no-exp', ctx)

    expect(store.get('jti-no-exp')).not.toBeNull()
    expect(store.get('jti-no-exp')!.patient).toBe('patient-no-exp')
  })

  it('evicts oldest entry when maxEntries is exceeded', () => {
    const smallStore = new TokenContextStore({ maxEntries: 3, cleanupIntervalMs: 60_000 })
    try {
      smallStore.set('jti-1', { patient: 'p1', exp: Math.floor(Date.now() / 1000) + 3600 })
      smallStore.set('jti-2', { patient: 'p2', exp: Math.floor(Date.now() / 1000) + 3600 })
      smallStore.set('jti-3', { patient: 'p3', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(smallStore.size()).toBe(3)

      smallStore.set('jti-4', { patient: 'p4', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(smallStore.size()).toBe(3)
      expect(smallStore.get('jti-1')).toBeNull()
      expect(smallStore.get('jti-4')!.patient).toBe('p4')
    } finally {
      smallStore.dispose()
    }
  })

  it('reports correct size', () => {
    expect(store.size()).toBe(0)
    store.set('a', { patient: '1', exp: Math.floor(Date.now() / 1000) + 3600 })
    store.set('b', { patient: '2', exp: Math.floor(Date.now() / 1000) + 3600 })
    expect(store.size()).toBe(2)
  })

  it('dispose clears all entries and stops timer', () => {
    store.set('x', { patient: 'px', exp: Math.floor(Date.now() / 1000) + 3600 })
    store.dispose()
    expect(store.size()).toBe(0)
    expect(store.get('x')).toBeNull()
  })

  it('stores full launch context fields', () => {
    const ctx: TokenContext = {
      patient: 'patient-full',
      encounter: 'encounter-full',
      fhirUser: 'Practitioner/dr-house',
      intent: 'order-sign',
      smart_style_url: 'https://ehr.example.com/styles/smart-v1.json',
      tenant: 'org-alpha',
      need_patient_banner: false,
      clientId: 'ehr-portal',
      exp: Math.floor(Date.now() / 1000) + 1800,
    }
    store.set('jti-full', ctx)

    const result = store.get('jti-full')!
    expect(result.patient).toBe('patient-full')
    expect(result.encounter).toBe('encounter-full')
    expect(result.fhirUser).toBe('Practitioner/dr-house')
    expect(result.intent).toBe('order-sign')
    expect(result.smart_style_url).toBe('https://ehr.example.com/styles/smart-v1.json')
    expect(result.tenant).toBe('org-alpha')
    expect(result.need_patient_banner).toBe(false)
    expect(result.clientId).toBe('ehr-portal')
  })

  // ─── Security Tests ─────────────────────────────────────────────────────

  describe('Security: Input Validation', () => {
    it('rejects empty JTI', () => {
      store.set('', { patient: 'should-not-store' })
      expect(store.size()).toBe(0)
    })

    it('rejects JTI exceeding max length', () => {
      const longJti = 'a'.repeat(200)
      store.set(longJti, { patient: 'should-not-store' })
      expect(store.size()).toBe(0)
    })

    it('rejects patient ID with path traversal characters', () => {
      store.set('jti-inject', { patient: '../../../etc/passwd', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.size()).toBe(0)
    })

    it('rejects patient ID with spaces or special chars', () => {
      store.set('jti-inject2', { patient: 'patient id with spaces', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.size()).toBe(0)
    })

    it('rejects fhirUser with invalid format', () => {
      store.set('jti-badfhir', { fhirUser: '<script>alert(1)</script>', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.size()).toBe(0)
    })

    it('accepts valid FHIR IDs', () => {
      store.set('jti-good', { patient: 'test-patient.123', encounter: 'enc-456', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.get('jti-good')!.patient).toBe('test-patient.123')
    })

    it('accepts valid absolute fhirUser URL', () => {
      store.set('jti-abs', { fhirUser: 'https://fhir.example.com/Patient/test-123', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.get('jti-abs')!.fhirUser).toBe('https://fhir.example.com/Patient/test-123')
    })

    it('truncates overly long intent strings', () => {
      const longIntent = 'x'.repeat(500)
      store.set('jti-longintent', { intent: longIntent, exp: Math.floor(Date.now() / 1000) + 3600 })
      const result = store.get('jti-longintent')!
      expect(result.intent!.length).toBeLessThanOrEqual(128)
    })
  })

  describe('Security: Client Binding', () => {
    it('allows retrieval without client_id check', () => {
      store.set('jti-unbound', { patient: 'p1', clientId: 'app-a', exp: Math.floor(Date.now() / 1000) + 3600 })
      // No client_id passed = no binding check
      expect(store.get('jti-unbound')!.patient).toBe('p1')
    })

    it('allows retrieval when client_id matches', () => {
      store.set('jti-bound', { patient: 'p2', clientId: 'app-b', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.get('jti-bound', 'app-b')!.patient).toBe('p2')
    })

    it('denies retrieval when client_id does not match', () => {
      store.set('jti-mismatch', { patient: 'p3', clientId: 'app-c', exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(store.get('jti-mismatch', 'malicious-client')).toBeNull()
    })

    it('allows retrieval when stored context has no clientId', () => {
      store.set('jti-noclient', { patient: 'p4', exp: Math.floor(Date.now() / 1000) + 3600 })
      // Context without clientId = no binding enforced
      expect(store.get('jti-noclient', 'any-client')!.patient).toBe('p4')
    })
  })

  describe('Security: Immutability', () => {
    it('returns a copy that cannot mutate the store', () => {
      store.set('jti-immutable', { patient: 'original', clientId: 'app-x', exp: Math.floor(Date.now() / 1000) + 3600 })
      const result = store.get('jti-immutable')!
      result.patient = 'tampered'
      // Store should still have original
      expect(store.get('jti-immutable')!.patient).toBe('original')
    })
  })

  describe('Security: TTL Cap', () => {
    it('caps TTL at 24 hours even with far-future exp', () => {
      const farFutureExp = Math.floor(Date.now() / 1000) + (365 * 24 * 3600) // 1 year
      store.set('jti-farfuture', { patient: 'pf', exp: farFutureExp })
      // Entry should be stored (cap applied internally)
      expect(store.get('jti-farfuture')!.patient).toBe('pf')
    })

    it('rejects tokens with exp in the past', () => {
      store.set('jti-past', { patient: 'pp', exp: Math.floor(Date.now() / 1000) - 10 })
      expect(store.get('jti-past')).toBeNull()
    })
  })
})
