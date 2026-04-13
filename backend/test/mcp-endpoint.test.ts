/**
 * MCP Streamable HTTP Endpoint — Integration Tests (TDD)
 *
 * Tests the /mcp endpoint against the MCP 2025-03-26 specification.
 * Written test-first to expose real bugs, then code is fixed.
 *
 * Key spec requirements covered:
 *  - Auth: 401 + RFC 9728 WWW-Authenticate header on every HTTP method
 *  - Session: initialize → session ID → tools/list + tools/call
 *  - Session: unknown session → 404 (spec §Session Management rule 3)
 *  - Session: DELETE tears down session, subsequent requests get 404
 *  - Disabled: file-config alone can disable endpoint (returns 404)
 *  - Protocol: server info, protocol version, capabilities shape
 *  - Tools: tools/list works after initialized notification
 *  - Tools: search_documentation is registered and callable
 *  - Path params: correct extraction and body/param separation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'

// ── Mock auth module before importing route code ─────────────────────────────

const mockValidateToken = mock(async (_token: string) => ({
  sub: 'test-user',
  azp: 'mcp-test-client',
  iss: 'http://localhost:8080/realms/proxy-smart',
  realm_access: { roles: ['admin'] },
  resource_access: {},
}))

mock.module('../src/lib/auth', () => ({
  validateToken: mockValidateToken,
}))

mock.module('../src/lib/keycloak-plugin', () => ({
  createAdminClient: () => ({}),
}))

mock.module('../src/lib/access-control/plugin', () => ({
  getAccessControlInstance: () => ({}),
}))

// Mock RAG tools — return a known result so we can test search_documentation tool
const mockSearchDocumentation = mock(async (_query: string, _limit?: number) => ({
  total_results: 1,
  documents: [
    {
      title: 'Test Doc',
      content: 'This is test documentation content.',
      source: 'test.md',
      similarity: 0.95,
    },
  ],
}))

mock.module('../src/lib/ai/rag-tools', () => ({
  searchDocumentation: mockSearchDocumentation,
}))

// Set env vars so the real config module returns the values we need.
// IMPORTANT: Do NOT mock.module('../src/config') — that replaces the entire
// singleton with a partial object, permanently stripping ial, accessControl,
// etc. for all subsequent test files in the same bun process.
process.env.MCP_ENDPOINT_ENABLED = 'true'
process.env.KEYCLOAK_BASE_URL = 'http://localhost:8080'
process.env.KEYCLOAK_PUBLIC_URL = 'http://localhost:8080'
process.env.KEYCLOAK_REALM = 'proxy-smart'

// Use the REAL mcp-endpoint-config module. Control it via saveMcpEndpointConfig
// in beforeEach. Do NOT mock.module('../src/lib/mcp-endpoint-config') — that
// permanently replaces the module for all subsequent test files in the same bun
// process, breaking mcp-endpoint-config.test.ts.
import { saveMcpEndpointConfig } from '../src/lib/mcp-endpoint-config'

// ── Import route after mocks are in place ────────────────────────────────────

import { Elysia } from 'elysia'

const { mcpEndpointRoutes } = await import('../src/routes/mcp-endpoint')

function createApp() {
  return new Elysia().use(mcpEndpointRoutes)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonRpcInitialize(id = 1) {
  return {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' },
    },
    id,
  }
}

function mcpPost(
  body: unknown,
  opts: { token?: string; sessionId?: string } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (opts.token !== undefined) {
    headers['Authorization'] = `Bearer ${opts.token}`
  }
  if (opts.sessionId) {
    headers['Mcp-Session-Id'] = opts.sessionId
  }
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function mcpGet(opts: { token?: string; sessionId?: string } = {}) {
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  }
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
  if (opts.sessionId) headers['Mcp-Session-Id'] = opts.sessionId
  return new Request('http://localhost/mcp', { method: 'GET', headers })
}

function mcpDelete(opts: { token?: string; sessionId?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
  if (opts.sessionId) headers['Mcp-Session-Id'] = opts.sessionId
  return new Request('http://localhost/mcp', { method: 'DELETE', headers })
}

/**
 * Parse an SSE or JSON response body into JSON-RPC message(s).
 * The MCP SDK may return `text/event-stream` for request responses.
 */
