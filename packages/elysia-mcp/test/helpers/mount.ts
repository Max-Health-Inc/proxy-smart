/**
 * A real Elysia app serving the routes a test's metadata describes.
 *
 * The executor has exactly one execution path — `app.handle()` — so a test has
 * to supply an app. It used to be able to omit one and have the handler called
 * directly through a synthetic context, which is the guard/response-schema
 * bypass that path was deleted to remove.
 */
import { Elysia } from 'elysia'

interface RouteLike {
  path: string
  method: string
  handler?: unknown
}

type Handler = (ctx: never) => unknown

/** Narrows without an assertion: metadata types `handler` as unknown. */
function isHandler(value: unknown): value is Handler {
  return typeof value === 'function'
}

/** Mount every route in `routes` on one app, so one dispatch target serves them all. */
export function mountRoutes(...routes: RouteLike[]): Elysia {
  let app = new Elysia()
  for (const route of routes) {
    if (!isHandler(route.handler)) continue
    const handler = route.handler
    switch (route.method.toUpperCase()) {
      case 'GET': app = app.get(route.path, handler); break
      case 'POST': app = app.post(route.path, handler); break
      case 'PUT': app = app.put(route.path, handler); break
      case 'PATCH': app = app.patch(route.path, handler); break
      case 'DELETE': app = app.delete(route.path, handler); break
      default: throw new Error(`mountRoutes: unsupported method ${route.method}`)
    }
  }
  return app
}
