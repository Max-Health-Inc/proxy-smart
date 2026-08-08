// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

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
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import { originGuard, closeWhenFinished } from '@max-health-inc/elysia-mcp'
import { config } from '../config'
import { isOriginAllowed } from '../lib/cors-origins'
import { validateToken } from '../lib/auth'
import { getServerInfoByName, ensureServersInitialized } from '../lib/fhir-server-store'
import { registerFhirToolsForServer } from '../lib/ai/fhir-tools'

// Stateless: no session store, no TTL sweeper, no max-session ceiling. Each
// request is served by a fresh server + transport bound to the bearer on THAT
// request, so there is nothing to expire, nothing to route back to a particular
// instance, and nothing for a deploy to invalidate.

// ── Route ────────────────────────────────────────────────────────────────────

export const fhirMcpRoutes = new Elysia()
  .all('/fhir/:server_id/mcp', async ({ params, request, set }) => {
    const { server_id } = params

    // Origin gate before anything else — see originGuard.
    const refused = originGuard(request, isOriginAllowed)
    if (refused) return refused

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
    try {
      // Validated for its own sake: the payload is not needed once sessions are
      // gone (there is no owner to bind a session to), but the token must still
      // be proven good before it is forwarded to FHIR as this request's identity.
      await validateToken(token)
    } catch {
      set.status = 401
      return { error: 'unauthorized', message: 'Invalid or expired token' }
    }

    // Session operations have nothing to operate on — see the note above.
    if (request.method === 'GET' || request.method === 'DELETE') {
      set.status = 405
      set.headers['allow'] = 'POST'
      return { error: 'method_not_allowed', message: 'This endpoint is stateless' }
    }

    // Parse request body for MCP protocol
    let body: unknown
    try {
      body = await request.json()
    } catch {
      set.status = 400
      return { error: 'invalid_request', message: 'Invalid JSON body' }
    }

    const tokenRef: { current?: string } = { current: token }
    const server = new McpServer({
      name: `proxy-smart-fhir-${server_id}`,
      version: config.version || '1.0.0',
    })

    // Scoped to this server, and to the scopes on THIS request's token.
    registerFhirToolsForServer(server, tokenRef, server_id)

    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)

    const raw = await transport.handleRequest(new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    }))
    const response = closeWhenFinished(raw, transport, server)

    set.status = response.status
    for (const [key, value] of response.headers) {
      set.headers[key] = value
    }
    return response.body ? await response.text() : ''
  })
