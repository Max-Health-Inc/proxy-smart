import { Dashboard } from "@/components/Dashboard"
import { AppHeader, Button, Spinner, useBranding, useSmartAuth, ModalStackProvider } from "@max-health-inc/shared-ui"
import {
  smartAuth,
} from "@/lib/smart-auth"
import { ShieldCheck, LogIn, AlertTriangle } from "lucide-react"
import "./index.css"

export default function App() {
  const { state, error, handleLogin, handleLogout } = useSmartAuth({ smartAuth, ehrLaunch: false })
  const brand = useBranding()

  return (
    <ModalStackProvider>
      <div className="min-h-screen bg-background">
        <AppHeader
          title="Consent Manager"
          icon={ShieldCheck}
          authenticated={state === "authenticated"}
          onSignOut={handleLogout}
          maxWidth="max-w-4xl"
        />

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
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="h-16 mx-auto" />
              ) : (
                <ShieldCheck className="size-16 mx-auto text-muted-foreground/30" />
              )}
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
    </ModalStackProvider>
  )
}
