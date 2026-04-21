import { Elysia, t } from 'elysia'
import { consentMetricsLogger } from '../lib/consent-metrics-logger'
import { logger } from '../lib/logger'
import { validateToken } from '../lib/auth'
import { CommonErrorResponses } from '../schemas'
import { StreamResponse } from '../schemas/monitoring'

/**
 * Consent monitoring routes — real-time event stream + REST queries + analytics.
 * Mirrors the OAuth monitoring pattern.
 */
export const consentMonitoringRoutes = new Elysia({ prefix: '/monitoring/consent', tags: ['consent-monitoring'] })

  // ─── SSE: real-time consent decision stream ────────────────────

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
          `data: ${JSON.stringify({ type: 'connection', message: 'Connected to consent events stream', timestamp: new Date().toISOString() })}\n\n`
        ))

        const unsubscribe = consentMetricsLogger.subscribeToEvents(event => {
          if (!active) return
          try {
            if (controller.desiredSize === null) { active = false; return }
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
          } catch {
            active = false
          }
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
      summary: 'Consent Events Stream',
      description: 'SSE stream of real-time consent decisions',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
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

        const current = consentMetricsLogger.getAnalytics()
        if (current) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(current)}\n\n`))

        const unsubscribe = consentMetricsLogger.subscribeToAnalytics(analytics => {
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
      summary: 'Consent Analytics Stream',
      description: 'SSE stream of real-time consent analytics updates',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // ─── REST: recent events with filtering ────────────────────────

  .get('/events', async ({ query, headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = consentMetricsLogger.getRecentEvents({
      limit: query.limit ? parseInt(query.limit) : 100,
      decision: query.decision !== 'all' ? query.decision : undefined,
      clientId: query.clientId || undefined,
      patientId: query.patientId || undefined,
      resourceType: query.resourceType !== 'all' ? query.resourceType : undefined,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { events, total: events.length, timestamp: new Date().toISOString() }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      decision: t.Optional(t.String()),
      clientId: t.Optional(t.String()),
      patientId: t.Optional(t.String()),
      resourceType: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    detail: {
      summary: 'Get Consent Events',
      description: 'Retrieve recent consent decision events with optional filtering',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // ─── REST: analytics snapshot ──────────────────────────────────

  .get('/analytics', async ({ headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const analytics = consentMetricsLogger.getAnalytics()

    if (!analytics) {
      return {
        totalDecisions: 0,
        permitRate: 0,
        denyRate: 0,
        averageCheckDuration: 0,
        cacheHitRate: 0,
        decisionsByMode: {},
        decisionsByResourceType: {},
        topDeniedClients: [],
        topDeniedPatients: [],
        hourlyStats: [],
        timestamp: new Date().toISOString(),
      }
    }

    return { ...analytics, timestamp: new Date().toISOString() }
  }, {
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    detail: {
      summary: 'Get Consent Analytics',
      description: 'Get current consent decision analytics (last 24 hours)',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // ─── REST: export events JSONL ─────────────────────────────────

  .get('/events/export', async ({ set, headers }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const eventsLogPath = path.join(process.cwd(), 'logs', 'consent-metrics', 'consent-events.jsonl')

      try {
        await fs.access(eventsLogPath)
        const data = await fs.readFile(eventsLogPath, 'utf-8')
        set.headers['Content-Type'] = 'application/x-jsonlines'
        set.headers['Content-Disposition'] = `attachment; filename="consent-events-${new Date().toISOString().split('T')[0]}.jsonl"`
        return data
      } catch {
        set.headers['Content-Type'] = 'application/x-jsonlines'
        set.headers['Content-Disposition'] = `attachment; filename="consent-events-${new Date().toISOString().split('T')[0]}.jsonl"`
        return ''
      }
    } catch (error) {
      logger.consent.error('Failed to export consent events', { error })
      set.status = 500
      throw new Error('Failed to export consent events')
    }
  }, {
    headers: t.Object({ authorization: t.String() }),
    detail: {
      summary: 'Export Consent Events',
      description: 'Download consent events log as JSONL file',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // ─── REST: patient-scoped access log ───────────────────────────

  .get('/patients/:patientId/access-log', async ({ params, query, headers, set }) => {
    if (!headers.authorization) { set.status = 401; throw new Error('Unauthorized') }
    try { await validateToken(headers.authorization.replace('Bearer ', '')) } catch { set.status = 401; throw new Error('Unauthorized') }

    const events = consentMetricsLogger.getRecentEvents({
      patientId: params.patientId,
      limit: query.limit ? parseInt(query.limit) : 200,
      decision: query.decision !== 'all' ? query.decision : undefined,
      resourceType: query.resourceType !== 'all' ? query.resourceType : undefined,
      since: query.since ? new Date(query.since) : undefined,
    })

    return { events, total: events.length, patientId: params.patientId, timestamp: new Date().toISOString() }
  }, {
    params: t.Object({ patientId: t.String() }),
    query: t.Object({
      limit: t.Optional(t.String()),
      decision: t.Optional(t.String()),
      resourceType: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
    headers: t.Object({ authorization: t.Optional(t.String()) }),
    detail: {
      summary: 'Patient Access Log',
      description: 'Retrieve data access events for a specific patient (who accessed what, when)',
      tags: ['consent-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })
