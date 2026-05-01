/**
 * Backend Services (client_credentials + private_key_jwt) Tests
 *
 * TDD tests for the SMART Backend Services token flow.
 * Specifically targets verifyJwtSignature + the full handleBackendServicesToken flow.
 *
 * Mocks:
 * - cross-fetch: intercepts Keycloak admin API calls
 * - config: provides deterministic test values
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { generateKeyPairSync, createPublicKey, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'

// ─── RSA Key Pair for test signing ──────────────────────────────────────────

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// Convert public key PEM to JWK for the mock JWKS response
const publicKeyObject = createPublicKey(publicKey)
const publicJwk = publicKeyObject.export({ format: 'jwk' })
const TEST_KID = 'test-key-1'
const TEST_CLIENT_ID = 'backend-service-client'
const TEST_CLIENT_SECRET = 'test-client-secret'
const TEST_BASE_URL = 'http://localhost:8445'
const TEST_KC_BASE_URL = 'http://localhost:8080'
const TEST_REALM = 'smart-health'
const TEST_INTERNAL_CLIENT_UUID = 'uuid-1234'

// JWKS that Keycloak would return for the client
const clientJwks = {
  keys: [{
    ...publicJwk,
    kid: TEST_KID,
    use: 'sig',
    alg: 'RS384',
  }]
}

// ─── Mock fetch to intercept all Keycloak admin API calls ───────────────────

let fetchMock: ReturnType<typeof mock>

function createFetchMock() {
  return mock((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

    // Admin token endpoint
    if (urlStr.includes('/protocol/openid-connect/token') && init?.body?.toString().includes('client_credentials')) {
      // If it's the service account token exchange (has client_secret for the backend service client)
      if (init?.body?.toString().includes(TEST_CLIENT_ID)) {
        return Promise.resolve(new Response(JSON.stringify({
          access_token: 'service-account-token-xyz',
          token_type: 'Bearer',
          expires_in: 300,
          scope: 'system/*.read',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      // Admin service token request
      return Promise.resolve(new Response(JSON.stringify({
        access_token: 'admin-token-123',
        token_type: 'Bearer',
        expires_in: 300,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }

    // Client lookup by clientId (admin API)
    if (urlStr.includes('/admin/realms/') && urlStr.includes('clients?clientId=')) {
      return Promise.resolve(new Response(JSON.stringify([{
        id: TEST_INTERNAL_CLIENT_UUID,
        clientId: TEST_CLIENT_ID,
        attributes: {
          'jwks.string': JSON.stringify(clientJwks),
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }

    // Client secret endpoint
    if (urlStr.includes(`/clients/${TEST_INTERNAL_CLIENT_UUID}/client-secret`)) {
      return Promise.resolve(new Response(JSON.stringify({
        value: TEST_CLIENT_SECRET,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }

    // Fallback — unknown URL
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  })
}

// ─── Module mocking ─────────────────────────────────────────────────────────

// We need to mock cross-fetch and config before importing the module under test
mock.module('cross-fetch', () => ({
  default: (...args: unknown[]) => fetchMock(...args),
}))

// NOTE: Do NOT mock.module('@/config') — it's global in Bun and leaks to other
// test files. Instead, set env vars so the real config's dynamic getters pick
// them up. Save and restore in beforeEach/afterEach.
const CONFIG_ENV_VARS = {
  BASE_URL: TEST_BASE_URL,
  KEYCLOAK_BASE_URL: TEST_KC_BASE_URL,
  KEYCLOAK_REALM: TEST_REALM,
  KEYCLOAK_ADMIN_CLIENT_ID: 'admin-service',
  KEYCLOAK_ADMIN_CLIENT_SECRET: 'admin-secret',
} as const

// Suppress logger output in tests
// NOTE: mock.module is global in Bun — partial mocks leak to other test files.
// Use a Proxy so every namespace (server, consent, fhir, …) and top-level
// method (info, debug, …) resolves to a no-op, keeping other suites safe.
const noop = () => {}
const noopCategory = { error: noop, warn: noop, info: noop, debug: noop, trace: noop }
const noopLogger = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    if (typeof prop === 'string') {
      if (['error', 'warn', 'info', 'debug', 'trace'].includes(prop)) return noop
      return noopCategory
    }
    return undefined
  },
})
mock.module('@/lib/logger', () => ({
  logger: noopLogger,
  createLogger: () => noopLogger,
  PerformanceTimer: class { start() {} stop() {} },
  createRequestLogger: () => ({ request: noop, response: noop }),
}))

// ─── Import after mocking ───────────────────────────────────────────────────

const { handleBackendServicesToken, isBackendServicesRequest, clearJtiCache } = await import(
  '../src/routes/auth/backend-services'
)

// ─── Helper: create a valid JWT assertion ───────────────────────────────────

function createClientAssertion(overrides?: {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  jti?: string
  kid?: string
  algorithm?: jwt.Algorithm
}): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: overrides?.iss ?? TEST_CLIENT_ID,
    sub: overrides?.sub ?? TEST_CLIENT_ID,
    aud: overrides?.aud ?? `${TEST_BASE_URL}/auth/token`,
    exp: overrides?.exp ?? now + 300,
    jti: overrides?.jti ?? randomUUID(),
    iat: now,
  }

  return jwt.sign(payload, privateKey, {
    algorithm: overrides?.algorithm ?? 'RS384',
    header: {
      alg: overrides?.algorithm ?? 'RS384',
      kid: overrides?.kid ?? TEST_KID,
      typ: 'JWT',
    },
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Backend Services', () => {
  let envSnapshot: Record<string, string | undefined>

  beforeEach(() => {
    // Snapshot env vars that we'll override
    envSnapshot = {}
    for (const key of Object.keys(CONFIG_ENV_VARS)) {
      envSnapshot[key] = process.env[key]
    }
    // Set config env vars for this test
    for (const [key, value] of Object.entries(CONFIG_ENV_VARS)) {
      process.env[key] = value
    }
    fetchMock = createFetchMock()
    clearJtiCache()
  })

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  describe('isBackendServicesRequest', () => {
    it('detects a valid backend services request', () => {
      expect(isBackendServicesRequest({
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: 'some.jwt.here',
      })).toBe(true)
    })

    it('rejects when client_assertion_type is wrong', () => {
      expect(isBackendServicesRequest({
        client_assertion_type: 'wrong',
        client_assertion: 'some.jwt.here',
      })).toBe(false)
    })

    it('rejects when client_assertion is missing', () => {
      expect(isBackendServicesRequest({
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      })).toBe(false)
    })
  })

  describe('handleBackendServicesToken', () => {
    it('rejects non-client_credentials grant_type', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'authorization_code',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion(),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('unsupported_grant_type')
    })

    it('rejects invalid JWT (not a JWT)', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: 'not-a-jwt',
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
    })

    it('rejects JWT where iss !== sub', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ iss: 'client-a', sub: 'client-b' }),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('iss and sub')
    })

    it('rejects JWT with wrong audience', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ aud: 'https://wrong.example.com/token' }),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('audience')
    })

    it('rejects JWT with Keycloak internal token endpoint as audience', async () => {
      const keycloakAud = `${TEST_KC_BASE_URL}/realms/${TEST_REALM}/protocol/openid-connect/token`
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ aud: keycloakAud }),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('audience')
    })

    it('rejects expired JWT', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ exp: Math.floor(Date.now() / 1000) - 120 }),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('expired')
    })

    it('rejects JWT without jti', async () => {
      // Create a JWT manually without jti
      const now = Math.floor(Date.now() / 1000)
      const token = jwt.sign(
        { iss: TEST_CLIENT_ID, sub: TEST_CLIENT_ID, aud: `${TEST_BASE_URL}/auth/token`, exp: now + 300 },
        privateKey,
        { algorithm: 'RS384', header: { alg: 'RS384', kid: TEST_KID, typ: 'JWT' } }
      )

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: token,
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('jti')
    })

    it('successfully verifies JWT signature and returns token (happy path)', async () => {
      const assertion = createClientAssertion()

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
        scope: 'system/*.read',
      })

      expect(result.status).toBe(200)
      expect(result.body.access_token).toBe('service-account-token-xyz')
      expect(result.body.token_type).toBe('Bearer')
    })

    it('verifies signature using kid from JWT header', async () => {
      // Sign with the correct key and kid
      const assertion = createClientAssertion({ kid: TEST_KID })

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })

      expect(result.status).toBe(200)
      expect(result.body.access_token).toBeDefined()
    })

    it('rejects JWT signed with wrong key', async () => {
      // Generate a different key pair
      const { privateKey: wrongKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })

      const now = Math.floor(Date.now() / 1000)
      const assertion = jwt.sign(
        {
          iss: TEST_CLIENT_ID,
          sub: TEST_CLIENT_ID,
          aud: `${TEST_BASE_URL}/auth/token`,
          exp: now + 300,
          jti: randomUUID(),
        },
        wrongKey,
        { algorithm: 'RS384', header: { alg: 'RS384', kid: TEST_KID, typ: 'JWT' } }
      )

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('signature')
    })

    it('handles RS256 algorithm correctly', async () => {
      // Rebuild JWKS mock to not specify alg (crypto.createPublicKey infers from kty)
      const originalFetch = fetchMock
      fetchMock = mock((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

        // Override client lookup to return JWK without explicit alg
        if (urlStr.includes('/admin/realms/') && urlStr.includes('clients?clientId=')) {
          const jwksNoAlg = {
            keys: [{
              ...publicJwk,
              kid: TEST_KID,
              use: 'sig',
              // No alg — crypto.createPublicKey infers from kty=RSA
            }]
          }
          return Promise.resolve(new Response(JSON.stringify([{
            id: TEST_INTERNAL_CLIENT_UUID,
            clientId: TEST_CLIENT_ID,
            attributes: { 'jwks.string': JSON.stringify(jwksNoAlg) },
          }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }

        // Delegate other calls to the original mock
        return originalFetch(url, init)
      })

      const assertion = createClientAssertion({ algorithm: 'RS256' })

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })

      expect(result.status).toBe(200)
    })

    it('verifies JWT signature does not hang or timeout (regression)', async () => {
      // This test ensures the verifyJwtSignature completes within a reasonable time.
      // A bug where getKeysInterceptor returns wrong data could cause
      // a fallback network fetch to 'https://unused', hanging the request.
      const assertion = createClientAssertion()

      const startTime = Date.now()
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })
      const elapsed = Date.now() - startTime

      expect(result.status).toBe(200)
      // Should complete in well under 5 seconds (network fallback would timeout)
      expect(elapsed).toBeLessThan(5000)
    })

    it('accepts JWKS keys with use:enc (crypto ignores use field)', async () => {
      // crypto.createPublicKey ignores the 'use' field — it imports any valid JWK.
      // This is BETTER than jwks-rsa which would filter them out and fall back to
      // a network request to a dummy URL, causing timeouts/503s.
      const originalFetch = fetchMock
      fetchMock = mock((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

        // Return JWKS where keys have use:"enc" — still valid for signature verification
        if (urlStr.includes('/admin/realms/') && urlStr.includes('clients?clientId=')) {
          const encJwks = {
            keys: [{
              ...publicJwk,
              kid: TEST_KID,
              use: 'enc', // crypto.createPublicKey doesn't care about this
              alg: 'RS384',
            }]
          }
          return Promise.resolve(new Response(JSON.stringify([{
            id: TEST_INTERNAL_CLIENT_UUID,
            clientId: TEST_CLIENT_ID,
            attributes: { 'jwks.string': JSON.stringify(encJwks) },
          }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }

        return originalFetch(url, init)
      })

      const assertion = createClientAssertion()
      const startTime = Date.now()

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })
      const elapsed = Date.now() - startTime

      // Should succeed — key material is valid regardless of 'use' field
      expect(result.status).toBe(200)
      // Should be instant (no network fallback)
      expect(elapsed).toBeLessThan(1000)
    })

    it('fails gracefully when JWKS keys lack kty field', async () => {
      // Keys without a valid kty are rejected by jose.importJWK in retrieveSigningKeys.
      // This simulates a malformed JWKS from Keycloak.
      const originalFetch = fetchMock
      fetchMock = mock((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

        if (urlStr.includes('/admin/realms/') && urlStr.includes('clients?clientId=')) {
          // Return key with no kty — retrieveSigningKeys will skip it
          const badJwks = {
            keys: [{
              kid: TEST_KID,
              alg: 'RS384',
              // Missing kty, n, e — can't be processed
            }]
          }
          return Promise.resolve(new Response(JSON.stringify([{
            id: TEST_INTERNAL_CLIENT_UUID,
            clientId: TEST_CLIENT_ID,
            attributes: { 'jwks.string': JSON.stringify(badJwks) },
          }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }

        if (urlStr.includes('unused')) {
          return Promise.resolve(new Response('Not Found', { status: 404 }))
        }

        return originalFetch(url, init)
      })

      const assertion = createClientAssertion()

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
    })

    it('handles client with no JWKS registered', async () => {
      const originalFetch = fetchMock
      fetchMock = mock((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

        if (urlStr.includes('/admin/realms/') && urlStr.includes('clients?clientId=')) {
          // Client exists but has no jwks.string attribute
          return Promise.resolve(new Response(JSON.stringify([{
            id: TEST_INTERNAL_CLIENT_UUID,
            clientId: TEST_CLIENT_ID,
            attributes: {},
          }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }

        return originalFetch(url, init)
      })

      const assertion = createClientAssertion()

      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('JWKS')
    })

    it('rejects JWT with exp more than 5 minutes in the future', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ exp: Math.floor(Date.now() / 1000) + 600 }),
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('5 minutes')
    })

    it('rejects replayed jti (same jti used twice)', async () => {
      const fixedJti = 'replay-test-jti-12345'

      // First request should succeed
      const result1 = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ jti: fixedJti }),
      })
      expect(result1.status).toBe(200)

      // Second request with same jti should be rejected
      const result2 = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ jti: fixedJti }),
      })
      expect(result2.status).toBe(400)
      expect(result2.body.error).toBe('invalid_client')
      expect(result2.body.error_description).toContain('jti')
    })

    it('allows same jti from different issuers (scoped per iss)', async () => {
      const fixedJti = 'shared-jti-different-iss'

      // First request from client A
      const result1 = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ jti: fixedJti, iss: TEST_CLIENT_ID, sub: TEST_CLIENT_ID }),
      })
      expect(result1.status).toBe(200)

      // Same jti from a different issuer — the jti check should pass because
      // jti is scoped per iss. The mock doesn't differentiate clients, so this
      // will succeed end-to-end (proving jti replay is per-iss, not global).
      const result2 = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ jti: fixedJti, iss: 'other-client', sub: 'other-client' }),
      })
      // Should NOT be rejected for jti replay — if it fails, it's for a different reason
      if (result2.status !== 200) {
        expect(result2.body.error_description).not.toContain('jti has already been used')
      }
    })

    it('rejects when client_id body param does not match JWT iss', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion(),
        client_id: 'wrong-client-id',
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toBe('invalid_client')
      expect(result.body.error_description).toContain('client_id')
    })

    it('accepts when client_id body param matches JWT iss', async () => {
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion(),
        client_id: TEST_CLIENT_ID,
      })

      expect(result.status).toBe(200)
    })

    it('accepts exp just under 5-minute ceiling', async () => {
      // exp = now + 299 seconds (within 300 + 30 clock skew tolerance)
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: createClientAssertion({ exp: Math.floor(Date.now() / 1000) + 299 }),
      })

      expect(result.status).toBe(200)
    })

    it('always uses client_secret internally with Keycloak (proxy enforces private_key_jwt externally)', async () => {
      // The proxy validates JWT signature (private_key_jwt) at steps 4-8,
      // then authenticates to Keycloak using client_secret internally.
      let capturedTokenBody: string | undefined
      const originalFetch = fetchMock

      fetchMock = mock((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

        // Token endpoint — capture body
        if (urlStr.includes('/protocol/openid-connect/token') && init?.body?.toString().includes(TEST_CLIENT_ID)) {
          capturedTokenBody = init?.body?.toString()
          return Promise.resolve(new Response(JSON.stringify({
            access_token: 'secret-based-token',
            token_type: 'Bearer',
            expires_in: 300,
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }

        return originalFetch(url, init)
      })

      const assertion = createClientAssertion()
      const result = await handleBackendServicesToken({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
        scope: 'system/*.read',
      })

      expect(result.status).toBe(200)

      // Verify it uses client_secret internally, never forwards client_assertion to Keycloak
      expect(capturedTokenBody).toBeDefined()
      const params = new URLSearchParams(capturedTokenBody!)
      expect(params.get('client_secret')).toBe(TEST_CLIENT_SECRET)
      expect(params.has('client_assertion')).toBe(false)
      expect(params.has('client_assertion_type')).toBe(false)
    })
  })
})
