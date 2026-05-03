import { AppHeader, Button, Spinner, useBranding, useSmartAuth } from "@max-health-inc/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import { Brain, LogIn, AlertTriangle } from "lucide-react"
import { AlgorithmRunner } from "@/components/AlgorithmRunner"
import "./index.css"

export default function App() {
  const { state, error, handleLogin, handleLogout } = useSmartAuth({ smartAuth })
  const brand = useBranding()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="SMART DICOM Algorithm"
        icon={Brain}
        authenticated={state === "authenticated"}
        onSignOut={handleLogout}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
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
                <Brain className="size-16 mx-auto text-muted-foreground/30" />
              )}
              <h2 className="text-2xl font-semibold">SMART DICOM Algorithm</h2>
              <p className="text-muted-foreground max-w-md">
                Imaging analysis powered by SMART on FHIR. Sign in to run your algorithm on patient DICOM studies.
              </p>
            </div>
            <Button size="lg" onClick={handleLogin}>
              <LogIn className="size-4" />
              Sign In with SMART
            </Button>
          </div>
        ) : (
          <AlgorithmRunner />
        )}
      </main>
    </div>
  )
}
