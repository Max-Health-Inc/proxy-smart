/**
 * Tool Registry - Auto-generates OpenAI function definitions from Elysia routes
 * 
 * This module introspects your existing API routes and converts them into
 * OpenAI function calling tools, eliminating the need for manual tool definitions.
 */

import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { getCustomTools } from './custom-tools'

// Module-level storage for tools (initialized once at startup)
let globalTools: Map<string, ToolMetadata> | null = null

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

export interface ToolMetadata {
  path: string
  method: string
  handler: unknown
  schema?: TSchema
  public?: boolean // Whether tool is public (no auth required)
}

/**
 * Converts TypeBox schema to OpenAI JSON schema format
 */
function typeboxToOpenAI(schema: TSchema): ToolDefinition['function']['parameters'] {
  const converted = schema as unknown as ToolDefinition['function']['parameters']
  // Ensure additionalProperties is false for OpenAI strict mode when object
  if (converted.type === 'object') {
    return { ...converted, additionalProperties: false }
  }
  return converted
}

/**
 * Initialize the global tool registry (call once at startup after all routes are mounted)
 */
export function initializeToolRegistry(app: unknown, options?: { prefixes?: string[] }): void {
  console.log('[tool-registry] Initializing global tool registry...')
  
  // Extract route tools
  const routeTools = extractRouteTools(app, options)
  console.log(`[tool-registry] Extracted ${routeTools.size} route tools`)
  
  // Add custom tools
  const customTools = getCustomTools()
  globalTools = addCustomTools(routeTools, customTools)
  console.log(`[tool-registry] Added ${customTools.size} custom tools, total: ${globalTools.size}`)
  
  // Log tool names for debugging
  const toolNames = Array.from(globalTools.keys())
  console.log('[tool-registry] Available tools:', toolNames.join(', '))
}

/**
 * Get the initialized tool registry
 */
export function getToolRegistry(): Map<string, ToolMetadata> {
  if (!globalTools) {
    throw new Error('Tool registry not initialized. Call initializeToolRegistry() first.')
  }
  return globalTools
}

/**
 * Check if tool registry is initialized
 */
export function isToolRegistryInitialized(): boolean {
  return globalTools !== null
}

/**
 * Extract route metadata from Elysia app
 */
export function extractRouteTools(app: unknown, options?: { prefixes?: string[] }): Map<string, ToolMetadata> {
  const tools = new Map<string, ToolMetadata>()
  const routePrefixes = options?.prefixes || ['/admin/']
  
  // Access Elysia's internal routes
  const routes: unknown[] = (app as { routes?: unknown[] }).routes ?? []
  
  for (const route of routes) {
    // Check if route matches any of the specified prefixes
    const path = (route as { path?: unknown }).path
    const method = (route as { method?: unknown }).method
    // Elysia stores body schema in hooks.body (TypeBox schema directly), not schema.body
    const hooks = (route as { hooks?: { body?: TSchema } }).hooks
    const legacySchema = (route as { schema?: { body?: TSchema } }).schema
    const handler = (route as { handler?: unknown }).handler
    const meta = (route as { meta?: { public?: boolean } }).meta

    if (typeof path !== 'string' || typeof method !== 'string') continue

    const matchesPrefix = routePrefixes.some(prefix => path.startsWith(prefix))
    if (!matchesPrefix) continue
    
    // Skip read-only / non-action methods (tools should be actions)
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') continue
    
    // Convert route path to tool name
    // e.g., /api/users/:id -> update_user_by_id (if PUT)
    //       /api/users -> create_user (if POST)
    const toolName = pathToToolName(path, method)
    
    // Extract schema from route — prefer hooks.body (Elysia 1.x), fall back to schema.body (legacy)
    const bodySchema = hooks?.body ?? legacySchema?.body
    
    tools.set(toolName, {
      path,
      method,
      handler,
      schema: bodySchema,
      public: meta?.public || false,
    })
  }
  
  return tools
}

/**
 * Add custom tools to the tool registry (for non-route tools like RAG search)
 */
