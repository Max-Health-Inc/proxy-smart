import { AppHeader, SmartAppShell, ModalStackProvider } from "@max-health-inc/shared-ui"
import { useTranslation } from "react-i18next"
import { smartAuth } from "@/lib/smart-auth"
import { Heart, Link2 } from "lucide-react"
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
  const { t } = useTranslation()

  if (shlMode) {
    return (
      <ModalStackProvider>
        <div className="min-h-screen bg-background">
          <AppHeader
            title={t("shl.viewerTitle", "Shared Health Records")}
            icon={Link2}
            authenticated={false}
            maxWidth="max-w-6xl"
            hideActions
          >
            <LanguageSwitcher />
          </AppHeader>
          <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
            <ShlView />
          </main>
        </div>
      </ModalStackProvider>
    )
  }

  return (
    <SmartAppShell
      smartAuth={smartAuth}
      hookOptions={{ skip: false }}
      header={{ title: t("app.title"), icon: Heart, maxWidth: "max-w-6xl", children: <LanguageSwitcher /> }}
      title={t("app.title")}
      description={t("app.description")}
      icon={Heart}
      maxWidth="max-w-6xl"
      wrapper={(children) => <ModalStackProvider>{children}</ModalStackProvider>}
    >
      <Dashboard />
    </SmartAppShell>
  )
}
