/**
 * Admin routes for the built-in MCP endpoint configuration.
 *
 * Lets admins:
 *  - GET  /admin/mcp-endpoint          → current config + available tools
 *  - PATCH /admin/mcp-endpoint         → update enabled / tool lists
 */

import { Elysia, t } from 'elysia'
import { validateToken } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { ErrorResponse, McpEndpointStatusResponse, McpEndpointUpdateBody } from '@/schemas'
import {
  loadMcpEndpointConfig,
  saveMcpEndpointConfig,
  type McpEndpointConfig,
} from '@/lib/mcp-endpoint-config'
import { getToolRegistry, isToolRegistryInitialized, generateToolDefinitions, getResourceRegistry, isResourceRegistryInitialized, pathToResourceUri } from '@/lib/ai/tool-registry'
import { config } from '@/config'

// ── Route ────────────────────────────────────────────────────────────────────

export const mcpEndpointAdminRoutes = new Elysia({
  prefix: '/mcp-endpoint',
  tags: ['mcp-management'],
})
  /**
   * Get current MCP endpoint status + tool list
   */
  .get('/', async ({ headers }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const cfg = loadMcpEndpointConfig()
    const tools = buildToolList(cfg)
    const resources = buildResourceList(cfg)

    const configSource =
      process.env.MCP_ENDPOINT_ENABLED !== undefined
        ? 'env'
        : cfg.updatedAt !== new Date(0).toISOString()
          ? 'file'
          : 'default'

    return {
      enabled: cfg.enabled || config.mcp.enabled,
      configSource,
      endpointPath: config.mcp.path,
      endpointUrl: `${config.baseUrl}${config.mcp.path}`,
      tools,
      resources,
      disabledTools: cfg.disabledTools,
      enabledTools: cfg.enabledTools,
      exposeResourcesAsTools: cfg.exposeResourcesAsTools,
      updatedAt: cfg.updatedAt,
    }
  }, {
    detail: {
      summary: 'Get MCP endpoint status',
      description: 'Returns the current MCP endpoint configuration including which tools are exposed.',
      tags: ['mcp-management'],
    },
    response: { 200: McpEndpointStatusResponse, 401: ErrorResponse },
  })

  /**
   * Update MCP endpoint configuration
   */
  .patch('/', async ({ headers, body }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const update = body as typeof McpEndpointUpdateBody.static
    const cfg = loadMcpEndpointConfig()

    if (update.enabled !== undefined) cfg.enabled = update.enabled
    if (update.disabledTools !== undefined) cfg.disabledTools = update.disabledTools
    if (update.enabledTools !== undefined) cfg.enabledTools = update.enabledTools
    if (update.exposeResourcesAsTools !== undefined) cfg.exposeResourcesAsTools = update.exposeResourcesAsTools

    saveMcpEndpointConfig(cfg)
    logger.server.info('MCP endpoint config updated', {
      enabled: cfg.enabled,
      disabledToolCount: cfg.disabledTools.length,
      enabledToolCount: cfg.enabledTools?.length ?? 'all',
    })

    const tools = buildToolList(cfg)
    const resources = buildResourceList(cfg)

    return {
      enabled: cfg.enabled || config.mcp.enabled,
      configSource: 'file',
      endpointPath: config.mcp.path,
      endpointUrl: `${config.baseUrl}${config.mcp.path}`,
      tools,
      resources,
      disabledTools: cfg.disabledTools,
      enabledTools: cfg.enabledTools,
      exposeResourcesAsTools: cfg.exposeResourcesAsTools,
      updatedAt: cfg.updatedAt,
    }
  }, {
    body: McpEndpointUpdateBody,
    detail: {
      summary: 'Update MCP endpoint configuration',
      description: 'Enable/disable the MCP endpoint or change which tools are exposed.',
      tags: ['mcp-management'],
    },
    response: { 200: McpEndpointStatusResponse, 401: ErrorResponse },
  })

// ── helpers ──────────────────────────────────────────────────────────────────

function buildToolList(cfg: McpEndpointConfig) {
  if (!isToolRegistryInitialized()) return []

  const registry = getToolRegistry()
  const defs = generateToolDefinitions(registry, ['admin'])

  const tools = defs.map((d) => {
    const name = d.function.name
    const meta = registry.get(name)
    let exposed: boolean
    if (cfg.enabledTools !== null) {
      exposed = cfg.enabledTools.includes(name)
    } else {
      exposed = !cfg.disabledTools.includes(name)
    }
    return { name, description: d.function.description, exposed, readOnly: meta?.readOnly || false }
  })

  // Include the RAG search_documentation tool (registered directly on McpServer, not in route registry)
  const ragName = 'search_documentation'
  let ragExposed: boolean
  if (cfg.enabledTools !== null) {
    ragExposed = cfg.enabledTools.includes(ragName)
  } else {
    ragExposed = !cfg.disabledTools.includes(ragName)
  }
  tools.push({
    name: ragName,
    description: 'Search the platform documentation knowledge base using semantic similarity.',
    exposed: ragExposed,
  })

  return tools
}

function buildResourceList(cfg: McpEndpointConfig) {
  if (!isResourceRegistryInitialized()) return []

  const registry = getResourceRegistry()
  return Array.from(registry.entries()).map(([name, meta]) => {
    let exposed: boolean
    if (cfg.enabledTools !== null) {
      exposed = cfg.enabledTools.includes(name)
    } else {
      exposed = !cfg.disabledTools.includes(name)
    }
    const parts = name.split('_')
    const description = `Read ${parts.join(' ')}. ${meta.public ? '(Public)' : '(Admin only)'}`
    return { name, description, uri: pathToResourceUri(meta.path), exposed }
  })
}
