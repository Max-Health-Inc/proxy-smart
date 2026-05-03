import { useState } from "react"
import type { Patient } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, CardAction, Spinner } from "@max-health-inc/shared-ui"
import { PersonCard } from "@/components/PersonCard"
import { PatientDetail } from "@/components/PatientDetail"
import { PractitionerDashboard } from "@/components/PractitionerDashboard"
import { usePerson } from "@/hooks/usePerson"
import { usePatients } from "@/hooks/usePatients"
import { formatHumanName } from "@/lib/fhir-client"
import {
  Users,
  Calendar,
  Hash,
  ChevronRight,
} from "lucide-react"

export function Dashboard() {
  const { result, loading: personLoading, error: personError } = usePerson()
  // Only extract linked patients when fhirUser is a Person
  const personResource = result?.resourceType === "Person" ? result.resource : null
  const { patients: linkedPatients, loading: patientsLoading } = usePatients(personResource)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Practitioner fhirUser → show practitioner dashboard
  if (result?.resourceType === "Practitioner") {
    return <PractitionerDashboard practitioner={result.resource} />
  }

  // When fhirUser IS the Patient, go directly to PatientDetail (no list)
  const directPatient = result?.resourceType === "Patient" ? result.resource : null

  const activePatient = selectedPatient ?? directPatient

  if (activePatient && result) {
    const ref = result.resourceType === "Person"
      ? `Person/${result.resource.id}`
      : `Patient/${result.resource.id}`
    return (
      <PatientDetail
        patient={activePatient}
        personReference={ref}
        onBack={() => {
          setSelectedPatient(null)
        }}
        hideBack={!!directPatient}
      />
    )
  }

  if (personLoading || patientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading your health records...</p>
      </div>
    )
  }

  if (personError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-destructive font-medium">Failed to load identity</p>
        <p className="text-sm text-muted-foreground">{personError}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">No identity found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Person identity card — only shown when fhirUser is a Person */}
      {result.resourceType === "Person" && <PersonCard person={result.resource} />}

      {/* Patients list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-5" />
          <h2 className="text-lg font-semibold">Your Patient Records</h2>
        </div>

        {linkedPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No linked patients</p>
              <p className="text-sm">Your Person resource has no linked Patient records.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {linkedPatients.map((patient) => {
              const name = formatHumanName(patient.name)
              const mrn = patient.identifier?.[0]?.value

              return (
                <Card key={patient.id} className="cursor-pointer hover:bg-accent/30 transition-colors">
                  <button
                    className="w-full text-left"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {name}
                      </CardTitle>
                      <CardAction>
                        <ChevronRight className="size-5 text-muted-foreground" />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                        {patient.birthDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            {patient.birthDate}
                          </span>
                        )}
                        {mrn && (
                          <span className="flex items-center gap-1.5">
                            <Hash className="size-3.5" />
                            {mrn}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
