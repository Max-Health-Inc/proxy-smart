import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import { config } from "@/config"
import { createAuthFetch } from "@proxy-smart/shared-ui"
import { FhirClient, type FhirResource as IpsFhirResource } from "hl7.fhir.uv.ips-generated/fhir-client"
import { FhirClient as GenomicsFhirClient, type FhirResource as GenomicsFhirResource } from "hl7.fhir.uv.genomics-reporting-generated/fhir-client"
import type {
  PatientUvIps,
  ConditionUvIps,
  AllergyIntoleranceUvIps,
  MedicationStatementIPS,
  MedicationRequestIPS,
  ImmunizationUvIps,
  DiagnosticReportUvIps,
  ObservationResultsLaboratoryPathologyUvIps,
  ObservationResultsRadiologyUvIps,
  ObservationTobaccoUseUvIps,
  ObservationAlcoholUseUvIps,
  ObservationPregnancyStatusUvIps,
  ObservationPregnancyEddUvIps,
  ObservationPregnancyOutcomeUvIps,
  ProcedureUvIps,
  FlagAlertUvIps,
  DeviceUseStatementUvIps,
  ImagingStudyUvIps,
  BundleUvIps,
  OrganizationUvIps,
  PractitionerUvIps,
  PractitionerRoleUvIps,
} from "hl7.fhir.uv.ips-generated"
import type {
  GenomicReport,
  Variant,
  DiagnosticImplication,
  TherapeuticImplication,
} from "hl7.fhir.uv.genomics-reporting-generated"
import type {
  Observation,
  DocumentReference,
  Coverage,
  Encounter,
} from "fhir/r4"
import type { ConditionClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionClinical"
import type { AllergyintoleranceClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyintoleranceClinical"
import type { MedicationStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-MedicationStatus"
import type { MedicationrequestStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-MedicationrequestStatus"
import type { ObservationCategoryCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ObservationCategory"
import type { ImmunizationStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ImmunizationStatus"
import type { DeviceStatementStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DeviceStatementStatus"
import type { DiagnosticReportStatusUvIpsCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DiagnosticReportStatusUvIps"
import type { ObservationStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ObservationStatus"

export type {
  PatientUvIps as Patient,
  ConditionUvIps as Condition,
  AllergyIntoleranceUvIps as AllergyIntolerance,
  MedicationStatementIPS as MedicationStatement,
  MedicationRequestIPS as MedicationRequest,
  ImmunizationUvIps as Immunization,
  DiagnosticReportUvIps as DiagnosticReport,
  ObservationResultsLaboratoryPathologyUvIps as LabResult,
  ObservationResultsRadiologyUvIps as RadiologyResult,
  ObservationTobaccoUseUvIps as TobaccoUseObservation,
  ObservationAlcoholUseUvIps as AlcoholUseObservation,
  ObservationPregnancyStatusUvIps as PregnancyStatus,
  ObservationPregnancyEddUvIps as PregnancyEdd,
  ObservationPregnancyOutcomeUvIps as PregnancyOutcome,
  ProcedureUvIps as Procedure,
  FlagAlertUvIps as FlagAlert,
  DeviceUseStatementUvIps as DeviceUseStatement,
  ImagingStudyUvIps as ImagingStudy,
  BundleUvIps as IpsBundle,
}
export type { Observation, DocumentReference, Coverage, Encounter }
export type { OrganizationUvIps as Organization, PractitionerUvIps as Practitioner, PractitionerRoleUvIps as PractitionerRole }
export type { GenomicReport, Variant, DiagnosticImplication, TherapeuticImplication }
export type { DeviceStatementStatusCode, DiagnosticReportStatusUvIpsCode, ObservationStatusCode, ImmunizationStatusCode }

// Properly typed union covering all portal resource types (IPS + Genomics + base R4)
export type PortalFhirResource = IpsFhirResource | GenomicsFhirResource | Observation | DocumentReference | Coverage | Encounter
// Escape hatch for components needing dynamic property access (RecordEditModal, RecordDetailModal)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DynamicFhirResource = PortalFhirResource & Record<string, any>

// ── FHIR client with authenticated fetch ────────────────────────────────────

const authFetch = createAuthFetch(smartAuth)

const defaultClient = new FhirClient(fhirBaseUrl, authFetch)

// Swappable active references — allows SHL viewer to inject a different client
let _activeClient: FhirClient = defaultClient
let _activeGenomicsClient: GenomicsFhirClient = new GenomicsFhirClient(fhirBaseUrl, authFetch)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _activeAuthFetch: any = authFetch
let _activeFhirBaseUrl: string = fhirBaseUrl

/** Inject a different FhirClient (e.g. SHL bearer-token client) */
export function setActiveFhirClient(client: FhirClient, fetchFn: typeof fetch, baseUrl: string) {
  _activeClient = client
  _activeGenomicsClient = new GenomicsFhirClient(baseUrl, fetchFn)
  _activeAuthFetch = fetchFn
  _activeFhirBaseUrl = baseUrl
}

/** Restore the default SMART-authenticated client */
export function resetFhirClient() {
  _activeClient = defaultClient
  _activeGenomicsClient = new GenomicsFhirClient(fhirBaseUrl, authFetch)
  _activeAuthFetch = authFetch
  _activeFhirBaseUrl = fhirBaseUrl
}

// ── Patient ──────────────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<PatientUvIps> {
  return _activeClient.read().patientUvIps().read(id)
}

// ── Update Patient demographics ──────────────────────────────────────────────

export async function updatePatient(
  id: string,
  resource: PatientUvIps
): Promise<PatientUvIps> {
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/Patient/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
    },
    body: JSON.stringify(resource),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Patient update failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<PatientUvIps>
}

// ── IPS: International Patient Summary ($summary operation) ──────────────────

export async function getPatientSummary(patientId: string): Promise<BundleUvIps> {
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/Patient/${patientId}/$summary`, {
    headers: { Accept: "application/fhir+json" },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`$summary failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<BundleUvIps>
}

// ── Conditions (IPS-profiled) ────────────────────────────────────────────────

export async function searchConditions(patientId: string): Promise<ConditionUvIps[]> {
  return _activeClient.read().conditionUvIps().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active" satisfies ConditionClinicalCode,
    _count: 50,
    _sort: "-onset-date",
  })
}

// ── Allergies (IPS-profiled) ─────────────────────────────────────────────────

export async function searchAllergies(patientId: string): Promise<AllergyIntoleranceUvIps[]> {
  return _activeClient.read().allergyIntoleranceUvIps().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active" satisfies AllergyintoleranceClinicalCode,
    _count: 50,
  })
}

// ── Medications (IPS-profiled) ───────────────────────────────────────────────

export async function searchMedicationStatements(patientId: string): Promise<MedicationStatementIPS[]> {
  return _activeClient.read().medicationStatementIPS().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies MedicationStatusCode,
    _count: 50,
  })
}

// ── Immunizations (IPS-profiled) ─────────────────────────────────────────────

export async function searchImmunizations(patientId: string): Promise<ImmunizationUvIps[]> {
  return _activeClient.read().immunizationUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Observations (vitals — base R4, labs — IPS-profiled) ─────────────────────

export async function searchVitals(patientId: string): Promise<Observation[]> {
  return _activeClient.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    category: "vital-signs" satisfies ObservationCategoryCode,
    _count: 20,
    _sort: "-date",
  })
}

