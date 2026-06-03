/**
 * @max-health-inc/elysia-mcp - Tests
 *
 * Unit tests for route introspection, TypeBox-to-Zod bridge, and tool execution.
 */

import { describe, it, expect } from 'bun:test'
import { Type } from '@sinclair/typebox'
import {
  extractRouteTools,
  extractRouteResources,
  pathToToolName,
  pathToResourceName,
  pathToResourceUri,
} from '../src/introspect'
import { typeboxToZod, getMergedInputSchema } from '../src/typebox-to-zod'
import { executeTool, executeResource } from '../src/executor'
import type { ToolMetadata, ResourceMetadata } from '../src/types'

// ── Introspect tests ─────────────────────────────────────────────────────────

describe('pathToToolName', () => {
  it('generates correct names for POST routes', () => {
    expect(pathToToolName('/admin/users', 'POST')).toBe('create_admin_users')
  })

  it('generates correct names for PUT routes with params', () => {
    expect(pathToToolName('/admin/users/:userId', 'PUT')).toBe('update_admin_users_userId')
  })

  it('generates correct names for DELETE routes', () => {
    expect(pathToToolName('/admin/roles/:roleName', 'DELETE')).toBe('delete_admin_roles_roleName')
  })

  it('generates correct names for GET routes', () => {
    expect(pathToToolName('/admin/branding', 'GET')).toBe('get_admin_branding')
  })

  it('handles nested paths', () => {
    expect(pathToToolName('/admin/access-control/groups', 'POST')).toBe('create_admin_access-control_groups')
  })
})

describe('pathToResourceName', () => {
  it('converts simple paths', () => {
    expect(pathToResourceName('/admin/branding')).toBe('admin_branding')
  })

  it('converts parameterized paths', () => {
    expect(pathToResourceName('/admin/roles/:roleName')).toBe('admin_roles_by_roleName')
  })

  it('replaces hyphens with underscores', () => {
    expect(pathToResourceName('/admin/access-control/groups')).toBe('admin_access_control_groups')
  })
})

describe('pathToResourceUri', () => {
  it('generates static URIs', () => {
    expect(pathToResourceUri('/admin/branding', 'myapp')).toBe('myapp://admin/branding')
  })

  it('generates URI templates for parameterized paths', () => {
    expect(pathToResourceUri('/admin/roles/:roleName', 'myapp')).toBe('myapp://admin/roles/{roleName}')
  })

  it('uses default scheme', () => {
    expect(pathToResourceUri('/api/data')).toBe('app://api/data')
  })
})

describe('extractRouteTools', () => {
  it('extracts tools from routes matching prefixes', () => {
    const mockApp = {
      routes: [
        { path: '/admin/users', method: 'POST', handler: () => 'ok', hooks: { body: Type.Object({ name: Type.String() }) } },
        { path: '/admin/users/:id', method: 'GET', handler: () => 'ok', hooks: { params: Type.Object({ id: Type.String() }) } },
        { path: '/public/health', method: 'GET', handler: () => 'ok' },
      ],
    }

    const tools = extractRouteTools(mockApp, { prefixes: ['/admin/'] })
    expect(tools.size).toBe(2)
    expect(tools.has('create_admin_users')).toBe(true)
    expect(tools.has('get_admin_users_id')).toBe(true)
    expect(tools.has('get_public_health')).toBe(false)
  })

  it('skips HEAD and OPTIONS routes', () => {
    const mockApp = {
      routes: [
        { path: '/admin/test', method: 'HEAD', handler: () => 'ok' },
        { path: '/admin/test', method: 'OPTIONS', handler: () => 'ok' },
        { path: '/admin/test', method: 'POST', handler: () => 'ok' },
      ],
    }

    const tools = extractRouteTools(mockApp, { prefixes: ['/admin/'] })
    expect(tools.size).toBe(1)
    expect(tools.has('create_admin_test')).toBe(true)
  })

  it('marks GET routes as readOnly', () => {
    const mockApp = {
      routes: [
        { path: '/admin/data', method: 'GET', handler: () => 'ok' },
        { path: '/admin/data', method: 'POST', handler: () => 'ok' },
      ],
    }

    const tools = extractRouteTools(mockApp, { prefixes: ['/admin/'] })
    expect(tools.get('get_admin_data')?.readOnly).toBe(true)
    expect(tools.get('create_admin_data')?.readOnly).toBe(false)
  })

  it('reads meta.public annotation', () => {
    const mockApp = {
      routes: [
        { path: '/api/public-data', method: 'GET', handler: () => 'ok', meta: { public: true } },
      ],
    }

    const tools = extractRouteTools(mockApp, { prefixes: ['/api/'] })
    expect(tools.get('get_api_public-data')?.public).toBe(true)
  })
})

describe('extractRouteResources', () => {
  it('extracts only GET routes', () => {
    const mockApp = {
      routes: [
        { path: '/admin/branding', method: 'GET', handler: () => 'ok' },
        { path: '/admin/branding', method: 'PUT', handler: () => 'ok' },
      ],
    }

    const resources = extractRouteResources(mockApp, { prefixes: ['/admin/'] })
    expect(resources.size).toBe(1)
    expect(resources.has('admin_branding')).toBe(true)
  })

  it('extracts path params', () => {
    const mockApp = {
      routes: [
        { path: '/admin/users/:userId/roles/:roleId', method: 'GET', handler: () => 'ok' },
      ],
    }

    const resources = extractRouteResources(mockApp, { prefixes: ['/admin/'] })
    const res = resources.get('admin_users_by_userId_roles_by_roleId')!
    expect(res.pathParams).toEqual(['userId', 'roleId'])
  })
})

// ── TypeBox-to-Zod tests ─────────────────────────────────────────────────────

