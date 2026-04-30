/**
 * Token Endpoint Form Body Parsing — Regression Guards
 *
 * A form-body parsing failure was observed (2026-04-30) where Elysia/Bun's
 * internal parser dropped client_assertion_type after a long RS384 JWT in
 * client_assertion. The issue is not reliably reproducible across Bun
 * reinstalls (tested 1.3.9 and 1.3.13 with Elysia 1.4.28 — both pass).
 *
 * The /auth/token endpoint uses a custom URLSearchParams-based parser as
 * defense-in-depth. These tests guard against regression:
 * 1. "Isolated" tests — verify both default and custom parsers handle JWTs.
 * 2. "Integration" tests — exercise the actual endpoint with real JWTs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia, t } from 'elysia'
import { generateKeyPairSync } from 'crypto'
import jwt from 'jsonwebtoken'
import { authRoutes } from '../src/routes/auth'

// ─── Test key pair for JWT generation ───────────────────────────────────────

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const ORIGINAL_FETCH = globalThis.fetch

function createJwt(claims: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      iss: 'test-client',
      sub: 'test-client',
      aud: 'http://localhost:8445/auth/token',
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: crypto.randomUUID(),
      ...claims,
    },
    privateKey,
    { algorithm: 'RS384', header: { alg: 'RS384', kid: 'test-kid', typ: 'JWT' } }
  )
}

function buildFormBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

// ─── Isolated parser tests ──────────────────────────────────────────────────
// These test Elysia's form parsing behavior directly to prove the bug exists
// in the default parser and that our custom parser handles it correctly.

describe('Token endpoint form-body parsing — isolated', () => {
  it('Elysia default parser handles long JWT values correctly (regression guard)', async () => {
    // Standalone Elysia instance WITHOUT custom parser — if this ever fails,
    // it means the native parser has regressed and our custom parser is essential.
    const app = new Elysia()
      .post('/token', ({ body }) => {
        return body
      }, {
        body: t.Object({
          grant_type: t.String(),
          client_id: t.Optional(t.String()),
          client_assertion_type: t.Optional(t.String()),
          client_assertion: t.Optional(t.String()),
          scope: t.Optional(t.String()),
        })
      })

    const assertion = createJwt({ custom_data: 'x'.repeat(500) })
    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_id: 'test-client',
      client_assertion: assertion,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      scope: 'system/*.read',
    })

    const req = new Request('http://localhost/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    const res = await app.handle(req)
    const data = await res.json() as Record<string, string | undefined>

    expect(data.grant_type).toBe('client_credentials')
    expect(data.client_id).toBe('test-client')
    expect(data.client_assertion_type).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    expect(data.scope).toBe('system/*.read')
  })

  it('custom URLSearchParams parser preserves all fields after long JWT values', async () => {
    // Same as above but WITH our custom parser — must always work
    const app = new Elysia()
      .post('/token', ({ body }) => {
        return body
      }, {
        async parse({ request, contentType }) {
          if (contentType?.startsWith('application/x-www-form-urlencoded')) {
            const text = await request.text()
            return Object.fromEntries(new URLSearchParams(text).entries())
          }
        },
        body: t.Object({
          grant_type: t.String(),
          client_id: t.Optional(t.String()),
          client_assertion_type: t.Optional(t.String()),
          client_assertion: t.Optional(t.String()),
          scope: t.Optional(t.String()),
        })
      })

    const assertion = createJwt({ custom_data: 'x'.repeat(500) })
    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_id: 'test-client',
      client_assertion: assertion,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      scope: 'system/*.read',
    })

    const req = new Request('http://localhost/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    const res = await app.handle(req)
    const data = await res.json() as Record<string, string | undefined>

    expect(data.grant_type).toBe('client_credentials')
    expect(data.client_id).toBe('test-client')
    expect(data.client_assertion_type).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    expect(data.scope).toBe('system/*.read')
    expect(data.client_assertion).toBe(assertion)
  })

  it('custom parser handles Content-Type with charset parameter', async () => {
    const app = new Elysia()
      .post('/token', ({ body }) => {
        return body
      }, {
        async parse({ request, contentType }) {
          if (contentType?.startsWith('application/x-www-form-urlencoded')) {
            const text = await request.text()
            return Object.fromEntries(new URLSearchParams(text).entries())
          }
        },
        body: t.Object({
          grant_type: t.String(),
          client_assertion_type: t.Optional(t.String()),
          client_assertion: t.Optional(t.String()),
        })
      })

    const assertion = createJwt()
    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    })

    const req = new Request('http://localhost/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: formBody,
    })

    const res = await app.handle(req)
    const data = await res.json() as Record<string, string | undefined>

    expect(data.grant_type).toBe('client_credentials')
    expect(data.client_assertion_type).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    expect(data.client_assertion).toBe(assertion)
  })
})

// ─── Integration tests against actual auth routes ───────────────────────────

describe('Token endpoint form-body parsing — integration', () => {
  beforeEach(() => {
    // Mock fetch to prevent actual Keycloak calls — we only care about parsing
    const mockFetch = Object.assign(
      async () => new Response(JSON.stringify({ error: 'mock' }), { status: 400 }),
      { preconnect: () => {} }
    ) as typeof fetch
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('parses client_assertion_type when client_assertion contains a real JWT', async () => {
    const assertion = createJwt()
    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_id: 'test-client',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
      scope: 'system/*.read',
    })

    const req = new Request('http://localhost/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    const res = await authRoutes.handle(req)
    const data = await res.json() as Record<string, unknown>

    // If parsing works, isBackendServicesRequest returns true and our handler
    // processes it (returning invalid_client from JWKS validation failure).
    // If parsing fails, we get a validation error or the request falls through
    // to Keycloak proxy path.
    expect(data.error).not.toBe('validation')
    expect(data.error).toBe('invalid_client')
  })

  it('parses client_assertion_type with charset in Content-Type', async () => {
    const assertion = createJwt()
    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_id: 'test-client',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
      scope: 'system/*.read',
    })

    const req = new Request('http://localhost/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: formBody,
    })

    const res = await authRoutes.handle(req)
    const data = await res.json() as Record<string, unknown>

    expect(data.error).not.toBe('validation')
    expect(data.error).toBe('invalid_client')
  })

  it('parses fields correctly when client_assertion appears before client_assertion_type', async () => {
    // Field ordering matters — if the JWT corrupts parsing, subsequent fields vanish
    const assertion = createJwt()

    // Manually construct body with assertion BEFORE assertion_type
    const params = new URLSearchParams()
    params.set('grant_type', 'client_credentials')
    params.set('client_id', 'test-client')
    params.set('client_assertion', assertion)
    params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    params.set('scope', 'system/*.read')

    const req = new Request('http://localhost/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const res = await authRoutes.handle(req)
    const data = await res.json() as Record<string, unknown>

    expect(data.error).not.toBe('validation')
    expect(data.error).toBe('invalid_client')
  })

  it('handles very long JWT assertions without field corruption', async () => {
    // Large JWTs with many claims are the most likely to trigger the bug
    const assertion = createJwt({
      custom_data: 'x'.repeat(2000),
      nested: { a: 'b'.repeat(100), c: [1, 2, 3, 4, 5] },
    })

    const formBody = buildFormBody({
      grant_type: 'client_credentials',
      client_id: 'test-client',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
      scope: 'system/Patient.read system/Observation.read',
    })

    const req = new Request('http://localhost/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    const res = await authRoutes.handle(req)
    const data = await res.json() as Record<string, unknown>

    expect(data.error).not.toBe('validation')
    expect(data.error).toBe('invalid_client')
  })
})
