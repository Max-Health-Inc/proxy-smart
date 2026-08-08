// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp - Transport & Session Management
 *
 * Wraps the MCP SDK's WebStandardStreamableHTTPServerTransport with session
 * lifecycle (creation, TTL eviction, max session limits, hijack protection).
 */

import {
  McpServer,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server'
import type { ToolMetadata, ResourceMetadata, AuthResult, ElysiaMcpOptions, Logger } from './types'
import { typeboxToSchema, getMergedInputSchema } from './typebox-schema'
import { pathToResourceUri } from './introspect'
import { executeTool, executeResource } from './executor'

// ── HTTP header contract ─────────────────────────────────────────────────────

/**
 * Request headers a Streamable HTTP client sends, which a CORS preflight must allow.
 *
 * `Mcp-Method` and `Mcp-Name` are REQUIRED of clients from MCP 2026-07-28 (Streamable
 * HTTP, "Standard Request Headers") so intermediaries can route and inspect a request
 * without parsing the JSON-RPC body. A server that omits them from
 * Access-Control-Allow-Headers fails the preflight of any browser-based client that
 * sends them — which, being required, is every conformant one.
 */
export const MCP_REQUEST_HEADERS = [
  'Mcp-Session-Id',
  'Mcp-Protocol-Version',
  'Mcp-Method',
  'Mcp-Name',
  // Sent by 2025-era clients resuming an SSE stream. This server is stateless and
  // has nothing to resume, but the spec says ignore it rather than reject it — and
  // omitting it from the allow-list would fail those clients' preflight outright.
  'Last-Event-ID',
] as const

/**
 * Response headers a browser-based client must be able to READ, which only
 * Access-Control-Expose-Headers grants — the allow-list above does not.
 *
 * Deliberately short. `Mcp-Session-Id` used to be here, and had to be while the
 * server was stateful: it came back on initialize and the client had to echo it.
 * Statelessly there is no session id to emit, so exposing it advertised a header
 * that is never sent. `Last-Event-ID` likewise — it is a REQUEST header for stream
 * resumption, and belongs in the allow-list above rather than here.
 */
export const MCP_EXPOSED_RESPONSE_HEADERS = [
  'Mcp-Protocol-Version',
] as const

/**
 * Refuse a request whose `Origin` the host does not allow.
 *
 * MCP Streamable HTTP, Security Warning: *"Servers MUST validate the `Origin`
 * header on all incoming connections to prevent DNS rebinding attacks. If the
 * `Origin` header is present and invalid, servers MUST respond with HTTP 403
 * Forbidden."*
 *
 * A CORS policy alone does not satisfy this. Omitting `Access-Control-Allow-Origin`
 * only makes the RESPONSE unreadable to the page — the request still reaches the
 * handler and still executes, which is precisely the case the 403 exists to stop.
 *
 * An absent `Origin` is NOT a failure: non-browser clients (the ones that carry a
 * bearer token) do not send one, and the spec conditions the 403 on the header
 * being present and invalid.
 *
 * @param isOriginAllowed The host's policy. Kept as a callback so this package
 *   never owns a second, subtly different allow-list to the one the host's CORS
 *   layer already enforces.
 * @returns A 403 Response to return immediately, or null to continue.
 */
export function originGuard(
  request: Request,
  isOriginAllowed: (origin: string) => boolean,
): Response | null {
  const origin = request.headers.get('origin')
  if (!origin || isOriginAllowed(origin)) return null

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      // The spec allows an id-less JSON-RPC error body here; the request may not
      // even have parsed as JSON-RPC, so there is no id to echo.
      error: { code: -32000, message: 'Forbidden -- Origin not allowed' },
      id: null,
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}

// (The SessionManager that lived here is gone: this transport is stateless.
// It held transports in PROCESS MEMORY, which made every deploy invalidate every
// live connection and forced sticky routing across instances — see SEP-2575.)

/**
 * Tie a per-request server + transport lifetime to the response body.
 *
 * `handleRequest` resolves as soon as the Response OBJECT exists, which for a
 * streamed (SSE) reply is before a single byte of body has been written. Closing
 * the transport there truncates the reply to an empty 200 — which is exactly what
 * happened the first time this was written with a `finally` block.
 *
 * A bodyless response is released immediately; a streamed one is piped through a
 * pass-through whose `flush` fires only after the last chunk, so the transport
 * stays open for precisely as long as it is still writing. Without any release at
 * all the process accumulates one dead server per request.
 */
export function closeWhenFinished(
  response: Response,
  transport: { close(): Promise<void> },
  server: { close(): Promise<void> },
): Response {
  const release = () => {
    void transport.close().catch(() => {})
    void server.close().catch(() => {})
  }

  if (!response.body) {
    release()
    return response
  }

  const instrumented = response.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) { controller.enqueue(chunk) },
      flush: release,
    }),
  )

  return new Response(instrumented, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

// ── Tool/Resource Registration ───────────────────────────────────────────────

export interface RegistrationContext {
  tools: Map<string, ToolMetadata>
  resources: Map<string, ResourceMetadata>
  options: ElysiaMcpOptions
  userRoles: string[]
  tokenRef: { current?: string }
}

/**
 * Register extracted tools on an MCP server instance.
 */
export function registerToolsOnServer(server: McpServer, ctx: RegistrationContext): void {
  const { tools, options, userRoles, tokenRef } = ctx
  const filter = options.toolFilter

  for (const [toolName, meta] of tools) {
    // Skip read-only tools (they're resources, not tools, unless opted in)
    if (meta.readOnly && !options.exposeResourcesAsTools) continue

    // Permission: skip non-public tools when caller has no admin role
    if (!meta.public && !userRoles.includes('admin')) continue

    // Custom filter
    if (filter && !filter(toolName, meta)) continue

    const inputSchema = getMergedInputSchema(meta)
    const toolSchema = inputSchema ? typeboxToSchema(inputSchema) : undefined
    const description = generateToolDescription(toolName, meta)
    const annotations = meta.annotations

    if (toolSchema) {
      server.registerTool(
        toolName,
        { description, inputSchema: toolSchema, annotations },
        async (args: unknown) => executeTool(toolName, meta, args as Record<string, unknown>, tokenRef.current, options.contextDecorators),
      )
    } else {
      server.registerTool(
        toolName,
        { description, annotations },
        async () => executeTool(toolName, meta, {}, tokenRef.current, options.contextDecorators),
      )
    }
  }
}

/**
 * Register extracted resources on an MCP server instance.
 */
export function registerResourcesOnServer(server: McpServer, ctx: RegistrationContext): void {
  const { resources, options, userRoles, tokenRef } = ctx
  const filter = options.resourceFilter
  const scheme = options.resourceUriScheme ?? 'app'

  for (const [resourceName, meta] of resources) {
    if (!meta.public && !userRoles.includes('admin')) continue
    if (filter && !filter(resourceName, meta)) continue

    const uri = pathToResourceUri(meta.path, scheme)
    const description = generateResourceDescription(resourceName, meta)

    if (meta.pathParams.length === 0) {
      // Static resource
      server.registerResource(
        resourceName,
        uri,
        { description, mimeType: 'application/json' },
        async () => {
          const result = await executeResource(meta, {}, tokenRef.current, options.contextDecorators)
          return { contents: [{ uri, text: result }] }
        },
      )
    } else {
      // Parameterized resource -- URI template
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
          const result = await executeResource(meta, params, tokenRef.current, options.contextDecorators)
          return { contents: [{ uri: reqUri.href, text: result }] }
        },
      )
    }
  }
}

