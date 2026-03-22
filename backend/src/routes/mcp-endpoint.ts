/**
 * MCP Streamable HTTP Endpoint
 *
 * Exposes the backend's tool-registry as a proper MCP server using the
 * Streamable HTTP transport (Web Standards variant) from @modelcontextprotocol/sdk.
 *
 * Auth: MCP clients discover OAuth via RFC 9728 → Keycloak login → Bearer token.
 * The handler validates the token on every request. Unauthenticated requests
 * receive a 401 with a `WWW-Authenticate` header pointing at the protected
 * resource metadata URL so compliant clients can trigger the OAuth flow.
 *
 * Mounted at `config.mcp.path` (default `/mcp`) via app-factory.
 */

import { Elysia } from 'elysia'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { config } from '../config'
import { validateToken } from '../lib/auth'
import { logger } from '../lib/logger'
import {
  getToolRegistry,
  isToolRegistryInitialized,
  generateToolDefinitions,
} from '../lib/ai/tool-registry'
import { loadMcpEndpointConfig, isToolExposed } from '../lib/mcp-endpoint-config'
import type { ToolMetadata } from '../lib/ai/tool-registry'
import { Value } from '@sinclair/typebox/value'

// ── Session management ───────────────────────────────────────────────────────

interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport
  server: McpServer
}

const sessions = new Map<string, McpSession>()

// ── Tool bridging ────────────────────────────────────────────────────────────

/**
 * Register all exposed tools from the tool-registry onto an McpServer instance.
 */
function registerTools(server: McpServer, userRoles: string[], authToken?: string): void {
  if (!isToolRegistryInitialized()) return

  const registry = getToolRegistry()

  for (const [toolName, meta] of registry) {
    // Respect admin MCP-endpoint tool config
    if (!isToolExposed(toolName)) continue

    // Permission: skip admin-only tools when caller has no admin role
    if (!meta.public && !userRoles.includes('admin')) continue

    // Build JSON-schema for the tool parameters
    const inputSchema = meta.schema
      ? toJsonSchema(meta.schema)
      : { type: 'object' as const, properties: {} }

    server.tool(
      toolName,
      generateDescription(toolName, meta),
      inputSchema,
      async (args: Record<string, unknown>) => {
        return executeTool(toolName, meta, args, authToken)
      },
    )
  }
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

function toJsonSchema(schema: unknown): Record<string, unknown> {
  // Strip TypeBox Symbols and produce clean JSON Schema for MCP SDK
  const clean = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  if (clean.type === 'object') {
    clean.additionalProperties = false
  }
  return clean
}

async function executeTool(
  toolName: string,
  meta: ToolMetadata,
  args: Record<string, unknown>,
  authToken?: string,
) {
  try {
    // Validate args
    if (meta.schema) {
      const valid = Value.Check(meta.schema, args)
      if (!valid) {
        const errors = [...Value.Errors(meta.schema, args)]
        return {
          content: [{ type: 'text' as const, text: `Validation error: ${JSON.stringify(errors)}` }],
          isError: true,
        }
      }
    }

    if (typeof meta.handler !== 'function') {
      return {
        content: [{ type: 'text' as const, text: `Tool ${toolName} has no callable handler.` }],
        isError: true,
      }
    }

    // Build an Elysia-like context so route handlers work correctly.
    // Route handlers expect ({ body, headers, set, params, query, ... }).
    let responseStatus = 200
    const elysiaContext = {
      body: args,
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        'content-type': 'application/json',
      },
      set: {
        status: 200,
        headers: {} as Record<string, string>,
      },
      params: extractPathParams(meta.path, args),
      query: {},
      request: new Request(`http://localhost${meta.path}`, {
        method: meta.method,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'Content-Type': 'application/json',
        },
      }),
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)
    responseStatus = typeof elysiaContext.set.status === 'number' ? elysiaContext.set.status : 200
    
    // If the handler set an error status, report it
    if (responseStatus >= 400) {
      return {
        content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        isError: true,
      }
    }

    return {
      content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [{ type: 'text' as const, text: `Error executing ${toolName}: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    }
  }
}

/**
 * Extract path parameters from route path and args.
 * e.g. path="/admin/users/:userId", args={userId: "123"} → {userId: "123"}
 */
function extractPathParams(path: string, args: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {}
  const paramNames = path.match(/:(\w+)/g)
  if (paramNames) {
    for (const param of paramNames) {
      const name = param.slice(1) // remove leading ':'
      if (args[name] !== undefined) {
        params[name] = String(args[name])
      }
    }
  }
  return params
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

  const token = authHeader.substring(7)
  try {
    const payload = await validateToken(token)
    // Extract Keycloak roles
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
      error: { code: -32001, message: 'Unauthorized — Bearer token required' },
      id: null,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    },
  )
}

// ── Core request handler ─────────────────────────────────────────────────────

async function handleMcpRequest(request: Request): Promise<Response> {
  // Check master switch (runtime config file overrides env-based config)
  const endpointCfg = loadMcpEndpointConfig()
  if (!endpointCfg.enabled && !config.mcp.enabled) {
    return new Response(JSON.stringify({ error: 'MCP endpoint is disabled' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Authenticate
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const sessionId = request.headers.get('mcp-session-id')

  // ── Existing session ───────────────────────────────────────────────────
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    return session.transport.handleRequest(request)
  }

  // ── New session (initialization) ───────────────────────────────────────
  if (request.method === 'POST') {
    const body = await request.json()

    if (isInitializeRequest(body)) {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server })
          logger.server.info('MCP session initialized', { sessionId: sid, sub: auth.sub })
        },
        onsessionclosed: (sid) => {
          sessions.delete(sid)
          logger.server.info('MCP session closed', { sessionId: sid })
        },
      })

      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId)
        }
      }

      const server = new McpServer(
        { name: config.displayName, version: config.version },
        { capabilities: { tools: { listChanged: false } } },
      )

      // Bridge tool-registry → MCP tools
      registerTools(server, auth.roles, auth.token)

      await server.connect(transport)

      return transport.handleRequest(request, { parsedBody: body })
    }
  }

  // Bad request
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session or initialization request' },
      id: null,
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

export async function closeMcpEndpoint(): Promise<void> {
  for (const [sid, session] of sessions) {
    try {
      await session.transport.close()
    } catch (err) {
      logger.server.error('Error closing MCP transport', { sessionId: sid, error: String(err) })
    }
  }
  sessions.clear()
  logger.server.info('All MCP endpoint sessions closed')
}

// ── Elysia route ─────────────────────────────────────────────────────────────

export const mcpEndpointRoutes = new Elysia({ tags: ['mcp-endpoint'] })
  .all('/mcp', ({ request }) => handleMcpRequest(request), {
    detail: {
      summary: 'MCP Streamable HTTP Endpoint',
      description:
        'Model Context Protocol endpoint (Streamable HTTP transport). ' +
        'Supports POST (tool calls / initialize), GET (SSE notifications), DELETE (session teardown). ' +
        'Requires Bearer token — unauthenticated requests receive 401 with RFC 9728 discovery link.',
      tags: ['mcp-endpoint'],
    },
  })
