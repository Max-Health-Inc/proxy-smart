/**
 * MCP Endpoint Configuration — file-backed persistence for tool exposure settings.
 *
 * Persists to `mcp-endpoint.json` next to the running backend.
 * Admin API reads/writes through helpers exported here.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'

// ── Types ────────────────────────────────────────────────────────────────────

export interface McpEndpointConfig {
  /** Master switch — overrides config.mcp.enabled at runtime */
  enabled: boolean
  /** Tool names explicitly disabled (blocklist). Empty = all exposed. */
  disabledTools: string[]
  /** When set, only these tools are exposed (allowlist). null = use blocklist mode. */
  enabledTools: string[] | null
  /** Last modified timestamp */
  updatedAt: string
}

// ── File persistence ─────────────────────────────────────────────────────────

const CONFIG_PATH = join(process.cwd(), 'mcp-endpoint.json')

const DEFAULT_CONFIG: McpEndpointConfig = {
  enabled: true,
  disabledTools: [],
  enabledTools: null,
  updatedAt: new Date().toISOString(),
}

let cached: McpEndpointConfig | null = null

export function loadMcpEndpointConfig(): McpEndpointConfig {
  if (cached) return cached
  try {
    if (!existsSync(CONFIG_PATH)) {
      cached = { ...DEFAULT_CONFIG }
      return cached
    }
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    const data = JSON.parse(raw) as Partial<McpEndpointConfig>
    cached = {
      enabled: data.enabled ?? DEFAULT_CONFIG.enabled,
      disabledTools: Array.isArray(data.disabledTools) ? data.disabledTools : [],
      enabledTools: Array.isArray(data.enabledTools) ? data.enabledTools : null,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    }
    return cached
  } catch (error) {
    logger.server.warn('Failed to load mcp-endpoint.json, using defaults', {
      error: error instanceof Error ? error.message : String(error),
    })
    cached = { ...DEFAULT_CONFIG }
    return cached
  }
}

export function saveMcpEndpointConfig(cfg: McpEndpointConfig): void {
  cfg.updatedAt = new Date().toISOString()
  cached = cfg
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
}

/**
 * Check whether a specific tool should be exposed via the MCP endpoint.
 */
export function isToolExposed(toolName: string): boolean {
  const cfg = loadMcpEndpointConfig()
  // Allowlist mode takes priority
  if (cfg.enabledTools !== null) {
    return cfg.enabledTools.includes(toolName)
  }
  // Otherwise blocklist mode
  return !cfg.disabledTools.includes(toolName)
}
