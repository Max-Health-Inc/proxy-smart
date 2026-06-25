/**
 * @max-health-inc/elysia-mcp
 *
 * Auto-generate MCP (Model Context Protocol) tools and resources from Elysia
 * routes via introspection. Zero manual tool definitions required.
 *
 * Features:
 * - Route introspection: reads Elysia's internal route table
 * - TypeBox -> Zod bridge: converts Elysia's type system to MCP SDK's Zod
 * - Streamable HTTP transport: modern MCP protocol (not deprecated SSE)
 * - Session management: TTL, max sessions, hijack protection
 * - Permission filtering: role-based tool/resource exposure
 * - Context injection: pass decorators to route handlers
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { elysiaMcp } from '@max-health-inc/elysia-mcp'
 *
 * const app = new Elysia()
 *   .post('/admin/users', handler, { body: t.Object({ name: t.String() }) })
 *   .get('/admin/branding', handler)
 *   .use(elysiaMcp({
 *     path: '/mcp',
 *     prefixes: ['/admin/'],
 *     name: 'my-server',
 *     version: '1.0.0',
 *     authenticate: async (req) => {
 *       const token = req.headers.get('authorization')?.slice(7)
 *       if (!token) return null
 *       const payload = await verify(token)
 *       return { roles: payload.roles, sub: payload.sub, token }
 *     },
 *   }))
 *   .listen(3000)
 * ```
 */

import { Elysia } from 'elysia'
import { extractRouteTools, extractRouteResources } from './introspect'
import { createMcpRequestHandler, SessionManager } from './transport'
import type { ElysiaMcpOptions, Logger } from './types'

// Default logger
const defaultLogger: Logger = {
  info: (msg, data) => console.log(`[elysia-mcp] ${msg}`, data ?? ''),
  warn: (msg, data) => console.warn(`[elysia-mcp] ${msg}`, data ?? ''),
  error: (msg, data) => console.error(`[elysia-mcp] ${msg}`, data ?? ''),
  debug: (msg, data) => console.debug(`[elysia-mcp] ${msg}`, data ?? ''),
}

/**
 * Elysia plugin that auto-generates an MCP endpoint from your existing routes.
 *
 * Mount AFTER all target routes are registered (Elysia evaluates plugins in order).
 *
 * Alternatively, use `createElysiaMcp()` for deferred initialization when you
 * need to call `initialize(app)` explicitly after all routes are mounted.
 */
export function elysiaMcp(options: ElysiaMcpOptions = {}) {
  const path = options.path ?? '/mcp'
  const logger = options.logger ?? defaultLogger

  // Handler reference -- populated in onStart
  let mcpHandler: ((req: Request) => Promise<Response>) | null = null

  return new Elysia({ name: '@max-health-inc/elysia-mcp' })
    .onStart((app) => {
      // Introspect routes at startup (after all routes are mounted)
      const tools = extractRouteTools(app, {
        prefixes: options.prefixes,
        toolNameGenerator: options.toolNameGenerator,
        resourceNameGenerator: options.resourceNameGenerator,
      })
      const resources = extractRouteResources(app, {
        prefixes: options.prefixes,
        resourceNameGenerator: options.resourceNameGenerator,
      })

      logger.info(`Extracted ${tools.size} tools and ${resources.size} resources`)

      // Create session manager
      const sessionManager = new SessionManager(
        options.maxSessions,
        options.sessionTtlMs,
        logger,
      )

      // Create the request handler
      mcpHandler = createMcpRequestHandler({
        tools,
        resources,
        options,
        sessionManager,
        logger,
      })
    })
    .all(path, ({ request }) => {
      if (!mcpHandler) {
        return new Response(JSON.stringify({ error: 'MCP not initialized' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return mcpHandler(request)
    }, {
      detail: {
        summary: 'MCP Streamable HTTP Endpoint',
        description: 'Model Context Protocol endpoint (Streamable HTTP transport). Supports POST, GET, DELETE.',
        tags: ['mcp'],
      },
    })
}

/**
 * Deferred initialization variant. Use when you need fine-grained control
 * over when introspection happens (e.g. in complex app-factory patterns).
 *
 * @example
 * ```ts
 * const mcp = createElysiaMcp({ prefixes: ['/admin/'] })
 * const app = new Elysia().use(routes).use(mcp.plugin)
 * mcp.initialize(app) // introspect after all routes are mounted
 * app.listen(3000)
 * ```
 */
export function createElysiaMcp(options: ElysiaMcpOptions = {}) {
  const path = options.path ?? '/mcp'
  const logger = options.logger ?? defaultLogger

  let mcpHandler: ((req: Request) => Promise<Response>) | null = null

  const plugin = new Elysia({ name: '@max-health-inc/elysia-mcp' })
    .all(path, ({ request }) => {
      if (!mcpHandler) {
        return new Response(JSON.stringify({ error: 'MCP not initialized' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return mcpHandler(request)
    }, {
      detail: {
        summary: 'MCP Streamable HTTP Endpoint',
        description: 'Model Context Protocol endpoint (Streamable HTTP transport). Supports POST, GET, DELETE.',
        tags: ['mcp'],
      },
    })

  function initialize(app: unknown): void {
    const tools = extractRouteTools(app, {
      prefixes: options.prefixes,
      toolNameGenerator: options.toolNameGenerator,
      resourceNameGenerator: options.resourceNameGenerator,
    })
    const resources = extractRouteResources(app, {
      prefixes: options.prefixes,
      resourceNameGenerator: options.resourceNameGenerator,
    })

    logger.info(`Extracted ${tools.size} tools and ${resources.size} resources`)

    const sessionManager = new SessionManager(
      options.maxSessions,
      options.sessionTtlMs,
      logger,
    )

    mcpHandler = createMcpRequestHandler({
      tools,
      resources,
      options,
      sessionManager,
      logger,
    })
  }

  return { plugin, initialize }
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export type {
  ElysiaMcpOptions,
  ToolMetadata,
  ResourceMetadata,
  AuthResult,
  McpSession,
  Logger,
} from './types'

export {
  extractRouteTools,
  extractRouteResources,
  pathToToolName,
  pathToResourceName,
  pathToResourceUri,
} from './introspect'

export type { IntrospectOptions } from './introspect'

export { typeboxToZod, getMergedInputSchema } from './typebox-to-zod'

export { executeTool, executeResource, DISPATCH_APP_KEY } from './executor'

export {
  SessionManager,
  createMcpRequestHandler,
  registerToolsOnServer,
  registerResourcesOnServer,
} from './transport'

export type { RegistrationContext } from './transport'
