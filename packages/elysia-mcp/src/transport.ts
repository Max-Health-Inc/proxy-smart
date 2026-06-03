/**
 * @max-health-inc/elysia-mcp - Transport & Session Management
 *
 * Wraps the MCP SDK's WebStandardStreamableHTTPServerTransport with session
 * lifecycle (creation, TTL eviction, max session limits, hijack protection).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import type { ToolMetadata, ResourceMetadata, AuthResult, McpSession, ElysiaMcpOptions, Logger } from './types'
import { typeboxToZod, getMergedInputSchema } from './typebox-to-zod'
import { pathToResourceUri } from './introspect'
import { executeTool, executeResource } from './executor'

// ── Default logger ───────────────────────────────────────────────────────────

const defaultLogger: Logger = {
  info: (msg, data) => console.log(`[elysia-mcp] ${msg}`, data ?? ''),
  warn: (msg, data) => console.warn(`[elysia-mcp] ${msg}`, data ?? ''),
  error: (msg, data) => console.error(`[elysia-mcp] ${msg}`, data ?? ''),
  debug: (msg, data) => console.debug(`[elysia-mcp] ${msg}`, data ?? ''),
}

// ── Session Store ────────────────────────────────────────────────────────────

export class SessionManager {
  private sessions = new Map<string, McpSession>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private maxSessions: number = 100,
    private ttlMs: number = 30 * 60_000,
    private logger: Logger = defaultLogger,
  ) {
    // Periodic cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => this.evictExpired(), 5 * 60_000)
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as { unref: () => void }).unref()
    }
  }

  get(sessionId: string): McpSession | undefined {
    return this.sessions.get(sessionId)
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  set(sessionId: string, session: McpSession): void {
    // Enforce max session limit -- evict oldest
    if (this.sessions.size >= this.maxSessions) {
      let oldestSid: string | null = null
      let oldestTime = Infinity
      for (const [sid, sess] of this.sessions) {
        if (sess.lastActivity < oldestTime) {
          oldestTime = sess.lastActivity
          oldestSid = sid
        }
      }
      if (oldestSid) {
        this.sessions.delete(oldestSid)
        this.logger.info('Evicted oldest MCP session', { sessionId: oldestSid })
      }
    }
    this.sessions.set(sessionId, session)
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  get size(): number {
    return this.sessions.size
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [sid, session] of this.sessions) {
      if (now - session.lastActivity > this.ttlMs) {
        this.sessions.delete(sid)
        this.logger.info('MCP session expired (TTL)', { sessionId: sid })
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.sessions.clear()
  }
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
    const zodSchema = inputSchema ? typeboxToZod(inputSchema) : undefined
    const description = generateToolDescription(toolName, meta)

    if (zodSchema) {
      server.registerTool(
        toolName,
        { description, inputSchema: zodSchema },
        async (args: unknown) => executeTool(toolName, meta, args as Record<string, unknown>, tokenRef.current, options.contextDecorators),
      )
    } else {
      server.registerTool(
        toolName,
        { description },
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
  sessionManager: SessionManager
  logger: Logger
}

/**
 * Create the core MCP request handler function.
 * Handles session creation, lookup, authentication, and request dispatch.
 */
export function createMcpRequestHandler(handlerOpts: McpRequestHandlerOptions) {
  const { tools, resources, options, sessionManager, logger } = handlerOpts
  const serverName = options.name ?? 'elysia-mcp-server'
  const serverVersion = options.version ?? '1.0.0'

  return async function handleMcpRequest(request: Request): Promise<Response> {
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

    const sessionId = request.headers.get('mcp-session-id')

    // ── Existing session ─────────────────────────────────────────────────
    if (sessionId && sessionManager.has(sessionId)) {
      const session = sessionManager.get(sessionId)!

      // Verify session belongs to same user (prevent hijacking)
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

      // Update token & TTL
      if (auth.token) session.tokenRef.current = auth.token
      session.lastActivity = Date.now()

      return (session.transport as WebStandardStreamableHTTPServerTransport).handleRequest(request)
    }

    // ── Unknown session ID -> 404 (MCP spec) ─────────────────────────────
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

    // ── New session (initialization) ─────────────────────────────────────
    if (request.method === 'POST') {
      const body = await request.json()

      if (isInitializeRequest(body)) {
        const tokenRef = { current: auth.token }

        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (sid) => {
            sessionManager.set(sid, {
              transport,
              server,
              tokenRef,
              lastActivity: Date.now(),
              boundSub: auth.sub,
            })
            logger.info('MCP session initialized', { sessionId: sid, sub: auth.sub })
          },
          onsessionclosed: (sid) => {
            sessionManager.delete(sid)
            logger.info('MCP session closed', { sessionId: sid })
          },
        })

        transport.onclose = () => {
          if (transport.sessionId) {
            sessionManager.delete(transport.sessionId)
          }
        }

        const server = new McpServer(
          { name: serverName, version: serverVersion },
          { capabilities: { tools: { listChanged: false }, resources: { listChanged: false } } },
        )

        // Bridge introspected routes -> MCP tools & resources
        const regCtx: RegistrationContext = { tools, resources, options, userRoles: auth.roles, tokenRef }
        registerToolsOnServer(server, regCtx)
        registerResourcesOnServer(server, regCtx)

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
