import { Elysia, t } from 'elysia'
import { adminAuditLogger } from '../lib/admin-audit-logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import { StreamResponse } from '../schemas/monitoring'
import {
  AdminAuditEventsResponse,
  AdminAuditAnalyticsResponse,
} from '../schemas/admin-audit'

/**
 * Admin audit monitoring routes — real-time SSE streams + REST queries.
 * Follows the same pattern as oauth-monitoring and consent-monitoring.
 */
export const adminAuditMonitoringRoutes = new Elysia({
  prefix: '/monitoring/admin-audit',
  tags: ['admin-audit-monitoring'],
})

  // ─── SSE: real-time audit event stream ─────────────────────────

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
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to admin audit stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = adminAuditLogger.subscribe(event => {
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
      summary: 'Admin Audit Events Stream',
      description: 'SSE stream of real-time admin audit events (mutations only)',
      tags: ['admin-audit-monitoring'],
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

        const current = adminAuditLogger.getAnalytics()
        if (current) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(current)}\n\n`))

        const unsubscribe = adminAuditLogger.subscribeAnalytics(analytics => {
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
      summary: 'Admin Audit Analytics Stream',
      description: 'SSE stream of real-time admin audit analytics updates',
      tags: ['admin-audit-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: recent events with filtering ────────────────────────

  .get('/events', async ({ query, headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = adminAuditLogger.getRecentEvents({
      limit: query.limit ? parseInt(query.limit) : 100,
      action: query.action !== 'all' ? query.action : undefined,
      resource: query.resource !== 'all' ? query.resource : undefined,
      actor: query.actor || undefined,
      success: query.success !== undefined ? query.success === 'true' : undefined,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { events, total: events.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      action: t.Optional(t.String()),
      resource: t.Optional(t.String()),
      actor: t.Optional(t.String()),
      success: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: AdminAuditEventsResponse },
    detail: {
      summary: 'Get Admin Audit Events',
      description: 'Retrieve recent admin audit events with optional filtering by action, resource, actor, and success',
      tags: ['admin-audit-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: analytics snapshot ──────────────────────────────────

  .get('/analytics', async ({ headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const analytics = adminAuditLogger.getAnalytics()

    if (!analytics) {
      return {
        totalActions: 0,
        successRate: 0,
        actionsByType: {},
        actionsByResource: {},
        topActors: [],
        hourlyStats: [],
        recentFailures: [],
        timestamp: new Date().toISOString(),
      }
    }

    return { ...analytics, timestamp: new Date().toISOString() }
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    response: { 200: AdminAuditAnalyticsResponse },
    detail: {
      summary: 'Get Admin Audit Analytics',
      description: 'Get current admin audit analytics (last 24 hours)',
      tags: ['admin-audit-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })

  // ─── REST: export full JSONL ───────────────────────────────────

  .get('/events/export', async ({ set, headers }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    try {
      const { join } = await import('path')
      const { existsSync, createReadStream } = await import('fs')
      const logPath = join(process.cwd(), 'logs', 'admin-audit', 'admin-audit.jsonl')

      if (!existsSync(logPath)) {
        return new Response('', {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Content-Disposition': 'attachment; filename="admin-audit.jsonl"',
          },
        })
      }

      const nodeStream = createReadStream(logPath)
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', chunk => controller.enqueue(chunk))
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', err => controller.error(err))
        },
      })

      return new Response(webStream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': 'attachment; filename="admin-audit.jsonl"',
        },
      })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to export audit log', details: String(error) }
    }
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    detail: {
      summary: 'Export Admin Audit Log',
      description: 'Download the full admin audit log as newline-delimited JSON (JSONL)',
      tags: ['admin-audit-monitoring'],
      security: [{ BearerAuth: [] }],
    },
  })
