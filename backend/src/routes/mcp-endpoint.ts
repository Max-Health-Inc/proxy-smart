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
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod'
import { config } from '../config'
import { validateToken } from '../lib/auth'
import { logger } from '../lib/logger'
import {
  getToolRegistry,
  isToolRegistryInitialized,
  getMergedInputSchema,
  getResourceRegistry,
  isResourceRegistryInitialized,
  pathToResourceUri,
} from '../lib/ai/tool-registry'
import { loadMcpEndpointConfig, isToolExposed, isResourceExposed } from '../lib/mcp-endpoint-config'
import type { ToolMetadata, ResourceMetadata as ResourceMeta } from '../lib/ai/tool-registry'
import { searchDocumentation } from '../lib/ai/rag-tools'
import { registerFhirTools } from '../lib/ai/fhir-tools'
import { Value } from '@sinclair/typebox/value'
import { createAdminClient } from '../lib/keycloak-plugin'
import { getAccessControlInstance } from '../lib/access-control/plugin'

// ── Session management ───────────────────────────────────────────────────────

interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport
  server: McpServer
  /** Mutable token ref — updated on every authenticated request so tool/resource handlers always use the freshest token. */
  tokenRef: { current?: string }
  /** Timestamp of last activity (for TTL eviction) */
  lastActivity: number
  /** Subject (user ID) bound at creation — prevents session hijacking */
  boundSub?: string
}

const sessions = new Map<string, McpSession>()

// Maximum number of concurrent sessions to prevent memory exhaustion
const MAX_SESSIONS = 100
// Session TTL: 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60_000

// Periodic cleanup of expired sessions (every 5 minutes)
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [sid, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(sid)
      logger.server.info('MCP session expired (TTL)', { sessionId: sid })
    }
  }
}, 5 * 60_000)
if (sessionCleanupInterval.unref) sessionCleanupInterval.unref()

// ── Tool bridging ────────────────────────────────────────────────────────────

/**
 * Register all exposed tools from the tool-registry onto an McpServer instance.
 */
