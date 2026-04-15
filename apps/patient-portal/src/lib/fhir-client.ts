import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import { reportAuthError } from "@/lib/auth-error"
import { FhirClient } from "hl7.fhir.uv.ips-generated/fhir-client"
import { FhirClient as GenomicsFhirClient } from "hl7.fhir.uv.genomics-reporting-generated/fhir-client"
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
} from "fhir/r4"

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
export type { Observation, DocumentReference }
export type { GenomicReport, Variant, DiagnosticImplication, TherapeuticImplication }

// ── FHIR client with authenticated fetch ────────────────────────────────────

const baseFetch = smartAuth.createAuthenticatedFetch()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authFetch: any = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await baseFetch(input, init)
  } catch (err) {
    if (err instanceof Error && /no valid smart token/i.test(err.message)) {
      reportAuthError("Your session has expired. Please sign in again.")
    }
    throw err
  }
}

const client = new FhirClient(fhirBaseUrl, authFetch)

// ── Patient ──────────────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<PatientUvIps> {
  return client.read().patientUvIps().read(id)
}

// ── Update Patient demographics ──────────────────────────────────────────────

export async function updatePatient(
  id: string,
  resource: PatientUvIps
): Promise<PatientUvIps> {
  const res = await authFetch(`${fhirBaseUrl}/Patient/${id}`, {
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
  const res = await authFetch(`${fhirBaseUrl}/Patient/${patientId}/$summary`, {
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
  return client.read().conditionUvIps().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active",
    _count: 50,
    _sort: "-onset-date",
  })
}

// ── Allergies (IPS-profiled) ─────────────────────────────────────────────────

export async function searchAllergies(patientId: string): Promise<AllergyIntoleranceUvIps[]> {
  return client.read().allergyIntolerance().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active",
    _count: 50,
  }) as Promise<AllergyIntoleranceUvIps[]>
}

// ── Medications (IPS-profiled) ───────────────────────────────────────────────

export async function searchMedicationStatements(patientId: string): Promise<MedicationStatementIPS[]> {
  return client.read().medicationStatement().searchAll({
    patient: `Patient/${patientId}`,
    status: "active",
    _count: 50,
  }) as Promise<MedicationStatementIPS[]>
}

// ── Immunizations (IPS-profiled) ─────────────────────────────────────────────

export async function searchImmunizations(patientId: string): Promise<ImmunizationUvIps[]> {
  return client.read().immunizationUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Observations (vitals — base R4, labs — IPS-profiled) ─────────────────────

export async function searchVitals(patientId: string): Promise<Observation[]> {
  return client.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    category: "vital-signs",
    _count: 20,
    _sort: "-date",
  })
}

export async function searchLabs(patientId: string): Promise<ObservationResultsLaboratoryPathologyUvIps[]> {
  return client.read().observationResultsLaboratoryPathologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    category: "laboratory",
    _count: 50,
    _sort: "-date",
  })
}

// ── Diagnostic Reports (IPS-profiled) ────────────────────────────────────────

export async function searchDiagnosticReports(patientId: string): Promise<DiagnosticReportUvIps[]> {
  return client.read().diagnosticReportUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function searchDocuments(patientId: string): Promise<DocumentReference[]> {
  return client.read().documentReference().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Social History (IPS-profiled) ────────────────────────────────────────────

export async function searchTobaccoUse(patientId: string): Promise<ObservationTobaccoUseUvIps[]> {
  return client.read().observationTobaccoUseUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "72166-2",
    _count: 10,
    _sort: "-date",
  })
}

export async function searchAlcoholUse(patientId: string): Promise<ObservationAlcoholUseUvIps[]> {
  return client.read().observationAlcoholUseUvIps().searchAll({
    patient: `Patient/${patientId}`,
    code: "74013-4",
    _count: 10,
    _sort: "-date",
  })
}

// ── Procedures (IPS-profiled) ────────────────────────────────────────────────

