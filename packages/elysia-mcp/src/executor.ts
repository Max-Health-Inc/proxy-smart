// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp - Tool & Resource Execution
 *
 * Two execution strategies:
 *
 *  1. PIPELINE DISPATCH (secure, preferred) — when an Elysia app reference is
 *     supplied via the `__app` context decorator, the tool/resource is executed
 *     by reconstructing an HTTP `Request` from the route metadata + args + token
 *     and dispatching it through `app.handle()`. This runs the FULL Elysia
 *     lifecycle: `beforeHandle`/guards, response-schema coercion, and
 *     `onAfterResponse` hooks (e.g. audit logging). Use the ROOT app so global
 *     plugins and route prefixes resolve.
 *
 *  2. SYNTHETIC CONTEXT (legacy fallback) — when no app reference is supplied,
 *     a hand-built Elysia-like context is passed directly to the handler. This
 *     BYPASSES the pipeline (no guards / response-schema / lifecycle hooks) and
 *     is retained only for environments that cannot dispatch through an app.
 */

import { Value } from '@sinclair/typebox/value'
import type { ToolMetadata, ResourceMetadata } from './types'
import { getMergedInputSchema } from './typebox-schema'
import { chooseToolText, type ToolTextFormat } from './text-format'

/** Context-decorator key carrying the Elysia app used for pipeline dispatch. */
export const DISPATCH_APP_KEY = '__app'

/** Per-call execution options. */
export interface ExecuteOptions {
  /**
   * Encoding for the text block a client feeds to the model. Defaults to
   * `json`, so this is opt-in and no existing caller changes behaviour.
   * See {@link chooseToolText}.
   */
  textFormat?: ToolTextFormat
}

/** Minimal shape of an Elysia app we depend on for pipeline dispatch. */
interface DispatchableApp {
  handle(request: Request): Promise<Response> | Response
}

// ── Tool Execution ───────────────────────────────────────────────────────────

/**
 * Execute a tool (route handler) with the given arguments.
 *
 * Dispatches through the real Elysia pipeline when a `__app` decorator is
 * present; otherwise falls back to the synthetic-context invocation.
 */
export async function executeTool(
  toolName: string,
  meta: ToolMetadata,
  args: Record<string, unknown>,
  authToken?: string,
  contextDecorators?: Record<string, unknown>,
  options?: ExecuteOptions,
): Promise<{
  content: { type: 'text'; text: string }[]
  structuredContent?: StructuredContent
  isError?: boolean
}> {
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

    const app = getDispatchApp(contextDecorators)

    // ── Pipeline dispatch (secure) ───────────────────────────────────────
    if (app) {
      const { status, text } = await dispatchThroughPipeline(app, meta.path, meta.method, args, authToken)
      if (status >= 400) {
        return { content: [{ type: 'text', text }], isError: true }
      }
      return successResult(text, options?.textFormat)
    }

    // ── Synthetic context (legacy fallback) ──────────────────────────────
    if (typeof meta.handler !== 'function') {
      return {
        content: [{ type: 'text', text: `Tool ${toolName} has no callable handler.` }],
        isError: true,
      }
    }

    const elysiaContext = buildSyntheticContext(meta.path, meta.method, args, authToken, contextDecorators)
    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)
    const responseStatus = typeof elysiaContext.set.status === 'number' ? elysiaContext.set.status : 200

    const text = serializeResult(result, responseStatus)

    if (responseStatus >= 400) {
      return { content: [{ type: 'text', text }], isError: true }
    }
    return successResult(text, options?.textFormat)
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
 *
 * Dispatches through the real Elysia pipeline when a `__app` decorator is
 * present; otherwise falls back to the synthetic-context invocation.
 */