function registerTools(server: McpServer, userRoles: string[], tokenRef: { current?: string }): void {
  // Register route-based tools from the tool registry (if initialized)
  if (isToolRegistryInitialized()) {
    const registry = getToolRegistry()
    const cfg = loadMcpEndpointConfig()

    for (const [toolName, meta] of registry) {
      // Respect admin MCP-endpoint tool config
      if (!isToolExposed(toolName)) continue

      // Skip readOnly (GET) tools when exposeResourcesAsTools is disabled
      if (meta.readOnly && !cfg.exposeResourcesAsTools) continue

      // Permission: skip admin-only tools when caller has no admin role
      if (!meta.public && !userRoles.includes('admin')) continue

      // MCP SDK expects Zod schemas — convert merged TypeBox (body + path params) via z.fromJSONSchema
      const inputSchema = getMergedInputSchema(meta)
      const zodSchema = inputSchema ? typeboxToZod(inputSchema) : undefined

      // Add readOnlyHint annotation for GET routes so clients skip confirmation
      const annotations = meta.readOnly
        ? { readOnlyHint: true, idempotentHint: true } as const
        : undefined

      if (zodSchema) {
        server.registerTool(
          toolName,
          {
            description: generateDescription(toolName, meta),
            inputSchema: zodSchema,
            ...(annotations && { annotations }),
          },
          async (args: unknown) => {
            return executeTool(toolName, meta, args as Record<string, unknown>, tokenRef.current)
          },
        )
      } else {
        server.registerTool(
          toolName,
          {
            description: generateDescription(toolName, meta),
            ...(annotations && { annotations }),
          },
          async () => {
            return executeTool(toolName, meta, {}, tokenRef.current)
          },
        )
      }
    }
  }

  // Register RAG documentation search tool independently of tool registry
  // (search_documentation doesn't depend on route-based tools)
  if (isToolExposed('search_documentation')) {
    server.registerTool(
      'search_documentation',
    {
      description:
        'Search the platform documentation knowledge base using semantic similarity. Use this when asked about platform features, configuration, SMART on FHIR concepts, admin UI, OAuth flows, or anything the docs might cover.',
      inputSchema: {
        query: z.string().describe('The search query to find relevant documentation'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
      },
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

  // Register FHIR data tools (fhir_read, fhir_search, fhir_create, fhir_update, fhir_delete, fhir_capabilities)
  registerFhirTools(server, tokenRef)
}

// ── Resource bridging ────────────────────────────────────────────────────────

/**
 * Register all exposed GET routes from the resource registry as MCP resources.
 * Static (no path params) → fixed URI resources.
 * Parameterized → URI template resources.
 */
function registerResources(server: McpServer, userRoles: string[], tokenRef: { current?: string }): void {
  if (!isResourceRegistryInitialized()) return

  const registry = getResourceRegistry()

  for (const [resourceName, meta] of registry) {
    if (!isResourceExposed(resourceName)) continue
    if (!meta.public && !userRoles.includes('admin')) continue

    const uri = pathToResourceUri(meta.path)
    const description = generateResourceDescription(resourceName, meta)

    if (meta.pathParams.length === 0) {
      // Static resource — fixed URI
      server.registerResource(
        resourceName,
        uri,
        { description, mimeType: 'application/json' },
        async () => {
          const result = await executeResource(meta, {}, tokenRef.current)
          return { contents: [{ uri, text: result }] }
        },
      )
    } else {
      // Parameterized resource — URI template
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
          const result = await executeResource(meta, params, tokenRef.current)
          return { contents: [{ uri: reqUri.href, text: result }] }
        },
      )
    }
  }
}

/**
 * Execute a GET route handler and return the serialized result.
 */
async function executeResource(
  meta: ResourceMeta,
  pathParams: Record<string, string>,
  authToken?: string,
): Promise<string> {
  try {
    if (typeof meta.handler !== 'function') {
      return JSON.stringify({ error: 'Resource has no callable handler' })
    }

    const elysiaContext = {
      body: {},
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        'content-type': 'application/json',
      },
      set: {
        status: 200,
        headers: {} as Record<string, string>,
      },
      params: pathParams,
      query: {},
      request: new Request(`http://localhost${meta.path}`, {
        method: 'GET',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }),
      getAdmin: createAdminClient,
      getAccessControl: getAccessControlInstance,
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)

    if (result === undefined || result === null) {
      return JSON.stringify({ success: true })
    }
    return typeof result === 'string' ? result : JSON.stringify(result, serializeErrors, 2)
  } catch (err) {
    return JSON.stringify({ error: `Resource read failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

function generateResourceDescription(name: string, meta: ResourceMeta): string {
  const parts = name.split('_')
  const resource = parts.join(' ')
  return `Read ${resource}. ${meta.public ? '(Public)' : '(Admin only)'}`
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

/**
 * Convert a TypeBox schema to a Zod v4 schema via JSON Schema intermediary.
 * TypeBox schemas ARE JSON Schema (with extra Symbol metadata) — strip Symbols
 * then use Zod v4's built-in z.fromJSONSchema() for a proper Zod type the MCP SDK understands.
 */
function typeboxToZod(schema: unknown): Record<string, z.ZodType> | undefined {
  try {
    const jsonSchema = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
    if (jsonSchema.type !== 'object') return undefined

    // Build a raw shape from JSON Schema properties — the MCP SDK accepts
    // Record<string, AnySchema> (ZodRawShapeCompat) and wraps it internally.
    const properties = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined
    if (!properties) return undefined

    const required = new Set((jsonSchema.required as string[] | undefined) ?? [])
    const shape: Record<string, z.ZodType> = {}

    for (const [key, propSchema] of Object.entries(properties)) {
      let fieldSchema = z.fromJSONSchema(propSchema)
      if (!required.has(key)) {
        fieldSchema = fieldSchema.optional()
      }
      if (propSchema.description && typeof propSchema.description === 'string') {
        fieldSchema = fieldSchema.describe(propSchema.description)
      }
      shape[key] = fieldSchema
    }

    return shape
  } catch (err) {
    logger.warn('Failed to convert TypeBox schema to Zod:', err instanceof Error ? err.message : String(err))
    return undefined
  }
}

/**
 * JSON.stringify replacer that exposes Error properties (message, name, stack)
 * which are otherwise non-enumerable and serialize as `{}`.
 */
function serializeErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message }
  }
  return value
}

async function executeTool(
  toolName: string,
  meta: ToolMetadata,
  args: Record<string, unknown>,
  authToken?: string,
) {
  try {
    // Validate args against merged schema (body + path params)
    const inputSchema = getMergedInputSchema(meta)
    if (inputSchema) {
      const valid = Value.Check(inputSchema, args)
      if (!valid) {
        const errors = [...Value.Errors(inputSchema, args)]
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
    // Route handlers expect ({ body, headers, set, params, query, getAdmin, ... }).
    // Separate path params from body args so handlers receive clean objects.
    const pathParams = extractPathParams(meta.path, args)
    const bodyArgs = { ...args }
    for (const key of Object.keys(pathParams)) {
      delete bodyArgs[key]
    }
    // For GET routes, non-path-param args are query params; for mutations they're body
    const isGetRoute = meta.method === 'GET'
    let responseStatus = 200
    const elysiaContext = {
      body: isGetRoute ? {} : bodyArgs,
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        'content-type': 'application/json',
      },
      set: {
        status: 200,
        headers: {} as Record<string, string>,
      },
      params: pathParams,
      query: isGetRoute ? bodyArgs : {},
      request: new Request(`http://localhost${meta.path}`, {
        method: meta.method,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'Content-Type': 'application/json',
        },
      }),
      // Elysia plugin decorators needed by route handlers
      getAdmin: createAdminClient,
      getAccessControl: getAccessControlInstance,
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)
    responseStatus = typeof elysiaContext.set.status === 'number' ? elysiaContext.set.status : 200

    // Serialize the result — handle void/undefined and Error objects
    const text = result === undefined || result === null
      ? JSON.stringify({ success: true, status: responseStatus })
      : typeof result === 'string'
        ? result
        : JSON.stringify(result, serializeErrors, 2)
    
    // If the handler set an error status, report it
    if (responseStatus >= 400) {
      return {
        content: [{ type: 'text' as const, text }],
        isError: true,
      }
    }

    return {
      content: [{ type: 'text' as const, text }],
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

  const token = authHeader.substring(7).trim()
  if (!token) {
    return unauthorized()
  }
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
        'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="openid profile email"`,
      },
    },
  )
}