export async function searchLabs(patientId: string): Promise<ObservationResultsLaboratoryPathologyUvIps[]> {
  return _activeClient.read().observationResultsLaboratoryPathologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    category: "laboratory" satisfies ObservationCategoryCode,
    _count: 50,
    _sort: "-date",
  })
}

// ── Diagnostic Reports (IPS-profiled) ────────────────────────────────────────

/**
 * Search for ABO + Rh blood type observations (LOINC 882-1, 10331-7).
 * Returns the most recent result of each.
 */
export async function searchBloodType(patientId: string): Promise<ObservationResultsLaboratoryPathologyUvIps[]> {
  return _activeClient.read().observationResultsLaboratoryPathologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "882-1,10331-7",
    _count: 2,
    _sort: "-date",
  })
}

export async function searchDiagnosticReports(patientId: string): Promise<DiagnosticReportUvIps[]> {
  return _activeClient.read().diagnosticReportUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function searchDocuments(patientId: string): Promise<DocumentReference[]> {
  return _activeClient.read().documentReference().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Social History (IPS-profiled) ────────────────────────────────────────────

export async function searchTobaccoUse(patientId: string): Promise<ObservationTobaccoUseUvIps[]> {
  return _activeClient.read().observationTobaccoUseUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "72166-2",
    _count: 10,
    _sort: "-date",
  })
}

