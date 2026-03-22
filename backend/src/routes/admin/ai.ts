/**
 * AI Assistant - Unified implementation
 * 
 * Combines internal function calling (direct Elysia route execution) with external MCP server tools.
 * - Primary: Internal tools auto-extracted from Elysia routes (fast, no network overhead)
 * - Secondary: External MCP servers (GitHub, Pylance, custom servers, etc.)
 */

import { Elysia, t } from 'elysia'
import { logger } from '@/lib/logger'
import { ErrorResponse } from '@/schemas'
import {
  ChatRequest,
  ChatResponse,
  AiStreamResponse,
  AiHealthResponse,
  type AiHealthResponseType,
} from '@/schemas/ai-assistant'
import { getToolRegistry, createToolExecutor } from '@/lib/ai/tool-registry'
import { type AIContext } from '@/lib/ai/assistant'
import { McpClient, McpConnectionManager } from '@/lib/ai/mcp-client'
import { streamText, generateText, jsonSchema, stepCountIs, type Tool as AiSdkTool, type LanguageModel } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { validateToken } from '@/lib/auth'
import type { JwtPayload } from 'jsonwebtoken'
import { config } from '@/config'
import { getConfiguredServers } from './mcp-servers'
import { getInstalledSkills } from './ai-tools-skills'

// Keycloak-flavored OIDC JWT payload shape (subset)
type KeycloakJwtPayload = JwtPayload & {
  scope?: string | string[]
  scp?: string | string[]
  email?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
}

function parseRolesFromTokenPayload(payload: KeycloakJwtPayload): string[] {
  const roles: string[] = []
  const realmRoles: string[] = payload?.realm_access?.roles || []
  const clientRoles: string[] = Object.values(payload?.resource_access || {}).flatMap((r) => (r?.roles || [])) as string[]
  return [...new Set([...roles, ...realmRoles, ...clientRoles])]
}

// Mask sensitive identifiers for logs (show a short prefix only)
function maskId(id?: string): string | undefined {
  if (!id) return id
  if (id.length <= 8) return id
  return `${id.slice(0, 8)}…`
}

// Load system prompt from shared markdown file
async function loadSystemPrompt(reqId?: string): Promise<string> {
  const fallback = 'You are an AI assistant for SMART on FHIR. Be concise and helpful.'
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const configuredPath = process.env.AI_SYSTEM_PROMPT_PATH
    const candidatePaths: string[] = []

    if (configuredPath) {
      candidatePaths.push(path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath))
    }

    candidatePaths.push(
      path.join(process.cwd(), 'prompts', 'system.md'),
      path.join(process.cwd(), '..', 'prompts', 'system.md'),
      path.join(process.cwd(), '..', '..', 'prompts', 'system.md')
    )

    const errors: Array<{ path: string; message: string }> = []

    for (const promptPath of candidatePaths) {
      try {
        const promptContent = await fs.readFile(promptPath, 'utf-8')
        // Only strip the top-level H1 title, keep everything else intact
        // (headings, code fences, examples are all meaningful to the model)
        return promptContent
          .replace(/^# SMART on FHIR Platform AI Assistant - System Prompt\n\n/, '')
          .trim()
      } catch (error) {
        errors.push({
          path: promptPath,
          message: error instanceof Error ? error.message : String(error)
        })
      }
    }

    logger.server.warn('Failed to load system prompt, using fallback', {
      reqId,
      attempts: errors
    })
  } catch (err) {
    logger.server.warn('Failed to initialize system prompt loader, using fallback', {
      reqId,
      error: err instanceof Error ? err.message : String(err)
    })
  }
  return fallback
}

/**
 * Append dynamic context (installed skills, MCP servers) to the system prompt.
 */
function enrichSystemPrompt(basePrompt: string): string {
  const sections: string[] = [basePrompt]

  // Installed skills
  const skills = getInstalledSkills().filter(s => s.enabled)
  if (skills.length > 0) {
    const skillLines = skills.map(s => {
      const parts = [`- **${s.name}** (${s.type}): ${s.description}`]
      if (s.sourceUrl) parts.push(`  Source: ${s.sourceUrl}`)
      return parts.join('\n')
    })
    sections.push(
      `\n\n## INSTALLED SKILLS\n\nThe platform has the following AI skills installed. You should know about these and be able to answer questions about them:\n\n${skillLines.join('\n')}`
    )
  }

  // Configured MCP servers
  const mcpServers = getConfiguredMcpServers()
  if (mcpServers.length > 0) {
    const serverLines = mcpServers.map(s => `- **${s.name}**: ${s.url}`)
    sections.push(
      `\n\n## CONNECTED MCP SERVERS\n\n${serverLines.join('\n')}`
    )
  }

  return sections.join('')
}

