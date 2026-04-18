import { Elysia, t } from 'elysia'
import { logger } from '../../lib/logger'
import { ErrorResponse } from '../../schemas'
import {
  McpServerInfo,
  McpServerCreate,
  McpServerUpdate,
  McpServersListResponse,
  McpServerHealthResponse,
  McpToolInfo,
  McpServerToolsResponse,
  type McpServerInfoType,
  type McpServersListResponseType,
  type McpServerHealthResponseType,
  type McpServerToolsResponseType,
  type McpServerCreateType,
  type McpServerUpdateType,
} from '../../schemas'
import { validateToken, validateAdminToken } from '@/lib/auth'
import { validateExternalUrl } from '@/lib/url-validation'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Configuration, ServersApi } from '../../lib/mcp-registry-client'
import { checkMcpHealth, listMcpTools } from '../../lib/mcp-client'

/**
 * MCP Server Management Endpoints
 * 
 * Allows the UI to:
 * - List configured MCP servers
 * - Check server health/connectivity
 * - View available tools per server
 */

// ─── File-backed MCP server persistence ─────────────────────────────

interface McpServerEntry { url: string; description?: string }

const MCP_JSON_PATH = join(process.cwd(), 'mcp.json')

function loadDynamicServers(): Map<string, McpServerEntry> {
  try {
    if (!existsSync(MCP_JSON_PATH)) return new Map()
    const raw = readFileSync(MCP_JSON_PATH, 'utf-8')
    const data = JSON.parse(raw)
    if (!data || typeof data.servers !== 'object') return new Map()
    return new Map(Object.entries(data.servers as Record<string, McpServerEntry>))
  } catch (error) {
    logger.server.warn('Failed to load mcp.json, starting with empty server list', {
      error: error instanceof Error ? error.message : String(error)
    })
    return new Map()
  }
}

