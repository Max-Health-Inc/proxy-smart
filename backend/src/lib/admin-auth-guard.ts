/**
 * Admin Authentication Guard
 *
 * Structural, enforcing authentication for the admin router. This is the single
 * choke point that guarantees EVERY admin route requires a valid Keycloak admin
 * token BEFORE its handler runs — independent of whether the individual handler
 * remembers to call validateAdminToken.
 *
 * Historically, `adminRoutes` only attached `.guard({ detail: { security: [...] } })`,
 * which is OpenAPI METADATA only and enforces nothing. Several handlers (e.g. the
 * access-control GET enumeration routes and the door-unlock route for non-UniFi
 * providers) never checked the token, allowing unauthenticated reads and a
 * door-unlock bypass. This scoped `onBeforeHandle` closes that gap globally.
 *
 * Status semantics (aligned with the rest of the codebase):
 *   - missing bearer token          → 401 (Authorization header required)
 *   - signature/expiry/issuer fail  → 401 (invalid token)
 *   - valid token, no admin role    → 403 (insufficient permissions)
 *
 * Defense-in-depth: handlers that already call validateAdminToken / getAdmin(token)
 * keep doing so — this guard does not replace per-handler Keycloak RBAC, it ensures
 * a baseline that cannot be forgotten.
 */

import { Elysia } from 'elysia'
import { extractBearerToken, AuthenticationError } from './admin-utils'
import { validateToken, validateAdminToken } from './auth'
import { logger } from './logger'

/**
 * Paths (relative to the `/admin` prefix) that are intentionally reachable
 * without an admin token. Empty by design — every admin route is protected.
 * If a route ever legitimately needs to be public, add it here EXPLICITLY
 * rather than weakening the guard. Matching is exact on the pathname.
 */
const PUBLIC_ADMIN_PATHS = new Set<string>()

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.has(pathname)
}

/**
 * Scoped plugin enforcing admin authentication on every admin route.
 *
 * `as: 'scoped'` so the hook propagates exactly one level up — to the root app
 * that mounts `adminRoutes` — without leaking onto sibling routers. It runs in
 * registration order after the admin audit plugin's start-time stash, so the
 * audit `onAfterResponse` hook still records rejected (401/403) attempts.
 */
export const adminAuthGuard = new Elysia({ name: 'admin-auth-guard' })
  .onBeforeHandle({ as: 'scoped' }, async ({ request, headers, set }) => {
    const pathname = new URL(request.url).pathname
    if (isPublicAdminPath(pathname)) return

    const token = extractBearerToken(headers as Record<string, string | undefined>)
    if (!token) {
      set.status = 401
      return { error: 'Unauthorized', details: 'Bearer token required' }
    }

    // 401-class: signature / expiry / issuer / format failures.
    try {
      await validateToken(token)
    } catch (error) {
      logger.auth.warn('Admin guard rejected token (invalid)', {
        path: pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      set.status = 401
      return { error: 'Unauthorized', details: 'Invalid or expired token' }
    }

    // 403-class: token is valid but lacks an admin role.
    try {
      await validateAdminToken(token)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.auth.warn('Admin guard rejected token (insufficient permissions)', {
          path: pathname,
          error: error.message,
        })
        set.status = 403
        return { error: 'Forbidden', details: 'Admin permissions required' }
      }
      // Unexpected non-auth error — fail closed as 401 rather than leaking through.
      logger.auth.error('Admin guard encountered unexpected error', {
        path: pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      set.status = 401
      return { error: 'Unauthorized', details: 'Authentication failed' }
    }

    // Authenticated admin — fall through to the route handler.
  })
