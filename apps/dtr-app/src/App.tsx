import { useState, useCallback } from "react"
import { SmartAppShell } from "@max-health-inc/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import type { LaunchMode } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"
import { Dashboard } from "@/components/Dashboard"
import { FileCheck } from "lucide-react"
import "./index.css"

export default function App() {
  const [launchMode, setLaunchMode] = useState<LaunchMode>("standalone")
  const onAuthenticated = useCallback(() => setLaunchMode(smartAuth.getLaunchMode()), [])

  return (
    <SmartAppShell
      smartAuth={smartAuth}
      hookOptions={{
        onAuthenticated,
        startAuth: () => smartAuth.startStandaloneLaunch(),
      }}
      header={{
        title: "Prior Authorization",
        icon: FileCheck,
        maxWidth: "max-w-5xl",
        children: (
          <span className="text-xs text-muted-foreground ml-2 border rounded px-1.5 py-0.5">
            {launchMode === "ehr" ? "EHR Launch" : "Standalone"}
          </span>
        ),
      }}
      title="Prior Authorization"
      description="Submit and track prior authorization requests. Sign in to access patient records and documentation forms."
      icon={FileCheck}
      maxWidth="max-w-5xl"
    >
      <Dashboard launchMode={launchMode} />
    </SmartAppShell>
  )
}