export function addCustomTools(
  tools: Map<string, ToolMetadata>,
  customTools: Map<string, ToolMetadata>
): Map<string, ToolMetadata> {
  const merged = new Map(tools)
  
  for (const [name, metadata] of customTools.entries()) {
    merged.set(name, metadata)
  }
  
  return merged
}

/**
 * Convert route path and method to tool name
 * Examples:
 * - POST /admin/users -> create_admin_user
 * - PUT /admin/users/:id -> update_admin_user_by_id
 * - DELETE /admin/users/:id -> delete_admin_user_by_id
 * - POST /fhir-servers -> create_fhir_server
 */
function pathToToolName(path: string, method: string): string {
  // Remove leading slash
  let name = path.replace(/^\//, '')
  
  // Replace slashes and colons with underscores
  name = name.replace(/\//g, '_').replace(/:/g, '')
  
  // Add method prefix based on HTTP verb
  const methodMap: Record<string, string> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  }
  
  const prefix = methodMap[method.toUpperCase()] || method.toLowerCase()
  
  // Handle path parameters
  if (name.includes('_id')) {
    // e.g., users_id -> user_by_id
    name = name.replace(/_id$/, '_by_id')
  }
  
  return `${prefix}_${name}`
}

/**
 * Generate OpenAI tool definitions from route metadata
 */
export function generateToolDefinitions(
  tools: Map<string, ToolMetadata>,
  userRoles: string[] = []
): ToolDefinition[] {
  const definitions: ToolDefinition[] = []
  
  for (const [toolName, metadata] of tools) {
    // Skip private tools if user doesn't have admin role
    if (!metadata.public && !userRoles.includes('admin')) {
      continue
    }
    
    // Convert TypeBox schema to OpenAI format
    let parameters: ToolDefinition['function']['parameters'] = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }
    
    if (metadata.schema) {
      parameters = typeboxToOpenAI(metadata.schema) as unknown as ToolDefinition['function']['parameters']
    }
    
    // Generate description from route metadata
    const description = generateDescription(toolName, metadata)
    
    definitions.push({
      type: 'function',
      function: {
        name: toolName,
        description,
        parameters,
        strict: true, // Enable OpenAI strict mode
      },
    })
  }
  
  return definitions
}

/**
 * Generate human-readable description from tool metadata
 */
function generateDescription(toolName: string, metadata: ToolMetadata): string {
  const action = toolName.split('_')[0]
  const resource = toolName.split('_').slice(1).join(' ')
  
  const actionDescriptions: Record<string, string> = {
    create: 'Create a new',
    update: 'Update an existing',
    delete: 'Delete an existing',
    list: 'List all',
    get: 'Get details of',
  }
  
  const actionDesc = actionDescriptions[action] || action
  
  return `${actionDesc} ${resource}. ${metadata.public ? '(Public)' : '(Admin only)'}`
}

/**
 * Create a tool executor that runs route handlers directly
 */
export function createToolExecutor(
  tools: Map<string, ToolMetadata>,
  context: {
    userId: string
    roles: string[]
    email?: string
  }
) {
  type ExecutorHandler = (args: unknown, context: unknown) => unknown | Promise<unknown>
  return {
    /**
     * Execute a tool by name
     */
    async execute(toolName: string, args: unknown): Promise<unknown> {
      const tool = tools.get(toolName)
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`)
      }
      
      // Check permissions
      if (!tool.public && !context.roles.includes('admin')) {
        throw new Error(`Permission denied: ${toolName} requires admin role`)
      }
      
      // Validate arguments against schema
      if (tool.schema) {
        const valid = Value.Check(tool.schema, args)
        if (!valid) {
          const errors = [...Value.Errors(tool.schema, args)]
          throw new Error(`Invalid arguments: ${JSON.stringify(errors)}`)
        }
      }
      
      // Execute handler directly (no HTTP overhead!)
      if (typeof tool.handler !== 'function') {
        throw new Error(`Invalid handler for tool ${toolName}`)
      }
      const result = await (tool.handler as ExecutorHandler)(args, {
        user: context,
        // Add any other context needed by handlers
      })
      
      return result
    },
    
    /**
     * Get available tool definitions for this user
     */
    getToolDefinitions(): ToolDefinition[] {
      return generateToolDefinitions(tools, context.roles)
    },
  }
}
