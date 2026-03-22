import { describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'
import { extractRouteTools, type ToolMetadata } from '../src/lib/ai/tool-registry'

/**
 * Tests for MCP tool-registry schema extraction and tool bridging.
 *
 * These catch regressions like:
 *  - Elysia body schemas not being extracted (hooks.body vs schema.body)
 *  - TypeBox symbols leaking into JSON Schema
 *  - Route handler context mismatches
 *  - Path parameter extraction
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Elysia app with test routes */
function createTestApp() {
  return new Elysia()
    .post('/admin/users', ({ body }) => ({ created: true, ...body }), {
      body: t.Object({
        name: t.String({ minLength: 1, description: 'User name' }),
        email: t.String({ format: 'email', description: 'Email address' }),
        age: t.Optional(t.Number({ minimum: 0 })),
      }),
    })
    .put('/admin/users/:userId', ({ body, params }) => ({ updated: true, userId: params.userId, ...body }), {
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String({ format: 'email' })),
      }),
    })
    .delete('/admin/users/:userId', ({ params }) => ({ deleted: true, userId: params.userId }))
    .post('/admin/ai/chat', ({ body }) => ({ reply: `Echo: ${body.message}` }), {
      body: t.Object({
        message: t.String({ minLength: 1, description: 'User message' }),
        conversationId: t.Optional(t.String()),
        model: t.Optional(t.String()),
      }),
    })
    .post('/admin/restart', () => ({ success: true, message: 'Restarted' }))
    .get('/admin/health', () => ({ status: 'ok' })) // GET — should be skipped
    .post('/public/other', () => ({ nope: true })) // wrong prefix — should be skipped
}

// ── Schema Extraction ────────────────────────────────────────────────────────

describe('Tool Registry — Schema Extraction', () => {
  const app = createTestApp()
  const tools = extractRouteTools(app, { prefixes: ['/admin/'] })

  it('extracts POST/PUT/DELETE routes under /admin/', () => {
    const names = Array.from(tools.keys())
    expect(names).toContain('create_admin_users')
    expect(names).toContain('update_admin_users_userId')
    expect(names).toContain('delete_admin_users_userId')
    expect(names).toContain('create_admin_ai_chat')
    expect(names).toContain('create_admin_restart')
  })

  it('skips GET routes', () => {
    const names = Array.from(tools.keys())
    const hasGet = names.some(n => n.includes('health'))
    expect(hasGet).toBe(false)
  })

  it('skips routes outside the prefix', () => {
    const names = Array.from(tools.keys())
    const hasPublic = names.some(n => n.includes('public'))
    expect(hasPublic).toBe(false)
  })

  it('extracts body schema with correct properties for POST with body', () => {
    const chatTool = tools.get('create_admin_ai_chat')
    expect(chatTool).toBeDefined()
    expect(chatTool!.schema).toBeDefined()

    const schema = chatTool!.schema as Record<string, unknown>
    expect(schema.type).toBe('object')

    const props = schema.properties as Record<string, unknown>
    expect(props).toBeDefined()
    expect(props.message).toBeDefined()
    expect(props.conversationId).toBeDefined()
    expect(props.model).toBeDefined()
  })

  it('extracts required fields from schema', () => {
    const chatTool = tools.get('create_admin_ai_chat')
    const schema = chatTool!.schema as Record<string, unknown>
    const required = schema.required as string[]
    expect(required).toContain('message')
    // Optional fields should NOT be in required
    expect(required).not.toContain('conversationId')
    expect(required).not.toContain('model')
  })

  it('extracts body schema for user creation with minLength', () => {
    const userTool = tools.get('create_admin_users')
    expect(userTool).toBeDefined()
    expect(userTool!.schema).toBeDefined()

    const schema = userTool!.schema as Record<string, unknown>
    const props = schema.properties as Record<string, Record<string, unknown>>
    expect(props.name).toBeDefined()
    expect(props.name.type).toBe('string')
    expect(props.name.minLength).toBe(1)
    expect(props.email).toBeDefined()
  })

  it('has no schema for routes without body validation', () => {
    const restartTool = tools.get('create_admin_restart')
    expect(restartTool).toBeDefined()
    // Routes with no body schema should have undefined schema
    expect(restartTool!.schema).toBeUndefined()
  })

  it('stores the handler function', () => {
    const chatTool = tools.get('create_admin_ai_chat')
    expect(typeof chatTool!.handler).toBe('function')
  })

  it('stores the correct HTTP method and path', () => {
    const chatTool = tools.get('create_admin_ai_chat')
    expect(chatTool!.method).toBe('POST')
    expect(chatTool!.path).toBe('/admin/ai/chat')

    const deleteTool = tools.get('delete_admin_users_userId')
    expect(deleteTool!.method).toBe('DELETE')
    expect(deleteTool!.path).toBe('/admin/users/:userId')
  })
})

// ── JSON Schema Cleaning ─────────────────────────────────────────────────────

