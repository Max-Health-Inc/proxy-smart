/**
 * MCP Endpoint Config — Unit Tests
 *
 * Tests the file-backed config persistence for:
 *  - isToolExposed: allowlist vs blocklist modes
 *  - isResourceExposed follows same logic as tools
 *  - Edge cases: empty allowlist blocks everything, null enabledTools uses blocklist
 *  - saveMcpEndpointConfig updates timestamp and file
 *
 * NOTE: The module caches config in memory (`let cached`). We use
 * `saveMcpEndpointConfig` to update the in-memory cache between tests
 * rather than writing files and trying to bust the module cache.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import {
  loadMcpEndpointConfig,
  saveMcpEndpointConfig,
  isToolExposed,
  isResourceExposed,
} from '../src/lib/mcp-endpoint-config'

const CONFIG_PATH = join(process.cwd(), 'mcp-endpoint.json')

// ── Backup / restore ─────────────────────────────────────────────────────────

let originalContent: string | null = null

function backupConfig() {
  if (existsSync(CONFIG_PATH)) {
    originalContent = readFileSync(CONFIG_PATH, 'utf-8')
  } else {
    originalContent = null
  }
}

function restoreConfig() {
  if (originalContent !== null) {
    writeFileSync(CONFIG_PATH, originalContent, 'utf-8')
    // Also update the in-memory cache
    try {
      saveMcpEndpointConfig(JSON.parse(originalContent))
    } catch {
      // If original was invalid JSON, reset to defaults
      saveMcpEndpointConfig({
        enabled: true,
        disabledTools: [],
        enabledTools: null,
        exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
      })
    }
  } else if (existsSync(CONFIG_PATH)) {
    unlinkSync(CONFIG_PATH)
    // Reset the in-memory cache to defaults
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MCP Endpoint Config — isToolExposed', () => {
  beforeEach(() => {
    backupConfig()
  })

  afterEach(() => {
    restoreConfig()
  })

  it('exposes all tools in default blocklist mode (empty blocklist)', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    expect(isToolExposed('any_tool_name')).toBe(true)
    expect(isToolExposed('search_documentation')).toBe(true)
  })

  it('blocks tools in the disabledTools blocklist', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: ['dangerous_tool', 'another_tool'],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    expect(isToolExposed('dangerous_tool')).toBe(false)
    expect(isToolExposed('another_tool')).toBe(false)
    expect(isToolExposed('safe_tool')).toBe(true)
  })

  it('allowlist mode: only enabled tools are exposed', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: ['tool_a', 'tool_b'],
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    expect(isToolExposed('tool_a')).toBe(true)
    expect(isToolExposed('tool_b')).toBe(true)
    expect(isToolExposed('tool_c')).toBe(false)
  })

  it('allowlist takes priority over blocklist', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: ['tool_a'], // also in blocklist
      enabledTools: ['tool_a', 'tool_b'], // allowlist overrides
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    // tool_a is in both — allowlist wins
    expect(isToolExposed('tool_a')).toBe(true)
    // tool_c is not in allowlist — blocked even though not in blocklist
    expect(isToolExposed('tool_c')).toBe(false)
  })

  it('empty allowlist blocks ALL tools', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: [],
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    expect(isToolExposed('any_tool')).toBe(false)
    expect(isToolExposed('search_documentation')).toBe(false)
  })

  it('isResourceExposed follows same logic as isToolExposed', () => {
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: ['blocked_resource'],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    expect(isResourceExposed('blocked_resource')).toBe(false)
    expect(isResourceExposed('allowed_resource')).toBe(true)
  })
})

describe('MCP Endpoint Config — saveMcpEndpointConfig', () => {
  beforeEach(() => {
    backupConfig()
  })

  afterEach(() => {
    restoreConfig()
  })

  it('persists config to mcp-endpoint.json', () => {
    saveMcpEndpointConfig({
      enabled: false,
      disabledTools: ['test_tool'],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: '', // should be overwritten
    })

    expect(existsSync(CONFIG_PATH)).toBe(true)
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    expect(raw.enabled).toBe(false)
    expect(raw.disabledTools).toEqual(['test_tool'])
    expect(raw.updatedAt).not.toBe('')
  })

  it('updates the updatedAt timestamp', () => {
    const before = new Date().toISOString()
    saveMcpEndpointConfig({
      enabled: true,
      disabledTools: [],
      enabledTools: null,
      exposeResourcesAsTools: true,
      updatedAt: '2020-01-01T00:00:00Z',
    })

    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    expect(new Date(raw.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime())
  })

  it('saved config is immediately visible via loadMcpEndpointConfig', () => {
    saveMcpEndpointConfig({
      enabled: false,
      disabledTools: ['x'],
      enabledTools: ['y'],
      exposeResourcesAsTools: true,
      updatedAt: new Date().toISOString(),
    })

    const cfg = loadMcpEndpointConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.disabledTools).toEqual(['x'])
    expect(cfg.enabledTools).toEqual(['y'])
  })
})