export async function searchAlcoholUse(patientId: string): Promise<ObservationAlcoholUseUvIps[]> {
  return _activeClient.read().observationAlcoholUseUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "74013-4",
    _count: 10,
    _sort: "-date",
  })
}

// ── Procedures (IPS-profiled) ────────────────────────────────────────────────

export async function searchProcedures(patientId: string): Promise<ProcedureUvIps[]> {
  return _activeClient.read().procedureUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Flags / Alerts (IPS-profiled) ────────────────────────────────────────────

export async function searchFlags(patientId: string): Promise<FlagAlertUvIps[]> {
  try {
    return await _activeClient.read().flagAlertUvIps().searchAll({
      patient: `Patient/${patientId}`,
      _count: 20,
    })
  } catch {
    // HAPI may not support Flag search — return empty gracefully
    return []
  }
}

// ── Pregnancy (IPS-profiled) ─────────────────────────────────────────────────

export async function searchPregnancyStatus(patientId: string): Promise<ObservationPregnancyStatusUvIps[]> {
  return _activeClient.read().observationPregnancyStatusUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "82810-3",
    _count: 10,
    _sort: "-date",
  })
}

export async function searchPregnancyEdd(patientId: string): Promise<ObservationPregnancyEddUvIps[]> {
  return _activeClient.read().observationPregnancyEddUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "11778-8,11779-6,11780-4",
    _count: 10,
    _sort: "-date",
  })
}

export async function searchPregnancyOutcome(patientId: string): Promise<ObservationPregnancyOutcomeUvIps[]> {
  return _activeClient.read().observationPregnancyOutcomeUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "11636-8,11637-6,11638-4,11639-2,11640-0,11612-9,11613-7,33065-X",
    _count: 10,
    _sort: "-date",
  })
}

// ── Medication Requests (IPS-profiled) ───────────────────────────────────────

export async function searchMedicationRequests(patientId: string): Promise<MedicationRequestIPS[]> {
  return _activeClient.read().medicationRequestIPS().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies MedicationrequestStatusCode,
    _count: 50,
    _sort: "-authoredon",
  })
}

// ── Device Use Statements (IPS-profiled) ─────────────────────────────────────

export async function searchDeviceUseStatements(patientId: string): Promise<DeviceUseStatementUvIps[]> {
  return _activeClient.read().deviceUseStatementUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
  })
}

// ── Imaging Studies (IPS-profiled) ───────────────────────────────────────────

export async function searchImagingStudies(patientId: string): Promise<ImagingStudyUvIps[]> {
  return _activeClient.read().imagingStudyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-started",
  })
}

// ── Radiology Results (IPS-profiled) ─────────────────────────────────────────

export async function searchRadiologyResults(patientId: string): Promise<ObservationResultsRadiologyUvIps[]> {
  return _activeClient.read().observationResultsRadiologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    category: "imaging" satisfies ObservationCategoryCode,
    _count: 50,
    _sort: "-date",
  })
}

// ── Coverage (base R4) ───────────────────────────────────────────────────────

export async function searchCoverage(patientId: string): Promise<Coverage[]> {
  return _activeClient.read().coverage().searchAll({
    beneficiary: `Patient/${patientId}`,
    _count: 10,
  })
}

// ── Encounters (base R4) ─────────────────────────────────────────────────────

export async function searchEncounters(patientId: string): Promise<Encounter[]> {
  return _activeClient.read().encounter().searchAll({
    patient: `Patient/${patientId}`,
    _count: 20,
    _sort: "-date",
  })
}

// ── Care Team (IPS-profiled) ─────────────────────────────────────────────────

export async function searchPractitioners(patientId: string): Promise<PractitionerUvIps[]> {
  // _has reverse chaining requires special URL syntax the typed client can't express
  try {
    const res = await _activeAuthFetch(
      `${_activeFhirBaseUrl}/Practitioner?_has:Encounter:participant:patient=Patient/${encodeURIComponent(patientId)}&_count=20`,
      { headers: { Accept: "application/fhir+json" } },
    )
    if (!res.ok) throw new Error(`${res.status}`)
    const bundle = await res.json()
    return (bundle.entry?.map((e: { resource: PractitionerUvIps }) => e.resource) ?? []) as PractitionerUvIps[]
  } catch {
    return _activeClient.read().practitionerUvIps().searchAll({ _count: 20 })
  }
}