describe('Tool Registry — JSON Schema Cleaning', () => {
  it('produces clean JSON Schema from TypeBox (no Symbol pollution)', () => {
    const schema = t.Object({
      message: t.String({ minLength: 1 }),
      count: t.Optional(t.Number()),
    })

    // TypeBox adds Symbol(TypeBox.Kind)
    const symbols = Object.getOwnPropertySymbols(schema)
    expect(symbols.length).toBeGreaterThan(0)

    // JSON.parse(JSON.stringify()) strips Symbols
    const clean = JSON.parse(JSON.stringify(schema))
    const cleanSymbols = Object.getOwnPropertySymbols(clean)
    expect(cleanSymbols.length).toBe(0)

    // Verify structure is preserved
    expect(clean.type).toBe('object')
    expect(clean.required).toContain('message')
    expect(clean.properties.message.type).toBe('string')
    expect(clean.properties.message.minLength).toBe(1)
    expect(clean.properties.count.type).toBe('number')
  })

  it('cleans nested object schemas (e.g. array of messages)', () => {
    const schema = t.Object({
      messages: t.Array(t.Object({
        role: t.String(),
        content: t.String(),
      })),
    })

    const clean = JSON.parse(JSON.stringify(schema))
    expect(clean.properties.messages.type).toBe('array')
    expect(clean.properties.messages.items.type).toBe('object')
    expect(clean.properties.messages.items.properties.role.type).toBe('string')

    // No Symbols anywhere in the tree
    const deepCheck = (obj: unknown): boolean => {
      if (typeof obj !== 'object' || obj === null) return true
      if (Object.getOwnPropertySymbols(obj).length > 0) return false
      return Object.values(obj).every(deepCheck)
    }
    expect(deepCheck(clean)).toBe(true)
  })
})

// ── Elysia Context Building ─────────────────────────────────────────────────

describe('Tool Registry — Elysia Context for Handlers', () => {
  const app = createTestApp()
  const tools = extractRouteTools(app, { prefixes: ['/admin/'] })

  it('handler receives body args correctly', async () => {
    const chatTool = tools.get('create_admin_ai_chat')!
    const handler = chatTool.handler as (ctx: unknown) => unknown

    const result = await handler({
      body: { message: 'Hello!' },
      headers: { 'content-type': 'application/json' },
      set: { status: 200, headers: {} },
      params: {},
      query: {},
    })

    expect(result).toEqual({ reply: 'Echo: Hello!' })
  })

  it('handler receives params for path-parameterized routes', async () => {
    const deleteTool = tools.get('delete_admin_users_userId')!
    const handler = deleteTool.handler as (ctx: unknown) => unknown

    const result = await handler({
      body: {},
      headers: {},
      set: { status: 200, headers: {} },
      params: { userId: 'user-123' },
      query: {},
    })

    expect(result).toEqual({ deleted: true, userId: 'user-123' })
  })

  it('handler receives both body and params for update routes', async () => {
    const updateTool = tools.get('update_admin_users_userId')!
    const handler = updateTool.handler as (ctx: unknown) => unknown

    const result = await handler({
      body: { name: 'Jane' },
      headers: {},
      set: { status: 200, headers: {} },
      params: { userId: 'user-456' },
      query: {},
    })

    expect(result).toEqual({ updated: true, userId: 'user-456', name: 'Jane' })
  })

  it('handler works with no body for bodyless routes', async () => {
    const restartTool = tools.get('create_admin_restart')!
    const handler = restartTool.handler as (ctx: unknown) => unknown

    const result = await handler({
      body: {},
      headers: {},
      set: { status: 200, headers: {} },
      params: {},
      query: {},
    })

    expect(result).toEqual({ success: true, message: 'Restarted' })
  })
})

// ── Path Parameter Extraction ────────────────────────────────────────────────

describe('Tool Registry — Path Parameter Extraction', () => {
  // Reimplementation for testing (same logic as mcp-endpoint.ts extractPathParams)
  function extractPathParams(path: string, args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {}
    const paramNames = path.match(/:(\w+)/g)
    if (paramNames) {
      for (const param of paramNames) {
        const name = param.slice(1)
        if (args[name] !== undefined) {
          params[name] = String(args[name])
        }
      }
    }
    return params
  }

  it('extracts single path param', () => {
    const result = extractPathParams('/admin/users/:userId', { userId: 'abc-123', name: 'Test' })
    expect(result).toEqual({ userId: 'abc-123' })
  })

  it('extracts multiple path params', () => {
    const result = extractPathParams('/admin/launch-contexts/:userId/patient/:patientId', {
      userId: 'user-1',
      patientId: 'patient-2',
      extra: 'ignored',
    })
    expect(result).toEqual({ userId: 'user-1', patientId: 'patient-2' })
  })

  it('returns empty for paths with no params', () => {
    const result = extractPathParams('/admin/restart', { anything: 'here' })
    expect(result).toEqual({})
  })

  it('skips params not present in args', () => {
    const result = extractPathParams('/admin/users/:userId', { name: 'no-id-here' })
    expect(result).toEqual({})
  })
})

// ── Tool Name Generation ─────────────────────────────────────────────────────

describe('Tool Registry — Tool Name Generation', () => {
  const app = createTestApp()
  const tools = extractRouteTools(app, { prefixes: ['/admin/'] })

  it('generates create_ prefix for POST routes', () => {
    expect(tools.has('create_admin_users')).toBe(true)
    expect(tools.has('create_admin_ai_chat')).toBe(true)
    expect(tools.has('create_admin_restart')).toBe(true)
  })

  it('generates update_ prefix for PUT routes', () => {
    expect(tools.has('update_admin_users_userId')).toBe(true)
  })

  it('generates delete_ prefix for DELETE routes', () => {
    expect(tools.has('delete_admin_users_userId')).toBe(true)
  })
})
