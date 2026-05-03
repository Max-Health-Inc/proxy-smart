/**
 * callback-handler.test.ts — TDD for patient-picker gate
 *
 * Bug: A Patient user (fhirUser = "Patient/X") should NEVER see the patient picker.
 * Even when autoResolvePatient fails (returns null), the callback handler should
 * fall back to the session's fhirUser attribute to auto-set the patient.
 */

import { describe, test, expect } from 'bun:test'
import { handleCallback, type CallbackParams, type CallbackHandlerDeps } from './callback-handler'
import { MemoryStore } from './stores/memory'
import type { LaunchSession, SmartProxyConfig } from './types'

const BASE_CONFIG: SmartProxyConfig = {
  baseUrl: 'https://proxy.example.com',
  launchCodeSecret: 'test-secret-key-for-testing-only',
}

function makeSession(overrides: Partial<LaunchSession> = {}): LaunchSession {
  return {
    clientRedirectUri: 'https://app.example.com/callback',
    clientState: 'abc123',
    clientId: 'patient-portal',
    scope: 'openid fhirUser patient/*.rs launch/patient',
    needsPatientPicker: true,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('callback-handler: patient picker gate', () => {
  test('Patient user: skips picker when autoResolvePatient succeeds', async () => {
    const store = new MemoryStore()
    const session = makeSession({ needsPatientPicker: true })
    store.set('session-key', session)

    const deps: CallbackHandlerDeps = {
      config: BASE_CONFIG,
      store,
      autoResolvePatient: async () => 'max-nussbaumer',
    }

    const params: CallbackParams = { state: 'session-key', code: 'auth-code-123' }
    const { result } = await handleCallback(params, deps)

    // Should forward to client, NOT to picker
    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
    expect(result.type === 'redirect' && result.url).not.toContain('patient-picker')

    // Session should have patient set
    const updated = store.get('session-key')
    expect(updated?.patient).toBe('max-nussbaumer')
    expect(updated?.needsPatientPicker).toBe(false)
  })

  test('Patient user: skips picker even when autoResolvePatient FAILS (returns null) — uses session fhirUser', async () => {
    const store = new MemoryStore()
    const session = makeSession({
      needsPatientPicker: true,
      fhirUser: 'Patient/max-nussbaumer', // This is populated from Keycloak protocol mapper
    })
    store.set('session-key', session)

    const deps: CallbackHandlerDeps = {
      config: BASE_CONFIG,
      store,
      // Simulates Keycloak admin API failure — returns null
      autoResolvePatient: async () => null,
    }

    const params: CallbackParams = { state: 'session-key', code: 'auth-code-123' }
    const { result } = await handleCallback(params, deps)

    // Should STILL forward to client, NOT show picker
    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
    expect(result.type === 'redirect' && result.url).not.toContain('patient-picker')

    // Session should have patient auto-resolved from fhirUser
    const updated = store.get('session-key')
    expect(updated?.patient).toBe('max-nussbaumer')
    expect(updated?.needsPatientPicker).toBe(false)
  })

  test('Patient user: skips picker when NO autoResolvePatient hook provided — uses session fhirUser', async () => {
    const store = new MemoryStore()
    const session = makeSession({
      needsPatientPicker: true,
      fhirUser: 'Patient/max-nussbaumer',
    })
    store.set('session-key', session)

    const deps: CallbackHandlerDeps = {
      config: BASE_CONFIG,
      store,
      // No autoResolvePatient hook at all
    }

    const params: CallbackParams = { state: 'session-key', code: 'auth-code-123' }
    const { result } = await handleCallback(params, deps)

    // Should forward to client, NOT show picker
    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
    expect(result.type === 'redirect' && result.url).not.toContain('patient-picker')

    const updated = store.get('session-key')
    expect(updated?.patient).toBe('max-nussbaumer')
    expect(updated?.needsPatientPicker).toBe(false)
  })

  test('Practitioner user: STILL shows picker when autoResolvePatient fails', async () => {
    const store = new MemoryStore()
    const session = makeSession({
      needsPatientPicker: true,
      fhirUser: 'Practitioner/example-practitioner',
    })
    store.set('session-key', session)

    const deps: CallbackHandlerDeps = {
      config: BASE_CONFIG,
      store,
      autoResolvePatient: async () => null,
    }

    const params: CallbackParams = { state: 'session-key', code: 'auth-code-123' }
    const { result } = await handleCallback(params, deps)

    // Practitioner SHOULD see the picker
    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('patient-picker')
  })

  test('No fhirUser on session: shows picker when autoResolvePatient fails', async () => {
    const store = new MemoryStore()
    const session = makeSession({
      needsPatientPicker: true,
      // No fhirUser set
    })
    store.set('session-key', session)

    const deps: CallbackHandlerDeps = {
      config: BASE_CONFIG,
      store,
      autoResolvePatient: async () => null,
    }

    const params: CallbackParams = { state: 'session-key', code: 'auth-code-123' }
    const { result } = await handleCallback(params, deps)

    // No fhirUser → still needs picker
    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('patient-picker')
  })
})
