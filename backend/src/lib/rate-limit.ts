import { Elysia } from 'elysia'

/**
 * Simple in-memory rate limiter for Elysia.
 * Uses a sliding window approach with automatic cleanup.
 *
 * Configuration:
 * - windowMs: Time window in milliseconds (default: 60000 = 1 minute)
 * - max: Maximum requests per window (default: 60)
 * - keyFn: Function to extract rate limit key from request (default: IP-based)
 */
interface RateLimitOptions {
  windowMs?: number
  max?: number
  message?: string
  keyFn?: (request: Request) => string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Creates a rate limiting plugin for Elysia routes.
 * Apply to specific route groups (auth, admin, AI) to prevent abuse.
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60_000,
    max = 60,
    message = 'Too many requests, please try again later',
    keyFn = defaultKeyFn,
  } = options

  const store = new Map<string, RateLimitEntry>()

  // Periodic cleanup of expired entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key)
      }
    }
  }, 5 * 60_000)

  // Prevent interval from keeping process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return new Elysia({ name: 'rate-limit' })
    .onBeforeHandle(({ request, set }) => {
      const key = keyFn(request)
      const now = Date.now()
      let entry = store.get(key)

      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs }
        store.set(key, entry)
      }

      entry.count++

      // Set rate limit headers
      const remaining = Math.max(0, max - entry.count)
      set.headers['X-RateLimit-Limit'] = String(max)
      set.headers['X-RateLimit-Remaining'] = String(remaining)
      set.headers['X-RateLimit-Reset'] = String(Math.ceil(entry.resetAt / 1000))

      if (entry.count > max) {
        set.status = 429
        set.headers['Retry-After'] = String(Math.ceil((entry.resetAt - now) / 1000))
        return { error: message }
      }
    })
}

function defaultKeyFn(request: Request): string {
  // Use X-Forwarded-For if behind a proxy, otherwise fall back to URL origin
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  // Fallback — in production behind Caddy, X-Forwarded-For will always be set
  return 'unknown'
}