// ── Core request handler ─────────────────────────────────────────────────────

async function handleMcpRequest(request: Request): Promise<Response> {
  // Check master switch — file config (admin UI toggle) overrides env-based config.
  // Either source being enabled is sufficient; this matches the admin status endpoint.
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
    // Verify the session belongs to the same user (prevent session hijacking)
    if (session.boundSub && auth.sub && session.boundSub !== auth.sub) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session belongs to a different user' },
          id: null,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    // Update the token ref so tool/resource handlers use the freshest token
    if (auth.token) session.tokenRef.current = auth.token
    // Refresh TTL on activity
    session.lastActivity = Date.now()
    return session.transport.handleRequest(request)
  }

  // ── Unknown session ID → 404 (MCP spec §Session Management rule 3) ────
  if (sessionId) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session not found' },
        id: null,
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── New session (initialization) ───────────────────────────────────────
  if (request.method === 'POST') {
    const body = await request.json()

    if (isInitializeRequest(body)) {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          // Enforce max session limit to prevent memory exhaustion
          if (sessions.size >= MAX_SESSIONS) {
            // Evict the oldest session
            let oldestSid: string | null = null
            let oldestTime = Infinity
            for (const [s, sess] of sessions) {
              if (sess.lastActivity < oldestTime) {
                oldestTime = sess.lastActivity
                oldestSid = s
              }
            }
            if (oldestSid) sessions.delete(oldestSid)
          }
          sessions.set(sid, { transport, server, tokenRef, lastActivity: Date.now(), boundSub: auth.sub })
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
        { capabilities: { tools: { listChanged: false }, resources: { listChanged: false } } },
      )

      // Mutable token reference — closures read from this, updated on each request
      const tokenRef = { current: auth.token }

      // Bridge tool-registry → MCP tools
      registerTools(server, auth.roles, tokenRef)

      // Bridge resource-registry → MCP resources (GET routes)
      registerResources(server, auth.roles, tokenRef)

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
