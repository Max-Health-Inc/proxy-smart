// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Monitoring SSE plumbing.
 *
 * Every monitoring stream in the backend is the same machine: authorise, open a
 * text/event-stream, push an optional first frame, forward everything the source
 * publishes, and keep the connection alive until the client goes away. Only the
 * source and the first frame differ, so the machine lives here once.
 */

import { validateToken } from '@/lib/auth'

const KEEPALIVE_INTERVAL_MS = 30_000

const encoder = new TextEncoder()

/** Headers a caller may present. Elysia gives these as a plain record. */
export interface MonitoringHeaders {
  authorization?: string
}

/** Query params a stream request may carry (EventSource cannot set headers). */
export interface MonitoringStreamQuery {
  token?: string
}

/** Minimal view of Elysia's `set`, so this file stays free of framework types. */
export interface MonitoringResponseSet {
  status?: number | string
  headers: Record<string, string | number | undefined>
}

/**
 * A stream's data source: how to subscribe, and optionally what to send first.
 *
 * `initial` returning `null` or `undefined` sends no first frame — a "nothing
 * computed yet" snapshot is not worth a frame the client has to special-case.
 */
export interface SseSource<T> {
  subscribe: (emit: (payload: T) => void) => () => void
  initial?: () => unknown
  connectionMessage?: string
}

function frame(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
}

/**
 * Resolve the bearer token from either the Authorization header or the `token`
 * query param, since EventSource cannot set headers.
 */
export function extractStreamToken(headers: MonitoringHeaders, query: MonitoringStreamQuery): string | undefined {
  if (headers.authorization) return headers.authorization.replace('Bearer ', '')
  return query.token
}

/**
 * Authorise an SSE request and set the stream headers.
 *
 * @returns `null` when authorised; a 401 Response to return as-is otherwise.
 */
export async function openStreamResponse(
  headers: MonitoringHeaders,
  query: MonitoringStreamQuery,
  set: MonitoringResponseSet,
): Promise<Response | null> {
  const token = extractStreamToken(headers, query)
  if (!token) {
    set.status = 401
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    await validateToken(token)
  } catch {
    set.status = 401
    return new Response('Unauthorized', { status: 401 })
  }

  set.headers['Content-Type'] = 'text/event-stream'
  set.headers['Cache-Control'] = 'no-cache'
  set.headers['Connection'] = 'keep-alive'
  return null
}

/**
 * Build the SSE body for an authorised request.
 *
 * The stream unsubscribes and clears its keepalive as soon as the client stops
 * reading (`desiredSize === null`) or an enqueue throws, so a disconnected
 * client cannot leak a subscription or a timer.
 */
export function createSseStream<T>(source: SseSource<T>): ReadableStream {
  return new ReadableStream({
    start(controller) {
      let active = true

      if (source.connectionMessage) {
        controller.enqueue(frame({
          type: 'connection',
          message: source.connectionMessage,
          timestamp: new Date().toISOString(),
        }))
      }

      const initial = source.initial?.()
      if (initial !== null && initial !== undefined) controller.enqueue(frame(initial))

      const unsubscribe = source.subscribe((payload: T) => {
        if (!active) return
        try {
          if (controller.desiredSize === null) { active = false; return }
          controller.enqueue(frame(payload))
        } catch { active = false }
      })

      const stop = () => {
        active = false
        clearInterval(keepAlive)
        unsubscribe()
      }

      const keepAlive = setInterval(() => {
        if (!active) { stop(); return }
        try {
          if (controller.desiredSize === null) { stop(); return }
          controller.enqueue(frame({ type: 'keepalive', timestamp: new Date().toISOString() }))
        } catch {
          stop()
          try { controller.close() } catch { /* already closed */ }
        }
      }, KEEPALIVE_INTERVAL_MS)

      return stop
    },
  })
}

/**
 * Authorise a REST monitoring request.
 *
 * Throws on failure after setting 401, matching how the monitoring routes have
 * always reported it.
 */
export async function requireMonitoringAuth(headers: MonitoringHeaders, set: MonitoringResponseSet): Promise<void> {
  if (!headers.authorization) {
    set.status = 401
    throw new Error('Unauthorized')
  }
  try {
    await validateToken(headers.authorization.replace('Bearer ', ''))
  } catch {
    set.status = 401
    throw new Error('Unauthorized')
  }
}
