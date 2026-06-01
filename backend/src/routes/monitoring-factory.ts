/**
 * Monitoring Route Factory
 *
 * Creates standardised monitoring routes (SSE streams + REST endpoints)
 * for any event logger that follows the BaseEventsLogger interface.
 *
 * Each monitoring module gets:
 *  - GET /events/stream  — SSE real-time event stream
 *  - GET /analytics/stream — SSE real-time analytics stream
 *  - GET /events — REST recent events with filtering
 *  - GET /analytics — REST analytics snapshot
 */

import { Elysia, t, type TSchema } from 'elysia'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import { StreamResponse } from '../schemas/monitoring'

// ─── Logger interface ────────────────────────────────────────────

export interface MonitoringLogger<TEvent, TAnalytics> {
  subscribe(cb: (event: TEvent) => void): () => void
  subscribeAnalytics(cb: (analytics: TAnalytics) => void): () => void
  getAnalytics(): TAnalytics | null
}

// ─── Config ──────────────────────────────────────────────────────

export interface MonitoringRouteConfig<TEvent, TAnalytics> {
  /** Route prefix (e.g. '/monitoring/auth') */
  prefix: string
  /** Tag for OpenAPI docs */
  tag: string
  /** Logger instance */
  logger: MonitoringLogger<TEvent, TAnalytics>
  /** SSE connection message */
  connectionMessage: string
  /** TypeBox schema for events response */
  eventsResponseSchema: TSchema
  /** TypeBox schema for analytics response */
  analyticsResponseSchema: TSchema
  /** Default empty analytics when none computed yet */
  emptyAnalytics: TAnalytics
  /** Fetch events given the parsed query object. Handles domain-specific filtering. */
  getEvents: (query: Record<string, string | undefined>) => TEvent[]
  /** Additional query params for the events endpoint (merged with base) */
  extraQueryParams?: Record<string, TSchema>
  /** Summary text for events stream */
  eventsStreamSummary: string
  /** Description text for events stream */
  eventsStreamDescription: string
  /** Summary text for analytics stream */
  analyticsStreamSummary: string
  /** Summary text for GET events */
  eventsGetSummary: string
  /** Description text for GET events */
  eventsGetDescription: string
  /** Summary text for GET analytics */
  analyticsGetSummary: string
  /** Description text for GET analytics */
  analyticsGetDescription: string
}

// ─── Factory ─────────────────────────────────────────────────────

export function createMonitoringRoutes<TEvent, TAnalytics>(
  cfg: MonitoringRouteConfig<TEvent, TAnalytics>,
) {
  return new Elysia({ prefix: cfg.prefix, tags: [cfg.tag] })

    // ─── SSE: real-time event stream ───────────────────────────
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
            `data: ${JSON.stringify({ type: 'connection', message: cfg.connectionMessage, timestamp: new Date().toISOString() })}\n\n`
          ))

          const unsubscribe = cfg.logger.subscribe((event: TEvent) => {
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
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'keepalive', timestamp: new Date().toISOString() })}\n\n`))
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
        summary: cfg.eventsStreamSummary,
        description: cfg.eventsStreamDescription,
        tags: [cfg.tag],
        security: [{ BearerAuth: [] }],
      },
    })

    // ─── SSE: real-time analytics stream ───────────────────────
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

          const current = cfg.logger.getAnalytics()
          if (current) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(current)}\n\n`))

          const unsubscribe = cfg.logger.subscribeAnalytics((analytics: TAnalytics) => {
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
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'keepalive', timestamp: new Date().toISOString() })}\n\n`))
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
        summary: cfg.analyticsStreamSummary,
        description: `SSE stream of real-time ${cfg.tag} analytics updates`,
        tags: [cfg.tag],
        security: [{ BearerAuth: [] }],
      },
    })

    // ─── REST: recent events with filtering ────────────────────
    .get('/events', async ({ query, headers, set }) => {
      if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
      try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

      const events = cfg.getEvents(query as Record<string, string | undefined>)

      return { events, total: events.length, timestamp: new Date().toISOString() }
    }, {
      query: t.Object({
        limit: t.Optional(t.String()),
        type: t.Optional(t.String()),
        success: t.Optional(t.String()),
        since: t.Optional(t.String()),
        ...(cfg.extraQueryParams ?? {}),
      }),
      headers: t.Object({ authorization: t.Optional(t.String()) }),
      response: { 200: cfg.eventsResponseSchema },
      detail: {
        summary: cfg.eventsGetSummary,
        description: cfg.eventsGetDescription,
        tags: [cfg.tag],
        security: [{ BearerAuth: [] }],
      },
    })

    // ─── REST: analytics snapshot ──────────────────────────────
    .get('/analytics', async ({ headers, set }) => {
      if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
      try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

      const analytics = cfg.logger.getAnalytics()
      return analytics
        ? { ...analytics, timestamp: new Date().toISOString() }
        : cfg.emptyAnalytics
    }, {
      headers: t.Object({ authorization: t.Optional(t.String()) }),
      response: { 200: cfg.analyticsResponseSchema },
      detail: {
        summary: cfg.analyticsGetSummary,
        description: cfg.analyticsGetDescription,
        tags: [cfg.tag],
        security: [{ BearerAuth: [] }],
      },
    })
}
