import { useEffect, useRef, useState } from "react"
import { Dashboard } from "@/components/Dashboard"
import { Button, Spinner } from "@proxy-smart/shared-ui"
import {
  smartAuth,
} from "@/lib/smart-auth"
import { onAuthError } from "@/lib/auth-error"
import { ShieldCheck, LogOut, LogIn, AlertTriangle } from "lucide-react"
import "./index.css"

type AppState = "loading" | "unauthenticated" | "callback" | "authenticated" | "error" | "session-expired"

export default function App() {
  const [state, setState] = useState<AppState>("loading")
  const [error, setError] = useState<string | null>(null)
  const callbackHandled = useRef(false)

  useEffect(() => {
    // Subscribe to auth errors from fetch wrapper
    onAuthError((msg) => {
      setError(msg)
      setState("session-expired")
    })

    // Check if we're on the callback path
    const params = new URLSearchParams(window.location.search)
    if (params.has("code")) {
      // Guard against React StrictMode double-mount
      if (callbackHandled.current) return
      callbackHandled.current = true

      setState("callback")
      smartAuth.handleCallback()
        .then(() => {
          // Clear callback params from URL
          window.history.replaceState({}, "", window.location.pathname)
          setState("authenticated")
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Auth callback failed")
          setState("error")
        })
      return
    }

    // Check existing token — validate it's not expired
    if (smartAuth.isAuthenticated()) {
      if (smartAuth.isTokenExpired()) {
        smartAuth.refreshAccessToken().then((refreshed) => {
          if (refreshed) {
            setState("authenticated")
          } else {
            smartAuth.clearToken()
            setState("session-expired")
            setError("Your session has expired. Please sign in again.")
          }
        })
      } else {
        setState("authenticated")
      }
    } else {
      setState("unauthenticated")
    }
  }, [])

  const handleLogin = () => {
    smartAuth.authorize().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to start SMART launch")
      setState("error")
    })
  }

  const handleLogout = () => {
    smartAuth.logout()
    setState("unauthenticated")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-maxhealth" />
            <h1 className="font-semibold">Consent Manager</h1>
          </div>
          {state === "authenticated" && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Sign Out
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {state === "loading" || state === "callback" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">
              {state === "callback" ? "Completing sign in..." : "Loading..."}
            </p>
          </div>
        ) : state === "session-expired" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="size-12 mx-auto text-amber-500" />
              <h2 className="text-xl font-semibold">Session Expired</h2>
              <p className="text-muted-foreground max-w-md">
                {error || "Your session has expired. Please sign in again to continue."}
              </p>
            </div>
            <Button size="lg" onClick={handleLogin}>
              <LogIn className="size-4" />
              Sign In Again
            </Button>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-destructive font-medium">Authentication Error</p>
            <p className="text-sm text-muted-foreground max-w-md text-center">{error}</p>
            <Button onClick={handleLogin}>Try Again</Button>
          </div>
        ) : state === "unauthenticated" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="text-center space-y-2">
              <ShieldCheck className="size-16 mx-auto text-muted-foreground/30" />
              <h2 className="text-2xl font-semibold">Consent Manager</h2>
              <p className="text-muted-foreground max-w-md">
                Manage who can access your health records. Sign in with your identity to view and control your consent settings.
              </p>
            </div>
            <Button size="lg" onClick={handleLogin}>
              <LogIn className="size-4" />
              Sign In with SMART
            </Button>
          </div>
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  )
}
