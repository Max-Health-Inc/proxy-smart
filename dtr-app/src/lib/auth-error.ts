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
