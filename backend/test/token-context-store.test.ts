/**
 * Token Context Store — Unit Tests
 *
 * Tests the JTI→launch-context mapping used for SMART STU 2.2 §5.2 introspection.
 * Verifies: set/get lifecycle, TTL expiration, capacity eviction, dispose cleanup.
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
    const ctx: TokenContext = { patient: 'patient-123', fhirUser: 'Patient/patient-123', clientId: 'app-1' }
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
      exp: Math.floor(Date.now() / 1000) - 60, // expired 60 seconds ago
    }
    store.set('jti-expired', ctx)

    expect(store.get('jti-expired')).toBeNull()
  })

  it('returns context for non-expired token', () => {
    const ctx: TokenContext = {
      patient: 'patient-789',
      exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
    }
    store.set('jti-valid', ctx)

    expect(store.get('jti-valid')).not.toBeNull()
    expect(store.get('jti-valid')!.patient).toBe('patient-789')
  })

  it('uses default 1-hour TTL when exp is not provided', () => {
    const ctx: TokenContext = { patient: 'patient-no-exp' }
    store.set('jti-no-exp', ctx)

    // Should still be retrievable (within the 1-hour default)
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

      // Adding a 4th should evict jti-1
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
})
