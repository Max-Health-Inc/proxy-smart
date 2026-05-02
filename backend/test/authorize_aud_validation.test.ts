import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_ENV = { ...process.env }

/**
 * Tests for the /auth/authorize endpoint's aud/resource parameter validation.
 *
 * Per SMART App Launch 2.2.0: `aud` must match a known FHIR endpoint URL.
 * Per MCP spec (RFC 8707, Section 2.5.1): `resource` must identify the MCP server.
 *
 * The authorize endpoint accepts both `aud` (SMART) and `resource` (RFC 8707) as
 * synonymous parameters, validating them against:
 * 1. FHIR base prefix: {baseUrl}/{name}/...
 * 2. Specific FHIR server endpoints: {baseUrl}/{name}/{identifier}/{version}
 * 3. MCP endpoint: {baseUrl}{mcpPath}
 */
describe('Authorize endpoint aud/resource validation', () => {
  // Set env vars so Keycloak appears configured (needed for isKeycloakReachable)
  // and mock fetch to simulate Keycloak being reachable + FHIR metadata responses.
  beforeEach(() => {
    process.env.KEYCLOAK_BASE_URL = 'http://localhost:8080'
    process.env.KEYCLOAK_REALM = 'test-realm'
    process.env.BASE_URL = 'http://localhost:8445'
    process.env.MCP_ENDPOINT_PATH = '/mcp'

    const mockFetch = Object.assign(
      async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
        // Keycloak reachability check
        if (urlStr.includes('/realms/')) {
          return new Response(JSON.stringify({ realm: 'test' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        }
        // FHIR server metadata (CapabilityStatement)
        if (urlStr.includes('/fhir') || urlStr.includes(':8081')) {
          return new Response(JSON.stringify({
            resourceType: 'CapabilityStatement',
            fhirVersion: '4.0.1',
            status: 'active',
            software: { name: 'test-server' },
            implementation: { description: 'Test FHIR Server' }
          }), {
            status: 200,
            headers: { 'content-type': 'application/fhir+json' }
          })
        }
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      },
      { preconnect: () => {} }
    ) as typeof fetch
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key]
      else process.env[key] = ORIGINAL_ENV[key]
    }
  })

  // Helper to build authorize URL with aud or resource parameter
  function authorizeUrl(params: Record<string, string>): string {
    const search = new URLSearchParams({
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'openid',
      ...params,
    })
    return `http://localhost/auth/authorize?${search.toString()}`
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VALID aud/resource values
  // ────────────────────────────────────────────────────────────────────────────

  it('accepts aud matching the FHIR base prefix', async () => {
    // config.baseUrl defaults to http://localhost:8445, config.name = package name
    // The FHIR base prefix is: {baseUrl}/{name}/
    // Any URL starting with that prefix is valid
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'http://localhost:8445/proxy-smart-backend/some-server/R4'
    })))
    // Should NOT be a 400 (will be redirect 302 to Keycloak or 503 if KC unreachable)
    expect(res.status).not.toBe(400)
  })

  it('accepts resource parameter (RFC 8707 synonym for aud)', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      resource: 'http://localhost:8445/proxy-smart-backend/some-server/R4'
    })))
    expect(res.status).not.toBe(400)
  })

  it('accepts MCP endpoint URL as aud (MCP spec Section 2.5.1)', async () => {
    // MCP clients send resource=baseUrl+mcpPath per RFC 8707
    // config.mcp.path defaults to '/mcp'
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'http://localhost:8445/mcp'
    })))
    expect(res.status).not.toBe(400)
  })

  it('accepts MCP endpoint URL as resource parameter', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      resource: 'http://localhost:8445/mcp'
    })))
    expect(res.status).not.toBe(400)
  })

  it('accepts MCP endpoint sub-path (e.g., /mcp/sse)', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      resource: 'http://localhost:8445/mcp/sse'
    })))
    expect(res.status).not.toBe(400)
  })

  it('passes through when aud is not provided (optional per SMART spec)', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({})))
    // No aud = no validation, should proceed to redirect
    expect(res.status).not.toBe(400)
  })

  // ────────────────────────────────────────────────────────────────────────────
  // INVALID aud/resource values
  // ────────────────────────────────────────────────────────────────────────────

  it('rejects aud pointing to an unknown server', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'https://evil.example.com/fhir'
    })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toContain('aud')
  })

  it('rejects resource pointing to an unrelated URL', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      resource: 'https://attacker.com/api'
    })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
  })

  it('rejects aud that is a prefix attack (similar but not matching)', async () => {
    // e.g., http://localhost:8445/proxy-smart-backend-evil/ should NOT match
    // because fhirBasePrefix is http://localhost:8445/proxy-smart-backend/
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'http://localhost:8445/proxy-smart-backend-evil/server/R4'
    })))
    expect(res.status).toBe(400)
  })

  it('rejects aud matching MCP path prefix but different base URL', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'https://evil.com/mcp'
    })))
    expect(res.status).toBe(400)
  })

  it('rejects aud that is a partial MCP endpoint match (e.g., /mcpevil)', async () => {
    // Must be exactly /mcp or /mcp/... not /mcpevil
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'http://localhost:8445/mcpevil'
    })))
    expect(res.status).toBe(400)
  })

  // ────────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ────────────────────────────────────────────────────────────────────────────

  it('prefers aud over resource when both are provided', async () => {
    // aud takes precedence (code: query.aud || query.resource)
    const res = await authRoutes.handle(new Request(authorizeUrl({
      aud: 'http://localhost:8445/mcp',
      resource: 'https://evil.example.com/fhir'
    })))
    // aud is valid (MCP endpoint), resource is ignored
    expect(res.status).not.toBe(400)
  })

  it('uses resource when aud is absent', async () => {
    const res = await authRoutes.handle(new Request(authorizeUrl({
      resource: 'https://evil.example.com/fhir'
    })))
    // resource is invalid — should be rejected
    expect(res.status).toBe(400)
  })
})
