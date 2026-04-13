/**
 * MCP Endpoint Admin schemas
 * 
 * Centralized TypeBox schemas for MCP endpoint configuration management.
 */
import { t } from 'elysia'

// ── Schemas ──────────────────────────────────────────────────────────────────

export const McpEndpointToolInfo = t.Object({
  name: t.String({ description: 'Tool name' }),
  description: t.String({ description: 'Tool description' }),
  exposed: t.Boolean({ description: 'Whether tool is currently exposed via MCP' }),
})

export const McpEndpointResourceInfo = t.Object({
  name: t.String({ description: 'Resource name' }),
  description: t.String({ description: 'Resource description' }),
  uri: t.String({ description: 'MCP resource URI or URI template' }),
  exposed: t.Boolean({ description: 'Whether resource is currently exposed via MCP' }),
})

export const McpEndpointStatusResponse = t.Object({
  enabled: t.Boolean({ description: 'Whether the MCP endpoint is active' }),
  configSource: t.String({ description: 'Where the enabled flag comes from (env | file | default)' }),
  endpointPath: t.String({ description: 'URL path where MCP is mounted' }),
  endpointUrl: t.String({ description: 'Full URL of the MCP endpoint' }),
  tools: t.Array(McpEndpointToolInfo, { description: 'Available tools and their exposure status' }),
  resources: t.Array(McpEndpointResourceInfo, { description: 'Available resources (GET routes) and their exposure status' }),
  disabledTools: t.Array(t.String(), { description: 'Blocklisted tool names' }),
  enabledTools: t.Union([t.Array(t.String()), t.Null()], {
    description: 'Allowlisted tool names (null = blocklist mode)',
  }),
  exposeResourcesAsTools: t.Boolean({ description: 'Whether read-only GET resources are also exposed as MCP tools with readOnlyHint' }),
  updatedAt: t.String({ description: 'Last config update timestamp' }),
})

export const McpEndpointUpdateBody = t.Object({
  enabled: t.Optional(t.Boolean({ description: 'Enable or disable MCP endpoint' })),
  disabledTools: t.Optional(t.Array(t.String(), { description: 'Tools to block from MCP exposure' })),
  enabledTools: t.Optional(
    t.Union([t.Array(t.String()), t.Null()], { description: 'Tools to allow (null = blocklist mode)' }),
  ),
  exposeResourcesAsTools: t.Optional(t.Boolean({ description: 'Whether to also expose read-only GET resources as MCP tools with readOnlyHint' })),
})

// ── Inferred types ───────────────────────────────────────────────────────────

export type McpEndpointStatusResponseType = typeof McpEndpointStatusResponse.static
export type McpEndpointUpdateBodyType = typeof McpEndpointUpdateBody.static
