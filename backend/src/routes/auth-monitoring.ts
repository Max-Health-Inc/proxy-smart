import { Elysia, t } from 'elysia'
import { authEventsLogger } from '../lib/auth-events-logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import { StreamResponse } from '../schemas/monitoring'
import {
  AuthEventsResponse,
  AuthAnalyticsResponse,
} from '../schemas/auth-monitoring'

/**
 * Auth event monitoring routes — real-time SSE streams + REST queries.
 * Polls Keycloak for LOGIN, LOGOUT, REGISTER, CODE_TO_TOKEN, etc.
 * Follows the same pattern as email-monitoring.
 */
export const authMonitoringRoutes = new Elysia({
  prefix: '/monitoring/auth',
  tags: ['auth-monitoring'],
})

  // ─── SSE: real-time auth event stream ──────────────────────────

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
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to auth events stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = authEventsLogger.subscribe(event => {
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
      summary: 'Auth Events Stream',
      description: 'SSE stream of real-time authentication events (logins, logouts, registrations, token exchanges)',
      tags: ['auth-monitoring'],
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

        const current = authEventsLogger.getAnalytics()
        if (current) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(current)}\n\n`))

        const unsubscribe = authEventsLogger.subscribeAnalytics(analytics => {
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
      summary: 'Auth Analytics Stream',
      description: 'SSE stream of real-time auth analytics updates',
      tags: ['auth-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: recent events with filtering ────────────────────────

  .get('/events', async ({ query, headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = authEventsLogger.getRecentEvents({
      limit: query.limit ? parseInt(query.limit) : 100,
      type: query.type !== 'all' ? query.type : undefined,
      success: query.success !== undefined ? query.success === 'true' : undefined,
      since: query.since ? new Date(query.since) : undefined,
      clientId: query.clientId,
      userId: query.userId,
    })

    return { events, total: events.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      type: t.Optional(t.String()),
      success: t.Optional(t.String()),
      since: t.Optional(t.String()),
      clientId: t.Optional(t.String()),
      userId: t.Optional(t.String()),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: AuthEventsResponse },
    detail: {
      summary: 'Get Auth Events',
      description: 'Retrieve recent auth events with optional filtering by type, success, date, client, and user',
      tags: ['auth-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: analytics snapshot ──────────────────────────────────

  .get('/analytics', async ({ headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const analytics = authEventsLogger.getAnalytics()

    if (!analytics) {
      return {
        totalEvents: 0,
        successRate: 100,
        eventsByType: {},
        recentErrors: [],
        hourlyStats: [],
        topClients: [],
        timestamp: new Date().toISOString(),
      }
    }

    return analytics
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: AuthAnalyticsResponse },
    detail: {
      summary: 'Get Auth Analytics',
      description: 'Get current auth event analytics (last 24 hours)',
      tags: ['auth-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })
