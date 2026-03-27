import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@proxy-smart/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import {
  getPatient,
  searchConditions,
  searchAllergies,
  searchMedicationStatements,
  searchImmunizations,
  searchVitals,
  searchLabs,
  type Patient,
  type Condition,
  type AllergyIntolerance,
  type MedicationStatement,
  type Immunization,
  type Observation,
  type LabResult,
} from "@/lib/fhir-client"
import { PatientBanner } from "@/components/PatientBanner"
import {
  Heart,
  Pill,
  ShieldAlert,
  Syringe,
  Activity,
  FlaskConical,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [allergies, setAllergies] = useState<AllergyIntolerance[]>([])
  const [medications, setMedications] = useState<MedicationStatement[]>([])
  const [immunizations, setImmunizations] = useState<Immunization[]>([])
  const [vitals, setVitals] = useState<Observation[]>([])
  const [labs, setLabs] = useState<LabResult[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const patientId = smartAuth.getToken()?.patient
        if (!patientId) {
          setError("No patient context available. Please launch from an EHR or select a patient.")
          setLoading(false)
          return
        }

        const pt = await getPatient(patientId)
        setPatient(pt)

        // Load clinical data in small batches to avoid 429 rate limits
        const [cond, allergy] = await Promise.allSettled([
          searchConditions(patientId),
          searchAllergies(patientId),
        ])
        if (cond.status === "fulfilled") setConditions(cond.value)
        if (allergy.status === "fulfilled") setAllergies(allergy.value)

        const [meds, imm] = await Promise.allSettled([
          searchMedicationStatements(patientId),
          searchImmunizations(patientId),
        ])
        if (meds.status === "fulfilled") setMedications(meds.value)
        if (imm.status === "fulfilled") setImmunizations(imm.value)

        const [vit, lab] = await Promise.allSettled([
          searchVitals(patientId),
          searchLabs(patientId),
        ])
        if (vit.status === "fulfilled") setVitals(vit.value)
        if (lab.status === "fulfilled") setLabs(lab.value)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading your health records...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {patient && <PatientBanner patient={patient} />}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="size-4 text-rose-500" />
              Active Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active conditions on record</p>
            ) : (
              <ul className="space-y-2">
                {conditions.map((c, i) => (
                  <li key={c.id || i} className="text-sm">
                    <span className="font-medium">
                      {c.code?.coding?.[0]?.display || c.code?.text || "Unknown condition"}
                    </span>
                    {c.onsetDateTime && (
                      <span className="text-muted-foreground ml-2">
                        since {format(new Date(c.onsetDateTime), "MMM yyyy")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-amber-500" />
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No known allergies</p>
            ) : (
              <ul className="space-y-2">
                {allergies.map((a, i) => (
                  <li key={a.id || i} className="text-sm">
                    <span className="font-medium">
                      {a.code?.coding?.[0]?.display || a.code?.text || "Unknown allergen"}
                    </span>
                    {a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display && (
                      <span className="text-muted-foreground ml-2">
                        — {a.reaction[0].manifestation[0].coding[0].display}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="size-4 text-blue-500" />
              Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active medications</p>
            ) : (
              <ul className="space-y-2">
                {medications.map((m, i) => (
                  <li key={m.id || i} className="text-sm">
                    <span className="font-medium">
                      {m.medicationCodeableConcept?.coding?.[0]?.display ||
                        m.medicationCodeableConcept?.text ||
                        "Unknown medication"}
                    </span>
                    {m.dosage?.[0]?.text && (
                      <span className="text-muted-foreground ml-2">— {m.dosage[0].text}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Immunizations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="size-4 text-green-500" />
              Immunizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {immunizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No immunization records</p>
            ) : (
              <ul className="space-y-2">
                {immunizations.map((imm, i) => (
                  <li key={imm.id || i} className="text-sm">
                    <span className="font-medium">
                      {imm.vaccineCode?.coding?.[0]?.display || imm.vaccineCode?.text || "Unknown vaccine"}
                    </span>
                    {imm.occurrenceDateTime && (
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(imm.occurrenceDateTime), "MMM d, yyyy")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-purple-500" />
              Recent Vitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent vital signs</p>
            ) : (
              <ul className="space-y-2">
                {vitals.slice(0, 10).map((v, i) => (
                  <li key={v.id || i} className="text-sm flex justify-between">
                    <span className="font-medium">
                      {v.code?.coding?.[0]?.display || v.code?.text || "Unknown"}
                    </span>
                    <span className="text-muted-foreground">
                      {v.valueQuantity
                        ? `${v.valueQuantity.value} ${v.valueQuantity.unit || ""}`
                        : v.valueString || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Lab Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-teal-500" />
              Recent Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {labs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent lab results</p>
            ) : (
              <ul className="space-y-2">
                {labs.slice(0, 10).map((l, i) => (
                  <li key={l.id || i} className="text-sm flex justify-between">
                    <span className="font-medium truncate mr-2">
                      {l.code?.coding?.[0]?.display || l.code?.text || "Unknown"}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {l.valueQuantity
                        ? `${l.valueQuantity.value} ${l.valueQuantity.unit || ""}`
                        : l.valueString || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