export async function executeResource(
  meta: ResourceMetadata,
  pathParams: Record<string, string>,
  authToken?: string,
  contextDecorators?: Record<string, unknown>,
  options?: ExecuteOptions,
): Promise<string> {
  try {
    const app = getDispatchApp(contextDecorators)

    // ── Pipeline dispatch (secure) ───────────────────────────────────────
    if (app) {
      // pathParams are pre-resolved by the caller; feed them as args so the
      // shared URL builder interpolates them into the concrete path.
      const { text } = await dispatchThroughPipeline(app, meta.path, 'GET', pathParams, authToken)
      return chooseToolText(text, options?.textFormat)
    }

    // ── Synthetic context (legacy fallback) ──────────────────────────────
    if (typeof meta.handler !== 'function') {
      return JSON.stringify({ error: 'Resource has no callable handler' })
    }

    const elysiaContext = {
      body: {},
      headers: buildHeaders(authToken),
      set: { status: 200, headers: {} as Record<string, string> },
      params: pathParams,
      query: {},
      request: new Request(`http://localhost${meta.path}`, { method: 'GET', headers: buildAuthHeader(authToken) }),
      ...stripDispatchApp(contextDecorators),
    }

    const result = await (meta.handler as (ctx: unknown) => unknown)(elysiaContext)

    if (result === undefined || result === null) {
      return JSON.stringify({ success: true })
    }
    const serialized = typeof result === 'string' ? result : JSON.stringify(result, serializeErrors, 2)
    return chooseToolText(serialized, options?.textFormat)
  } catch (err) {
    return JSON.stringify({ error: `Resource read failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

// ── Pipeline dispatch ──────────────────────────────────────────────────────────

/**
 * Reconstruct an HTTP Request from route metadata + args + token and dispatch it
 * through the real Elysia pipeline, returning the parsed status + body text.
 *
 * - Path params (`:name` segments) are interpolated into the URL.
 * - For GET, remaining args become query-string params.
 * - For mutations, remaining args become the JSON body.
 */
async function dispatchThroughPipeline(
  app: DispatchableApp,
  path: string,
  method: string,
  args: Record<string, unknown>,
  authToken?: string,
): Promise<{ status: number; text: string }> {
  const { url, rest } = buildUrl(path, method, args)
  const isGet = method.toUpperCase() === 'GET'

  const init: RequestInit = { method, headers: buildAuthHeader(authToken) }
  if (!isGet && Object.keys(rest).length > 0) {
    ;(init.headers as Record<string, string>)['Content-Type'] = 'application/json'
    init.body = JSON.stringify(rest)
  }

  const response = await app.handle(new Request(`http://localhost${url}`, init))
  const text = await response.text()
  return { status: response.status, text }
}

/**
 * Build the concrete request URL by interpolating path params and (for GET)
 * appending remaining args as query parameters. Returns the URL plus the args
 * that were NOT consumed as path params (the request body / query payload).
 */
function buildUrl(
  path: string,
  method: string,
  args: Record<string, unknown>,
): { url: string; rest: Record<string, unknown> } {
  const pathParams = extractPathParams(path, args)
  let url = path
  for (const [name, value] of Object.entries(pathParams)) {
    url = url.replace(`:${name}`, encodeURIComponent(value))
  }

  const rest = { ...args }
  for (const key of Object.keys(pathParams)) delete rest[key]

  if (method.toUpperCase() === 'GET' && Object.keys(rest).length > 0) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) qs.append(key, String(value))
    }
    const query = qs.toString()
    if (query) url += `?${query}`
    return { url, rest: {} }
  }

  return { url, rest }
}

/** Pull the dispatch app out of the context decorators, if present. */
function getDispatchApp(contextDecorators?: Record<string, unknown>): DispatchableApp | null {
  const candidate = contextDecorators?.[DISPATCH_APP_KEY]
  if (candidate && typeof (candidate as { handle?: unknown }).handle === 'function') {
    return candidate as DispatchableApp
  }
  return null
}

// ── Synthetic-context helpers ──────────────────────────────────────────────────