describe('typeboxToZod', () => {
  it('converts a simple TypeBox object to Zod shape', () => {
    const schema = Type.Object({
      name: Type.String({ description: 'User name' }),
      age: Type.Number(),
    })

    const zod = typeboxToZod(schema)
    expect(zod).toBeDefined()
    expect(zod!.name).toBeDefined()
    expect(zod!.age).toBeDefined()
  })

  it('marks non-required fields as optional', () => {
    const schema = Type.Object({
      name: Type.String(),
      bio: Type.Optional(Type.String()),
    })
    // TypeBox with Optional doesn't add to required array
    const zod = typeboxToZod(schema)
    expect(zod).toBeDefined()
  })

  it('returns undefined for non-object schemas', () => {
    const schema = Type.String()
    const zod = typeboxToZod(schema)
    expect(zod).toBeUndefined()
  })

  it('returns undefined for invalid input', () => {
    const zod = typeboxToZod('not a schema')
    expect(zod).toBeUndefined()
  })
})

describe('getMergedInputSchema', () => {
  it('returns body schema when no params', () => {
    const bodySchema = Type.Object({ name: Type.String() })
    const meta: ToolMetadata = { path: '/test', method: 'POST', handler: () => {}, schema: bodySchema }
    const merged = getMergedInputSchema(meta)
    expect(merged).toBe(bodySchema)
  })

  it('returns params schema when no body', () => {
    const paramsSchema = Type.Object({ id: Type.String() })
    const meta: ToolMetadata = { path: '/test/:id', method: 'GET', handler: () => {}, paramsSchema }
    const merged = getMergedInputSchema(meta)
    expect(merged).toBe(paramsSchema)
  })

  it('merges body and params schemas', () => {
    const bodySchema = Type.Object({ name: Type.String() })
    const paramsSchema = Type.Object({ id: Type.String() })
    const meta: ToolMetadata = { path: '/test/:id', method: 'PUT', handler: () => {}, schema: bodySchema, paramsSchema }
    const merged = getMergedInputSchema(meta)!
    const props = (merged as { properties?: Record<string, unknown> }).properties
    expect(props).toBeDefined()
    expect(props!.name).toBeDefined()
    expect(props!.id).toBeDefined()
  })

  it('returns undefined when neither body nor params', () => {
    const meta: ToolMetadata = { path: '/test', method: 'POST', handler: () => {} }
    expect(getMergedInputSchema(meta)).toBeUndefined()
  })
})

// ── Executor tests ───────────────────────────────────────────────────────────

describe('executeTool', () => {
  it('executes a simple handler', async () => {
    const meta: ToolMetadata = {
      path: '/admin/test',
      method: 'POST',
      handler: (ctx: { body: { message: string } }) => ({ echo: ctx.body.message }),
    }

    const result = await executeTool('create_admin_test', meta, { message: 'hello' })
    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.echo).toBe('hello')
  })

  it('passes path params correctly', async () => {
    const meta: ToolMetadata = {
      path: '/admin/users/:userId',
      method: 'PUT',
      handler: (ctx: { params: { userId: string }; body: { name: string } }) => ({
        userId: ctx.params.userId,
        name: ctx.body.name,
      }),
    }

    const result = await executeTool('update_admin_users_userId', meta, { userId: '123', name: 'Alice' })
    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.userId).toBe('123')
    expect(parsed.name).toBe('Alice')
  })

  it('reports handler errors gracefully', async () => {
    const meta: ToolMetadata = {
      path: '/admin/fail',
      method: 'POST',
      handler: () => { throw new Error('Boom') },
    }

    const result = await executeTool('create_admin_fail', meta, {})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Boom')
  })

  it('reports missing handler', async () => {
    const meta: ToolMetadata = {
      path: '/admin/nohandler',
      method: 'POST',
      handler: 'not a function',
    }

    const result = await executeTool('create_admin_nohandler', meta, {})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('no callable handler')
  })

  it('injects context decorators', async () => {
    const meta: ToolMetadata = {
      path: '/admin/decorated',
      method: 'POST',
      handler: (ctx: { body: object; getDb: () => string }) => ({ db: ctx.getDb() }),
    }

    const result = await executeTool('create_admin_decorated', meta, {}, undefined, { getDb: () => 'postgres' })
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.db).toBe('postgres')
  })

  it('validates input against schema', async () => {
    const meta: ToolMetadata = {
      path: '/admin/strict',
      method: 'POST',
      handler: () => 'ok',
      schema: Type.Object({ name: Type.String() }),
    }

    const result = await executeTool('create_admin_strict', meta, { name: 123 as unknown as string })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation error')
  })
})

describe('executeResource', () => {
  it('executes a GET handler', async () => {
    const meta: ResourceMetadata = {
      path: '/admin/branding',
      method: 'GET',
      handler: () => ({ logo: 'test.png' }),
      pathParams: [],
    }

    const result = await executeResource(meta, {})
    const parsed = JSON.parse(result)
    expect(parsed.logo).toBe('test.png')
  })

  it('passes path params', async () => {
    const meta: ResourceMetadata = {
      path: '/admin/users/:userId',
      method: 'GET',
      handler: (ctx: { params: { userId: string } }) => ({ id: ctx.params.userId }),
      pathParams: ['userId'],
    }

    const result = await executeResource(meta, { userId: '456' })
    const parsed = JSON.parse(result)
    expect(parsed.id).toBe('456')
  })

  it('handles errors gracefully', async () => {
    const meta: ResourceMetadata = {
      path: '/admin/broken',
      method: 'GET',
      handler: () => { throw new Error('DB down') },
      pathParams: [],
    }

    const result = await executeResource(meta, {})
    const parsed = JSON.parse(result)
    expect(parsed.error).toContain('DB down')
  })
})
