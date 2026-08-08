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
import { McpServer } from '@modelcontextprotocol/server'
import { createMcpHttpHandler } from '@maxhealth.tech/mcp-http'
import type { McpHandler } from '@maxhealth.tech/mcp-http'
import { config } from '../config'
import { isOriginAllowed } from '../lib/cors-origins'
import { validateToken } from '../lib/auth'
import { getServerInfoByName, ensureServersInitialized } from '../lib/fhir-server-store'
import { registerFhirToolsForServer } from '../lib/ai/fhir-tools'

// Stateless: no session store, no TTL sweeper, no max-session ceiling. Each
// request is served by a fresh server bound to the bearer on THAT request, so
// there is nothing to expire, nothing to route back to a particular instance,
// and nothing for a deploy to invalidate.
//
// The HTTP edge — Origin gate, Bearer gate, RFC 9728 challenge, CORS, the
// Streamable HTTP lifecycle — is @maxhealth.tech/mcp-http rather than hand
// written here. It tracks the 2026-07-28 protocol through the SDK's own
// handler, which this endpoint did not implement at all.

/** A token that parses but does not validate. Mapped to a 401 in `onError`. */
class McpUnauthorizedError extends Error {}

/**
 * Allowed-origin bridge.
 *
 * mcp-http asks for the origin to echo (or null to refuse); we answer from the
 * repo's own allow-list. A request with no Origin is allowed upstream, which
 * keeps non-browser clients working.
 */
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin')
  if (!origin) return null
  return isOriginAllowed(origin) ? origin : null
}

/**
 * One handler per FHIR server, built lazily and reused.
 *
 * `mcpPath` has to match the mounted path exactly, and this endpoint is
 * per-server, so the handler is keyed by server id rather than built once.
 */
const handlers = new Map<string, McpHandler>()

function handlerFor(serverId: string): McpHandler {
  const existing = handlers.get(serverId)
  if (existing) return existing

  const handler = createMcpHttpHandler({
    mcpPath: `/fhir/${serverId}/mcp`,
    authorizationServer: config.keycloak.expectedIssuer ?? undefined,
    cors: { origin: allowedOrigin },
    createServer: async (token) => {
      // Validated for its own sake: the payload is not needed once sessions are
      // gone, but the token must be proven good before it is forwarded to FHIR
      // as this request's identity.
      try {
        await validateToken(token ?? '')
      } catch {
        throw new McpUnauthorizedError('Invalid or expired token')
      }

      const server = new McpServer({
        name: `proxy-smart-fhir-${serverId}`,
        version: config.version || '1.0.0',
      })
      // Scoped to this server, and to the scopes on THIS request's token.
      registerFhirToolsForServer(server, { current: token ?? undefined }, serverId)
      return server
    },
    // A createServer throw is an internal error upstream, which would turn a bad
    // token into a 500. Map it back to the 401 the client can act on.
    onError: (err) =>
      err instanceof McpUnauthorizedError
        ? new Response(
            JSON.stringify({ error: 'unauthorized', message: err.message }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          )
        : undefined,
  })

  handlers.set(serverId, handler)
  return handler
}

// ── Route ────────────────────────────────────────────────────────────────────

export const fhirMcpRoutes = new Elysia()
  .all('/fhir/:server_id/mcp', async ({ params, request }) => {
    const { server_id } = params

    // Server resolution stays here: it is this endpoint's own concern, and both
    // answers are about the server rather than the MCP exchange, so they are
    // settled before the protocol handler is involved.
    await ensureServersInitialized()

    const serverInfo = await getServerInfoByName(server_id)
    if (!serverInfo) {
      return Response.json(
        { error: 'not_found', message: `FHIR server '${server_id}' not found` },
        { status: 404 },
      )
    }
    if (!serverInfo.mcpEnabled) {
      return Response.json(
        { error: 'mcp_disabled', message: `MCP endpoint is not enabled for server '${server_id}'` },
        { status: 403 },
      )
    }

    // Everything from here — Origin, Bearer, method, transport — is mcp-http.
    return handlerFor(server_id)(request)
  })
