import { Elysia, t } from 'elysia'
import { emailEventsLogger } from '../lib/email-events-logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import { StreamResponse } from '../schemas/monitoring'
import {
  EmailEventsResponse,
  EmailAnalyticsResponse,
} from '../schemas/email-monitoring'

/**
 * Email monitoring routes — real-time SSE streams + REST queries.
 * Polls Keycloak for SEND_RESET_PASSWORD, SEND_VERIFY_EMAIL, etc.
 * Follows the same pattern as admin-audit-monitoring.
 */
export const emailMonitoringRoutes = new Elysia({
  prefix: '/monitoring/email',
  tags: ['email-monitoring'],
})

  // ─── SSE: real-time email event stream ─────────────────────────

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
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to email events stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = emailEventsLogger.subscribe(event => {
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
      summary: 'Email Events Stream',
      description: 'SSE stream of real-time email events (password resets, email verifications, etc.)',
      tags: ['email-monitoring'],
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

        const current = emailEventsLogger.getAnalytics()
        if (current) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(current)}\n\n`))

        const unsubscribe = emailEventsLogger.subscribeAnalytics(analytics => {
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
      summary: 'Email Analytics Stream',
      description: 'SSE stream of real-time email analytics updates',
      tags: ['email-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: recent events with filtering ────────────────────────

  .get('/events', async ({ query, headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = emailEventsLogger.getRecentEvents({
      limit: query.limit ? parseInt(query.limit) : 100,
      type: query.type !== 'all' ? query.type : undefined,
      success: query.success !== undefined ? query.success === 'true' : undefined,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { events, total: events.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      type: t.Optional(t.String()),
      success: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: EmailEventsResponse },
    detail: {
      summary: 'Get Email Events',
      description: 'Retrieve recent email events with optional filtering by type, success, and date',
      tags: ['email-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: analytics snapshot ──────────────────────────────────

  .get('/analytics', async ({ headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const analytics = emailEventsLogger.getAnalytics()

    if (!analytics) {
      return {
        totalEvents: 0,
        successRate: 100,
        eventsByType: {},
        recentErrors: [],
        hourlyStats: [],
        timestamp: new Date().toISOString(),
      }
    }

    return analytics
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: EmailAnalyticsResponse },
    detail: {
      summary: 'Get Email Analytics',
      description: 'Get current email event analytics (last 24 hours)',
      tags: ['email-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })
