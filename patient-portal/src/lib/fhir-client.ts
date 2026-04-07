import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import { reportAuthError } from "@/lib/auth-error"
import { FhirClient } from "hl7.fhir.uv.ips-generated/fhir-client"
import type {
  PatientUvIps,
  ConditionUvIps,
  AllergyIntoleranceUvIps,
  MedicationStatementIPS,
  ImmunizationUvIps,
  DiagnosticReportUvIps,
  ObservationResultsLaboratoryPathologyUvIps,
  ObservationTobaccoUseUvIps,
  ObservationAlcoholUseUvIps,
  ProcedureUvIps,
  FlagAlertUvIps,
  BundleUvIps,
} from "hl7.fhir.uv.ips-generated"
import type {
  Observation,
  DocumentReference,
} from "fhir/r4"

export type {
  PatientUvIps as Patient,
  ConditionUvIps as Condition,
  AllergyIntoleranceUvIps as AllergyIntolerance,
  MedicationStatementIPS as MedicationStatement,
  ImmunizationUvIps as Immunization,
  DiagnosticReportUvIps as DiagnosticReport,
  ObservationResultsLaboratoryPathologyUvIps as LabResult,
  ObservationTobaccoUseUvIps as TobaccoUseObservation,
  ObservationAlcoholUseUvIps as AlcoholUseObservation,
  ProcedureUvIps as Procedure,
  FlagAlertUvIps as FlagAlert,
  BundleUvIps as IpsBundle,
}
export type { Observation, DocumentReference }

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
  return client.read().flagAlertUvIps().searchAll({
    patient: `Patient/${patientId}`,
    status: "active",
    _count: 20,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@proxy-smart/shared-ui"
