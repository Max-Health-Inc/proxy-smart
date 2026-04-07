import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@proxy-smart/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import {
  getPatient,
  searchConditions,
  searchAllergies,
  searchMedicationStatements,
  searchMedicationRequests,
  searchImmunizations,
  searchVitals,
  searchLabs,
  searchTobaccoUse,
  searchAlcoholUse,
  searchProcedures,
  searchFlags,
  searchPregnancyStatus,
  searchPregnancyEdd,
  searchDeviceUseStatements,
  searchImagingStudies,
  searchRadiologyResults,
  type Patient,
  type Condition,
  type AllergyIntolerance,
  type MedicationStatement,
  type MedicationRequest,
  type Immunization,
  type Observation,
  type LabResult,
  type RadiologyResult,
  type TobaccoUseObservation,
  type AlcoholUseObservation,
  type PregnancyStatus,
  type PregnancyEdd,
  type Procedure,
  type FlagAlert,
  type DeviceUseStatement,
  type ImagingStudy,
} from "@/lib/fhir-client"
import { getCurrentSmokingStatusUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-CurrentSmokingStatusUvIps"
import { getVaccineTargetDiseasesUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-VaccineTargetDiseasesUvIps"
import { getPregnancyStatusUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-PregnancyStatusUvIps"
import { PatientBanner } from "@/components/PatientBanner"
import {
  Heart,
  Pill,
  ShieldAlert,
  Syringe,
  Activity,
  FlaskConical,
  AlertCircle,
  Cigarette,
  Wine,
  Scissors,
  Flag,
  Baby,
  Stethoscope,
  ScanLine,
  Laptop,
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
  const [tobaccoUse, setTobaccoUse] = useState<TobaccoUseObservation[]>([])
  const [alcoholUse, setAlcoholUse] = useState<AlcoholUseObservation[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [flags, setFlags] = useState<FlagAlert[]>([])
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus[]>([])
  const [pregnancyEdd, setPregnancyEdd] = useState<PregnancyEdd[]>([])
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([])
  const [deviceUse, setDeviceUse] = useState<DeviceUseStatement[]>([])
  const [imagingStudies, setImagingStudies] = useState<ImagingStudy[]>([])
  const [radiologyResults, setRadiologyResults] = useState<RadiologyResult[]>([])

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

        const [tobacco, alcohol, proc, flag] = await Promise.allSettled([
          searchTobaccoUse(patientId),
          searchAlcoholUse(patientId),
          searchProcedures(patientId),
          searchFlags(patientId),
        ])
        if (tobacco.status === "fulfilled") setTobaccoUse(tobacco.value)
        if (alcohol.status === "fulfilled") setAlcoholUse(alcohol.value)
        if (proc.status === "fulfilled") setProcedures(proc.value)
        if (flag.status === "fulfilled") setFlags(flag.value)

        const [pregStatus, pregEdd, medReqs, devices, imaging, radiology] = await Promise.allSettled([
          searchPregnancyStatus(patientId),
          searchPregnancyEdd(patientId),
          searchMedicationRequests(patientId),
          searchDeviceUseStatements(patientId),
          searchImagingStudies(patientId),
          searchRadiologyResults(patientId),
        ])
        if (pregStatus.status === "fulfilled") setPregnancyStatus(pregStatus.value)
        if (pregEdd.status === "fulfilled") setPregnancyEdd(pregEdd.value)
        if (medReqs.status === "fulfilled") setMedicationRequests(medReqs.value)
        if (devices.status === "fulfilled") setDeviceUse(devices.value)
        if (imaging.status === "fulfilled") setImagingStudies(imaging.value)
        if (radiology.status === "fulfilled") setRadiologyResults(radiology.value)
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
                {immunizations.map((imm, i) => {
                  const targetDiseaseCode = imm.protocolApplied?.[0]?.targetDisease?.[0]?.coding?.[0]?.code
                  const targetDisease = targetDiseaseCode
                    ? getVaccineTargetDiseasesUvIpsConcept(targetDiseaseCode)?.display
                    : undefined
                  return (
                    <li key={imm.id || i} className="text-sm">
                      <span className="font-medium">
                        {imm.vaccineCode?.coding?.[0]?.display || imm.vaccineCode?.text || "Unknown vaccine"}
                      </span>
                      {targetDisease && (
                        <span className="text-muted-foreground ml-1 text-xs">({targetDisease})</span>
                      )}
                      {imm.occurrenceDateTime && (
                        <span className="text-muted-foreground ml-2">
                          {format(new Date(imm.occurrenceDateTime), "MMM d, yyyy")}
                        </span>
                      )}
                    </li>
                  )
                })}
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

        {/* Social History — Tobacco Use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cigarette className="size-4 text-orange-500" />
              Smoking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tobaccoUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tobacco use records</p>
            ) : (
              <ul className="space-y-2">
                {tobaccoUse.map((obs, i) => {
                  const statusCode = obs.valueCodeableConcept?.coding?.[0]?.code
                  const statusDisplay = statusCode
                    ? getCurrentSmokingStatusUvIpsConcept(statusCode)?.display
                    : undefined
                  return (
                    <li key={obs.id || i} className="text-sm flex justify-between">
                      <span className="font-medium">
                        {statusDisplay || obs.valueCodeableConcept?.text || "Unknown"}
                      </span>
                      {obs.effectiveDateTime && (
                        <span className="text-muted-foreground">
                          {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Alcohol Use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wine className="size-4 text-rose-500" />
              Alcohol Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alcoholUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alcohol use records</p>
            ) : (
              <ul className="space-y-2">
                {alcoholUse.map((obs, i) => (
                  <li key={obs.id || i} className="text-sm flex justify-between">
                    <span className="font-medium">
                      {obs.valueCodeableConcept?.coding?.[0]?.display ||
                        obs.valueCodeableConcept?.text ||
                        obs.valueQuantity
                          ? `${obs.valueQuantity?.value ?? ""} ${obs.valueQuantity?.unit ?? ""}`.trim()
                          : "Unknown"}
                    </span>
                    {obs.effectiveDateTime && (
                      <span className="text-muted-foreground">
                        {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="size-4 text-indigo-500" />
              Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {procedures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No procedure records</p>
            ) : (
              <ul className="space-y-2">
                {procedures.map((proc, i) => (
                  <li key={proc.id || i} className="text-sm">
                    <span className="font-medium">
                      {proc.code?.coding?.[0]?.display || proc.code?.text || "Unknown procedure"}
                    </span>
                    {proc.performedDateTime && (
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(proc.performedDateTime), "MMM d, yyyy")}
                      </span>
                    )}
                    {proc.status && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {proc.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Flags / Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="size-4 text-red-500" />
              Flags &amp; Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active flags</p>
            ) : (
              <ul className="space-y-2">
                {flags.map((flag, i) => (
                  <li key={flag.id || i} className="text-sm flex items-center gap-2">
                    <span
                      className={`inline-block size-2 rounded-full ${
                        flag.status === "active" ? "bg-red-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="font-medium">
                      {flag.code?.coding?.[0]?.display || flag.code?.text || "Unknown flag"}
                    </span>
                    {flag.period?.start && (
                      <span className="text-muted-foreground text-xs">
                        since {format(new Date(flag.period.start), "MMM d, yyyy")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pregnancy Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="size-4 text-pink-500" />
              Pregnancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pregnancyStatus.length === 0 && pregnancyEdd.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pregnancy records</p>
            ) : (
              <ul className="space-y-2">
                {pregnancyStatus.map((obs, i) => {
                  const code = obs.valueCodeableConcept?.coding?.[0]?.code
                  const display = code
                    ? getPregnancyStatusUvIpsConcept(code)?.display
                    : undefined
                  return (
                    <li key={obs.id || `ps-${i}`} className="text-sm flex justify-between">
                      <span className="font-medium">
                        {display || obs.valueCodeableConcept?.text || "Unknown status"}
                      </span>
                      {obs.effectiveDateTime && (
                        <span className="text-muted-foreground">
                          {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                        </span>
                      )}
                    </li>
                  )
                })}
                {pregnancyEdd.map((obs, i) => (
                  <li key={obs.id || `edd-${i}`} className="text-sm flex justify-between">
                    <span className="font-medium">
                      EDD: {obs.valueDateTime
                        ? format(new Date(obs.valueDateTime), "MMM d, yyyy")
                        : "Unknown"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {obs.code?.coding?.[0]?.display || "Expected Delivery Date"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prescribed Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="size-4 text-cyan-500" />
              Prescribed Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medicationRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active prescriptions</p>
            ) : (
              <ul className="space-y-2">
                {medicationRequests.map((rx, i) => (
                  <li key={rx.id || i} className="text-sm">
                    <span className="font-medium">
                      {rx.medicationCodeableConcept?.coding?.[0]?.display ||
                        rx.medicationCodeableConcept?.text ||
                        "Unknown medication"}
                    </span>
                    {rx.dosageInstruction?.[0]?.text && (
                      <span className="text-muted-foreground ml-2">— {rx.dosageInstruction[0].text}</span>
                    )}
                    {rx.authoredOn && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {format(new Date(rx.authoredOn), "MMM d, yyyy")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Medical Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Laptop className="size-4 text-slate-500" />
              Medical Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No device records</p>
            ) : (
              <ul className="space-y-2">
                {deviceUse.map((du, i) => (
                  <li key={du.id || i} className="text-sm">
                    <span className="font-medium">
                      {du.device?.display || du.device?.reference || "Unknown device"}
                    </span>
                    {du.timingPeriod?.start && (
                      <span className="text-muted-foreground ml-2">
                        since {format(new Date(du.timingPeriod.start), "MMM d, yyyy")}
                      </span>
                    )}
                    {du.status && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {du.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Imaging Studies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="size-4 text-violet-500" />
              Imaging Studies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagingStudies.length === 0 && radiologyResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imaging records</p>
            ) : (
              <ul className="space-y-2">
                {imagingStudies.map((study, i) => (
                  <li key={study.id || `img-${i}`} className="text-sm">
                    <span className="font-medium">
                      {study.procedureCode?.[0]?.coding?.[0]?.display ||
                        study.description ||
                        "Imaging study"}
                    </span>
                    {study.started && (
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(study.started), "MMM d, yyyy")}
                      </span>
                    )}
                    {study.numberOfSeries != null && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {study.numberOfSeries} series
                      </span>
                    )}
                  </li>
                ))}
                {radiologyResults.map((obs, i) => (
                  <li key={obs.id || `rad-${i}`} className="text-sm flex justify-between">
                    <span className="font-medium truncate mr-2">
                      {obs.code?.coding?.[0]?.display || obs.code?.text || "Radiology result"}
                    </span>
                    {obs.effectiveDateTime && (
                      <span className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                      </span>
                    )}
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
