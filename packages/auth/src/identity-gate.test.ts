// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Turning a `Person` fhirUser into the one concrete identity the app receives.
 *
 * Resolved in the CALLBACK, while a browser is still there to ask. The version that resolved at
 * the token endpoint could not ask anyone, so it guessed from `patient_facing` — a client
 * attribute no dynamic registration writes, which left every DCR client holding a raw Person that
 * most SMART apps cannot read.
 */
import { describe, test, expect } from 'bun:test'
import { handleCallback, handleIdentitySelect, type CallbackHandlerDeps } from './callback-handler'
import { MemoryStore } from './stores/memory'
import type { IdentityCandidate } from './identity-choice'
import type { LaunchSession, SmartProxyConfig } from './types'

const BASE_CONFIG: SmartProxyConfig = {
  baseUrl: 'https://proxy.example.com',
  launchCodeSecret: 'test-secret-key-for-testing-only',
}

const PATIENT: IdentityCandidate = { reference: 'Patient/1', resourceType: 'Patient' }
const PRACTITIONER: IdentityCandidate = { reference: 'Practitioner/2', resourceType: 'Practitioner' }

function setup(session: Partial<LaunchSession>, identities: IdentityCandidate[] | Error) {
  const store = new MemoryStore()
  store.set('session-key', {
    clientRedirectUri: 'https://app.example.com/callback',
    clientState: 'abc123',
    clientId: 'some-app',
    scope: 'openid fhirUser',
    aud: 'https://proxy.example.com/proxy-smart-backend/hapi-fhir-server/R4',
    needsPatientPicker: true,
    fhirUser: 'Person/9',
    createdAt: Date.now(),
    ...session,
  })
  const deps: CallbackHandlerDeps = {
    config: BASE_CONFIG,
    store,
    resolveIdentities: async () => {
      if (identities instanceof Error) throw identities
      return identities
    },
  }
  return { store, deps }
}

const callback = (deps: CallbackHandlerDeps) =>
  handleCallback({ state: 'session-key', code: 'auth-code-123' }, deps)

describe('identity gate', () => {
  test('a human who is only a patient is never asked', async () => {
    const { store, deps } = setup({ scope: 'openid fhirUser patient/*.rs' }, [PATIENT])

    const { result } = await callback(deps)

    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
    expect(result.type === 'redirect' && result.url).not.toContain('choose=identity')
    const updated = store.get('session-key')
    expect(updated?.fhirUser).toBe('Patient/1')
    // A Patient identity IS the patient context, so the patient picker must not ask again.
    expect(updated?.patient).toBe('1')
    expect(updated?.needsPatientPicker).toBe(false)
  })

  test('a standalone patient launch resolves to the Patient without asking, even when both exist', async () => {
    const { store, deps } = setup({ scope: 'openid fhirUser launch/patient' }, [PATIENT, PRACTITIONER])

    const { result } = await callback(deps)

    expect(result.type === 'redirect' && result.url).not.toContain('choose=identity')
    expect(store.get('session-key')?.fhirUser).toBe('Patient/1')
  })

  test('asks when the human holds two identities and the request did not settle it', async () => {
    const { store, deps } = setup({ scope: 'openid fhirUser user/Patient.rs' }, [PATIENT, PRACTITIONER])

    const { result } = await callback(deps)

    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('/patient-picker/?choose=identity')
    const updated = store.get('session-key')
    expect(updated?.needsIdentityPicker).toBe(true)
    expect(updated?.identityOffered).toEqual(['Patient/1', 'Practitioner/2'])
  })

  test('a failure to read the Person falls through instead of failing the launch', async () => {
    // The behaviour that existed before any of this: a Person is deferred, never refused.
    const { deps } = setup({ scope: 'openid fhirUser launch/patient' }, new Error('FHIR unreachable'))

    const { result } = await callback(deps)

    expect(result.type).toBe('redirect')
    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
  })

  test('a consumer that never wired resolveIdentities is unchanged', async () => {
    const store = new MemoryStore()
    store.set('session-key', {
      clientRedirectUri: 'https://app.example.com/callback',
      clientState: 'abc123',
      clientId: 'some-app',
      scope: 'openid fhirUser launch/patient',
      needsPatientPicker: true,
      fhirUser: 'Person/9',
      createdAt: Date.now(),
    })

    const { result } = await handleCallback({ state: 'session-key', code: 'c' }, { config: BASE_CONFIG, store })

    expect(result.type === 'redirect' && result.url).toContain('app.example.com/callback')
  })
})

describe('handleIdentitySelect', () => {
  function offered() {
    const store = new MemoryStore()
    store.set('session-key', {
      clientRedirectUri: 'https://app.example.com/callback',
      clientState: 'abc123',
      clientId: 'some-app',
      scope: 'openid fhirUser',
      needsIdentityPicker: true,
      identityOffered: ['Patient/1', 'Practitioner/2'],
      fhirUser: 'Person/9',
      createdAt: Date.now(),
    })
    return { store, deps: { config: BASE_CONFIG, store } as CallbackHandlerDeps }
  }

  test('records the choice and forwards the code', () => {
    const { store, deps } = offered()

    const result = handleIdentitySelect({ session: 'session-key', code: 'c', identity: 'Practitioner/2' }, deps)

    expect(result.type).toBe('redirect')
    const updated = store.get('session-key')
    expect(updated?.fhirUser).toBe('Practitioner/2')
    expect(updated?.needsIdentityPicker).toBe(false)
  })

  test('choosing the Patient identity also establishes the patient context', () => {
    const { store, deps } = offered()

    handleIdentitySelect({ session: 'session-key', code: 'c', identity: 'Patient/1' }, deps)

    expect(store.get('session-key')?.patient).toBe('1')
    expect(store.get('session-key')?.needsPatientPicker).toBe(false)
  })

  test('refuses an identity the session never offered', () => {
    // The whole authorization check on this POST. Without it a session key would be enough to
    // name any Practitioner on the server and be issued a token as them.
    const { store, deps } = offered()

    const result = handleIdentitySelect({ session: 'session-key', code: 'c', identity: 'Practitioner/999' }, deps)

    expect(result.type).toBe('error')
    expect(result.type === 'error' && result.status).toBe(403)
    expect(store.get('session-key')?.fhirUser).toBe('Person/9')
  })

  test('a duplicate submission repeats the redirect rather than refusing it', () => {
    const { store, deps } = offered()
    handleIdentitySelect({ session: 'session-key', code: 'c', identity: 'Patient/1' }, deps)

    const again = handleIdentitySelect({ session: 'session-key', code: 'c', identity: 'Patient/1' }, deps)

    expect(again.type).toBe('redirect')
    expect(store.get('session-key')?.fhirUser).toBe('Patient/1')
  })
})
