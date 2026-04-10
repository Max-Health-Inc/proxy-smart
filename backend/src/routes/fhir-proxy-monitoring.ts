import { Elysia, t } from 'elysia'
import { fhirProxyMetricsLogger } from '../lib/fhir-proxy-metrics-logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import {
  StreamResponse,
  FhirProxyEventsResponse,
  FhirProxyAnalyticsResponse,
  type FhirProxyEventsResponseType,
  type FhirProxyAnalyticsResponseType,
} from '../schemas/monitoring'

/**
 * FHIR proxy request monitoring routes — SSE streams + REST history + analytics.
 */
export const fhirProxyMonitoringRoutes = new Elysia({ prefix: '/monitoring/fhir-proxy', tags: ['fhir-proxy-monitoring'] })

  // ─── SSE: real-time proxy event stream ─────────────────────────

  .get('/events/stream', async ({ set, headers, query }) => {
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
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to FHIR proxy metrics stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = fhirProxyMetricsLogger.subscribeToEvents(event => {
          if (!active) return
          try {
            if (controller.desiredSize === null) { active = false; return }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
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
      summary: 'FHIR Proxy Event Stream',
      description: 'SSE stream of real-time FHIR proxy request events',
      tags: ['fhir-proxy-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── SSE: real-time analytics stream ───────────────────────────

  .get('/analytics/stream', async ({ set, headers, query }) => {
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

        // Send initial analytics immediately
        const initial = fhirProxyMetricsLogger.getAnalytics()
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initial)}\n\n`))

        const unsubscribe = fhirProxyMetricsLogger.subscribeToAnalytics(analytics => {
          if (!active) return
          try {
            if (controller.desiredSize === null) { active = false; return }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(analytics)}\n\n`))
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
      summary: 'FHIR Proxy Analytics Stream',
      description: 'SSE stream of real-time FHIR proxy analytics, updated on every request',
      tags: ['fhir-proxy-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: recent proxy events ─────────────────────────────────

  .get('/events', async ({ query, headers, set }): Promise<FhirProxyEventsResponseType> => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = fhirProxyMetricsLogger.getRecentEvents({
      serverName: query.serverName || undefined,
      statusCode: query.statusCode ? parseInt(query.statusCode) : undefined,
      limit: query.limit ? parseInt(query.limit) : 200,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { events, total: events.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      serverName: t.Optional(t.String({ description: 'Filter by server name' })),
      statusCode: t.Optional(t.String({ description: 'Filter by HTTP status code' })),
      limit: t.Optional(t.String({ description: 'Max events to return' })),
      since: t.Optional(t.String({ description: 'Return events since this ISO timestamp' })),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: {
      200: FhirProxyEventsResponse,
      401: CommonErrorResponses[401],
    },
    detail: {
      summary: 'Get FHIR Proxy Events',
      description: 'Retrieve recent FHIR proxy request events with optional filtering',
      tags: ['fhir-proxy-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: analytics snapshot ──────────────────────────────────

  .get('/analytics', async ({ headers, set }): Promise<FhirProxyAnalyticsResponseType> => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const analytics = fhirProxyMetricsLogger.getAnalytics()
    return { analytics, timestamp: new Date().toISOString() }
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: {
      200: FhirProxyAnalyticsResponse,
      401: CommonErrorResponses[401],
    },
    detail: {
      summary: 'Get FHIR Proxy Analytics',
      description: 'Snapshot of FHIR proxy request analytics for the last 24 hours',
      tags: ['fhir-proxy-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })
