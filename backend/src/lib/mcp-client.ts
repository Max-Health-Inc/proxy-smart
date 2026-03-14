import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { logger } from './logger'

const CLIENT_INFO = { name: 'proxy-smart', version: '1.0.0' }

export interface ConnectMcpOptions {
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Connect to an MCP server using Streamable HTTP, falling back to SSE for legacy servers.
 * Caller is responsible for closing the client via `client.close()`.
 */
export async function connectMcpClient(url: string, options?: ConnectMcpOptions | number): Promise<Client> {
  const { timeout = 10_000, headers } = typeof options === 'number' ? { timeout: options } : (options ?? {})
  const baseUrl = new URL(url)
  const requestInit = headers ? { headers } : undefined

  // Try Streamable HTTP first (modern MCP protocol)
  try {
    const client = new Client(CLIENT_INFO)
    const transport = new StreamableHTTPClientTransport(baseUrl, { requestInit })
    await client.connect(transport)
    return client
  } catch {
    // Fall back to legacy SSE transport
    logger.server.debug('Streamable HTTP failed, falling back to SSE', { url })
  }

  const client = new Client(CLIENT_INFO)
  const transport = new SSEClientTransport(baseUrl, { requestInit })
  await client.connect(transport)
  return client
}

export interface McpHealthResult {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  responseTime?: number
  toolCount?: number
  error?: string
}

/**
 * Check health of a remote MCP server by connecting and listing tools.
 */
export async function checkMcpHealth(url: string, timeout = 5_000): Promise<McpHealthResult> {
  const start = Date.now()
  let client: Client | undefined

  try {
    client = await connectMcpClient(url, timeout)
    const { tools } = await client.listTools()
    const responseTime = Date.now() - start

    return { status: 'healthy', responseTime, toolCount: tools.length }
  } catch (error) {
    const responseTime = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)

    // If we never got a connection, it's unreachable
    if (!client) {
      return { status: 'unreachable', error: message }
    }

    return { status: 'unhealthy', responseTime, error: message }
  } finally {
    try { await client?.close() } catch { /* best-effort cleanup */ }
  }
}

export interface McpTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/**
 * List tools from a remote MCP server.
 */
export async function listMcpTools(url: string, timeout = 10_000): Promise<McpTool[]> {
  let client: Client | undefined

  try {
    client = await connectMcpClient(url, timeout)
    const { tools } = await client.listTools()

    return tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      parameters: (t.inputSchema ?? {}) as Record<string, unknown>,
    }))
  } finally {
    try { await client?.close() } catch { /* best-effort cleanup */ }
  }
}
