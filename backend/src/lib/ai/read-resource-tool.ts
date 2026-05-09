/**
 * Unified read_resource MCP tool.
 *
 * Collapses all individual GET route tools into a single `read_resource` tool
 * that accepts a path and optional query parameters, dispatching to the
 * matching GET route handler.
 *
 * MCP clients (LLMs) see one tool with a description listing all available
 * resource paths, rather than 80+ individual get_* tools.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod'
import {
  getResourceRegistry,
  isResourceRegistryInitialized,
} from './tool-registry'
import type { ResourceMetadata } from './tool-registry'
import { isResourceExposed } from '../mcp-endpoint-config'
import { createAdminClient } from '../keycloak-plugin'
import { getAccessControlInstance } from '../access-control/plugin'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a lookup map of available GET resources, keyed by their API path.
 * Filters by permission (public vs admin-only) and resource-exposure config.
 */
function buildResourceIndex(userRoles: string[]): Map<string, ResourceMetadata> {
  if (!isResourceRegistryInitialized()) return new Map()

  const registry = getResourceRegistry()
  const index = new Map<string, ResourceMetadata>()

  for (const [resourceName, meta] of registry) {
    if (!isResourceExposed(resourceName)) continue
    if (!meta.public && !userRoles.includes('admin')) continue
    index.set(meta.path, meta)
  }

  return index
}

/**
 * Generate the description for the unified read_resource tool.
 * Includes a list of available resource paths so LLMs know what to call.
 */
function buildReadResourceDescription(resources: Map<string, ResourceMetadata>): string {
  const paths = [...resources.keys()].sort()
  const pathList = paths.map((p) => `  - ${p}`).join('\n')
  return [
    'Read data from any available GET endpoint. Pass the API path and optional query parameters.',
    'For parameterized paths, replace path segments with actual values (e.g. /admin/users/abc123).',
    '',
    'Available paths:',
    pathList,
  ].join('\n')
}

/**
 * Match a concrete path against the resource index, supporting path params.
 * e.g. "/admin/users/abc123" matches "/admin/users/:userId"
 */
function matchResource(
  requestPath: string,
  resources: Map<string, ResourceMetadata>,
): { meta: ResourceMetadata; pathParams: Record<string, string> } | null {
  // 1. Try exact match first (static routes)
  const exact = resources.get(requestPath)
  if (exact) return { meta: exact, pathParams: {} }

  // 2. Try parameterized routes
  const requestSegments = requestPath.split('/').filter(Boolean)

  for (const [pattern, meta] of resources) {
    const patternSegments = pattern.split('/').filter(Boolean)
    if (patternSegments.length !== requestSegments.length) continue

    const params: Record<string, string> = {}
    let matched = true

    for (let i = 0; i < patternSegments.length; i++) {
      if (patternSegments[i].startsWith(':')) {
        params[patternSegments[i].slice(1)] = requestSegments[i]
      } else if (patternSegments[i] !== requestSegments[i]) {
        matched = false
        break
      }
    }

    if (matched) return { meta, pathParams: params }
  }

  return null
}

// JSON.stringify replacer for Error objects
function serializeErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the unified `read_resource` MCP tool.
 * Takes a `path` and optional `query` params, dispatches to the matching GET handler.
 */
export function registerReadResourceTool(
  server: McpServer,
  userRoles: string[],
  tokenRef: { current?: string },
): void {
  const resources = buildResourceIndex(userRoles)
  if (resources.size === 0) return

  server.registerTool(
    'read_resource',
    {
      description: buildReadResourceDescription(resources),
      inputSchema: {
        path: z.string().describe('The API path to read (e.g. /admin/users, /admin/smart-apps/:appId)'),
        query: z.record(z.string(), z.string()).optional().describe('Optional query parameters as key-value pairs'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ path, query }) => {
      const match = matchResource(path as string, resources)
      if (!match) {
        const available = [...resources.keys()].sort().join(', ')
        return {
          content: [{ type: 'text' as const, text: `Unknown path: ${path}. Available: ${available}` }],
          isError: true,
        }
      }

      try {
        const elysiaContext = {
          body: {},
          headers: {
            ...(tokenRef.current ? { authorization: `Bearer ${tokenRef.current}` } : {}),
            'content-type': 'application/json',
          },
          set: {
            status: 200,
            headers: {} as Record<string, string>,
          },
          params: match.pathParams,
          query: (query as Record<string, string> | undefined) ?? {},
          request: new Request(`http://localhost${path}`, {
            method: 'GET',
            headers: {
              ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
            },
          }),
          getAdmin: createAdminClient,
          getAccessControl: getAccessControlInstance,
        }

        const result = await (match.meta.handler as (ctx: unknown) => unknown)(elysiaContext)
        const status = typeof elysiaContext.set.status === 'number' ? elysiaContext.set.status : 200

        const text = result === undefined || result === null
          ? JSON.stringify({ success: true, status })
          : typeof result === 'string'
            ? result
            : JSON.stringify(result, serializeErrors, 2)

        if (status >= 400) {
          return { content: [{ type: 'text' as const, text }], isError: true }
        }
        return { content: [{ type: 'text' as const, text }] }
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error reading ${path}: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        }
      }
    },
  )
}