/** Copy of the decorators with the dispatch-app key removed (never leak it to handlers). */
function stripDispatchApp(contextDecorators?: Record<string, unknown>): Record<string, unknown> {
  const decorators = { ...contextDecorators }
  delete decorators[DISPATCH_APP_KEY]
  return decorators
}

/** Build a synthetic Elysia-like context for the legacy fallback path. */
function buildSyntheticContext(
  path: string,
  method: string,
  args: Record<string, unknown>,
  authToken: string | undefined,
  contextDecorators: Record<string, unknown> | undefined,
) {
  const pathParams = extractPathParams(path, args)
  const cleanArgs = { ...args }
  for (const key of Object.keys(pathParams)) delete cleanArgs[key]

  const isGetRoute = method.toUpperCase() === 'GET'

  return {
    body: isGetRoute ? {} : cleanArgs,
    headers: buildHeaders(authToken),
    set: { status: 200, headers: {} as Record<string, string> },
    params: pathParams,
    query: isGetRoute ? cleanArgs : {},
    request: new Request(`http://localhost${path}`, {
      method,
      headers: { ...buildAuthHeader(authToken), 'Content-Type': 'application/json' },
    }),
    ...stripDispatchApp(contextDecorators),
  }
}

/** Serialize a synthetic-handler result to MCP text content. */
function serializeResult(result: unknown, status: number): string {
  if (result === undefined || result === null) {
    return JSON.stringify({ success: true, status })
  }
  return typeof result === 'string' ? result : JSON.stringify(result, serializeErrors, 2)
}

/**
 * Build a successful tool result. Always includes a text content block, which
 * the spec asks for alongside structured content for backwards compatibility,
 * and which also opts out of the SDK's SEP-2106 §4.3 auto-append. When the
 * payload parses as JSON it is ALSO attached as `structuredContent`.
 *
 * Arrays are included. They used to be dropped because the 2025 wire shape
 * requires `structuredContent` to be an object, but reconciling that is the
 * SDK's job, not this function's: `projectCallToolResult` wraps a non-object
 * value as `{result:…}` for a 2025-era client and passes it through on 2026.
 * Dropping them here instead discarded the structured half of exactly the list
 * responses that carry the most data — and, once a route's response schema is
 * advertised as the tool's `outputSchema`, omitting it would leave the result
 * not conforming to the schema the tool advertises.
 *
 * `structuredContent` is derived from the ORIGINAL serialized JSON, never from
 * the text block: under `textFormat: 'auto'` the two can be different encodings
 * of the same data, and the structured half is required by the spec to be JSON.
 */
function successResult(
  text: string,
  textFormat?: ToolTextFormat,
): {
  content: { type: 'text'; text: string }[]
  structuredContent?: StructuredContent
} {
  const structured = toStructuredContent(text)
  const rendered = chooseToolText(text, textFormat)
  return structured !== undefined
    ? { content: [{ type: 'text', text: rendered }], structuredContent: structured }
    : { content: [{ type: 'text', text: rendered }] }
}

/**
 * A JSON value the MCP SDK accepts as `structuredContent`. Objects and arrays
 * only: a bare primitive carries no more than the text block already does, and
 * would just add a `{result:…}` wrap on 2025-era clients for nothing.
 */
export type StructuredContent = Record<string, unknown> | unknown[]

/** Parse text to a JSON object or array for `structuredContent`, or undefined. */
function toStructuredContent(text: string): StructuredContent | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed !== null && typeof parsed === 'object') {
      return parsed as StructuredContent
    }
  } catch {
    // Not JSON (or not parseable) — text content is the only representation.
  }
  return undefined
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Lowercased header map (Elysia handler `ctx.headers` convention). */
function buildHeaders(authToken?: string): Record<string, string> {
  return {
    ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    'content-type': 'application/json',
  }
}

/** Request `Authorization` header (capitalized, for the WHATWG Request). */
function buildAuthHeader(authToken?: string): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

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
