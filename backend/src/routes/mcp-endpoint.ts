/**
 * MCP Streamable HTTP Endpoint
 *
 * Exposes the backend's tool-registry as a proper MCP server using the
 * Streamable HTTP transport from @modelcontextprotocol/sdk.
 *
 * Auth: MCP clients discover OAuth via RFC 9728, login via Keycloak, pass Bearer token.
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

import {
  SessionManager,
  typeboxToZod,
  executeTool as pkgExecuteTool,
  executeResource as pkgExecuteResource,
  getMergedInputSchema,
  DISPATCH_APP_KEY,
} from '@max-health-inc/elysia-mcp'
import type { ToolMetadata, ResourceMetadata } from '@max-health-inc/elysia-mcp'

import { config } from '../config'
import { validateToken } from '../lib/auth'
import { getMcpResourceAudience } from '../lib/token-audience'
import { logger } from '../lib/logger'
import {
  getToolRegistry,
  isToolRegistryInitialized,
  getResourceRegistry,
  isResourceRegistryInitialized,
  pathToResourceUri,
  getDispatchApp,
} from '../lib/ai/tool-registry'
import { loadMcpEndpointConfig, isToolExposed, isResourceExposed } from '../lib/mcp-endpoint-config'
import { searchDocumentation } from '../lib/ai/rag-tools'
import { registerReadResourceTool } from '../lib/ai/read-resource-tool'
import { createAdminClient } from '../lib/keycloak-plugin'
import { getAccessControlInstance } from '../lib/access-control/plugin'

// ── Session management (delegated to package) ────────────────────────────────

const sessionManager = new SessionManager(100, 30 * 60_000, {
  info: (msg, data) => logger.server.info(msg, data),
  warn: (msg, data) => logger.warn('mcp', msg, data),
  error: (msg, data) => logger.error('mcp', msg, data),
})

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
      const zodSchema = inputSchema ? typeboxToZod(inputSchema) : undefined
      const description = generateDescription(toolName, meta)

      if (zodSchema) {
        server.registerTool(
          toolName,
          { description, inputSchema: zodSchema },
          async (args: unknown) =>
            pkgExecuteTool(toolName, meta, args as Record<string, unknown>, tokenRef.current, contextDecorators),
        )
      } else {
        server.registerTool(
          toolName,
          { description },
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
    // MCP tokens are bound to the MCP endpoint resource (RFC 8707) or the proxy's
    // own client. A patient-facing SMART-app token (FHIR-base aud) is rejected.
    const mcpAudiences = [getMcpResourceAudience()]
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
        'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="openid profile email"`,
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

  // Authenticate
  const auth = await authenticateRequest(request)
  if (auth instanceof Response) return auth

  const sessionId = request.headers.get('mcp-session-id')

  // ── Existing session ───────────────────────────────────────────────────
  if (sessionId && sessionManager.has(sessionId)) {
    const session = sessionManager.get(sessionId)!
    if (session.boundSub && auth.sub && session.boundSub !== auth.sub) {
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Session belongs to a different user' }, id: null }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (auth.token) session.tokenRef.current = auth.token
    session.lastActivity = Date.now()
    return (session.transport as WebStandardStreamableHTTPServerTransport).handleRequest(request)
  }

  // ── Unknown session ID -> 404 ──────────────────────────────────────────
  if (sessionId) {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── New session (initialization) ───────────────────────────────────────
  if (request.method === 'POST') {
    const body = await request.json()

    if (isInitializeRequest(body)) {
      const tokenRef = { current: auth.token }

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          sessionManager.set(sid, { transport, server, tokenRef, lastActivity: Date.now(), boundSub: auth.sub })
          logger.server.info('MCP session initialized', { sessionId: sid, sub: auth.sub })
        },
        onsessionclosed: (sid) => {
          sessionManager.delete(sid)
          logger.server.info('MCP session closed', { sessionId: sid })
        },
      })

      transport.onclose = () => {
        if (transport.sessionId) sessionManager.delete(transport.sessionId)
      }

      const server = new McpServer(
        { name: config.displayName, version: config.version },
        { capabilities: { tools: { listChanged: false }, resources: { listChanged: false } } },
      )

      registerTools(server, auth.roles, tokenRef)
      registerResources(server, auth.roles, tokenRef)

      await server.connect(transport)
      return transport.handleRequest(request, { parsedBody: body })
    }
  }

  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session or initialization request' }, id: null }),
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
        'Requires Bearer token -- unauthenticated requests receive 401 with RFC 9728 discovery link.',
      tags: ['mcp-endpoint'],
    },
  })
