// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * MCP Streamable HTTP Endpoint
 *
 * Exposes the backend's tool-registry as a proper MCP server using the
 * Streamable HTTP transport from @modelcontextprotocol/server.
 *
 * Auth: MCP clients discover OAuth via RFC 9728, login via Keycloak, pass Bearer token.
 * The handler validates the token on every request. Unauthenticated requests
 * receive a 401 with a `WWW-Authenticate` header pointing at the protected
 * resource metadata URL so compliant clients can trigger the OAuth flow.
 *
 * Mounted at `config.mcp.path` (default `/mcp`) via app-factory.
 */

import { Elysia } from 'elysia'
import * as z from 'zod'
import {
  McpServer,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import { isOriginAllowed } from '@/lib/cors-origins'

import {
  typeboxToSchema,
  originGuard,
  closeWhenFinished,
  executeTool as pkgExecuteTool,
  executeResource as pkgExecuteResource,
  getMergedInputSchema,
  DISPATCH_APP_KEY,
} from '@max-health-inc/elysia-mcp'
import type { ToolMetadata, ResourceMetadata } from '@max-health-inc/elysia-mcp'

import { config } from '../config'
import { validateToken } from '../lib/auth'
import { getMcpResourceAudience } from '../lib/token-audience'
import {
  getToolRegistry,
  isToolRegistryInitialized,
  getResourceRegistry,
  isResourceRegistryInitialized,
  pathToResourceUri,
  getDispatchApp,
} from '../lib/ai/tool-registry'
import { loadMcpEndpointConfig, isToolExposed, isResourceExposed } from '../lib/mcp-endpoint-config'
import { MCP_SCOPE_CHALLENGE } from '../lib/oauth-scopes'
import { searchDocumentation } from '../lib/ai/rag-tools'
import { registerReadResourceTool } from '../lib/ai/read-resource-tool'
import { createAdminClient } from '../lib/keycloak-plugin'
import { getAccessControlInstance } from '../lib/access-control/plugin'

// No session store: this endpoint is stateless (see handleMcpRequest). The
// SessionManager that used to live here held transports in PROCESS MEMORY, so
// every deploy silently invalidated every live connection and the next request
// got `404 Session not found` — on an environment that redeploys many times a
// day, that is most of them.

// Domain-specific context decorators injected into tool/resource execution.
// The dispatch app (resolved lazily — it is registered after this module loads)
// routes execution through the real Elysia pipeline so guards, response-schema
// coercion, and lifecycle hooks (e.g. admin audit logging) all run. The
// getAdmin / getAccessControl decorators remain for the synthetic fallback path.
function buildContextDecorators(): Record<string, unknown> {
  const decorators: Record<string, unknown> = {
    getAdmin: createAdminClient,
    getAccessControl: getAccessControlInstance,
  }
  const app = getDispatchApp()
  if (app) decorators[DISPATCH_APP_KEY] = app
  return decorators
}

// ── Tool bridging ────────────────────────────────────────────────────────────

/**
 * Register all exposed tools from the tool-registry onto an McpServer instance.
 * Mutation tools (POST/PUT/DELETE) are registered individually.
 * GET (read-only) tools are collapsed into a single `read_resource` tool.
 */
function registerTools(server: McpServer, userRoles: string[], tokenRef: { current?: string }): void {
  const contextDecorators = buildContextDecorators()
  if (isToolRegistryInitialized()) {
    const registry = getToolRegistry()

    for (const [toolName, meta] of registry) {
      if (!isToolExposed(toolName)) continue
      if (meta.readOnly) continue
      if (!meta.public && !userRoles.includes('admin')) continue

      const inputSchema = getMergedInputSchema(meta)
      const toolSchema = inputSchema ? typeboxToSchema(inputSchema) : undefined
      const description = generateDescription(toolName, meta)
      // Behavioural hints derived from the HTTP verb (destructiveHint for
      // delete_*, idempotentHint for update_*/PUT, etc.) so MCP clients can
      // flag destructive admin operations. See elysia-mcp `annotationsForMethod`.
      const annotations = meta.annotations

      if (toolSchema) {
        server.registerTool(
          toolName,
          { description, inputSchema: toolSchema, annotations },
          async (args: unknown) =>
            pkgExecuteTool(toolName, meta, args as Record<string, unknown>, tokenRef.current, contextDecorators),
        )
      } else {
        server.registerTool(
          toolName,
          { description, annotations },
          async () =>
            pkgExecuteTool(toolName, meta, {}, tokenRef.current, contextDecorators),
        )
      }
    }
  }

  // RAG documentation search (domain-specific, not auto-generated)
  if (isToolExposed('search_documentation')) {
    server.registerTool(
      'search_documentation',
      {
        description:
          'Search the platform documentation knowledge base using semantic similarity. Use this when asked about platform features, configuration, SMART on FHIR concepts, admin UI, OAuth flows, or anything the docs might cover.',
        inputSchema: z.object({
                  query: z.string().describe('The search query to find relevant documentation'),
                  limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
                }),
      },
      async ({ query, limit }) => {
        try {
          const result = await searchDocumentation(query, (limit as number | undefined) ?? 5)
          if (result.total_results === 0) {
            return { content: [{ type: 'text' as const, text: 'No relevant documentation found.' }] }
          }
          const text = result.documents
            .map((doc) => `## ${doc.title}\n\n${doc.content}\n\n_Source: ${doc.source}_`)
            .join('\n\n---\n\n')
          return { content: [{ type: 'text' as const, text }] }
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Documentation search failed: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          }
        }
      },
    )
  }

  // Unified read_resource tool (collapses GET route tools into one)
  const cfg = loadMcpEndpointConfig()
  if (cfg.exposeResourcesAsTools && isToolExposed('read_resource')) {
    registerReadResourceTool(server, userRoles, tokenRef)
  }
}

