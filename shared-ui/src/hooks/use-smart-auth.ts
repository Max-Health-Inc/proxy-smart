import { useEffect, useRef, useState } from "react"
import { onAuthError } from "../lib/auth-error"

export type SmartAppState =
  | "loading"
  | "unauthenticated"
  | "callback"
  | "authenticated"
  | "error"
  | "session-expired"

/** Minimal interface matching any generated SmartAuth class. */
export interface SmartAuthLike {
  handleCallback(): Promise<unknown>
  isAuthenticated(): boolean
  isTokenExpired(): boolean
  refreshAccessToken(): Promise<unknown>
  clearToken(): void
  authorize(): Promise<void>
  logout(): void
  startEhrLaunch?(launch: string, iss: string): Promise<void>
}

export interface UseSmartAuthOptions {
  smartAuth: SmartAuthLike
  /** Called after successful authentication (callback, refresh, or existing valid token). */
  onAuthenticated?: () => void
  /** Override the default authorize() for login. E.g., dtr-app uses startStandaloneLaunch(). */
  startAuth?: () => Promise<void>
  /** Handle EHR launch params (launch + iss). Defaults to true. */
  ehrLaunch?: boolean
}

export function useSmartAuth({
  smartAuth,
  onAuthenticated,
  startAuth,
  ehrLaunch = true,
}: UseSmartAuthOptions) {
  const [state, setState] = useState<SmartAppState>("loading")
  const [error, setError] = useState<string | null>(null)
  const callbackHandled = useRef(false)

  useEffect(() => {
    onAuthError((msg) => {
      setError(msg)
      setState("session-expired")
    })

    const params = new URLSearchParams(window.location.search)

    // Handle OAuth callback
    if (params.has("code")) {
      if (callbackHandled.current) return
      callbackHandled.current = true

      setState("callback")
      smartAuth
        .handleCallback()
        .then(() => {
          window.history.replaceState({}, "", window.location.pathname)
          onAuthenticated?.()
          setState("authenticated")
        })
        .catch((err) => {
          const msg =
            err instanceof Error ? err.message : "Auth callback failed"
          if (/state mismatch/i.test(msg)) {
            window.history.replaceState({}, "", window.location.pathname)
            smartAuth.clearToken()
            setError(
              "Your session was reset (e.g. after a password change). Please sign in again.",
            )
            setState("session-expired")
          } else {
            setError(msg)
            setState("error")
          }
        })
      return
    }

    // Handle EHR launch
    if (
      ehrLaunch &&
      params.has("launch") &&
      params.has("iss") &&
      smartAuth.startEhrLaunch
    ) {
      const launch = params.get("launch")!
      const iss = params.get("iss")!
      smartAuth.startEhrLaunch(launch, iss).catch((err) => {
        setError(err instanceof Error ? err.message : "EHR launch failed")
        setState("error")
      })
      return
    }

    // Check existing token
    if (smartAuth.isAuthenticated()) {
      if (smartAuth.isTokenExpired()) {
        smartAuth.refreshAccessToken().then((refreshed) => {
          if (refreshed) {
            onAuthenticated?.()
            setState("authenticated")
          } else {
            smartAuth.clearToken()
            setState("session-expired")
            setError("Your session has expired. Please sign in again.")
          }
        })
      } else {
        onAuthenticated?.()
        setState("authenticated")
      }
    } else {
      setState("unauthenticated")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = () => {
    const auth = startAuth ?? (() => smartAuth.authorize())
    auth().catch((err) => {
      setError(
        err instanceof Error ? err.message : "Failed to start SMART launch",
      )
      setState("error")
    })
  }

  const handleLogout = () => {
    smartAuth.logout()
  }

  return { state, error, handleLogin, handleLogout }
}
