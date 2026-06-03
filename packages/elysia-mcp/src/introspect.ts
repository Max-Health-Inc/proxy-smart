/**
 * @max-health-inc/elysia-mcp - Route Introspection
 *
 * Extracts route metadata from an Elysia app instance by reading its internal
 * route table. Produces tool and resource metadata for MCP registration.
 */

import type { TSchema } from '@sinclair/typebox'
import type { ToolMetadata, ResourceMetadata } from './types'

// ── Configuration ────────────────────────────────────────────────────────────

export interface IntrospectOptions {
  /**
   * Route prefixes to include. Only routes starting with one of these
   * prefixes are extracted.
   * @default ['/admin/', '/api/']
   */
  prefixes?: string[]

  /**
   * Custom tool name generator.
   * @default pathToToolName
   */
  toolNameGenerator?: (path: string, method: string) => string

  /**
   * Custom resource name generator.
   * @default pathToResourceName
   */
  resourceNameGenerator?: (path: string) => string
}

// ── Route extraction ─────────────────────────────────────────────────────────

/**
 * Extract mutation and query routes from an Elysia app as MCP tool metadata.
 *
 * Reads Elysia's internal `routes` array and pulls path, method, body/query/params
 * schemas, handler references, and public/readOnly annotations.
 */
export function extractRouteTools(app: unknown, options?: IntrospectOptions): Map<string, ToolMetadata> {
  const tools = new Map<string, ToolMetadata>()
  const prefixes = options?.prefixes ?? ['/admin/', '/api/']
  const nameGen = options?.toolNameGenerator ?? pathToToolName

  const routes: unknown[] = (app as { routes?: unknown[] }).routes ?? []

  for (const route of routes) {
    const path = (route as { path?: unknown }).path
    const method = (route as { method?: unknown }).method
    const hooks = (route as { hooks?: { body?: TSchema; params?: TSchema; query?: TSchema } }).hooks
    const legacySchema = (route as { schema?: { body?: TSchema; params?: TSchema; query?: TSchema } }).schema
    const handler = (route as { handler?: unknown }).handler
    const meta = (route as { meta?: { public?: boolean } }).meta

    if (typeof path !== 'string' || typeof method !== 'string') continue
    if (!prefixes.some(prefix => path.startsWith(prefix))) continue
    if (method === 'HEAD' || method === 'OPTIONS') continue

    const bodySchema = hooks?.body ?? legacySchema?.body
    const paramsSchema = hooks?.params ?? legacySchema?.params
    const querySchema = hooks?.query ?? legacySchema?.query

    const isGet = method === 'GET'
    const toolName = nameGen(path, method)

    tools.set(toolName, {
      path,
      method,
      handler,
      schema: isGet ? querySchema : bodySchema,
      paramsSchema,
      public: meta?.public ?? false,
      readOnly: isGet,
    })
  }

  return tools
}

/**
 * Extract GET routes from an Elysia app as MCP resource metadata.
 * Static paths become fixed-URI resources; parameterized paths become URI templates.
 */
export function extractRouteResources(app: unknown, options?: IntrospectOptions): Map<string, ResourceMetadata> {
  const resources = new Map<string, ResourceMetadata>()
  const prefixes = options?.prefixes ?? ['/admin/', '/api/']
  const nameGen = options?.resourceNameGenerator ?? pathToResourceName

  const routes: unknown[] = (app as { routes?: unknown[] }).routes ?? []

  for (const route of routes) {
    const path = (route as { path?: unknown }).path
    const method = (route as { method?: unknown }).method
    const hooks = (route as { hooks?: { params?: TSchema } }).hooks
    const legacySchema = (route as { schema?: { params?: TSchema } }).schema
    const handler = (route as { handler?: unknown }).handler
    const meta = (route as { meta?: { public?: boolean } }).meta

    if (typeof path !== 'string' || typeof method !== 'string') continue
    if (method !== 'GET') continue
    if (!prefixes.some(prefix => path.startsWith(prefix))) continue

    const paramMatches = path.match(/:(\w+)/g)
    const pathParams = paramMatches ? paramMatches.map(p => p.slice(1)) : []
    const resourceName = nameGen(path)
    const paramsSchema = hooks?.params ?? legacySchema?.params

    resources.set(resourceName, {
      path,
      method,
      handler,
      paramsSchema,
      public: meta?.public ?? false,
      pathParams,
    })
  }

  return resources
}

// ── Naming helpers ───────────────────────────────────────────────────────────

/**
 * Convert route path and method to a tool name.
 *
 * Examples:
 * - POST /admin/users -> create_admin_users
 * - PUT /admin/users/:id -> update_admin_users_id
 * - DELETE /admin/roles/:roleName -> delete_admin_roles_roleName
 * - GET /admin/branding -> get_admin_branding
 */
export function pathToToolName(path: string, method: string): string {
  let name = path.replace(/^\//, '')
  name = name.replace(/\//g, '_').replace(/:/g, '')

  const methodPrefixes: Record<string, string> = {
    GET: 'get',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  }

  const prefix = methodPrefixes[method.toUpperCase()] ?? method.toLowerCase()
  return `${prefix}_${name}`
}

/**
 * Convert a GET route path to a human-readable resource name.
 *
 * Examples:
 * - /admin/branding -> admin_branding
 * - /admin/roles/:roleName -> admin_roles_by_roleName
 */
export function pathToResourceName(path: string): string {
  let name = path.replace(/^\//, '')
  name = name.replace(/:(\w+)/g, 'by_$1')
  name = name.replace(/\//g, '_')
  name = name.replace(/-/g, '_')
  return name
}

/**
 * Convert an Elysia route path to an MCP resource URI.
 *
 * Static: scheme://admin/branding
 * Parameterized: scheme://admin/roles/{roleName} (RFC 6570 URI template)
 */
export function pathToResourceUri(path: string, scheme = 'app'): string {
  const uriPath = path.replace(/:(\w+)/g, '{$1}')
  return `${scheme}:/${uriPath}`
}