// ── Resource bridging ────────────────────────────────────────────────────────

function registerResources(server: McpServer, userRoles: string[], tokenRef: { current?: string }): void {
  if (!isResourceRegistryInitialized()) return

  const contextDecorators = buildContextDecorators()
  const registry = getResourceRegistry()

  for (const [resourceName, meta] of registry) {
    if (!isResourceExposed(resourceName)) continue
    if (!meta.public && !userRoles.includes('admin')) continue

    const uri = pathToResourceUri(meta.path)
    const description = generateResourceDescription(resourceName, meta)

    if (meta.pathParams.length === 0) {
      server.registerResource(
        resourceName,
        uri,
        { description, mimeType: 'application/json' },
        async () => {
          const result = await pkgExecuteResource(meta, {}, tokenRef.current, contextDecorators)
          return { contents: [{ uri, text: result }] }
        },
      )
    } else {
      const template = new ResourceTemplate(uri, { list: undefined })
      server.registerResource(
        resourceName,
        template,
        { description, mimeType: 'application/json' },
        async (reqUri, variables) => {
          const params: Record<string, string> = {}
          for (const p of meta.pathParams) {
            if (variables[p]) params[p] = String(variables[p])
          }
          const result = await pkgExecuteResource(meta, params, tokenRef.current, contextDecorators)
          return { contents: [{ uri: reqUri.href, text: result }] }
        },
      )
    }
  }
}

// ── Description generators ───────────────────────────────────────────────────

function generateResourceDescription(name: string, meta: ResourceMetadata): string {
  const parts = name.split('_')
  return `Read ${parts.join(' ')}. ${meta.public ? '(Public)' : '(Admin only)'}`
}

function generateDescription(toolName: string, meta: ToolMetadata): string {
  const action = toolName.split('_')[0]
  const resource = toolName.split('_').slice(1).join(' ')
  const descs: Record<string, string> = {
    create: 'Create a new',
    update: 'Update an existing',
    delete: 'Delete an existing',
    list: 'List all',
    get: 'Get details of',
  }
  return `${descs[action] ?? action} ${resource}. ${meta.public ? '(Public)' : '(Admin only)'}`
}

// ── Auth helper ──────────────────────────────────────────────────────────────

interface AuthResult {
  roles: string[]
  sub?: string
  token?: string
}

