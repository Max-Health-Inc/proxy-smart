import { Elysia, t } from 'elysia'
import { fhirHealthLogger } from '../lib/fhir-health-logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import {
  StreamResponse,
  FhirHealthChecksResponse,
  FhirUptimeSummariesResponse,
  type FhirHealthChecksResponseType,
  type FhirUptimeSummariesResponseType,
} from '../schemas/monitoring'

/**
 * FHIR server health monitoring routes — SSE + REST history + uptime summaries.
 */
export const fhirMonitoringRoutes = new Elysia({ prefix: '/monitoring/fhir', tags: ['fhir-monitoring'] })

  // ─── SSE: real-time per-check stream ───────────────────────────

  .get('/checks/stream', async ({ set, headers, query }) => {
    let token: string | undefined
    if (headers.authorization) token = headers.authorization.replace('Bearer ', '')
    else if (query.token) token = query.token

    if (!token) { set.status = 401; return new Response('Unauthorized', { status: 401 }) }
    try { await validateToken(token) } catch { set.status = 401; return new Response('Unauthorized', { status: 401 }) }

    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    const stream = new ReadableStream({
      start(controller) {
        let active = true

        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to FHIR health stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = fhirHealthLogger.subscribeToChecks(check => {
          if (!active) return
          try {
            if (controller.desiredSize === null) { active = false; return }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(check)}\n\n`))
          } catch { active = false }
        })

        const keepAlive = setInterval(() => {
          if (!active) { clearInterval(keepAlive); unsubscribe(); return }
          try {
            if (controller.desiredSize === null) { active = false; clearInterval(keepAlive); unsubscribe(); return }
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'keepalive', timestamp: new Date().toISOString() })}\n\n`
            ))
          } catch {
            active = false; clearInterval(keepAlive); unsubscribe()
            try { controller.close() } catch { /* already closed */ }
          }
        }, 30_000)

        return () => { active = false; clearInterval(keepAlive); unsubscribe() }
      }
    })

    return new Response(stream)
  }, {
    query: t.Object({ token: t.Optional(t.String()) }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: StreamResponse, 401: CommonErrorResponses[401] },
    detail: {
      summary: 'FHIR Health Check Stream',
      description: 'SSE stream of real-time FHIR server health check results',
      tags: ['fhir-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── SSE: uptime summary stream (emits after each full sweep) ──

  .get('/summaries/stream', async ({ set, headers, query }) => {
    let token: string | undefined
    if (headers.authorization) token = headers.authorization.replace('Bearer ', '')
    else if (query.token) token = query.token

    if (!token) { set.status = 401; return new Response('Unauthorized', { status: 401 }) }
    try { await validateToken(token) } catch { set.status = 401; return new Response('Unauthorized', { status: 401 }) }

    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    const stream = new ReadableStream({
      start(controller) {
        let active = true

        // Send initial summaries immediately
        const initial = fhirHealthLogger.getSummaries()
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initial)}\n\n`))

        const unsubscribe = fhirHealthLogger.subscribeToSummaries(summaries => {
          if (!active) return
          try {
            if (controller.desiredSize === null) { active = false; return }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(summaries)}\n\n`))
          } catch { active = false }
        })

        const keepAlive = setInterval(() => {
          if (!active) { clearInterval(keepAlive); unsubscribe(); return }
          try {
            if (controller.desiredSize === null) { active = false; clearInterval(keepAlive); unsubscribe(); return }
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'keepalive', timestamp: new Date().toISOString() })}\n\n`
            ))
          } catch {
            active = false; clearInterval(keepAlive); unsubscribe()
            try { controller.close() } catch { /* already closed */ }
          }
        }, 30_000)

        return () => { active = false; clearInterval(keepAlive); unsubscribe() }
      }
    })

    return new Response(stream)
  }, {
    query: t.Object({ token: t.Optional(t.String()) }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: StreamResponse, 401: CommonErrorResponses[401] },
    detail: {
      summary: 'FHIR Uptime Summary Stream',
      description: 'SSE stream of FHIR server uptime summaries, emitted after each check sweep',
      tags: ['fhir-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: recent health checks ────────────────────────────────

  .get('/checks', async ({ query, headers, set }): Promise<FhirHealthChecksResponseType> => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const checks = fhirHealthLogger.getRecentChecks({
      serverUrl: query.serverUrl || undefined,
      limit: query.limit ? parseInt(query.limit) : 200,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { checks, total: checks.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      serverUrl: t.Optional(t.String({ description: 'Filter by server URL' })),
      limit: t.Optional(t.String({ description: 'Max checks to return' })),
      since: t.Optional(t.String({ description: 'Return checks since this ISO timestamp' })),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: {
      200: FhirHealthChecksResponse,
      401: CommonErrorResponses[401],
    },
    detail: {
      summary: 'Get FHIR Health Checks',
      description: 'Retrieve recent FHIR server health check results with optional filtering',
      tags: ['fhir-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: uptime summaries ────────────────────────────────────

  .get('/summaries', async ({ headers, set }): Promise<FhirUptimeSummariesResponseType> => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const servers = fhirHealthLogger.getSummaries()
    return { servers, timestamp: new Date().toISOString() }
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: {
      200: FhirUptimeSummariesResponse,
      401: CommonErrorResponses[401],
    },
    detail: {
      summary: 'Get FHIR Uptime Summaries',
      description: 'Per-server uptime percentage, average response time, and recent check history',
      tags: ['fhir-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })
