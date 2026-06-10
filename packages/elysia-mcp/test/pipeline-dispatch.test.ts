/**
 * @max-health-inc/elysia-mcp - Middleware Bypass Security Tests (TDD)
 *
 * The executor historically ran route handlers by building a SYNTHETIC Elysia
 * context and calling `meta.handler(ctx)` directly. That bypasses the real
 * Elysia HTTP pipeline, so anything implemented as a lifecycle hook / guard /
 * response-schema is silently skipped:
 *
 *   (b) Response-schema leakage — Elysia strips/coerces handler return values
 *       against each route's declared `response` TypeBox schema. The synthetic
 *       path returns the RAW handler result, leaking fields the contract drops.
 *
 *   (c) beforeHandle / guard bypass — per-route authz/validation hooks that
 *       short-circuit (e.g. 403) never run, so the handler executes anyway.
 *
 * These tests assert the SECURE expectation. They are RED against the synthetic
 * executor and GREEN once execution is dispatched through the real pipeline
 * (`app.handle(new Request(...))`).
 *
 * They reuse the REAL package introspection (`extractRouteTools`,
 * `extractRouteResources`) and the REAL `executeTool` / `executeResource`
 * against minimal real Elysia apps, so they exercise the actual code path.
 */

import { describe, it, expect } from 'bun:test'
import { Elysia, t } from 'elysia'
import { extractRouteTools, extractRouteResources } from '../src/introspect'
import { executeTool, executeResource } from '../src/executor'

// ── App under test ───────────────────────────────────────────────────────────

/**
 * A minimal real Elysia app that reproduces the two vulnerable patterns:
 *  - `/admin/leak` declares a `response` schema that should drop `secret`
 *  - `/admin/guarded` has a `beforeHandle` that rejects with 403
 */
function createVulnApp() {
  return new Elysia()
    // (b) response schema must strip `secret` — handler intentionally returns it
    .post(
      '/admin/leak',
      () => ({ id: 'item-1', secret: 'TOP-SECRET-VALUE' }),
      {
        body: t.Object({ name: t.String() }),
        response: t.Object({ id: t.String() }),
      },
    )
    // (c) beforeHandle guard must block before the handler runs
    .post(
      '/admin/guarded',
      () => ({ ran: true, leaked: 'handler-should-not-run' }),
      {
        body: t.Object({ name: t.String() }),
        beforeHandle: ({ set }) => {
          set.status = 403
          return { error: 'forbidden by guard' }
        },
      },
    )
    // GET resource with a response schema that must strip `secret`
    .get(
      '/admin/leak-resource',
      () => ({ id: 'res-1', secret: 'TOP-SECRET-RESOURCE' }),
      {
        response: t.Object({ id: t.String() }),
      },
    )
}

/**
 * The executor needs a way to reach the real pipeline. We pass the app through
 * the dispatch channel the package exposes (`__app` context decorator), which
 * the secure executor uses to call `app.handle()`. Until the secure path
 * exists, the executor ignores it and uses the synthetic context (RED).
 */
function dispatchOptions(app: Elysia) {
  return { __app: app }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Middleware bypass — response-schema leakage (b)', () => {
  it('executeTool MUST NOT leak fields the route response schema drops', async () => {
    const app = createVulnApp()
    const tools = extractRouteTools(app, { prefixes: ['/admin/'] })
    const meta = tools.get('create_admin_leak')!
    expect(meta).toBeDefined()

    const result = await executeTool(
      'create_admin_leak',
      meta,
      { name: 'whatever' },
      undefined,
      dispatchOptions(app),
    )

    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.id).toBe('item-1')
    // SECURE expectation: response schema { id } drops `secret`.
    expect(parsed.secret).toBeUndefined()
  })

  it('executeResource MUST NOT leak fields the GET response schema drops', async () => {
    const app = createVulnApp()
    const resources = extractRouteResources(app, { prefixes: ['/admin/'] })
    const meta = resources.get('admin_leak_resource')!
    expect(meta).toBeDefined()

    const raw = await executeResource(meta, {}, undefined, dispatchOptions(app))
    const parsed = JSON.parse(raw)
    expect(parsed.id).toBe('res-1')
    expect(parsed.secret).toBeUndefined()
  })
})

describe('Middleware bypass — beforeHandle/guard bypass (c)', () => {
  it('executeTool MUST honour a beforeHandle guard that rejects with 403', async () => {
    const app = createVulnApp()
    const tools = extractRouteTools(app, { prefixes: ['/admin/'] })
    const meta = tools.get('create_admin_guarded')!
    expect(meta).toBeDefined()

    const result = await executeTool(
      'create_admin_guarded',
      meta,
      { name: 'whatever' },
      undefined,
      dispatchOptions(app),
    )

    // SECURE expectation: guard short-circuits → error, handler never ran.
    expect(result.isError).toBe(true)
    expect(result.content[0].text).not.toContain('handler-should-not-run')
    expect(result.content[0].text).toContain('forbidden')
  })
})
