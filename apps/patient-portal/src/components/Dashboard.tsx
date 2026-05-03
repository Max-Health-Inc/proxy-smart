import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner, Badge } from "@proxy-smart/shared-ui"
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
  searchGenomicReports,
  searchVariants,
  searchDiagnosticImplications,
  searchTherapeuticImplications,
  searchDocuments, searchBloodType, searchCoverage, searchEncounters,
  searchDiagnosticReports, searchPractitioners, searchOrganizations,
  type Patient, type DocumentReference, type Condition, type Coverage, type Encounter,
  type Organization, type Practitioner, type AllergyIntolerance, type MedicationStatement,
  type MedicationRequest, type Immunization, type Observation, type LabResult,
  type RadiologyResult, type TobaccoUseObservation, type AlcoholUseObservation,
  type PregnancyStatus, type PregnancyEdd, type Procedure, type FlagAlert,
  type DeviceUseStatement, type ImagingStudy, type GenomicReport, type Variant,
  type DiagnosticImplication, type TherapeuticImplication, type DiagnosticReport,
} from "@/lib/fhir-client"
import { getCurrentSmokingStatusUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-CurrentSmokingStatusUvIps"
import { getVaccineTargetDiseasesUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-VaccineTargetDiseasesUvIps"
import { getPregnancyStatusUvIpsConcept } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-PregnancyStatusUvIps"
import type { FlagStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-FlagStatus"
import {
  criticalityStyles, categoryEmoji, severityStyles,
  getInterpretationFlag, getProcedureStatusStyle, conditionSeverityStyles, RecordName,
  type AllergyIntoleranceCriticalityCode, type AllergyIntoleranceCategoryCode,
  type ReactionEventSeverityCode, type EventStatusCode,
  type ConditionSeverityCode, type AnyResource,
} from "@/lib/ips-display-helpers"
import { PatientBanner } from "@/components/PatientBanner"
const HealthChartsCard = lazy(() => import("@/components/HealthChartsCard").then(m => ({ default: m.HealthChartsCard })))
const ImagingStudyCard = lazy(() => import("@/components/ImagingStudyCard").then(m => ({ default: m.ImagingStudyCard })))
const GenomicsCard = lazy(() => import("@/components/GenomicsCard").then(m => ({ default: m.GenomicsCard })))
import { DocumentsCard } from "@/components/DocumentsCard"
import { CoverageCard } from "@/components/CoverageCard"
import { EncountersCard } from "@/components/EncountersCard"
import { DiagnosticReportsCard } from "@/components/DiagnosticReportsCard"
import { CareTeamCard } from "@/components/CareTeamCard"
import { DocumentImport } from "@/components/DocumentImport"
import { PatientScribe } from "@/components/PatientScribe"
import { DicomUpload } from "@/components/DicomUpload"
import { PrescriptionsCard, DevicesCard } from "@/components/PrescriptionsDevicesCards"
import { RecordDetailModal, isResourceVerified } from "@/components/RecordDetailModal"
import { ShareQRDialog } from "@/components/ShareQRDialog"
import { MedicalTimeline } from "@/components/MedicalTimeline"
import { checkPacsStatus } from "@/lib/dicomweb"
import { useFhirTranslation } from "@/lib/fhir-translations"
import {
  Heart, Pill, ShieldAlert, Syringe, Activity, FlaskConical, AlertCircle, Cigarette,
  Wine, Scissors, Flag, Baby, Upload, FileImage, MessageSquare, Eye, EyeOff, QrCode,
  LayoutGrid, Clock, Search, X,
} from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
interface DashboardProps {
  /** Hide all write actions (import, scribe, upload, share QR, edit) */
  readOnly?: boolean
  /** Override patient ID (e.g. from SHL token) instead of SMART auth token */
  patientId?: string
}
export function Dashboard({ readOnly = false, patientId: overridePatientId }: DashboardProps) {
  const { t } = useTranslation()
  const { translateCoding } = useFhirTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showScribe, setShowScribe] = useState(false); const [showDicomUpload, setShowDicomUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pacsAvailable, setPacsAvailable] = useState<boolean | null>(null)
  const [showUnverified, setShowUnverified] = useState(true)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTitle, setDetailTitle] = useState(""); const [detailResource, setDetailResource] = useState<AnyResource | null>(null)

  const openDetail = useCallback((title: string, resource: AnyResource) => { setDetailTitle(title); setDetailResource(resource); setDetailOpen(true) }, [])
  const refreshData = useCallback(() => setRefreshKey(k => k + 1), [])

  const [patient, setPatient] = useState<Patient | null>(null)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [allergies, setAllergies] = useState<AllergyIntolerance[]>([])
  const [medications, setMedications] = useState<MedicationStatement[]>([])
  const [immunizations, setImmunizations] = useState<Immunization[]>([])
  const [vitals, setVitals] = useState<Observation[]>([])
  const [labs, setLabs] = useState<LabResult[]>([])
  const [tobaccoUse, setTobaccoUse] = useState<TobaccoUseObservation[]>([])
  const [alcoholUse, setAlcoholUse] = useState<AlcoholUseObservation[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([]); const [flags, setFlags] = useState<FlagAlert[]>([])
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus[]>([])
  const [pregnancyEdd, setPregnancyEdd] = useState<PregnancyEdd[]>([])
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([])
  const [deviceUse, setDeviceUse] = useState<DeviceUseStatement[]>([])
  const [imagingStudies, setImagingStudies] = useState<ImagingStudy[]>([])
  const [radiologyResults, setRadiologyResults] = useState<RadiologyResult[]>([])
  const [genomicReports, setGenomicReports] = useState<GenomicReport[]>([]); const [variants, setVariants] = useState<Variant[]>([])
  const [diagnosticImplications, setDiagnosticImplications] = useState<DiagnosticImplication[]>([])
  const [therapeuticImplications, setTherapeuticImplications] = useState<TherapeuticImplication[]>([])
  const [documents, setDocuments] = useState<DocumentReference[]>([])
  const [bloodType, setBloodType] = useState<string | null>(null)
  const [coverages, setCoverages] = useState<Coverage[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [diagnosticReports, setDiagnosticReports] = useState<DiagnosticReport[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Filter helper
  const filterVerified = useCallback(<T extends AnyResource>(items: T[]): T[] => {
    if (showUnverified) return items
    return items.filter(isResourceVerified)
  }, [showUnverified])

  useEffect(() => {
    async function loadData() {
      try {
        const patientId = overridePatientId || smartAuth.getToken()?.patient
        if (!patientId) {
          setError(t("dashboard.noPatientContext"))
          setLoading(false)
          return
        }

        const pt = await getPatient(patientId)
        setPatient(pt)

        // Batch all searches into a single allSettled call
        const results = await Promise.allSettled([
          searchConditions(patientId), searchAllergies(patientId),
          searchMedicationStatements(patientId), searchImmunizations(patientId),
          searchVitals(patientId), searchLabs(patientId),
          searchTobaccoUse(patientId), searchAlcoholUse(patientId),
          searchProcedures(patientId), searchFlags(patientId),
          searchPregnancyStatus(patientId), searchPregnancyEdd(patientId),
          searchMedicationRequests(patientId), searchDeviceUseStatements(patientId),
          searchImagingStudies(patientId), searchRadiologyResults(patientId),
          searchGenomicReports(patientId), searchVariants(patientId),
          searchDiagnosticImplications(patientId), searchTherapeuticImplications(patientId),
          searchDocuments(patientId),
          searchBloodType(patientId),
          searchCoverage(patientId),
          searchEncounters(patientId),
          searchDiagnosticReports(patientId),
          searchPractitioners(patientId),
          searchOrganizations(),
        ])
        const v = <T,>(r: PromiseSettledResult<T>): T | undefined => r.status === "fulfilled" ? r.value : undefined
        const [cond, allergy, meds, imm, vit, lab, tobacco, alcohol, proc, flag,
          pregStatus, pregEdd, medReqs, devices, imaging, radiology,
          gReports, gVariants, gDiagImpl, gTheraImpl, docs, btObs,
          cov, enc, diagReps, practs, orgs] = results

        // Apply results — each setter is a no-op if the search failed
        const apply = <T,>(r: PromiseSettledResult<T>, set: (v: T) => void) => { if (v(r)) set(v(r)!) }
        apply(cond, setConditions); apply(allergy, setAllergies)
        apply(meds, setMedications); apply(imm, setImmunizations)
        apply(vit, setVitals); apply(lab, setLabs)
        apply(tobacco, setTobaccoUse); apply(alcohol, setAlcoholUse)
        apply(proc, setProcedures); apply(flag, setFlags)
        apply(pregStatus, setPregnancyStatus); apply(pregEdd, setPregnancyEdd)
        apply(medReqs, setMedicationRequests); apply(devices, setDeviceUse)
        apply(imaging, setImagingStudies); apply(radiology, setRadiologyResults)
        apply(gReports, setGenomicReports); apply(gVariants, setVariants)
        apply(gDiagImpl, setDiagnosticImplications); apply(gTheraImpl, setTherapeuticImplications)
        apply(docs, setDocuments)
        apply(cov, setCoverages); apply(enc, setEncounters)
        apply(diagReps, setDiagnosticReports)
        apply(practs, setPractitioners); apply(orgs, setOrganizations)

        // Derive blood type display string from ABO + Rh observations
        if (btObs.status === 'fulfilled' && btObs.value?.length) {
          const abo = btObs.value.find((o: LabResult) => o.code?.coding?.some(c => c.code === '882-1'))
          const rh = btObs.value.find((o: LabResult) => o.code?.coding?.some(c => c.code === '10331-7'))
          const aboText = abo?.valueCodeableConcept?.text || abo?.valueCodeableConcept?.coding?.[0]?.display || ''
          const rhText = rh?.valueCodeableConcept?.text || rh?.valueCodeableConcept?.coding?.[0]?.display || ''
          if (aboText || rhText) setBloodType([aboText, rhText].filter(Boolean).join(' '))
        }

        if (!readOnly) {
          checkPacsStatus().then(s => setPacsAvailable(s.configured && s.reachable === true)).catch(() => setPacsAvailable(false))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [refreshKey, overridePatientId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">{t("dashboard.loadingRecords")}</p>
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
      {patient && <PatientBanner patient={patient} bloodType={bloodType} onPatientUpdated={readOnly ? undefined : setPatient} />}

      {readOnly ? (
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "timeline" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode(v => v === "cards" ? "timeline" : "cards")}
            className="gap-1.5"
            title={viewMode === "cards" ? t("dashboard.timelineView", "Timeline view") : t("dashboard.cardView", "Card view")}
          >
            {viewMode === "cards" ? <Clock className="size-4" /> : <LayoutGrid className="size-4" />}
            <span className="hidden sm:inline">{viewMode === "cards" ? t("dashboard.timeline", "Timeline") : t("dashboard.cards", "Cards")}</span>
          </Button>
          <Button
            variant={showUnverified ? "outline" : "secondary"}
            size="sm"
            onClick={() => setShowUnverified(v => !v)}
            className="gap-1.5"
          >
            {showUnverified ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            <span className="hidden sm:inline">{showUnverified ? t("dashboard.showingAll") : t("dashboard.verifiedOnly")}</span>
          </Button>
        </div>
      ) : showImport ? (
        <DocumentImport onClose={() => { setShowImport(false); refreshData() }} onSaved={refreshData} />
      ) : showScribe ? (
        <PatientScribe onClose={() => { setShowScribe(false); refreshData() }} onSaved={refreshData} />
      ) : showDicomUpload ? (
        <DicomUpload onClose={() => setShowDicomUpload(false)} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "timeline" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setViewMode(v => v === "cards" ? "timeline" : "cards")}
              className="gap-1.5"
              title={viewMode === "cards" ? t("dashboard.timelineView", "Timeline view") : t("dashboard.cardView", "Card view")}
            >
              {viewMode === "cards" ? <Clock className="size-4" /> : <LayoutGrid className="size-4" />}
              <span className="hidden sm:inline">{viewMode === "cards" ? t("dashboard.timeline", "Timeline") : t("dashboard.cards", "Cards")}</span>
            </Button>
            <Button
              variant={showUnverified ? "outline" : "secondary"}
              size="sm"
              onClick={() => setShowUnverified(v => !v)}
              className="gap-1.5"
            >
              {showUnverified ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              <span className="hidden sm:inline">{showUnverified ? t("dashboard.showingAll") : t("dashboard.verifiedOnly")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowQrDialog(true)}
              title={t("shareQr.title")}
            >
              <QrCode className="size-4" />
              <span className="hidden sm:inline">{t("shareQr.share")}</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setShowDicomUpload(true)}
              title={pacsAvailable === false ? "Imaging server is not available" : pacsAvailable === null ? "Checking imaging server..." : t("dashboard.uploadImaging")}
            >
              <FileImage className={`size-4 ${pacsAvailable === false ? "opacity-50" : ""}`} />
              <span className="hidden sm:inline">{t("dashboard.uploadImaging")}</span>
              {pacsAvailable === false && <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{t("dashboard.offline")}</span>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} title={t("dashboard.importDocument")}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">{t("dashboard.importDocument")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowScribe(true)} title={t("dashboard.patientScribe")}>
              <MessageSquare className="size-4" />
              <span className="hidden sm:inline">{t("dashboard.patientScribe")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Search bar — shared across both views */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("dashboard.searchRecords", "Search records...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {viewMode === "timeline" ? (
        <MedicalTimeline
          conditions={filterVerified(conditions)}
          allergies={filterVerified(allergies)}
          medications={filterVerified(medications)}
          medicationRequests={filterVerified(medicationRequests)}
          immunizations={filterVerified(immunizations)}
          vitals={vitals}
          labs={labs}
          procedures={filterVerified(procedures)}
          flags={flags}
          pregnancyStatus={pregnancyStatus}
          pregnancyEdd={pregnancyEdd}
          encounters={encounters}
          imagingStudies={imagingStudies}
          diagnosticReports={diagnosticReports}
          documents={documents}
          devices={deviceUse}
          search={searchQuery}
          onOpenDetail={openDetail}
        />
      ) : (
      <div className="grid gap-4 md:grid-cols-2 min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="size-4 text-rose-500" />
              {t("dashboard.activeConditions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterVerified(conditions).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActiveConditions")}</p>
            ) : (
              <ul className="space-y-2">
                {filterVerified(conditions).map((c, i) => {
                  const sevCode = c.severity?.coding?.[0]?.code as ConditionSeverityCode | undefined
                  const sev = sevCode ? conditionSeverityStyles[sevCode] : undefined
                  return (
                  <li key={c.id || i} className="text-sm flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                    <RecordName resource={c} onOpen={openDetail}>
                      {translateCoding(c.code?.coding?.[0]) || c.code?.text || t("dashboard.unknownCondition")}
                    </RecordName>
                    {sev && <Badge variant={sev.variant} className="text-xs">{t(sev.i18nKey)}</Badge>}
                    {c.onsetDateTime && (
                      <span className="text-muted-foreground text-xs">
                        {t("common.since", { date: format(new Date(c.onsetDateTime), "MMM yyyy") })}
                      </span>
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-amber-500" />
              {t("dashboard.allergies")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterVerified(allergies).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noKnownAllergies")}</p>
            ) : (
              <ul className="space-y-2">
                {filterVerified(allergies).map((a, i) => {
                  const cat = a.category?.[0] as AllergyIntoleranceCategoryCode | undefined
                  const crit = a.criticality ? criticalityStyles[a.criticality as AllergyIntoleranceCriticalityCode] : undefined
                  const sev = a.reaction?.[0]?.severity ? severityStyles[a.reaction[0].severity as ReactionEventSeverityCode] : undefined
                  return (
                    <li key={a.id || i} className="text-sm min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cat && categoryEmoji[cat] && <span title={cat}>{categoryEmoji[cat]}</span>}
                        <RecordName resource={a} onOpen={openDetail}>
                          {translateCoding(a.code?.coding?.[0]) || a.code?.text || t("dashboard.unknownAllergen")}
                        </RecordName>
                        {crit && <Badge variant={crit.variant} className="text-xs">{t(crit.i18nKey)}</Badge>}
                      </div>
                      {a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display && (
                        <p className="text-muted-foreground text-xs truncate">
                          — {a.reaction[0].manifestation[0].coding[0].display}
                          {sev && <Badge variant="outline" className={`ml-1 text-xs ${sev.className}`}>{t(sev.i18nKey)}</Badge>}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="size-4 text-blue-500" />
              {t("dashboard.currentMedications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterVerified(medications).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActiveMedications")}</p>
            ) : (
              <ul className="space-y-2">
                {filterVerified(medications).map((m, i) => (
                  <li key={m.id || i} className="text-sm min-w-0">
                    <RecordName resource={m} onOpen={openDetail}>
                      {m.medicationCodeableConcept?.coding?.[0]?.display ||
                        m.medicationCodeableConcept?.text || t("dashboard.unknownMedication")}
                    </RecordName>
                    {m.dosage?.[0]?.text && (
                      <p className="text-muted-foreground text-xs truncate">— {m.dosage[0].text}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="size-4 text-green-500" />
              {t("dashboard.immunizations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterVerified(immunizations).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noImmunizationRecords")}</p>
            ) : (
              <ul className="space-y-2">
                {filterVerified(immunizations).map((imm, i) => {
                  const targetDiseaseCode = imm.protocolApplied?.[0]?.targetDisease?.[0]?.coding?.[0]?.code
                  const targetDisease = targetDiseaseCode
                    ? getVaccineTargetDiseasesUvIpsConcept(targetDiseaseCode)?.display : undefined
                  return (
                    <li key={imm.id || i} className="text-sm min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <RecordName resource={imm} onOpen={openDetail}>
                          {imm.vaccineCode?.coding?.[0]?.display || imm.vaccineCode?.text || t("dashboard.unknownVaccine")}
                        </RecordName>
                        {imm.occurrenceDateTime && (
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(imm.occurrenceDateTime), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {targetDisease && (
                        <p className="text-muted-foreground text-xs truncate">({targetDisease})</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-purple-500" />
              {t("dashboard.recentVitals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noRecentVitals")}</p>
            ) : (
              <ul className="space-y-2">
                {vitals.slice(0, 10).map((v, i) => (
                  <li key={v.id || i} className="text-sm flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <RecordName resource={v} onOpen={openDetail}>
                        {translateCoding(v.code?.coding?.[0]) || v.code?.text || t("common.unknown")}
                      </RecordName>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-right text-xs sm:text-sm">
                      {v.valueQuantity
                        ? `${v.valueQuantity.value} ${v.valueQuantity.unit || ""}`
                        : v.component?.length
                          ? v.component.map(c => c.valueQuantity ? `${c.valueQuantity.value}` : "").filter(Boolean).join("/") + ` ${v.component[0]?.valueQuantity?.unit || ""}`
                          : v.valueString || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-teal-500" />
              {t("dashboard.recentLabResults")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {labs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noRecentLabs")}</p>
            ) : (
              <ul className="space-y-2">
                {labs.slice(0, 10).map((l, i) => {
                  const interp = getInterpretationFlag(l)
                  return (
                    <li key={l.id || i} className="text-sm flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <RecordName resource={l} onOpen={openDetail}>
                          {translateCoding(l.code?.coding?.[0]) || l.code?.text || t("common.unknown")}
                        </RecordName>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0 text-right text-xs sm:text-sm">
                        {interp && (
                          <span className={`text-xs font-medium ${interp.className}`}>{t(interp.i18nKey)}</span>
                        )}
                        <span className="text-muted-foreground">
                          {l.valueQuantity
                            ? `${l.valueQuantity.value} ${l.valueQuantity.unit || ""}`
                            : l.valueString || "—"}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cigarette className="size-4 text-orange-500" />
              {t("dashboard.smokingStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tobaccoUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noTobaccoRecords")}</p>
            ) : (
              <ul className="space-y-2">
                {tobaccoUse.map((obs, i) => {
                  const statusCode = obs.valueCodeableConcept?.coding?.[0]?.code
                  const statusDisplay = statusCode
                    ? getCurrentSmokingStatusUvIpsConcept(statusCode)?.display : undefined
                  return (
                    <li key={obs.id || i} className="text-sm flex justify-between gap-2">
                      <RecordName resource={obs} onOpen={openDetail}>
                        {statusDisplay || obs.valueCodeableConcept?.text || "Unknown"}
                      </RecordName>
                      {obs.effectiveDateTime && (
                        <span className="text-muted-foreground shrink-0">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wine className="size-4 text-rose-500" />
              {t("dashboard.alcoholUse")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alcoholUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noAlcoholRecords")}</p>
            ) : (
              <ul className="space-y-2">
                {alcoholUse.map((obs, i) => (
                  <li key={obs.id || i} className="text-sm flex justify-between gap-2">
                    <RecordName resource={obs} onOpen={openDetail}>
                      {obs.valueCodeableConcept?.coding?.[0]?.display ||
                        obs.valueCodeableConcept?.text ||
                        obs.valueQuantity
                          ? `${obs.valueQuantity?.value ?? ""} ${obs.valueQuantity?.unit ?? ""}`.trim()
                          : "Unknown"}
                    </RecordName>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="size-4 text-indigo-500" />
              {t("dashboard.procedures")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterVerified(procedures).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noProcedureRecords")}</p>
            ) : (
              <ul className="space-y-2">
                {filterVerified(procedures).map((proc, i) => (
                  <li key={proc.id || i} className="text-sm flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                    <RecordName resource={proc} onOpen={openDetail}>
                      {proc.code?.coding?.[0]?.display || proc.code?.text || t("dashboard.unknownProcedure")}
                    </RecordName>
                    {proc.performedDateTime && (
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(proc.performedDateTime), "MMM d, yyyy")}
                      </span>
                    )}
                    {proc.status && (
                      <Badge variant={getProcedureStatusStyle(proc.status as EventStatusCode)} className="text-xs">
                        {proc.status}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="size-4 text-red-500" />
              {t("dashboard.flagsAndAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActiveFlags")}</p>
            ) : (
              <ul className="space-y-2">
                {flags.map((flag, i) => (
                  <li key={flag.id || i} className="text-sm flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full ${(flag.status as FlagStatusCode) === "active" ? "bg-red-500" : (flag.status as FlagStatusCode) === "inactive" ? "bg-gray-400" : "bg-amber-400"}`} />
                    <RecordName resource={flag} onOpen={openDetail}>
                      {flag.code?.coding?.[0]?.display || flag.code?.text || t("dashboard.unknownFlag")}
                    </RecordName>
                    {flag.period?.start && (
                      <span className="text-muted-foreground text-xs">
                        {t("common.since", { date: format(new Date(flag.period.start), "MMM d, yyyy") })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="size-4 text-pink-500" />
              {t("dashboard.pregnancy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pregnancyStatus.length === 0 && pregnancyEdd.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noPregnancyRecords")}</p>
            ) : (
              <ul className="space-y-2">
                {pregnancyStatus.map((obs, i) => {
                  const code = obs.valueCodeableConcept?.coding?.[0]?.code
                  const display = code ? getPregnancyStatusUvIpsConcept(code)?.display : undefined
                  return (
                    <li key={obs.id || `ps-${i}`} className="text-sm flex justify-between gap-2">
                      <RecordName resource={obs} onOpen={openDetail}>
                        {display || obs.valueCodeableConcept?.text || t("dashboard.unknownStatus")}
                      </RecordName>
                      {obs.effectiveDateTime && (
                        <span className="text-muted-foreground">
                          {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                        </span>
                      )}
                    </li>
                  )
                })}
                {pregnancyEdd.map((obs, i) => (
                  <li key={obs.id || `edd-${i}`} className="text-sm flex justify-between gap-2">
                    <RecordName resource={obs} onOpen={openDetail}>
                      {t("dashboard.edd", { date: obs.valueDateTime ? format(new Date(obs.valueDateTime), "MMM d, yyyy") : t("common.unknown") })}
                    </RecordName>
                    <span className="text-muted-foreground text-xs">
                      {obs.code?.coding?.[0]?.display || t("dashboard.expectedDeliveryDate")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <PrescriptionsCard prescriptions={filterVerified(medicationRequests)} onOpenDetail={openDetail} />

        <DevicesCard devices={deviceUse} onOpenDetail={openDetail} />

        <CoverageCard coverages={coverages} onOpenDetail={openDetail} />
        <EncountersCard encounters={encounters} onOpenDetail={openDetail} />
        <DiagnosticReportsCard reports={diagnosticReports} onOpenDetail={openDetail} />
        <CareTeamCard practitioners={practitioners} organizations={organizations} onOpenDetail={openDetail} />

        <DocumentsCard documents={documents} onOpenDetail={openDetail} />

        <div className="md:col-span-2">
          <Suspense fallback={<Card><CardContent className="flex items-center justify-center py-12"><Spinner size="sm" /></CardContent></Card>}>
            <HealthChartsCard vitals={vitals} labs={labs} />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <Suspense fallback={<Card><CardContent className="flex items-center justify-center py-12"><Spinner size="sm" /></CardContent></Card>}>
            <ImagingStudyCard imagingStudies={imagingStudies} radiologyResults={radiologyResults} readOnly={readOnly} onOpenDetail={openDetail} defaultCollapsed />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <Suspense fallback={<Card><CardContent className="flex items-center justify-center py-12"><Spinner size="sm" /></CardContent></Card>}>
            <GenomicsCard
              reports={genomicReports}
              variants={variants}
              diagnosticImplications={diagnosticImplications}
              therapeuticImplications={therapeuticImplications}
              onOpenDetail={openDetail}
              defaultCollapsed
            />
          </Suspense>
        </div>
      </div>
      )}

      <RecordDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={detailTitle}
        resource={detailResource}
        documents={documents}
        onResourceUpdated={readOnly ? undefined : refreshData}
        onResourceDeleted={readOnly ? undefined : refreshData}
      />

      {!readOnly && (
        <ShareQRDialog
          open={showQrDialog}
          onOpenChange={setShowQrDialog}
          verifiedOnly={!showUnverified}
        />
      )}
    </div>
  )
}
