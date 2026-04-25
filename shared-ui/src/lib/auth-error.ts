/**
 * Lightweight auth-error bus.
 * Components / fetch wrappers call `reportAuthError()` when a permanent
 * auth failure is detected (e.g. expired session, refresh rejected).
 * App.tsx subscribes via `onAuthError()` to transition to re-login UI.
 */

type AuthErrorHandler = (message: string) => void

let handler: AuthErrorHandler | null = null

export function onAuthError(fn: AuthErrorHandler) {
  handler = fn
}

export function reportAuthError(message: string) {
  handler?.(message)
}

// ─── Shared auth-fetch wrapper ───────────────────────────────────────────────

interface SmartAuthWithFetch {
  createAuthenticatedFetch(): typeof fetch
}

/**
 * Wraps the SMART authenticated fetch to detect permanent auth failures
 * and route them through the auth-error bus.
 *
 * Usage:
 * ```ts
 * const authFetch = createAuthFetch(smartAuth)
 * const client = new FhirClient(fhirBaseUrl, authFetch)
 * ```
 */
export function createAuthFetch(smartAuth: SmartAuthWithFetch): typeof fetch {
  const baseFetch = smartAuth.createAuthenticatedFetch()
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await baseFetch(input, init)
    } catch (err) {
      if (err instanceof Error && /no valid smart token/i.test(err.message)) {
        reportAuthError("Your session has expired. Please sign in again.")
      }
      throw err
    }
  }
}
