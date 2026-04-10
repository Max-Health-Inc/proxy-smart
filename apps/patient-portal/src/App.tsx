import { useEffect, useRef, useState } from "react"
import { AppHeader, Button, Spinner, useBranding } from "@proxy-smart/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import { onAuthError } from "@/lib/auth-error"
import { Heart, LogIn, AlertTriangle } from "lucide-react"
import { Dashboard } from "@/components/Dashboard"
import "./index.css"

type AppState = "loading" | "unauthenticated" | "callback" | "authenticated" | "error" | "session-expired"

export default function App() {
  const [state, setState] = useState<AppState>("loading")
  const [error, setError] = useState<string | null>(null)
  const callbackHandled = useRef(false)
  const brand = useBranding()

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
      smartAuth.handleCallback()
        .then(() => {
          window.history.replaceState({}, "", window.location.pathname)
          setState("authenticated")
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Auth callback failed")
          setState("error")
        })
      return
    }

    // Handle EHR launch
    if (params.has("launch") && params.has("iss")) {
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
    // logout() is async — it will redirect to Keycloak's end_session_endpoint
    // Don't setState here; the browser will navigate away
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Patient Portal"
        icon={Heart}
        authenticated={state === "authenticated"}
        onSignOut={handleLogout}
      />

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
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
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="h-16 mx-auto" />
              ) : (
                <Heart className="size-16 mx-auto text-muted-foreground/30" />
              )}
              <h2 className="text-2xl font-semibold">Patient Portal</h2>
              <p className="text-muted-foreground max-w-md">
                Access your health records, medications, immunizations, and lab results securely. Sign in to view your international patient summary.
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