// ── Request Handler Factory ──────────────────────────────────────────────────

export interface McpRequestHandlerOptions {
  tools: Map<string, ToolMetadata>
  resources: Map<string, ResourceMetadata>
  options: ElysiaMcpOptions
  logger: Logger
}

/**
 * Create the core MCP request handler function.
 * Authenticates, gates on Origin, and serves each request statelessly.
 */
export function createMcpRequestHandler(handlerOpts: McpRequestHandlerOptions) {
  const { tools, resources, options } = handlerOpts
  const serverName = options.name ?? 'elysia-mcp-server'
  const serverVersion = options.version ?? '1.0.0'

  return async function handleMcpRequest(request: Request): Promise<Response> {
    // Origin gate first: a rebound request must be refused, not merely denied a
    // readable response (see originGuard).
    if (options.isOriginAllowed) {
      const refused = originGuard(request, options.isOriginAllowed)
      if (refused) return refused
    }

    // Authenticate
    let auth: AuthResult = { roles: [] }
    if (options.authenticate) {
      const result = await options.authenticate(request)
      if (!result) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Unauthorized' },
            id: null,
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }
      auth = result
    }

    // ── Session operations: 405, because there are no sessions ───────────
    // Stateless serving (sessionIdGenerator: undefined) means GET and DELETE —
    // the 2025-era session verbs — have nothing to act on. The Streamable HTTP
    // spec makes a 405 here benign: the client proceeds without the standalone
    // stream, and terminateSession() resolves normally.
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

    // ── Serve on a fresh server + transport ──────────────────────────────
    const body = await request.json()
    const tokenRef = { current: auth.token }

    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const server = new McpServer(
      { name: serverName, version: serverVersion },
      { capabilities: { tools: { listChanged: false }, resources: { listChanged: false } } },
    )

    // Bridge introspected routes -> MCP tools & resources, filtered by the roles
    // on THIS request's token rather than the ones captured when a session opened.
    const regCtx: RegistrationContext = { tools, resources, options, userRoles: auth.roles, tokenRef }
    registerToolsOnServer(server, regCtx)
    registerResourcesOnServer(server, regCtx)

    await server.connect(transport)
    const response = await transport.handleRequest(request, { parsedBody: body })
    return closeWhenFinished(response, transport, server)
  }
}

// ── Description generators ───────────────────────────────────────────────────

function generateToolDescription(toolName: string, meta: ToolMetadata): string {
  const action = toolName.split('_')[0]
  const resource = toolName.split('_').slice(1).join(' ')
  const descs: Record<string, string> = {
    create: 'Create a new',
    update: 'Update an existing',
    delete: 'Delete an existing',
    list: 'List all',
    get: 'Get details of',
  }
  return `${descs[action] ?? action} ${resource}. ${meta.public ? '(Public)' : '(Requires authentication)'}`
}

function generateResourceDescription(name: string, meta: ResourceMetadata): string {
  const parts = name.split('_')
  const resource = parts.join(' ')
  return `Read ${resource}. ${meta.public ? '(Public)' : '(Requires authentication)'}`
}
