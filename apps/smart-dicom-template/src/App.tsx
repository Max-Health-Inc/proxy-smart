import { SmartAppShell } from "@proxy-smart/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import { Brain } from "lucide-react"
import { AlgorithmRunner } from "@/components/AlgorithmRunner"
import "./index.css"

export default function App() {
  return (
    <SmartAppShell
      smartAuth={smartAuth}
      header={{ title: "SMART DICOM Algorithm", icon: Brain }}
      title="SMART DICOM Algorithm"
      description="Imaging analysis powered by SMART on FHIR. Sign in to run your algorithm on patient DICOM studies."
      icon={Brain}
      maxWidth="max-w-6xl"
    >
      <AlgorithmRunner />
    </SmartAppShell>
  )
}