export async function searchProcedures(patientId: string): Promise<ProcedureUvIps[]> {
  return client.read().procedureUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

// ── Flags / Alerts (IPS-profiled) ────────────────────────────────────────────

export async function searchFlags(patientId: string): Promise<FlagAlertUvIps[]> {
  try {
    return await client.read().flagAlertUvIps().searchAll({
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
  return client.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    code: "82810-3",
    _count: 10,
    _sort: "-date",
  }) as Promise<ObservationPregnancyStatusUvIps[]>
}

export async function searchPregnancyEdd(patientId: string): Promise<ObservationPregnancyEddUvIps[]> {
  return client.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    code: "11778-8,11779-6,11780-4",
    _count: 10,
    _sort: "-date",
  }) as Promise<ObservationPregnancyEddUvIps[]>
}

export async function searchPregnancyOutcome(patientId: string): Promise<ObservationPregnancyOutcomeUvIps[]> {
  return client.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    code: "11636-8,11637-6,11638-4,11639-2,11640-0,11612-9,11613-7,33065-X",
    _count: 10,
    _sort: "-date",
  }) as Promise<ObservationPregnancyOutcomeUvIps[]>
}

// ── Medication Requests (IPS-profiled) ───────────────────────────────────────

export async function searchMedicationRequests(patientId: string): Promise<MedicationRequestIPS[]> {
  return client.read().medicationRequest().searchAll({
    patient: `Patient/${patientId}`,
    status: "active",
    _count: 50,
    _sort: "-authoredon",
  }) as Promise<MedicationRequestIPS[]>
}

// ── Device Use Statements (IPS-profiled) ─────────────────────────────────────

export async function searchDeviceUseStatements(patientId: string): Promise<DeviceUseStatementUvIps[]> {
  return client.read().deviceUseStatement().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
  }) as Promise<DeviceUseStatementUvIps[]>
}

// ── Imaging Studies (IPS-profiled) ───────────────────────────────────────────

export async function searchImagingStudies(patientId: string): Promise<ImagingStudyUvIps[]> {
  return client.read().imagingStudyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-started",
  })
}

// ── Radiology Results (IPS-profiled) ─────────────────────────────────────────

export async function searchRadiologyResults(patientId: string): Promise<ObservationResultsRadiologyUvIps[]> {
  return client.read().observationResultsRadiologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    category: "imaging",
    _count: 50,
    _sort: "-date",
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@proxy-smart/shared-ui"

// ── Genomics Reporting (HL7 Genomics Reporting 3.0.0) ────────────────────────

const genomicsClient = new GenomicsFhirClient(fhirBaseUrl, authFetch)

export async function searchGenomicReports(patientId: string): Promise<GenomicReport[]> {
  return genomicsClient.read().genomicReport().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/genomic-report",
    _count: 50,
    _sort: "-date",
  })
}

export async function searchVariants(patientId: string): Promise<Variant[]> {
  return genomicsClient.read().variant().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/variant",
    _count: 100,
    _sort: "-date",
  })
}

export async function searchDiagnosticImplications(patientId: string): Promise<DiagnosticImplication[]> {
  return genomicsClient.read().diagnosticImplication().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/diagnostic-implication",
    _count: 100,
    _sort: "-date",
  })
}

export async function searchTherapeuticImplications(patientId: string): Promise<TherapeuticImplication[]> {
  return genomicsClient.read().therapeuticImplication().searchAll({
    patient: `Patient/${patientId}`,
    _profile: "http://hl7.org/fhir/uv/genomics-reporting/StructureDefinition/therapeutic-implication",
    _count: 100,
    _sort: "-date",
  })
}

// ── Write operations ─────────────────────────────────────────────────────────

/** Create a FHIR resource through the proxy (requires patient/*.write scope) */
export async function createResource<T extends { resourceType: string }>(resource: T): Promise<T> {
  const res = await authFetch(`${fhirBaseUrl}/${resource.resourceType}`, {
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

// ── Document Import ──────────────────────────────────────────────────────────

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

  const baseUrl = fhirBaseUrl.split('/fhir/')[0] // strip /fhir/<server>/<version>
  const res = await authFetch(`${baseUrl}/api/document-import`, {
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
  const baseUrl = fhirBaseUrl.split('/fhir/')[0]
  const res = await authFetch(`${baseUrl}/api/patient-scribe`, {
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
