import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger, Spinner } from "@proxy-smart/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import type { LaunchMode } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"
import { PatientSearch } from "@/components/PatientSearch"
import { PatientBanner } from "@/components/PatientBanner"
import { CoverageCard } from "@/components/CoverageCard"
import { PaRequestList } from "@/components/PaRequestList"
import { NewPaWorkflow } from "@/components/NewPaWorkflow"
import { QuestionnaireBrowser } from "@/components/QuestionnaireBrowser"
import { usePatientContext } from "@/hooks/usePatientContext"

interface DashboardProps {
  launchMode: LaunchMode
}

export function Dashboard({ launchMode }: DashboardProps) {
  const token = smartAuth.getToken()
  // In EHR launch, patient context comes from the token
  const ehrPatientId = launchMode === "ehr" ? token?.patient ?? null : null
  const { patient, loading, error, setPatient } = usePatientContext(ehrPatientId)
  const [activeTab, setActiveTab] = useState("requests")

  // Standalone mode: show patient search if no patient selected
  if (!patient && launchMode === "standalone") {
    return (
      <PatientSearch
        onSelect={(p) => setPatient(p)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading patient context...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-destructive font-medium">Failed to load patient</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PatientBanner
        patient={patient}
        launchMode={launchMode}
        onClear={launchMode === "standalone" ? () => setPatient(null) : undefined}
      />

      <CoverageCard patientId={patient.id!} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">PA Requests</TabsTrigger>
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaires</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <PaRequestList patientId={patient.id!} />
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <NewPaWorkflow
            patient={patient}
            onComplete={() => setActiveTab("requests")}
          />
        </TabsContent>

        <TabsContent value="questionnaires" className="mt-4">
          <QuestionnaireBrowser patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
