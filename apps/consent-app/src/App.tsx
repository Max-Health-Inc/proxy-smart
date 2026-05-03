import { Dashboard } from "@/components/Dashboard"
import { SmartAppShell, ModalStackProvider } from "@max-health-inc/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import { ShieldCheck } from "lucide-react"
import "./index.css"

export default function App() {
  return (
    <SmartAppShell
      smartAuth={smartAuth}
      hookOptions={{ ehrLaunch: false }}
      header={{ title: "Consent Manager", icon: ShieldCheck, maxWidth: "max-w-4xl" }}
      title="Consent Manager"
      description="Manage who can access your health records. Sign in with your identity to view and control your consent settings."
      icon={ShieldCheck}
      maxWidth="max-w-4xl"
      wrapper={(children) => <ModalStackProvider>{children}</ModalStackProvider>}
    >
      <Dashboard />
    </SmartAppShell>
  )
}
