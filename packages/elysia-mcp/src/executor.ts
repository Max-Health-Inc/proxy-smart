/**
 * @max-health-inc/elysia-mcp - Tool & Resource Execution
 *
 * Executes route handlers by building a synthetic Elysia-like context.
 * Handles path param extraction, body/query separation, and result serialization.
 */

import { Value } from '@sinclair/typebox/value'
import type { ToolMetadata, ResourceMetadata } from './types'
import { getMergedInputSchema } from './typebox-to-zod'

// ── Tool Execution ───────────────────────────────────────────────────────────

/**
 * Execute a tool (route handler) with the given arguments.
 * Builds a synthetic Elysia context and invokes the handler.
 */
export async function executeTool(
  toolName: string,
  meta: ToolMetadata,
  args: Record<string, unknown>,
  authToken?: string,
  contextDecorators?: Record<string, unknown>,
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    // Validate args against merged schema
    const inputSchema = getMergedInputSchema(meta)
    if (inputSchema) {
      const valid = Value.Check(inputSchema, args)
      if (!valid) {
        const errors = [...Value.Errors(inputSchema, args)]
        return {
          content: [{ type: 'text', text: `Validation error: ${JSON.stringify(errors)}` }],
          isError: true,
        }
      }
    }

    if (typeof meta.handler !== 'function') {
      return {
        content: [{ type: 'text', text: `Tool ${toolName} has no callable handler.` }],
        isError: true,
      }
    }

    // Separate path params from body/query args
    const pathParams = extractPathParams(meta.path, args)
    const cleanArgs = { ...args }
    for (const key of Object.keys(pathParams)) {
      delete cleanArgs[key]
    }

    const isGetRoute = meta.method === 'GET'
    let responseStatus = 200

    const elysiaContext = {
      body: isGetRoute ? {} : cleanArgs,
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        'content-type': 'application/json',
      },
      set: {
        status: 200,
        headers: {} as Record<string, string>,
      },
      params: pathParams,
      query: isGetRoute ? cleanArgs : {},
      request: new Request(`http://localhost${meta.path}`, {
        method: meta.method,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'Content-Type': 'application/json',
        },
      }),
      // Inject consumer-provided decorators (e.g. getAdmin, db, etc.)
      ...contextDecorators,
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)
    responseStatus = typeof elysiaContext.set.status === 'number' ? elysiaContext.set.status : 200

    const text = result === undefined || result === null
      ? JSON.stringify({ success: true, status: responseStatus })
      : typeof result === 'string'
        ? result
        : JSON.stringify(result, serializeErrors, 2)

    if (responseStatus >= 400) {
      return { content: [{ type: 'text', text }], isError: true }
    }

    return { content: [{ type: 'text', text }] }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error executing ${toolName}: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    }
  }
}

// ── Resource Execution ───────────────────────────────────────────────────────

/**
 * Execute a GET route handler and return the serialized result.
 */
export async function executeResource(
  meta: ResourceMetadata,
  pathParams: Record<string, string>,
  authToken?: string,
  contextDecorators?: Record<string, unknown>,
): Promise<string> {
  try {
    if (typeof meta.handler !== 'function') {
      return JSON.stringify({ error: 'Resource has no callable handler' })
    }

    const elysiaContext = {
      body: {},
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        'content-type': 'application/json',
      },
      set: {
        status: 200,
        headers: {} as Record<string, string>,
      },
      params: pathParams,
      query: {},
      request: new Request(`http://localhost${meta.path}`, {
        method: 'GET',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }),
      ...contextDecorators,
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)

    if (result === undefined || result === null) {
      return JSON.stringify({ success: true })
    }
    return typeof result === 'string' ? result : JSON.stringify(result, serializeErrors, 2)
  } catch (err) {
    return JSON.stringify({ error: `Resource read failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract path parameter values from route path pattern and flat args object.
 * e.g. path="/admin/users/:userId", args={userId: "123", name: "foo"} -> {userId: "123"}
 */
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

/**
 * JSON.stringify replacer that serializes Error objects (non-enumerable props).
 */
function serializeErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message }
  }
  return value
}
