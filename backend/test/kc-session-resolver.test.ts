/**
 * Unit tests for kc-session-resolver.ts
 *
 * Tests the autoResolvePatient flow by mocking KcAdminClient via DI.
 * Reproduces the beta bug where the patient picker still shows despite
 * the user having fhirUser=Patient/max-nussbaumer on their KC profile.
 *
 * NOTE: We do NOT use mock.module for any @/ path-aliased modules because
 * Bun's mock.module does not reliably intercept them on Linux CI.
 * Instead we use dependency injection (adminClientFactory parameter).
 */
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import type { LaunchSession, CallbackParams } from '@proxy-smart/auth'

// ── Config via env vars ──────────────────────────────────────────────────
const CONFIG_ENV_VARS = {
  KEYCLOAK_BASE_URL: 'http://keycloak:8080/auth',
  KEYCLOAK_REALM: 'proxy-smart',
  KEYCLOAK_ADMIN_CLIENT_ID: 'admin-service',
  KEYCLOAK_ADMIN_CLIENT_SECRET: 'admin-service-secret',
} as const
const envSnapshot: Record<string, string | undefined> = {}

// ── Mock admin client via dependency injection ──────────────────────────
// NOTE: Bun's mock.module does not reliably intercept modules on Linux CI
// (both npm packages and path-aliased local modules fail). Instead of
// mock.module, we use dependency injection: autoResolvePatient accepts an
// optional adminClientFactory parameter that we pass directly in tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClientsFind = mock((): Promise<any[]> => Promise.resolve([]))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClientsListSessions = mock((): Promise<any[]> => Promise.resolve([]))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUsersFindOne = mock((): Promise<any> => Promise.resolve(null))