/**
 * Get all configured MCP servers (env + dynamically added via UI)
 */
function getConfiguredMcpServers(): Array<{ name: string; url: string }> {
  return getConfiguredServers().map(s => ({ name: s.name, url: s.url }))
}

/**
 * Setup tool registry with both internal and external MCP tools
 */
async function setupTools(token: string | undefined, aiContext: AIContext, reqId: string): Promise<{
  sdkTools: Record<string, AiSdkTool>
  toolSources: { internal: number; external: number }
}> {
  const sdkTools: Record<string, AiSdkTool> = {}
  const toolSources = { internal: 0, external: 0 }

  // 1. Add internal tools from Elysia routes (primary, fast)
  const internalTools = getToolRegistry()
  logger.server.info('Loading internal tools from registry', {
    reqId,
    count: internalTools.size,
    toolNames: Array.from(internalTools.keys()).slice(0, 10)
  })

  for (const [toolName, meta] of internalTools.entries()) {
    // Use short prefix "i_" to stay within OpenAI's 64-char tool name limit
    const prefixedName = `i_${toolName}`
    sdkTools[prefixedName] = {
      description: `[Internal] Auto-generated tool for ${meta.method} ${meta.path}`,
      inputSchema: meta.schema ? (() => {
        try {
          const jsonSchema = JSON.parse(JSON.stringify(meta.schema))
          return jsonSchema.type === 'object' ? z.fromJSONSchema(jsonSchema) : z.object({}).strict()
        } catch { return z.object({}).strict() }
      })() : z.object({}).strict(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async ({ input }: any) => {
        logger.server.debug('Executing internal tool', { reqId, tool: toolName, input })
        const start = Date.now()
        try {
          const result = await createToolExecutor(internalTools, aiContext).execute(toolName, input)
          logger.server.debug('Internal tool completed', {
            reqId,
            tool: toolName,
            duration: Date.now() - start
          })
          return typeof result === 'string' ? result : JSON.stringify(result)
        } catch (error) {
          logger.server.error('Internal tool failed', {
            reqId,
            tool: toolName,
            duration: Date.now() - start,
            error: error instanceof Error ? error.message : String(error)
          })
          throw error
        }
      }
    }
    toolSources.internal++
  }

  // 2. Add external MCP server tools (secondary, distributed)
  const mcpServers = getConfiguredMcpServers()
  if (mcpServers.length > 0 && token) {
    logger.server.info('Loading external MCP server tools', {
      reqId,
      serverCount: mcpServers.length,
      servers: mcpServers.map(s => s.name)
    })

    const mcpManager = new McpConnectionManager()
    
    for (const server of mcpServers) {
      try {
        const mcpClient = McpClient.createExternalClient(server.url, server.name, { token: token! })
        mcpManager.addServer(server.name, mcpClient)
      } catch (error) {
        logger.server.warn('Failed to add MCP server', {
          reqId,
          server: server.name,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    try {
      const mcpTools = await mcpManager.getAllTools()
      logger.server.info('MCP tools loaded', {
        reqId,
        count: mcpTools.length,
        toolNames: mcpTools.map(t => t.function.name).slice(0, 10)
      })

      for (const mcpTool of mcpTools) {
        // Use short prefix "m_" to stay within OpenAI's 64-char tool name limit
        const toolName = `m_${mcpTool.function.name}`
        // Pass the real JSON Schema from the MCP server so the model knows what parameters to send
        const mcpInputSchema = mcpTool.function.parameters && Object.keys(mcpTool.function.parameters).length > 0
          ? jsonSchema(mcpTool.function.parameters as Parameters<typeof jsonSchema>[0])
          : z.object({})
        sdkTools[toolName] = {
          description: `[MCP] ${mcpTool.function.description}`,
          inputSchema: mcpInputSchema,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (args: any) => {
            logger.server.debug('Executing MCP tool', { reqId, tool: mcpTool.function.name, args })
            const start = Date.now()
            try {
              const result = await mcpManager.callTool(mcpTool.function.name, args || {})
              logger.server.debug('MCP tool completed', {
                reqId,
                tool: mcpTool.function.name,
                duration: Date.now() - start,
                contentCount: result.content.length,
              })
              // Concatenate all text content from the MCP response
              return result.content.map(c => c.text).join('\n\n') || ''
            } catch (error) {
              logger.server.error('MCP tool failed', {
                reqId,
                tool: mcpTool.function.name,
                duration: Date.now() - start,
                error: error instanceof Error ? error.message : String(error)
              })
              throw error
            }
          }
        }
        toolSources.external++
      }
    } catch (error) {
      logger.server.warn('Failed to load MCP tools', {
        reqId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  logger.server.info('Tool setup completed', {
    reqId,
    total: Object.keys(sdkTools).length,
    internal: toolSources.internal,
    external: toolSources.external
  })

  return { sdkTools, toolSources }
}

// Public AI health check routes
export const aiPublicRoutes = new Elysia({ prefix: '/ai', tags: ['ai'] })
  .get('/health', async ({ set }): Promise<AiHealthResponseType> => {
    try {
      // Check if OpenAI is configured
      const openaiConfigured = !!process.env.OPENAI_API_KEY
      const model = process.env.OPENAI_MODEL || 'gpt-5-mini'

      // Get internal tool count
      const internalTools = getToolRegistry()
      
      // Get external MCP server count
      const mcpServers = getConfiguredMcpServers()

      return {
        status: openaiConfigured ? 'healthy' : 'unhealthy',
        openai: {
          configured: openaiConfigured,
          model,
          reachable: undefined,
        },
        tools: {
          totalAvailable: internalTools.size,
          byPrefix: {
            internal: internalTools.size,
            mcp: mcpServers.length
          },
          examples: Array.from(internalTools.keys()).slice(0, 5),
        },
        mcpServers: mcpServers.map(s => ({ name: s.name, url: s.url })),
        version: '3.0.0-unified',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logger.server.warn('AI health check failed', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : String(error)
      })
      set.status = 503
      return {
        status: 'unhealthy',
        openai: {
          configured: false,
        },
        tools: {
          totalAvailable: 0,
          byPrefix: {},
        },
        version: '3.0.0-unified',
        timestamp: new Date().toISOString(),
      }
    }
  }, {
    response: {
      200: AiHealthResponse,
      503: AiHealthResponse
    },
    detail: {
      summary: 'Get AI assistant health status',
      description: 'Returns health status with both internal and external MCP tools availability.'
    }
  })
  .head('/chat', async ({ set }): Promise<void> => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        set.status = 503
        return
      }
      set.status = 200
    } catch (error) {
      logger.server.warn('AI HEAD /chat check failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      set.status = 503
    }
  }, {
    response: {
      200: t.Void(),
      503: t.Void(),
    },
    detail: {
      summary: 'Check AI assistant availability',
      description: 'HEAD request to check if the AI assistant is available.'
    }
  })

// Protected AI routes (authentication required)
export const aiRoutes = new Elysia({ prefix: '/ai', tags: ['ai'] })
  .post('/chat/stream', async ({ body, set, headers }) => {
    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      set.status = 503
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate
    const authOptional = (process.env.AI_AUTH_OPTIONAL || '').toLowerCase() === 'true'
    const authHeader = headers['authorization'] || headers['Authorization']
    const reqId = crypto.randomUUID()
    
    logger.auth.info('AI /chat/stream auth probe', {
      reqId,
      hasAuthHeader: !!authHeader,
      jwksConfigured: !!config.keycloak.jwksUri,
    })
    
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    if (!token) {
      if (!authOptional) {
        set.status = 401
        return new Response(
          JSON.stringify({ error: 'Authentication required: missing Authorization header' }),
          { headers: { 
            'Content-Type': 'application/json', 
            'WWW-Authenticate': `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}", error="invalid_token", error_description="missing Authorization header"` 
          }}
        )
      }
    }

    try {
      let userId: string | undefined
      let roles: string[] = []
      let email: string | undefined
      
      if (token) {
        try {
          const payload = (await validateToken(token)) as KeycloakJwtPayload
          userId = (payload.sub || payload.preferred_username) as string | undefined
          roles = parseRolesFromTokenPayload(payload)
          email = (payload as JwtPayload & { email?: string }).email
        } catch (err) {
          logger.auth.warn('Token validation failed', { reqId, error: err instanceof Error ? err.message : String(err) })
          if (!authOptional) {
            set.status = 401
            return new Response(
              JSON.stringify({ error: 'Invalid or expired token', details: err instanceof Error ? err.message : String(err) }),
              { headers: { 
                'Content-Type': 'application/json', 
                'WWW-Authenticate': `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}", error="invalid_token", error_description="invalid or expired token"` 
              }}
            )
          }
        }
      }

      if (!userId) {
        logger.auth.warn('AI /chat/stream rejected: no authenticated user', { reqId })
        set.status = 401
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { headers: { 
            'Content-Type': 'application/json', 
            'WWW-Authenticate': `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}"` 
          }}
        )
      }

      // Build AI context
      const aiContext: AIContext = { userId: userId!, roles, email }
      logger.auth.info('AI /chat/stream token accepted', {
        reqId,
        sub: maskId(aiContext.userId),
        rolesCount: roles.length,
        emailPresent: !!email,
      })

      // Setup tools (both internal and external MCP)
      const { sdkTools, toolSources } = await setupTools(token, aiContext, reqId)

      logger.server.info('AI stream starting', { 
        reqId, 
        model: body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini', 
        totalTools: Object.keys(sdkTools).length,
        internalTools: toolSources.internal,
        externalTools: toolSources.external
      })

      // Load system prompt
      const systemPrompt = await loadSystemPrompt(reqId)

      // Use model from request or env
      const modelToUse = body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // Build messages array from conversation history or single message
      const messages = body.messages && body.messages.length > 0
        ? body.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        : [
            {
              role: 'user' as const,
              content: body.message
            }
          ]

      // 🐛 DEBUG: Log what messages we received
      logger.server.info('📝 [STREAM] Messages received from frontend:', { 
        reqId,
        messagesCount: messages.length,
        messages: messages.map((m, i) => ({
          index: i,
          role: m.role,
          contentLength: m.content.length,
          contentPreview: m.content.substring(0, 150) + (m.content.length > 150 ? '...' : '')
        })),
        hasPageContext: !!body.pageContext,
        hasBodyMessage: !!body.message,
        hasBodyMessages: !!(body.messages && body.messages.length > 0)
      })

      // Add page context as first user message if provided and not in history
      if (body.pageContext && (!body.messages || body.messages.length === 0)) {
        messages.unshift({
          role: 'user' as const,
          content: `[Page Context: ${body.pageContext}]\n\n${body.message}`
        })
        // Remove the duplicate message we just added
        messages.pop()
      }

      // Stream with AI SDK
      const result = await streamText({
        model: openai(modelToUse) as unknown as LanguageModel,
        system: enrichSystemPrompt(systemPrompt),
        messages,
        tools: sdkTools,
        stopWhen: stepCountIs(5),
        onFinish: async ({ text, toolCalls, usage, finishReason }) => {
          logger.server.info('AI stream finished', {
            reqId,
            textLength: text?.length || 0,
            toolCallsCount: toolCalls?.length || 0,
            usage,
            finishReason
          })
        },
      })

      return result.toUIMessageStreamResponse()
    } catch (error) {
      logger.server.error('Failed to initialize AI stream', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      set.status = 500
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error while initializing AI assistant'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
  }, {
    body: ChatRequest,
    response: {
      200: AiStreamResponse,
      401: ErrorResponse,
      500: ErrorResponse,
      503: ErrorResponse
    },
    detail: {
      summary: 'Stream AI assistant chat responses',
      description: `Unified AI implementation with both internal function calling and external MCP server tools. Returns Server-Sent Events (SSE) stream using AI SDK's toUIMessageStreamResponse().`,
      tags: ['ai']
    }
  })
  .post('/chat', async ({ body, set, headers }) => {
    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      set.status = 503
      return { error: 'OpenAI API key is not configured' }
    }

    // Authenticate
    const authOptional = (process.env.AI_AUTH_OPTIONAL || '').toLowerCase() === 'true'
    const authHeader = headers['authorization'] || headers['Authorization']
    const reqId = crypto.randomUUID()
    
    logger.auth.info('AI /chat auth probe', {
      reqId,
      hasAuthHeader: !!authHeader,
      jwksConfigured: !!config.keycloak.jwksUri,
    })
    
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    if (!token && !authOptional) {
      set.status = 401
      ; (set.headers as unknown as Record<string, string | number>)['WWW-Authenticate'] = `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}", error="invalid_token", error_description="missing Authorization header"`
      return { error: 'Authentication required' }
    }

    try {
      let userId: string | undefined
      let roles: string[] = []
      let email: string | undefined
      
      if (token) {
        try {
          const payload = (await validateToken(token)) as KeycloakJwtPayload
          userId = (payload.sub || payload.preferred_username) as string | undefined
          roles = parseRolesFromTokenPayload(payload)
          email = (payload as JwtPayload & { email?: string }).email
        } catch (err) {
          logger.auth.warn('Token validation failed (non-stream)', { reqId, error: err instanceof Error ? err.message : String(err) })
          if (!authOptional) {
            set.status = 401
            ; (set.headers as unknown as Record<string, string | number>)['WWW-Authenticate'] = `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}", error="invalid_token", error_description="invalid or expired token"`
            return { error: 'Invalid or expired token' }
          }
        }
      }
      
      if (!userId) {
        set.status = 401
        ; (set.headers as unknown as Record<string, string | number>)['WWW-Authenticate'] = `Bearer realm="${config.keycloak.realm ?? 'proxy-smart'}"`
        return { error: 'Authentication required' }
      }

      // Build AI context
      const aiContext: AIContext = { userId: userId!, roles, email }
      logger.auth.info('AI /chat token accepted', {
        reqId,
        sub: maskId(aiContext.userId),
        rolesCount: roles.length,
        emailPresent: !!email,
      })

      // Setup tools (both internal and external MCP)
      const { sdkTools, toolSources } = await setupTools(token, aiContext, reqId)

      logger.server.info('AI chat starting', {
        reqId,
        model: body.model || process.env.OPENAI_MODEL || 'gpt-5-mini',
        totalTools: Object.keys(sdkTools).length,
        internalTools: toolSources.internal,
        externalTools: toolSources.external
      })

      // Load system prompt
      const systemPrompt = await loadSystemPrompt(reqId)

      // Use model from request or env
      const modelToUse = body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // Build messages array from conversation history or single message
      const messages = body.messages && body.messages.length > 0
        ? body.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        : [
            {
              role: 'user' as const,
              content: body.message
            }
          ]

      // Add page context as first user message if provided and not in history
      if (body.pageContext && (!body.messages || body.messages.length === 0)) {
        messages.unshift({
          role: 'user' as const,
          content: `[Page Context: ${body.pageContext}]\n\n${body.message}`
        })
        // Remove the duplicate message we just added
        messages.pop()
      }

      const startTime = Date.now()
      const result = await generateText({
        model: openai(modelToUse) as unknown as LanguageModel,
        system: enrichSystemPrompt(systemPrompt),
        messages,
        tools: sdkTools,
        stopWhen: stepCountIs(5),
      })

      logger.server.info('AI chat completed', { 
        reqId,
        model: modelToUse, 
        duration: Date.now() - startTime
      })

      return {
        answer: result.text,
        conversationId: body.conversationId || crypto.randomUUID(),
        model: modelToUse,
        sources: undefined,
        toolsUsed: undefined,
        totalDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logger.server.error('Failed to process AI chat request', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      set.status = 500
      return { error: error instanceof Error ? error.message : 'Unknown error while processing AI request' }
    }
  }, {
    body: ChatRequest,
    response: {
      200: ChatResponse,
      400: ErrorResponse,
      401: ErrorResponse,
      500: ErrorResponse,
      503: ErrorResponse
    },
    detail: {
      summary: 'Send chat message to AI assistant',
      description: 'Unified AI implementation with both internal function calling and external MCP server tools. Returns complete response with tool execution details.',
      tags: ['ai']
    }
  })
