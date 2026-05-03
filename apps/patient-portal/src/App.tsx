import { AppHeader, Button, Spinner, useBranding, useSmartAuth, ModalStackProvider } from "@max-health-inc/shared-ui"
import { useTranslation } from "react-i18next"
import { smartAuth } from "@/lib/smart-auth"
import { Heart, LogIn, AlertTriangle, Link2 } from "lucide-react"
import { Dashboard } from "@/components/Dashboard"
import { ShlView } from "@/components/ShlView"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import "./index.css"

/** Detect SHL mode from URL hash */
function isShlMode(): boolean {
  const hash = window.location.hash.slice(1)
  return hash.startsWith("shlink:/") || hash.startsWith("shlink%3A/")
}

export default function App() {
  const shlMode = isShlMode()
  const { state, error, handleLogin, handleLogout } = useSmartAuth({ smartAuth, skip: shlMode })
  const brand = useBranding()
  const { t } = useTranslation()

  return (
    <ModalStackProvider>
      <div className="min-h-screen bg-background">
        <AppHeader
          title={shlMode ? t("shl.viewerTitle", "Shared Health Records") : t("app.title")}
          icon={shlMode ? Link2 : Heart}
          authenticated={state === "authenticated"}
          onSignOut={shlMode ? undefined : handleLogout}
          maxWidth="max-w-6xl"
          hideActions={shlMode}
        >
        <LanguageSwitcher />
      </AppHeader>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        {shlMode ? (
          <ShlView />
        ) : state === "loading" || state === "callback" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">
              {state === "callback" ? t("app.completingSignIn") : t("common.loading")}
            </p>
          </div>
        ) : state === "session-expired" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="size-12 mx-auto text-amber-500" />
              <h2 className="text-xl font-semibold">{t("app.sessionExpired")}</h2>
              <p className="text-muted-foreground max-w-md">
                {error || t("app.sessionExpiredMessage")}
              </p>
            </div>
            <Button size="lg" onClick={handleLogin}>
              <LogIn className="size-4" />
              {t("app.signInAgain")}
            </Button>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-destructive font-medium">{t("app.authError")}</p>
            <p className="text-sm text-muted-foreground max-w-md text-center">{error}</p>
            <Button onClick={handleLogin}>{t("app.tryAgain")}</Button>
          </div>
        ) : state === "unauthenticated" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="text-center space-y-2">
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="h-16 mx-auto" />
              ) : (
                <Heart className="size-16 mx-auto text-muted-foreground/30" />
              )}
              <h2 className="text-2xl font-semibold">{t("app.title")}</h2>
              <p className="text-muted-foreground max-w-md">
                {t("app.description")}
              </p>
            </div>
            <Button size="lg" onClick={handleLogin}>
              <LogIn className="size-4" />
              {t("app.signInWithSmart")}
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
