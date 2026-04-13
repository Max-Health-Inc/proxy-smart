/**
 * MCP Server Management schemas
 * 
 * Centralized TypeBox schemas for MCP server CRUD operations,
 * health checks, and tool listing.
 */
import { t } from 'elysia'

// ── Core entities ────────────────────────────────────────────────────────────

export const McpServerInfo = t.Object({
  name: t.String({ description: 'Server identifier' }),
  url: t.String({ description: 'MCP server URL' }),
  type: t.Union([
    t.Literal('internal'),
    t.Literal('external')
  ], { description: 'Server type' }),
  status: t.Union([
    t.Literal('connected'),
    t.Literal('disconnected'),
    t.Literal('error'),
    t.Literal('unknown')
  ], { description: 'Connection status' }),
  description: t.Optional(t.String({ description: 'Server description' })),
  toolCount: t.Optional(t.Number({ description: 'Number of available tools' })),
  lastChecked: t.Optional(t.String({ description: 'Last health check timestamp (ISO)' })),
  error: t.Optional(t.String({ description: 'Error message if status is error' }))
})

export const McpToolInfo = t.Object({
  name: t.String({ description: 'Tool name' }),
  description: t.String({ description: 'Tool description' }),
  parameters: t.Record(t.String(), t.Unknown(), { description: 'Tool parameters schema' })
})

// ── Request schemas ──────────────────────────────────────────────────────────

export const McpServerCreate = t.Object({
  name: t.String({ description: 'Unique server identifier' }),
  url: t.String({ description: 'MCP server URL (must be accessible)' }),
  description: t.Optional(t.String({ description: 'Optional server description' }))
})

export const McpServerUpdate = t.Object({
  url: t.Optional(t.String({ description: 'MCP server URL' })),
  description: t.Optional(t.String({ description: 'Server description' }))
})

// ── Response schemas ─────────────────────────────────────────────────────────

export const McpServersListResponse = t.Object({
  servers: t.Array(McpServerInfo, { description: 'List of MCP servers' }),
  totalServers: t.Number({ description: 'Total number of servers' }),
  connectedServers: t.Number({ description: 'Number of connected servers' })
})

export const McpServerHealthResponse = t.Object({
  name: t.String({ description: 'Server name' }),
  status: t.Union([
    t.Literal('healthy'),
    t.Literal('unhealthy'),
    t.Literal('unreachable')
  ]),
  responseTime: t.Optional(t.Number({ description: 'Response time in milliseconds' })),
  toolCount: t.Optional(t.Number({ description: 'Number of available tools' })),
  error: t.Optional(t.String({ description: 'Error message if unhealthy' }))
})

export const McpServerToolsResponse = t.Object({
  server: t.String({ description: 'Server name' }),
  tools: t.Array(McpToolInfo, { description: 'Available tools' }),
  totalTools: t.Number({ description: 'Total number of tools' })
})

// ── Inferred types ───────────────────────────────────────────────────────────

export type McpServerInfoType = typeof McpServerInfo.static
export type McpServersListResponseType = typeof McpServersListResponse.static
export type McpServerHealthResponseType = typeof McpServerHealthResponse.static
export type McpServerToolsResponseType = typeof McpServerToolsResponse.static
export type McpServerCreateType = typeof McpServerCreate.static
export type McpServerUpdateType = typeof McpServerUpdate.static
