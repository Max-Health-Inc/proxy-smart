/**
 * Per-Server FHIR MCP Endpoint
 *
 * Exposes FHIR tools (read, search, create, update) scoped to a specific FHIR server
 * as a dedicated MCP endpoint at `/fhir/{server_id}/mcp`.
 *
 * Each server can independently enable/disable its MCP endpoint via the `mcpEnabled`
 * flag in the admin UI. Tools inherit all auth, consent, scope enforcement, and
 * capability-aware normalization from the shared FHIR proxy infrastructure.
 *
 * The user's SMART scopes determine which operations are available:
 * - patient/*.read or user/*.read → fhir_read + fhir_search
 * - patient/*.write or user/*.write → fhir_create + fhir_update
 */

import { Elysia } from 'elysia'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { config } from '../config'
import { validateToken } from '../lib/auth'
import { logger } from '../lib/logger'
import { getServerInfoByName, ensureServersInitialized } from '../lib/fhir-server-store'
import { registerFhirToolsForServer } from '../lib/ai/fhir-tools'

// ── Session management ───────────────────────────────────────────────────────

interface FhirMcpSession {
  transport: WebStandardStreamableHTTPServerTransport
  server: McpServer
  tokenRef: { current?: string }
  lastActivity: number
  boundSub?: string
  serverId: string
}

const sessions = new Map<string, FhirMcpSession>()
const MAX_SESSIONS = 200
const SESSION_TTL_MS = 30 * 60_000

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [sid, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(sid)
      logger.server.info('FHIR MCP session expired (TTL)', { sessionId: sid, serverId: session.serverId })
    }
  }
}, 5 * 60_000)
if (cleanupInterval.unref) cleanupInterval.unref()

// ── Route ────────────────────────────────────────────────────────────────────

export const fhirMcpRoutes = new Elysia()
  .all('/fhir/:server_id/mcp', async ({ params, request, set }) => {
    const { server_id } = params

    // Ensure servers initialized
    await ensureServersInitialized()

    // Validate server exists and has MCP enabled
    const serverInfo = await getServerInfoByName(server_id)
    if (!serverInfo) {
      set.status = 404
      return { error: 'not_found', message: `FHIR server '${server_id}' not found` }
    }
    if (!serverInfo.mcpEnabled) {
      set.status = 403
      return { error: 'mcp_disabled', message: `MCP endpoint is not enabled for server '${server_id}'` }
    }

    // Validate Bearer token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')
      set.status = 401
      set.headers['www-authenticate'] = `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      return { error: 'unauthorized', message: 'Bearer token required' }
    }

    const token = authHeader.slice(7)
    let tokenPayload: Record<string, unknown>
    try {
      tokenPayload = await validateToken(token) as Record<string, unknown>
    } catch {
      set.status = 401
      return { error: 'unauthorized', message: 'Invalid or expired token' }
    }

    const sub = tokenPayload.sub as string | undefined

    // Parse request body for MCP protocol
    let body: unknown
    try {
      body = await request.json()
    } catch {
      set.status = 400
      return { error: 'invalid_request', message: 'Invalid JSON body' }
    }

    // Session handling
    const sessionId = request.headers.get('mcp-session-id')

    // New session (initialize request)
    if (!sessionId || (isInitializeRequest(body) && !sessions.has(sessionId))) {
      // Enforce session limit
      if (sessions.size >= MAX_SESSIONS) {
        set.status = 503
        return { error: 'service_unavailable', message: 'Maximum MCP sessions reached' }
      }

      const tokenRef: { current?: string } = { current: token }
      const server = new McpServer({
        name: `proxy-smart-fhir-${server_id}`,
        version: config.version || '1.0.0',
      })

      // Register FHIR tools scoped to this server
      registerFhirToolsForServer(server, tokenRef, server_id)

      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() })
      await server.connect(transport)

      const response = await transport.handleRequest(new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      }))

      // Store session
      const newSessionId = response.headers.get('mcp-session-id')
      if (newSessionId) {
        sessions.set(newSessionId, {
          transport,
          server,
          tokenRef,
          lastActivity: Date.now(),
          boundSub: sub,
          serverId: server_id,
        })
        logger.server.info('FHIR MCP session created', { sessionId: newSessionId, serverId: server_id, sub })
      }

      // Convert response
      set.status = response.status
      for (const [key, value] of response.headers) {
        set.headers[key] = value
      }
      return response.body ? await response.text() : ''
    }

    // Existing session
    const session = sessions.get(sessionId)
    if (!session) {
      set.status = 404
      return { error: 'session_not_found', message: 'MCP session expired or not found' }
    }

    // Security: validate session is bound to same user
    if (session.boundSub && sub && session.boundSub !== sub) {
      set.status = 403
      return { error: 'forbidden', message: 'Token subject does not match session owner' }
    }

    // Update token ref with freshest token
    session.tokenRef.current = token
    session.lastActivity = Date.now()

    const response = await session.transport.handleRequest(new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    }))

    set.status = response.status
    for (const [key, value] of response.headers) {
      set.headers[key] = value
    }
    return response.body ? await response.text() : ''
  })
