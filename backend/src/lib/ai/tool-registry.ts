/**
 * Tool Registry - Auto-generates OpenAI function definitions from Elysia routes
 *
 * This module wraps @max-health-inc/elysia-mcp's route introspection and adds
 * domain-specific orchestration: global singleton, custom tools, OpenAI format,
 * and the tool executor used by the AI assistant chat.
 */

import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import {
  extractRouteTools as _extractRouteTools,
  extractRouteResources as _extractRouteResources,
  pathToResourceUri as _pathToResourceUri,
  getMergedInputSchema as _getMergedInputSchema,
} from '@max-health-inc/elysia-mcp'
import type {
  ToolMetadata,
  ResourceMetadata,
} from '@max-health-inc/elysia-mcp'
import { getCustomTools } from './custom-tools'

// Re-export types so existing consumers don't need to change their imports
export type { ToolMetadata, ResourceMetadata }

// ── Module-level singletons (initialized once at startup) ────────────────────

let globalTools: Map<string, ToolMetadata> | null = null
let globalResources: Map<string, ResourceMetadata> | null = null

// ── OpenAI Tool Definition types ─────────────────────────────────────────────

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
      additionalProperties?: boolean
    }
    strict?: boolean
  }
}

// ── Re-exports from package (preserving existing public API) ─────────────────

export const extractRouteTools = _extractRouteTools
export const extractRouteResources = _extractRouteResources
export const getMergedInputSchema = _getMergedInputSchema

/**
 * Convert an Elysia route path to an MCP resource URI (proxy-smart scheme).
 */
export function pathToResourceUri(path: string): string {
  return _pathToResourceUri(path, 'proxy-smart')
}

// ── Singleton lifecycle ──────────────────────────────────────────────────────

/**
 * Initialize the global tool registry (call once at startup after all routes are mounted)
 */
export function initializeToolRegistry(app: unknown, options?: { prefixes?: string[] }): void {
  console.log('[tool-registry] Initializing global tool registry...')

  const routeTools = extractRouteTools(app, options)
  console.log(`[tool-registry] Extracted ${routeTools.size} route tools`)

  const customTools = getCustomTools()
  globalTools = addCustomTools(routeTools, customTools)
  console.log(`[tool-registry] Added ${customTools.size} custom tools, total: ${globalTools.size}`)

  const toolNames = Array.from(globalTools.keys())
  console.log('[tool-registry] Available tools:', toolNames.join(', '))

  globalResources = extractRouteResources(app, options)
  console.log(`[tool-registry] Extracted ${globalResources.size} MCP resources from GET routes`)
}

export function getToolRegistry(): Map<string, ToolMetadata> {
  if (!globalTools) {
    throw new Error('Tool registry not initialized. Call initializeToolRegistry() first.')
  }
  return globalTools
}

export function isToolRegistryInitialized(): boolean {
  return globalTools !== null
}

export function getResourceRegistry(): Map<string, ResourceMetadata> {
  if (!globalResources) {
    throw new Error('Resource registry not initialized. Call initializeToolRegistry() first.')
  }
  return globalResources
}

export function isResourceRegistryInitialized(): boolean {
  return globalResources !== null
}

// ── Custom tools ─────────────────────────────────────────────────────────────

export function addCustomTools(
  tools: Map<string, ToolMetadata>,
  customTools: Map<string, ToolMetadata>,
): Map<string, ToolMetadata> {
  const merged = new Map(tools)
  for (const [name, metadata] of customTools.entries()) {
    merged.set(name, metadata)
  }
  return merged
}

// ── OpenAI format helpers ────────────────────────────────────────────────────

function typeboxToOpenAI(schema: TSchema): ToolDefinition['function']['parameters'] {
  const converted = schema as unknown as ToolDefinition['function']['parameters']
  if (converted.type === 'object') {
    return { ...converted, additionalProperties: false }
  }
  return converted
}

function generateDescription(toolName: string, metadata: ToolMetadata): string {
  const action = toolName.split('_')[0]
  const resource = toolName.split('_').slice(1).join(' ')

  const actionDescriptions: Record<string, string> = {
    create: 'Create a new',
    update: 'Update an existing',
    delete: 'Delete an existing',
    get: 'Get',
  }

  const actionDesc = actionDescriptions[action] || action
  return `${actionDesc} ${resource}. ${metadata.public ? '(Public)' : '(Admin only)'}`
}

/**
 * Generate OpenAI tool definitions from route metadata
 */
export function generateToolDefinitions(
  tools: Map<string, ToolMetadata>,
  userRoles: string[] = [],
): ToolDefinition[] {
  const definitions: ToolDefinition[] = []

  for (const [toolName, metadata] of tools) {
    if (!metadata.public && !userRoles.includes('admin')) continue

    let parameters: ToolDefinition['function']['parameters'] = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }

    const inputSchema = getMergedInputSchema(metadata)
    if (inputSchema) {
      parameters = typeboxToOpenAI(inputSchema) as unknown as ToolDefinition['function']['parameters']
    }

    definitions.push({
      type: 'function',
      function: {
        name: toolName,
        description: generateDescription(toolName, metadata),
        parameters,
        strict: true,
      },
    })
  }

  return definitions
}

// ── Tool executor (used by AI chat assistant) ────────────────────────────────

/**
 * Create a tool executor that runs route handlers directly
 */
export function createToolExecutor(
  tools: Map<string, ToolMetadata>,
  context: { userId: string; roles: string[]; email?: string },
) {
  type ExecutorHandler = (args: unknown, context: unknown) => unknown | Promise<unknown>
  return {
    async execute(toolName: string, args: unknown): Promise<unknown> {
      const tool = tools.get(toolName)

      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`)
      }

      if (!tool.public && !context.roles.includes('admin')) {
        throw new Error(`Permission denied: ${toolName} requires admin role`)
      }

      if (tool.schema) {
        const valid = Value.Check(tool.schema, args)
        if (!valid) {
          const errors = [...Value.Errors(tool.schema, args)]
          throw new Error(`Invalid arguments: ${JSON.stringify(errors)}`)
        }
      }

      if (typeof tool.handler !== 'function') {
        throw new Error(`Invalid handler for tool ${toolName}`)
      }

      return await (tool.handler as ExecutorHandler)(args, { user: context })
    },

    getToolDefinitions(): ToolDefinition[] {
      return generateToolDefinitions(tools, context.roles)
    },
  }
}