async function authenticateRequest(request: Request): Promise<AuthResult | Response> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized()
  }

  const token = authHeader.substring(7).trim()
  if (!token) return unauthorized()

  try {
    // MCP tokens are bound to the MCP endpoint resource (RFC 8707) or one of the
    // proxy's own clients (matched on aud/azp): the admin WEBAPP client
    // (admin-ui) and the backend admin-REST service account (admin-service). A
    // patient-facing SMART-app token (FHIR-base aud) is rejected. NB: admin-ui
    // must be accepted independently of adminClientId, which on beta/prod is the
    // service account (admin-service) — see validateAdminToken for the same fix.
    const mcpAudiences = [getMcpResourceAudience()]
    if (config.keycloak.adminUiClientId) mcpAudiences.push(config.keycloak.adminUiClientId)
    if (config.keycloak.adminClientId) mcpAudiences.push(config.keycloak.adminClientId)
    const payload = await validateToken(token, { audience: mcpAudiences })
    const realmRoles: string[] = (payload as Record<string, unknown> & { realm_access?: { roles?: string[] } }).realm_access?.roles ?? []
    const clientRoles: string[] = Object.values(
      (payload as Record<string, unknown> & { resource_access?: Record<string, { roles?: string[] }> }).resource_access ?? {},
    ).flatMap((r) => r?.roles ?? [])
    return { roles: [...new Set([...realmRoles, ...clientRoles])], sub: payload.sub, token }
  } catch {
    return unauthorized()
  }
}

function unauthorized(): Response {
  const baseUrl = config.baseUrl || 'http://localhost:8445'
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized -- Bearer token required' },
      id: null,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        // The challenged scopes are the ones every provisioned client is granted by default,
        // so a client that follows this challenge can actually authorize (see lib/oauth-scopes).
        'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="${MCP_SCOPE_CHALLENGE}"`,
      },
    },
  )
}

// ── Core request handler ─────────────────────────────────────────────────────

async function handleMcpRequest(request: Request): Promise<Response> {
  // Master switch — file-backed config is the single source of truth
  const endpointCfg = loadMcpEndpointConfig()
  const effectiveEnabled = endpointCfg.enabled
  if (!effectiveEnabled) {
    return new Response(JSON.stringify({ error: 'MCP endpoint is disabled' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Origin gate before authentication: a rebound request must be REFUSED, not
  // merely denied a readable response (MCP Streamable HTTP security warning).
  const refused = originGuard(request, isOriginAllowed)
  if (refused) return refused

  // Authenticate. Every request carries its own bearer, which is what makes the
  // stateless posture below safe: authorization is re-established per request
  // rather than captured once and refreshed into a long-lived session.
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  // ── Session operations: 405, because there are no sessions ─────────────
  // The established stateless idiom (SDK v2: "Because serving is per-request and
  // stateless, GET and DELETE (2025 session operations) are answered with 405").
  // A 405 here is benign by design — the Streamable HTTP spec has the client
  // proceed without the standalone stream, and terminateSession() resolve
  // normally. Nothing is lost because nothing was being resumed.
  if (request.method === 'GET' || request.method === 'DELETE') {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed: this endpoint is stateless' },
        id: null,
      }),
      { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } },
    )
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request' }, id: null }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── Serve the request on a fresh server + transport ────────────────────
  // `sessionIdGenerator: undefined` is what makes the transport stateless: it
  // mints no Mcp-Session-Id, so the client never has a session to lose and never
  // has to be routed back to the instance that holds it.
  const body = await request.json()
  const tokenRef = { current: auth.token }

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = new McpServer(
    { name: config.displayName, version: config.version },
    { capabilities: { tools: { listChanged: false }, resources: { listChanged: false } } },
  )

  // Tools are filtered by the roles on THIS request's token, so a token that lost
  // a role stops seeing those tools immediately rather than at session expiry.
  registerTools(server, auth.roles, tokenRef)
  registerResources(server, auth.roles, tokenRef)

  await server.connect(transport)
  const response = await transport.handleRequest(request, { parsedBody: body })

  // Release the transport when the RESPONSE IS DONE, not when handleRequest
  // returns. handleRequest resolves as soon as the Response object exists, which
  // for a streamed (SSE) reply is before a single byte of body has been written —
  // closing there truncates it to an empty 200.
  return closeWhenFinished(response, transport, server)
}

// ── Elysia route ─────────────────────────────────────────────────────────────

export const mcpEndpointRoutes = new Elysia({ tags: ['mcp-endpoint'] })
  .all('/mcp', ({ request }) => handleMcpRequest(request), {
    detail: {
      summary: 'MCP Streamable HTTP Endpoint',
      description:
        'Model Context Protocol endpoint (Streamable HTTP transport). ' +
        'Supports POST (tool calls / initialize), GET (SSE notifications), DELETE (session teardown). ' +
        'Requires Bearer token -- unauthenticated requests receive 401 with RFC 9728 discovery link.',
      tags: ['mcp-endpoint'],
    },
  })
