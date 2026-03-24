/**
 * MCP Client - Connect to MCP servers (internal or external)
 * 
 * Uses the official @modelcontextprotocol/sdk for proper JSON-RPC 2.0
 * communication with any standard MCP server (Streamable HTTP + SSE fallback).
 * 
 * This client can:
 * 1. Connect to our internal MCP server (/mcp) for backend tool execution
 * 2. Connect to external MCP servers (like filesystem, database, etc.)
 * 
 * It handles authentication, tool discovery, and execution.
 */

import { config } from '@/config'
import { logger } from '@/lib/logger'
import { connectMcpClient } from '@/lib/mcp-client'
import type { Client } from '@modelcontextprotocol/sdk/client'

export interface McpTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
    strict?: boolean
  }
}

export interface McpServerConfig {
  url: string
  name: string
  auth?: {
    type: 'bearer'
    token: string
  }
  // For internal server, we can pass user context
  internal?: boolean
}

export class McpClient {
  private serverConfig: McpServerConfig
  private client: Client | null = null
  private toolsCache: McpTool[] | null = null
  private toolsCacheTimestamp = 0
  private readonly CACHE_TTL = 60000 // 1 minute

  constructor(serverConfig: McpServerConfig) {
    this.serverConfig = serverConfig
  }

  /**
   * Get or create the SDK client connection
   */
  private async getClient(): Promise<Client> {
    if (this.client) return this.client
    const headers: Record<string, string> = {}
    if (this.serverConfig.auth?.token) {
      headers['Authorization'] = `Bearer ${this.serverConfig.auth.token}`
    }
    this.client = await connectMcpClient(this.serverConfig.url, {
      headers: Object.keys(headers).length > 0 ? headers : undefined
    })
    return this.client
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<McpTool[]> {
    // Check cache
    const now = Date.now()
    if (this.toolsCache && (now - this.toolsCacheTimestamp) < this.CACHE_TTL) {
      return this.toolsCache
    }

    try {
      const client = await this.getClient()
      const { tools } = await client.listTools()

      // Convert SDK tool format to OpenAI-style function format
      this.toolsCache = tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description ?? '',
          parameters: (t.inputSchema ?? {}) as Record<string, unknown>,
        }
      }))
      this.toolsCacheTimestamp = now

      logger.server.info('MCP tools fetched via SDK', {
        server: this.serverConfig.name,
        toolCount: this.toolsCache.length
      })

      return this.toolsCache
    } catch (error) {
      logger.server.error('Failed to list MCP tools', {
        server: this.serverConfig.name,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<{
    content: Array<{ type: 'text'; text: string }>
    duration?: number
  }> {
    const start = Date.now()
    try {
      const client = await this.getClient()
      const result = await client.callTool({ name, arguments: args })

      // Convert SDK response to expected format
      const content = (result.content as Array<{ type: string; text?: string }>)
        .filter(c => c.type === 'text' && c.text)
        .map(c => ({ type: 'text' as const, text: c.text! }))

      // If no text content, stringify the whole result
      if (content.length === 0) {
        content.push({ type: 'text', text: JSON.stringify(result.content) })
      }

      return { content, duration: Date.now() - start }
    } catch (error) {
      logger.server.error('Failed to call MCP tool', {
        server: this.serverConfig.name,
        tool: name,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Close the underlying SDK client connection
   */
  async close(): Promise<void> {
    try { await this.client?.close() } catch { /* best-effort cleanup */ }
    this.client = null
  }

  /**
   * Create a client for the internal MCP server
   */
  static createInternalClient(userToken: string): McpClient {
    return new McpClient({
      url: `${config.baseUrl}/mcp`,
      name: 'internal-backend',
      auth: {
        type: 'bearer',
        token: userToken
      },
      internal: true
    })
  }

  /**
   * Create a client for an external MCP server
   */
  static createExternalClient(url: string, name: string, auth?: { token: string }): McpClient {
    return new McpClient({
      url,
      name,
      auth: auth ? { type: 'bearer', token: auth.token } : undefined,
      internal: false
    })
  }
}

/**
 * MCP Connection Manager - Manages multiple MCP server connections
 */
export class McpConnectionManager {
  private clients = new Map<string, McpClient>()

  /**
   * Add an MCP server connection
   */
  addServer(name: string, client: McpClient): void {
    this.clients.set(name, client)
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<Array<McpTool & { serverName: string }>> {
    const allTools: Array<McpTool & { serverName: string }> = []

    for (const [serverName, client] of this.clients.entries()) {
      try {
        const tools = await client.listTools()
        for (const tool of tools) {
          allTools.push({
            ...tool,
            serverName,
            // Prefix tool names with server name to avoid conflicts
            function: {
              ...tool.function,
              name: `${serverName}__${tool.function.name}`,
              description: `[${serverName}] ${tool.function.description}`
            }
          })
        }
      } catch (error) {
        logger.server.warn('Failed to load tools from MCP server', {
          serverName,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return allTools
  }

  /**
   * Call a tool (automatically routes to the correct server)
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<{
    content: Array<{ type: 'text'; text: string }>
    duration?: number
  }> {
    // Parse server name and actual tool name
    const parts = toolName.split('__')
    if (parts.length !== 2) {
      throw new Error(`Invalid tool name format: ${toolName}. Expected format: serverName__toolName`)
    }

    const [serverName, actualToolName] = parts
    const client = this.clients.get(serverName)

    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`)
    }

    return client.callTool(actualToolName, args)
  }

  /**
   * Get a specific server client
   */
  getServer(name: string): McpClient | undefined {
    return this.clients.get(name)
  }

  /**
   * Remove a server connection and close it
   */
  async removeServer(name: string): Promise<void> {
    const client = this.clients.get(name)
    if (client) {
      await client.close()
      this.clients.delete(name)
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close()
    }
    this.clients.clear()
  }
}