export async function searchOrganizations(): Promise<OrganizationUvIps[]> {
  return _activeClient.read().organizationUvIps().searchAll({ _count: 20 })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@proxy-smart/shared-ui"

// ── Genomics Reporting (HL7 Genomics Reporting 3.0.0) ────────────────────────

export async function searchGenomicReports(patientId: string): Promise<GenomicReport[]> {
  return _activeGenomicsClient.read().genomicReport().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/genomic-report",
    _count: 50,
    _sort: "-date",
  })
}

export async function searchVariants(patientId: string): Promise<Variant[]> {
  return _activeGenomicsClient.read().variant().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/variant",
    _count: 100,
    _sort: "-date",
  })
}

export async function searchDiagnosticImplications(patientId: string): Promise<DiagnosticImplication[]> {
  return _activeGenomicsClient.read().diagnosticImplication().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/diagnostic-implication",
    _count: 100,
    _sort: "-date",
  })
}

export async function searchTherapeuticImplications(patientId: string): Promise<TherapeuticImplication[]> {
  return _activeGenomicsClient.read().therapeuticImplication().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/therapeutic-implication",
    _count: 100,
    _sort: "-date",
  })
}

// ── Write operations ─────────────────────────────────────────────────────────

/** Create a FHIR resource through the proxy (requires patient/*.write scope) */
export async function createResource<T extends { resourceType: string }>(resource: T): Promise<T> {
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/${resource.resourceType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
    body: JSON.stringify(resource),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create ${resource.resourceType} (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

/** Update a FHIR resource via PUT (requires patient/*.write scope) */
export async function updateResource<T extends { resourceType: string; id?: string }>(resource: T): Promise<T> {
  if (!resource.id) throw new Error('Cannot update a resource without an id')
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/${resource.resourceType}/${resource.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
    body: JSON.stringify(resource),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update ${resource.resourceType}/${resource.id} (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

/** Delete a FHIR resource via DELETE (requires patient/*.write scope) */
export async function deleteResource(resourceType: string, id: string): Promise<void> {
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/${resourceType}/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/fhir+json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to delete ${resourceType}/${id} (${res.status}): ${text}`)
  }
}

// ── Document Import ──────────────────────────────────────────────────────────

/**
 * Fetch a FHIR Binary resource through the authenticated proxy.
 * Returns a blob URL for rendering or a base64 data URI for text content.
 */
export async function fetchBinaryUrl(relativeUrl: string): Promise<string> {
  const res = await _activeAuthFetch(`${_activeFhirBaseUrl}/${relativeUrl}`, {
    headers: { Accept: '*/*' },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${relativeUrl} (${res.status})`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export interface ImportedResource {
  resourceType: string
  resource: Record<string, unknown>
  retriesNeeded: number
  warnings: string[]
}

export interface FailedResource {
  resourceType: string
  errors: string[]
  warnings: string[]
  retriesAttempted: number
}

export interface DocumentImportResponse {
  success: boolean
  fileName: string
  pagesProcessed: number
  resources: ImportedResource[]
  failed: FailedResource[]
  documentReference: Record<string, unknown>
  processingTimeMs: number
}

/** Upload a PDF for AI-powered FHIR extraction (calls /api/document-import) */
export async function importDocument(file: File, patientId: string): Promise<DocumentImportResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('patientId', patientId)

  const baseUrl = config.proxyBase
  const res = await _activeAuthFetch(`${baseUrl}/api/document-import`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Document import failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<DocumentImportResponse>
}

// ── Patient Scribe ───────────────────────────────────────────────────────────

export interface ScribeResponse {
  success: boolean
  resources: ImportedResource[]
  failed: FailedResource[]
  processingTimeMs: number
}

/** Send free text to the AI scribe and get back validated FHIR resources */
export async function scribeFromText(text: string, patientId: string): Promise<ScribeResponse> {
  const baseUrl = config.proxyBase
  const res = await _activeAuthFetch(`${baseUrl}/api/patient-scribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, patientId }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Scribe failed (${res.status}): ${errText}`)
  }
  return res.json() as Promise<ScribeResponse>
}

// ── SMART Health Links ───────────────────────────────────────────────────────
// Moved to @/lib/shl-client.ts — uses generated OpenAPI client (ShlApi)