async function parseResponse(res: Response): Promise<Record<string, unknown>> {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/event-stream')) {
    const text = await res.text()
    const messages: Record<string, unknown>[] = []
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          messages.push(JSON.parse(line.slice(6)))
        } catch {
          /* skip */
        }
      }
    }
    // Prefer the last JSON-RPC response (has `id`)
    const response = [...messages].reverse().find((m) => m.id !== undefined)
    return response ?? messages[0] ?? (() => { throw new Error(`No data in SSE: ${text}`) })()
  }
  return res.json()
}

/**
 * Full MCP handshake: initialize → extract session ID → send notifications/initialized.
 * Returns the session ID for subsequent requests.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initializeSession(app: any, token = 'valid-token') {
  const initRes = await app.handle(mcpPost(jsonRpcInitialize(), { token }))
  expect(initRes.status).toBe(200)
  const sessionId = initRes.headers.get('mcp-session-id')!
  expect(sessionId).toBeTruthy()

  // MCP spec requires notifications/initialized before any other requests
  const notifRes = await app.handle(
    mcpPost(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { token, sessionId },
    ),
  )
  expect(notifRes.status).toBeGreaterThanOrEqual(200)
  expect(notifRes.status).toBeLessThan(300)

  return { sessionId, initRes }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MCP Endpoint — /mcp', () => {
  beforeEach(() => {
    // Explicitly re-arm mock implementation — bun's mockClear may reset it
    mockValidateToken.mockClear()
    mockValidateToken.mockImplementation(async (_token: string) => ({
      sub: 'test-user',
      azp: 'mcp-test-client',
      iss: 'http://localhost:8080/realms/proxy-smart',
      realm_access: { roles: ['admin'] },
      resource_access: {},
    }))
    mockSearchDocumentation.mockClear()
    // Reset the real mcp-endpoint-config to defaults via its public API
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })
  })

  // ── Authentication (all HTTP methods) ──────────────────────────────────

  describe('Authentication', () => {
    it('POST: returns 401 when no Authorization header is provided', async () => {
      const app = createApp()
      const res = await app.handle(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonRpcInitialize()),
        }),
      )
      expect(res.status).toBe(401)
    })

    it('POST: 401 body is valid JSON-RPC error with code -32001', async () => {
      const app = createApp()
      const res = await app.handle(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonRpcInitialize()),
        }),
      )
      const body = await res.json()
      expect(body.jsonrpc).toBe('2.0')
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe(-32001)
      expect(body.id).toBeNull()
    })

    it('401 includes WWW-Authenticate with resource_metadata pointing to RFC 9728 URL', async () => {
      const app = createApp()
      const res = await app.handle(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonRpcInitialize()),
        }),
      )
      const wwwAuth = res.headers.get('WWW-Authenticate')
      expect(wwwAuth).toBeDefined()
      expect(wwwAuth).toContain('Bearer')
      expect(wwwAuth).toContain('resource_metadata=')
      expect(wwwAuth).toContain('http://localhost:8445/.well-known/oauth-protected-resource')
    })

    it('returns 401 when token validation throws', async () => {
      mockValidateToken.mockImplementationOnce(async () => {
        throw new Error('Token expired')
      })
      const app = createApp()
      const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'expired-token' }))
      expect(res.status).toBe(401)
    })

    it('returns 401 for "Bearer " with empty token string', async () => {
      // Code should reject empty tokens before calling validateToken
      const app = createApp()
      const res = await app.handle(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ',
          },
          body: JSON.stringify(jsonRpcInitialize()),
        }),
      )
      expect(res.status).toBe(401)
    })

    it('returns 401 for Basic auth scheme (wrong scheme)', async () => {
      const app = createApp()
      const res = await app.handle(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic dXNlcjpwYXNz',
          },
          body: JSON.stringify(jsonRpcInitialize()),
        }),
      )
      expect(res.status).toBe(401)
    })

    it('GET: returns 401 without auth', async () => {
      const app = createApp()
      const res = await app.handle(mcpGet())
      expect(res.status).toBe(401)
    })

    it('DELETE: returns 401 without auth', async () => {
      const app = createApp()
      const res = await app.handle(mcpDelete())
      expect(res.status).toBe(401)
    })
  })

  // ── Disabled endpoint ────────────────────────────────────────────────────
  // Either file-config OR env-config being enabled is sufficient (OR logic).
  // Only when BOTH are disabled should the endpoint return 404.

  describe('Disabled endpoint', () => {
    it('returns 404 when both file-config and env-config disable MCP', async () => {
      // Both sources disabled → endpoint must be off
      saveMcpEndpointConfig({ enabled: false, disabledTools: [], enabledTools: null, exposeResourcesAsTools: true, updatedAt: new Date().toISOString() })
      const prevEnv = process.env.MCP_ENDPOINT_ENABLED
      process.env.MCP_ENDPOINT_ENABLED = 'false'
      try {
        const app = createApp()
        const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
        expect(res.status).toBe(404)
      } finally {
        process.env.MCP_ENDPOINT_ENABLED = prevEnv
      }
    })

    it('returns 404 response body is JSON with error message', async () => {
      saveMcpEndpointConfig({ enabled: false, disabledTools: [], enabledTools: null, exposeResourcesAsTools: true, updatedAt: new Date().toISOString() })
      const prevEnv = process.env.MCP_ENDPOINT_ENABLED
      process.env.MCP_ENDPOINT_ENABLED = 'false'
      try {
        const app = createApp()
        const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
        const body = await res.json()
        expect(body.error).toBeDefined()
      } finally {
        process.env.MCP_ENDPOINT_ENABLED = prevEnv
      }
    })

    it('stays enabled when file-config is disabled but env-config is enabled', async () => {
      // Admin UI toggled off, but env says enabled → endpoint stays up (OR logic)
      saveMcpEndpointConfig({ enabled: false, disabledTools: [], enabledTools: null, exposeResourcesAsTools: true, updatedAt: new Date().toISOString() })
      const app = createApp()
      const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
      // Should NOT be 404 — env config keeps it alive
      expect(res.status).not.toBe(404)
    })

    it('stays enabled when env-config is disabled but file-config is enabled', async () => {
      // Env says disabled, but admin toggled on → endpoint stays up (OR logic)
      saveMcpEndpointConfig({ enabled: true, disabledTools: [], enabledTools: null, exposeResourcesAsTools: true, updatedAt: new Date().toISOString() })
      const prevEnv = process.env.MCP_ENDPOINT_ENABLED
      process.env.MCP_ENDPOINT_ENABLED = 'false'
      try {
        const app = createApp()
        const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
        expect(res.status).not.toBe(404)
      } finally {
        process.env.MCP_ENDPOINT_ENABLED = prevEnv
      }
    })
  })

  // ── Session lifecycle ────────────────────────────────────────────────────

  describe('Session lifecycle', () => {
    it('creates a session on valid initialize — returns 200 + Mcp-Session-Id header', async () => {
      const app = createApp()
      const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
      // Response may be 200 (JSON) or 200 (SSE) — the MCP SDK decides
      expect(res.status).toBe(200)
      const sessionId = res.headers.get('mcp-session-id')
      expect(sessionId).toBeTruthy()
      expect(typeof sessionId).toBe('string')
      // Verify the init response is valid JSON-RPC
      const body = await parseResponse(res)
      expect(body.jsonrpc).toBe('2.0')
      expect(body.result).toBeDefined()
    })

    it('initialize returns JSON-RPC result with serverInfo and protocolVersion', async () => {
      const app = createApp()
      const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
      const body = await parseResponse(res)
      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(1)
      expect(body.result).toBeDefined()
      const result = body.result as Record<string, unknown>
      expect(result.protocolVersion).toBe('2025-03-26')
      const serverInfo = result.serverInfo as Record<string, unknown>
      expect(typeof serverInfo.name).toBe('string')
      expect((serverInfo.name as string).length).toBeGreaterThan(0)
      expect(typeof serverInfo.version).toBe('string')
      expect((serverInfo.version as string).length).toBeGreaterThan(0)
    })

    it('initialize response declares tools and resources capabilities', async () => {
      const app = createApp()
      const res = await app.handle(mcpPost(jsonRpcInitialize(), { token: 'valid-token' }))
      const body = await parseResponse(res)
      const result = body.result as Record<string, unknown>
      const capabilities = result.capabilities as Record<string, unknown>
      expect(capabilities.tools).toBeDefined()
      expect(capabilities.resources).toBeDefined()
    })

    it('returns 400 for non-initialize POST without Mcp-Session-Id', async () => {
      const app = createApp()
      const res = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 },
          { token: 'valid-token' },
        ),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.jsonrpc).toBe('2.0')
      expect(body.error.code).toBe(-32000)
    })

    // BUG: Spec says unknown session → 404 Not Found (spec §Session Management rule 3)
    // Code currently falls through to 400 Bad Request.
    it('returns 404 for unknown session ID (spec: server MUST respond with 404)', async () => {
      const app = createApp()
      const res = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 },
          { token: 'valid-token', sessionId: 'non-existent-session-id' },
        ),
      )
      expect(res.status).toBe(404)
    })

    it('accepts ping on an established session', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      const pingRes = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'ping', id: 2 },
          { token: 'valid-token', sessionId },
        ),
      )
      expect(pingRes.status).toBe(200)
      const body = await parseResponse(pingRes)
      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(2)
      expect(body.result).toBeDefined()
    })

    it('tools/list works after full handshake and returns registered tools', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      const listRes = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 3 },
          { token: 'valid-token', sessionId },
        ),
      )
      expect(listRes.status).toBe(200)
      const body = await parseResponse(listRes)
      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(3)
      expect(body.result).toBeDefined()
      const result = body.result as Record<string, unknown>
      const tools = result.tools as Array<Record<string, unknown>>
      expect(Array.isArray(tools)).toBe(true)
      // search_documentation should always be registered
      const searchTool = tools.find((t) => t.name === 'search_documentation')
      expect(searchTool).toBeDefined()
      expect(searchTool!.description).toContain('documentation')
      // Every tool must have inputSchema (MCP spec)
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined()
      }
    })

    it('search_documentation tool is callable via tools/call and returns content', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      const callRes = await app.handle(
        mcpPost(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'search_documentation',
              arguments: { query: 'SMART on FHIR', limit: 3 },
            },
            id: 4,
          },
          { token: 'valid-token', sessionId },
        ),
      )
      expect(callRes.status).toBe(200)
      const body = await parseResponse(callRes)
      expect(body.jsonrpc).toBe('2.0')
      expect(body.id).toBe(4)
      const result = body.result as Record<string, unknown>
      const content = result.content as Array<Record<string, unknown>>
      expect(Array.isArray(content)).toBe(true)
      expect(content.length).toBeGreaterThan(0)
      expect(content[0].type).toBe('text')
      // Should contain the mock doc content
      expect(content[0].text).toContain('Test Doc')
      // Verify the mock was called with correct args
      expect(mockSearchDocumentation).toHaveBeenCalledWith('SMART on FHIR', 3)
    })

    it('tools/call with unknown tool name returns isError: true', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      const callRes = await app.handle(
        mcpPost(
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'nonexistent_tool_xyz',
              arguments: {},
            },
            id: 5,
          },
          { token: 'valid-token', sessionId },
        ),
      )
      expect(callRes.status).toBe(200)
      const body = await parseResponse(callRes)
      // MCP spec: "If a client calls a tool that does not exist, the server
      // SHOULD return an error in the result" (not a JSON-RPC error)
      expect(body.result).toBeDefined()
      const result = body.result as Record<string, unknown>
      expect(result.isError).toBe(true)
      const content = result.content as Array<Record<string, unknown>>
      expect(Array.isArray(content)).toBe(true)
    })

    it('token is refreshed on each request via tokenRef', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app, 'token-v1')

      // Second request with a different token
      const pingRes = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'ping', id: 2 },
          { token: 'token-v2', sessionId },
        ),
      )
      expect(pingRes.status).toBe(200)
      // validateToken was called with both tokens
      const calls = mockValidateToken.mock.calls.map((c) => c[0])
      expect(calls).toContain('token-v1')
      expect(calls).toContain('token-v2')
    })
  })

  // ── DELETE /mcp (session teardown) ───────────────────────────────────────
  // Spec: "Clients that no longer need a particular session SHOULD send an HTTP DELETE
  //        to the MCP endpoint with the Mcp-Session-Id header"

  describe('DELETE /mcp (session teardown)', () => {
    it('DELETE with valid session ID tears down the session', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      // Tear down
      const delRes = await app.handle(mcpDelete({ token: 'valid-token', sessionId }))
      // Spec says server processes it (200/202/204/405 are all valid)
      expect(delRes.status).toBeGreaterThanOrEqual(200)
      expect(delRes.status).toBeLessThan(500)

      // After teardown, session ID should no longer be valid → 404
      const afterRes = await app.handle(
        mcpPost(
          { jsonrpc: '2.0', method: 'ping', id: 99 },
          { token: 'valid-token', sessionId },
        ),
      )
      expect(afterRes.status).toBe(404)
    })
  })

  // ── Multiple sessions ──────────────────────────────────────────────────

  describe('Multiple sessions', () => {
    it('two different initializations produce different session IDs', async () => {
      const app = createApp()
      const { sessionId: sid1 } = await initializeSession(app)
      const { sessionId: sid2 } = await initializeSession(app)
      expect(sid1).not.toBe(sid2)
    })

    it('requests on one session do not affect another', async () => {
      const app = createApp()
      const { sessionId: sid1 } = await initializeSession(app)
      const { sessionId: sid2 } = await initializeSession(app)

      // Ping on session 1
      const res1 = await app.handle(
        mcpPost({ jsonrpc: '2.0', method: 'ping', id: 10 }, { token: 'valid-token', sessionId: sid1 }),
      )
      expect(res1.status).toBe(200)

      // Ping on session 2
      const res2 = await app.handle(
        mcpPost({ jsonrpc: '2.0', method: 'ping', id: 11 }, { token: 'valid-token', sessionId: sid2 }),
      )
      expect(res2.status).toBe(200)
    })
  })

  // ── JSON-RPC batch support ─────────────────────────────────────────────

  describe('JSON-RPC batch', () => {
    it('accepts a JSON-RPC batch array on an established session', async () => {
      const app = createApp()
      const { sessionId } = await initializeSession(app)

      const batchRes = await app.handle(
        mcpPost(
          [
            { jsonrpc: '2.0', method: 'ping', id: 10 },
            { jsonrpc: '2.0', method: 'ping', id: 11 },
          ],
          { token: 'valid-token', sessionId },
        ),
      )
      // Batch should be accepted (200)
      expect(batchRes.status).toBe(200)
    })
  })
})

// ── Path Parameter Extraction (unit) ─────────────────────────────────────────

describe('MCP Endpoint — Path Parameter Extraction', () => {
  // Replicates the extractPathParams logic (not exported) for unit testing
  function extractPathParams(path: string, args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {}
    const paramNames = path.match(/:(\w+)/g)
    if (paramNames) {
      for (const param of paramNames) {
        const name = param.slice(1)
        if (args[name] !== undefined) {
          params[name] = String(args[name])
        }
      }
    }
    return params
  }

  it('extracts single path param and removes it from body args', () => {
    const path = '/admin/users/:userId'
    const args: Record<string, unknown> = { userId: '123', name: 'John', email: 'john@example.com' }
    const params = extractPathParams(path, args)
    expect(params).toEqual({ userId: '123' })

    const bodyArgs = { ...args }
    for (const key of Object.keys(params)) delete bodyArgs[key]
    expect(bodyArgs).toEqual({ name: 'John', email: 'john@example.com' })
  })

  it('extracts multiple path params', () => {
    const path = '/admin/groups/:groupId/members/:memberId'
    const args = { groupId: 'g1', memberId: 'm1', role: 'editor' }
    const params = extractPathParams(path, args)
    expect(params).toEqual({ groupId: 'g1', memberId: 'm1' })
  })

  it('returns empty object for routes with no path params', () => {
    const params = extractPathParams('/admin/restart', { force: true })
    expect(params).toEqual({})
  })

  it('converts numeric values to strings', () => {
    const params = extractPathParams('/admin/items/:itemId', { itemId: 42 })
    expect(params.itemId).toBe('42')
    expect(typeof params.itemId).toBe('string')
  })

  it('handles missing path param in args gracefully', () => {
    const params = extractPathParams('/admin/users/:userId', { name: 'John' })
    expect(params).toEqual({})
  })

  it('handles undefined value for path param', () => {
    const params = extractPathParams('/admin/users/:userId', { userId: undefined, name: 'John' })
    expect(params).toEqual({})
  })
})
