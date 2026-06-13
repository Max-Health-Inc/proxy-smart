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
import { executeResource as pkgExecuteResource, DISPATCH_APP_KEY } from '@max-health-inc/elysia-mcp'
import {
  getResourceRegistry,
  isResourceRegistryInitialized,
  getDispatchApp,
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
        // Dispatch through the package executor. When a ROOT dispatch app is
        // registered, this runs the full Elysia pipeline (guards,
        // response-schema coercion, lifecycle hooks); otherwise it falls back
        // to a synthetic context. The getAdmin / getAccessControl decorators
        // remain available for the synthetic fallback path. Query params are
        // merged into the args the executor uses to rebuild the request.
        const app = getDispatchApp()
        const contextDecorators: Record<string, unknown> = {
          getAdmin: createAdminClient,
          getAccessControl: getAccessControlInstance,
        }
        if (app) contextDecorators[DISPATCH_APP_KEY] = app

        const params: Record<string, string> = {
          ...match.pathParams,
          ...((query as Record<string, string> | undefined) ?? {}),
        }

        const text = await pkgExecuteResource(match.meta, params, tokenRef.current, contextDecorators)
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