const mockAdminClient = {
  clients: {
    find: mockClientsFind,
    listSessions: mockClientsListSessions,
  },
  users: {
    findOne: mockUsersFindOne,
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAdminFactory = () => Promise.resolve(mockAdminClient as any)

// Import directly — no mock.module needed for kc-admin-factory
const { autoResolvePatient } = await import('@/lib/kc-session-resolver')

// ── Test fixtures (matching beta state) ─────────────────────────────────
const KC_CLIENT_UUID = '3c6b3282-7f49-480d-84c6-a24c31e08710'
const SESSION_STATE = 'a1b2c3d4-5678-9012-3456-789012345678'
const USER_ID = '91b2868f-6efe-4806-8534-153a7600a74d'

function makeSession(overrides?: Partial<LaunchSession>): LaunchSession {
  return {
    clientRedirectUri: 'https://beta.proxy-smart.com/apps/patient-portal/',
    clientState: 'abc123',
    clientId: 'patient-portal',
    scope: 'openid fhirUser launch/patient patient/*.read',
    needsPatientPicker: true,
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeCallbackParams(overrides?: Partial<CallbackParams>): CallbackParams {
  return {
    state: 'session-key-uuid',
    code: 'auth-code-from-kc',
    session_state: SESSION_STATE,
    ...overrides,
  }
}

describe('kc-session-resolver: autoResolvePatient', () => {
  beforeEach(() => {
    mockClientsFind.mockClear()
    mockClientsListSessions.mockClear()
    mockUsersFindOne.mockClear()

    // Save and set env vars for config dynamic getters
    for (const key of Object.keys(CONFIG_ENV_VARS)) {
      envSnapshot[key] = process.env[key]
    }
    for (const [key, value] of Object.entries(CONFIG_ENV_VARS)) {
      process.env[key] = value
    }

    // Default: client exists
    mockClientsFind.mockResolvedValue([{ id: KC_CLIENT_UUID, clientId: 'patient-portal' }])
    // Default: no sessions
    mockClientsListSessions.mockResolvedValue([])
    // Default: user not found
    mockUsersFindOne.mockResolvedValue(null)
  })

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('returns null when session_state is missing from params', async () => {
    const result = await autoResolvePatient(makeSession(), makeCallbackParams({ session_state: undefined }), mockAdminFactory)
    expect(result).toBeNull()
    // Admin client should not be called when there's no session_state
    expect(mockClientsFind).not.toHaveBeenCalled()
  })

  it('returns null when OIDC client is not found in Keycloak', async () => {
    mockClientsFind.mockResolvedValue([])
    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('returns null when no sessions exist for the client', async () => {
    mockClientsListSessions.mockResolvedValue([])
    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('returns null when session_state does not match any session id', async () => {
    mockClientsListSessions.mockResolvedValue([
      { id: 'different-session-id', userId: 'some-user', username: 'other' },
    ])
    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('returns patient ID when session matches and user has fhirUser=Patient/*', async () => {
    // Simulate: session found on the client
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'quotentiroler' },
    ])
    // Simulate: user has fhirUser attribute
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      username: 'quotentiroler',
      attributes: { fhirUser: ['Patient/max-nussbaumer'] },
    })

    const session = makeSession()
    const result = await autoResolvePatient(session, makeCallbackParams(), mockAdminFactory)

    expect(result).toBe('max-nussbaumer')
    expect(session.fhirUser).toBe('Patient/max-nussbaumer')
  })

  it('returns null when user has fhirUser=Practitioner/* (not a patient)', async () => {
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'doctor' },
    ])
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      username: 'doctor',
      attributes: { fhirUser: ['Practitioner/example-practitioner'] },
    })

    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('returns null when user has no fhirUser attribute at all', async () => {
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'maxivities@gmail.com' },
    ])
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      username: 'maxivities@gmail.com',
      attributes: {},
    })

    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('pages through sessions to find a match on later pages', async () => {
    // First page: 50 sessions, none matching
    const page1 = Array.from({ length: 50 }, (_, i) => ({
      id: `session-${i}`,
      userId: `user-${i}`,
      username: `user${i}`,
    }))
    // Second page: includes our match
    const page2 = [
      { id: SESSION_STATE, userId: USER_ID, username: 'quotentiroler' },
    ]

    let callCount = 0
    mockClientsListSessions.mockImplementation(async () => {
      callCount++
      return callCount === 1 ? page1 : page2
    })
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      attributes: { fhirUser: ['Patient/max-nussbaumer'] },
    })

    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBe('max-nussbaumer')
    expect(callCount).toBe(2)
  })

  it('catches exceptions and returns null gracefully', async () => {
    mockClientsFind.mockRejectedValue(new Error('Connection refused'))
    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  // ─────────────────────────────────────────────────────────────────────
  // BUG REPRODUCTION: The "App Store" scenario on beta
  // ─────────────────────────────────────────────────────────────────────

  it('BUG: uses session.clientId to look up sessions — what if the client has redirect_uri via proxy but user session is under a DIFFERENT Keycloak client?', async () => {
    // Scenario: The admin-ui logged in the user → session exists under "admin-ui" client.
    // Then App Store triggers a SMART authorize for "patient-portal".
    // Keycloak does SSO (no re-auth), returns code + session_state.
    // The session_state references the SSO session.
    // But does listSessions("patient-portal") return it?
    //
    // KEY INSIGHT: When Keycloak handles an authorize for client "patient-portal",
    // it creates a client session linking the user session to that client.
    // So listSessions on patient-portal SHOULD return this session.
    // BUT — there might be a timing issue or a different SSO mechanism.

    // Simulate the real scenario: session exists on the client
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'quotentiroler' },
    ])
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      username: 'quotentiroler',
      attributes: { fhirUser: ['Patient/max-nussbaumer'] },
    })

    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBe('max-nussbaumer')
  })

  it('BUG: verifies that admin.clients.find is called with the SMART app clientId (string), not the UUID', async () => {
    const session = makeSession({ clientId: 'patient-portal' })
    await autoResolvePatient(session, makeCallbackParams(), mockAdminFactory)

    // Verify the correct clientId string is used to look up the KC client
    expect(mockClientsFind).toHaveBeenCalledWith({ clientId: 'patient-portal', max: 1 })
  })

  it('BUG: verifies that listSessions is called with the KC UUID, not the clientId string', async () => {
    mockClientsFind.mockResolvedValue([{ id: KC_CLIENT_UUID, clientId: 'patient-portal' }])
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'quotentiroler' },
    ])
    mockUsersFindOne.mockResolvedValue({
      id: USER_ID,
      attributes: { fhirUser: ['Patient/max-nussbaumer'] },
    })

    await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)

    expect(mockClientsListSessions).toHaveBeenCalledWith({
      id: KC_CLIENT_UUID,
      first: 0,
      max: 50,
    })
  })

  it('BUG: what if session.clientId is empty string (authorize without client_id)?', async () => {
    const session = makeSession({ clientId: '' })
    const result = await autoResolvePatient(session, makeCallbackParams(), mockAdminFactory)

    // Should still attempt lookup (let KC tell us client not found)
    expect(mockClientsFind).toHaveBeenCalledWith({ clientId: '', max: 1 })
    expect(result).toBeNull()
  })

  it('BUG: what if admin-service lacks realm-management roles (403 on listSessions)?', async () => {
    mockClientsListSessions.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), { response: { status: 403 } })
    )
    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })

  it('BUG ROOT CAUSE: 403 on users.findOne when admin-service lacks view-users role', async () => {
    // This is the EXACT scenario on beta:
    // 1. admin.clients.find() works (view-clients role ✓)
    // 2. admin.clients.listSessions() works (view-clients role ✓)
    // 3. admin.users.findOne() FAILS with 403 (view-users role ✗)
    // The exception is caught, logged at debug, and null is returned.
    // Patient picker shows because autoResolvePatient returned null.
    mockClientsListSessions.mockResolvedValue([
      { id: SESSION_STATE, userId: USER_ID, username: 'quotentiroler' },
    ])
    mockUsersFindOne.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), {
        response: { status: 403, data: { error: 'unknown_error' } },
      })
    )

    const result = await autoResolvePatient(makeSession(), makeCallbackParams(), mockAdminFactory)
    expect(result).toBeNull()
  })
})