function saveDynamicServers(servers: Map<string, McpServerEntry>): void {
  const data = {
    $schema: 'mcp-servers-runtime',
    updatedAt: new Date().toISOString(),
    servers: Object.fromEntries(servers)
  }
  writeFileSync(MCP_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// Load once at module init, write-through on every mutation
const dynamicServers = loadDynamicServers()

// In-memory cache of server statuses
const serverStatusCache = new Map<string, {
  status: 'connected' | 'disconnected' | 'error' | 'unknown'
  toolCount?: number
  lastChecked: string
  error?: string
}>()

/**
 * Get configured MCP servers (env + dynamically added via UI)
 */
export function getConfiguredServers(): Array<{ name: string; url: string; type: 'internal' | 'external'; description?: string }> {
  const servers: Array<{ name: string; url: string; type: 'internal' | 'external'; description?: string }> = []

  // External MCP servers from environment
  const externalServers = process.env.EXTERNAL_MCP_SERVERS
  if (externalServers) {
    try {
      const parsed = JSON.parse(externalServers)
      if (Array.isArray(parsed)) {
        for (const server of parsed) {
          if (server.name && server.url) {
            servers.push({
              name: server.name,
              url: server.url,
              type: 'external',
              description: server.description
            })
          }
        }
      }
    } catch (error) {
      logger.server.warn('Failed to parse EXTERNAL_MCP_SERVERS', { error })
    }
  }

  // Add dynamically configured servers
  for (const [name, config] of dynamicServers.entries()) {
    servers.push({
      name,
      url: config.url,
      type: 'external',
      description: config.description
    })
  }

  return servers
}

/**
 * Check MCP server health using the official MCP SDK client
 */
async function checkServerHealth(url: string, timeout = 5000) {
  return checkMcpHealth(url, timeout)
}

export const mcpServersRoutes = new Elysia({ prefix: '/mcp-servers', tags: ['mcp-management'] })
  /**
   * Get MCP server templates catalog
   */
  .get('/templates', async ({ headers }) => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateToken(token)
    
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Try multiple possible paths for the templates file
      const possiblePaths = [
        path.join(process.cwd(), 'mcp-server-templates.json'),
        path.join(process.cwd(), 'backend', 'mcp-server-templates.json'),
        path.join(__dirname, '..', '..', '..', 'mcp-server-templates.json'),
        path.join(__dirname, '..', '..', 'mcp-server-templates.json'),
      ]
      
      let templatesContent: string | null = null
      
      for (const templatesPath of possiblePaths) {
        try {
          templatesContent = await fs.readFile(templatesPath, 'utf-8')
          logger.server.debug('Found MCP templates at', { path: templatesPath })
          break
        } catch {
          // Try next path
          continue
        }
      }
      
      if (!templatesContent) {
        throw new Error('Templates file not found in any expected location')
      }
      
      const templates = JSON.parse(templatesContent)
      
      return templates
    } catch (error) {
      logger.server.error('Failed to load MCP server templates', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Return empty template structure if file not found
      return {
        templates: [],
        categories: {},
        version: '1.0.0'
      }
    }
  }, {
    detail: {
      summary: 'Get MCP server templates',
      description: 'Get catalog of pre-configured MCP server templates for quick setup',
      tags: ['mcp-management']
    },
    response: {
      200: t.Object({
        templates: t.Array(t.Any()),
        categories: t.Record(t.String(), t.Any()),
        version: t.String()
      }),
      401: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * List all configured MCP servers
   */
  .get('/', async ({ headers }): Promise<McpServersListResponseType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateToken(token) // Will throw if invalid
    
    const configuredServers = getConfiguredServers()
    const servers: McpServerInfoType[] = []
    let connectedCount = 0
    
    for (const server of configuredServers) {
      const cached = serverStatusCache.get(server.name)
      
      servers.push({
        name: server.name,
        url: server.url,
        type: server.type,
        description: server.description,
        status: cached?.status || 'unknown',
        toolCount: cached?.toolCount,
        lastChecked: cached?.lastChecked,
        error: cached?.error
      })
      
      if (cached?.status === 'connected') {
        connectedCount++
      }
    }
    
    return {
      servers,
      totalServers: servers.length,
      connectedServers: connectedCount
    }
  }, {
    detail: {
      summary: 'List MCP servers',
      description: 'Get list of configured MCP servers with their status',
      tags: ['mcp-management']
    },
    response: {
      200: McpServersListResponse,
      401: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Check health of a specific MCP server
   */
  .get('/:name/health', async ({ headers, params }): Promise<McpServerHealthResponseType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateToken(token)
    
    const { name } = params
    const configuredServers = getConfiguredServers()
    const server = configuredServers.find(s => s.name === name)
    
    if (!server) {
      throw new Error(`MCP server '${name}' not found`)
    }
    
    const health = await checkServerHealth(server.url)
    
    // Update cache
    serverStatusCache.set(name, {
      status: health.status === 'healthy' ? 'connected' : health.status === 'unhealthy' ? 'error' : 'disconnected',
      toolCount: health.toolCount,
      lastChecked: new Date().toISOString(),
      error: health.error
    })
    
    return {
      name,
      status: health.status,
      responseTime: health.responseTime,
      toolCount: health.toolCount,
      error: health.error
    }
  }, {
    params: t.Object({
      name: t.String({ description: 'MCP server name' })
    }),
    detail: {
      summary: 'Check MCP server health',
      description: 'Check connectivity and health of a specific MCP server',
      tags: ['mcp-management']
    },
    response: {
      200: McpServerHealthResponse,
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Get tools from a specific MCP server
   */
  .get('/:name/tools', async ({ headers, params }): Promise<McpServerToolsResponseType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateToken(token)
    
    const { name } = params
    const configuredServers = getConfiguredServers()
    const server = configuredServers.find(s => s.name === name)
    
    if (!server) {
      throw new Error(`MCP server '${name}' not found`)
    }
    
    try {
      const tools = await listMcpTools(server.url)
      
      return {
        server: name,
        tools,
        totalTools: tools.length
      }
    } catch (error) {
      logger.server.error('Failed to fetch tools from MCP server', {
        server: name,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }, {
    params: t.Object({
      name: t.String({ description: 'MCP server name' })
    }),
    detail: {
      summary: 'List MCP server tools',
      description: 'Get available tools from a specific MCP server',
      tags: ['mcp-management']
    },
    response: {
      200: McpServerToolsResponse,
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Refresh health status of all servers
   */
  .post('/refresh', async ({ headers }): Promise<McpServersListResponseType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateAdminToken(token)
    
    const configuredServers = getConfiguredServers()
    const servers: McpServerInfoType[] = []
    let connectedCount = 0
    
    // Check health of all servers in parallel
    await Promise.all(
      configuredServers.map(async (server) => {
        const health = await checkServerHealth(server.url)
        
        const status = health.status === 'healthy' ? 'connected' : health.status === 'unhealthy' ? 'error' : 'disconnected'
        
        serverStatusCache.set(server.name, {
          status,
          toolCount: health.toolCount,
          lastChecked: new Date().toISOString(),
          error: health.error
        })
        
        servers.push({
          name: server.name,
          url: server.url,
          type: server.type,
          description: server.description,
          status,
          toolCount: health.toolCount,
          lastChecked: new Date().toISOString(),
          error: health.error
        })
        
        if (status === 'connected') {
          connectedCount++
        }
      })
    )
    
    return {
      servers,
      totalServers: servers.length,
      connectedServers: connectedCount
    }
  }, {
    detail: {
      summary: 'Refresh MCP servers status',
      description: 'Check health of all MCP servers and update their status',
      tags: ['mcp-management']
    },
    response: {
      200: McpServersListResponse,
      401: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Add a new MCP server
   */
  .post('/', async ({ headers, body }): Promise<McpServerInfoType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateAdminToken(token)
    
    const { name, url, description } = body as McpServerCreateType
    
    // Check if server with this name already exists
    const existing = getConfiguredServers().find(s => s.name === name)
    if (existing) {
      throw new Error(`MCP server with name '${name}' already exists`)
    }
    
    // Validate URL format
    try {
      new URL(url)
    } catch {
      throw new Error('Invalid URL format')
    }
    
    // SSRF protection: block private/internal network URLs in production
    const isInternalNetworking = process.env.NODE_ENV === 'development'
    const urlCheck = validateExternalUrl(url, isInternalNetworking)
    if (!urlCheck.valid) {
      throw new Error(`URL rejected: ${urlCheck.reason}`)
    }
    
    // Add to dynamic servers and persist
    dynamicServers.set(name, { url, description })
    saveDynamicServers(dynamicServers)
    
    // Check initial health
    const health = await checkServerHealth(url)
    const status = health.status === 'healthy' ? 'connected' : health.status === 'unhealthy' ? 'error' : 'disconnected'
    
    serverStatusCache.set(name, {
      status,
      toolCount: health.toolCount,
      lastChecked: new Date().toISOString(),
      error: health.error
    })
    
    logger.server.info('Added new MCP server', { name, url })
    
    return {
      name,
      url,
      type: 'external',
      description,
      status,
      toolCount: health.toolCount,
      lastChecked: new Date().toISOString(),
      error: health.error
    }
  }, {
    body: McpServerCreate,
    detail: {
      summary: 'Add MCP server',
      description: 'Register a new external MCP server',
      tags: ['mcp-management']
    },
    response: {
      200: McpServerInfo,
      400: ErrorResponse,
      401: ErrorResponse,
      409: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Update an existing MCP server
   */
  .patch('/:name', async ({ headers, params, body }): Promise<McpServerInfoType> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateAdminToken(token)
    
    const { name } = params
    const { url, description } = body as McpServerUpdateType
    
    // Check if server exists in dynamic servers
    const existing = dynamicServers.get(name)
    if (!existing) {
      throw new Error(`MCP server '${name}' not found or cannot be modified (only dynamically added servers can be updated)`)
    }
    
    // Update fields
    if (url) {
      try {
        new URL(url)
      } catch {
        throw new Error('Invalid URL format')
      }
      existing.url = url
    }
    
    if (description !== undefined) {
      existing.description = description
    }
    
    dynamicServers.set(name, existing)
    saveDynamicServers(dynamicServers)
    
    // Re-check health
    const health = await checkServerHealth(existing.url)
    const status = health.status === 'healthy' ? 'connected' : health.status === 'unhealthy' ? 'error' : 'disconnected'
    
    serverStatusCache.set(name, {
      status,
      toolCount: health.toolCount,
      lastChecked: new Date().toISOString(),
      error: health.error
    })
    
    logger.server.info('Updated MCP server', { name, url: existing.url })
    
    return {
      name,
      url: existing.url,
      type: 'external',
      description: existing.description,
      status,
      toolCount: health.toolCount,
      lastChecked: new Date().toISOString(),
      error: health.error
    }
  }, {
    params: t.Object({
      name: t.String({ description: 'MCP server name' })
    }),
    body: McpServerUpdate,
    detail: {
      summary: 'Update MCP server',
      description: 'Update configuration of an existing external MCP server',
      tags: ['mcp-management']
    },
    response: {
      200: McpServerInfo,
      400: ErrorResponse,
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Delete an MCP server
   */
  .delete('/:name', async ({ headers, params }): Promise<{ success: boolean; message: string }> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }
    
    const token = authHeader.substring(7)
    await validateAdminToken(token)
    
    const { name } = params
    
    // Only allow deletion of dynamically added servers
    if (!dynamicServers.has(name)) {
      throw new Error(`MCP server '${name}' not found or cannot be deleted (only dynamically added servers can be removed)`)
    }
    
    dynamicServers.delete(name)
    saveDynamicServers(dynamicServers)
    serverStatusCache.delete(name)
    
    logger.server.info('Deleted MCP server', { name })
    
    return {
      success: true,
      message: `MCP server '${name}' deleted successfully`
    }
  }, {
    params: t.Object({
      name: t.String({ description: 'MCP server name' })
    }),
    detail: {
      summary: 'Delete MCP server',
      description: 'Remove a dynamically added MCP server',
      tags: ['mcp-management']
    },
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      401: ErrorResponse,
      404: ErrorResponse,
      500: ErrorResponse
    }
  })

  /**
   * Search the public MCP Registry for servers
   * Uses the generated typed client from the official MCP Registry OpenAPI spec
   */
  .get('/registry/search', async ({ headers, query }): Promise<{
    servers: Array<{
      name: string
      title?: string
      description: string
      version: string
      url: string
      transport: string
      websiteUrl?: string
      publishedAt?: string
    }>
    total: number
    hasMore: boolean
  }> => {
    // Validate authentication
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.substring(7)
    await validateToken(token)

    const searchQuery = (query as { q?: string; cursor?: string; limit?: string }).q || ''
    const cursor = (query as { cursor?: string }).cursor
    const limit = Math.min(parseInt((query as { limit?: string }).limit || '50', 10), 100)

    const registryBaseUrl = process.env.MCP_REGISTRY_URL || 'https://registry.modelcontextprotocol.io'
    const registryClient = new ServersApi(new Configuration({ basePath: registryBaseUrl }))

    try {
      const data = await registryClient.listServersV01({
        search: searchQuery || undefined,
        version: 'latest',
        limit,
        cursor: cursor || undefined,
      }, { signal: AbortSignal.timeout(10000) })

      // Filter to only servers with streamable-http remotes
      const streamableServers = (data.servers ?? [])
        .filter(entry => entry.server.remotes?.some(r => r.type === 'streamable-http'))
        .map(entry => {
          const remote = entry.server.remotes!.find(r => r.type === 'streamable-http')!
          return {
            name: entry.server.name,
            title: entry.server.title,
            description: entry.server.description,
            version: entry.server.version,
            url: remote.url!,
            transport: 'streamable-http',
            websiteUrl: entry.server.websiteUrl,
            publishedAt: entry.meta?.io_modelcontextprotocol_registry_official?.publishedAt
          }
        })

      logger.server.info('MCP registry search completed', {
        query: searchQuery,
        totalFromRegistry: data.servers?.length ?? 0,
        streamableCount: streamableServers.length
      })

      return {
        servers: streamableServers,
        total: streamableServers.length,
        hasMore: !!data.metadata.nextCursor
      }
    } catch (error) {
      logger.server.error('Failed to search MCP registry', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }, {
    query: t.Object({
      q: t.Optional(t.String({ description: 'Search query' })),
      cursor: t.Optional(t.String({ description: 'Pagination cursor' })),
      limit: t.Optional(t.String({ description: 'Max results (default 50, max 100)' }))
    }),
    detail: {
      summary: 'Search public MCP registry',
      description: 'Search the official MCP registry (registry.modelcontextprotocol.io) for servers with streamable-http transport, suitable for direct connection.',
      tags: ['mcp-management']
    },
    response: {
      200: t.Object({
        servers: t.Array(t.Object({
          name: t.String(),
          title: t.Optional(t.String()),
          description: t.String(),
          version: t.String(),
          url: t.String(),
          transport: t.String(),
          websiteUrl: t.Optional(t.String()),
          publishedAt: t.Optional(t.String())
        })),
        total: t.Number(),
        hasMore: t.Boolean()
      }),
      401: ErrorResponse,
      500: ErrorResponse
    }
  })

