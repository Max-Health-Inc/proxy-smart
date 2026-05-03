import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
export { fhirBaseUrl }
import { createAuthFetch } from "@max-health-inc/shared-ui"
import { FhirClient as DTRFhirClient } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"
import { FhirClient as PASFhirClient } from "hl7.fhir.us.davinci-pas-generated/fhir-client"
import type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  Condition,
  QuestionnaireItem,
  QuestionnaireResponseItem,
} from "fhir/r4"
import type {
  PASClaim,
  PASClaimUpdate,
  PASClaimInquiry,
  PASCoverage,
  PASOrganization,
  PASServiceRequest,
  PASBeneficiary,
  PASInsurer,
  PASRequestor,
  PASPractitioner,
  PASEncounter,
  PASCommunicationRequest,
  PASTask,
  PASRequestBundle,
  PASResponseBundle,
  PASInquiryRequestBundle,
  PASInquiryResponseBundle,
  PASClaimInquiryResponse,
  PASDeviceRequest,
  PASMedicationRequest,
  PASClaimResponse,
} from "hl7.fhir.us.davinci-pas-generated"
import type {
  DTRStdQuestionnaire,
  DTRQuestionnaireResponse,
  DTRQuestionnairePackageBundle,
} from "hl7.fhir.us.davinci-dtr-generated"
import type { FmStatusCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-FmStatus"
import type { MedicationrequestIntentCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-MedicationrequestIntent"

export type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireItem,
  QuestionnaireResponseItem,
  Condition,
  PASClaim,
  PASClaimUpdate,
  PASClaimInquiry,
  PASClaimResponse,
  PASClaimInquiryResponse,
  PASCoverage,
  PASOrganization,
  PASServiceRequest,
  PASBeneficiary,
  PASInsurer,
  PASRequestor,
  PASPractitioner,
  PASEncounter,
  PASCommunicationRequest,
  PASTask,
  PASRequestBundle,
  PASResponseBundle,
  PASInquiryRequestBundle,
  PASInquiryResponseBundle,
  PASDeviceRequest,
  PASMedicationRequest,
  DTRStdQuestionnaire,
  DTRQuestionnaireResponse,
  DTRQuestionnairePackageBundle,
}

// ── FHIR clients with authenticated fetch ────────────────────────────────────
// DTR client — typed DTR profile accessors + base R4 (Patient, Condition, etc.)
// PAS client — typed PAS profile accessors (PASClaim, PASCoverage, etc.)

export const authFetch = createAuthFetch(smartAuth)

const dtrClient = new DTRFhirClient(fhirBaseUrl, authFetch)
const pasClient = new PASFhirClient(fhirBaseUrl, authFetch)

// ── Patient ──────────────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<Patient> {
  return dtrClient.read().patient().read(id)
}

export async function searchPatients(query: string): Promise<Patient[]> {
  return dtrClient.read().patient().searchAll({ name: query, _count: 20, _sort: "-_lastUpdated" })
}

export async function searchPatientByIdentifier(identifier: string): Promise<Patient[]> {
  return dtrClient.read().patient().searchAll({ identifier, _count: 10 })
}

// ── Practitioner (PAS-profiled) ──────────────────────────────────────────────

export async function getPractitioner(id: string): Promise<PASPractitioner> {
  return pasClient.read().pASPractitioner().read(id)
}

export async function searchPractitioners(name: string): Promise<PASPractitioner[]> {
  return pasClient.read().pASPractitioner().searchAll({ name, _count: 20 })
}

// ── Coverage (PAS-profiled) ──────────────────────────────────────────────────

export async function searchCoverage(patientId: string): Promise<PASCoverage[]> {
  return pasClient.read().pASCoverage().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies FmStatusCode,
    _count: 20,
  })
}

// ── ServiceRequest (PAS-profiled) ────────────────────────────────────────────

export async function searchServiceRequests(patientId: string): Promise<PASServiceRequest[]> {
  return pasClient.read().pASServiceRequest().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  })
}

export async function createServiceRequest(sr: PASServiceRequest): Promise<PASServiceRequest> {
  return pasClient.write().pASServiceRequest().create(sr)
}

// ── Conditions ───────────────────────────────────────────────────────────────

export async function searchConditions(patientId: string): Promise<Condition[]> {
  return dtrClient.read().condition().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active",
    _count: 50,
  })
}

// ── Questionnaire (DTR-profiled) ─────────────────────────────────────────────

export async function getQuestionnaire(id: string): Promise<Questionnaire> {
  return dtrClient.read().dTRStdQuestionnaire().read(id)
}

export async function searchQuestionnaires(context?: string): Promise<Questionnaire[]> {
  return dtrClient.read().dTRStdQuestionnaire().searchAll({
    _count: 50,
    _sort: "-date",
    ...(context ? { context } : {}),
  })
}

// ── QuestionnaireResponse (DTR-profiled) ─────────────────────────────────────

export async function createQuestionnaireResponse(
  qr: QuestionnaireResponse
): Promise<QuestionnaireResponse> {
  return dtrClient.write().dTRQuestionnaireResponse().create(qr as unknown as DTRQuestionnaireResponse) as unknown as Promise<QuestionnaireResponse>
}

export async function searchQuestionnaireResponses(
  patientId: string
): Promise<QuestionnaireResponse[]> {
  return dtrClient.read().dTRQuestionnaireResponse().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  }) as unknown as Promise<QuestionnaireResponse[]>
}

// ── Claim / Prior Authorization (PAS-profiled) ──────────────────────────────

export async function submitClaim(claim: PASClaim): Promise<PASClaimResponse> {
  // $submit is a custom FHIR operation — use authFetch directly
  const res = await authFetch(`${fhirBaseUrl}/Claim/$submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
    },
    body: JSON.stringify(claim),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claim/$submit failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<PASClaimResponse>
}

export async function searchClaims(patientId: string): Promise<PASClaim[]> {
  return pasClient.read().pASClaim().searchAll({
    patient: `Patient/${patientId}`,
    use: "preauthorization",
    _count: 50,
    _sort: "-created",
  })
}

export async function searchClaimResponses(patientId: string): Promise<PASClaimResponse[]> {
  return pasClient.read().pASClaimResponse().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-created",
  })
}

// ── Organization (PAS-profiled) ──────────────────────────────────────────────

export async function getOrganization(id: string): Promise<PASOrganization> {
  return pasClient.read().pASOrganization().read(id)
}

// ── Claim Inquiry ($inquire) ─────────────────────────────────────────────────

export async function inquireClaim(inquiry: PASClaimInquiry): Promise<PASClaimInquiryResponse> {
  const res = await authFetch(`${fhirBaseUrl}/Claim/$inquire`, {
    method: "POST",
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
    },
    body: JSON.stringify(inquiry),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claim/$inquire failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<PASClaimInquiryResponse>
}

// ── Device Requests (PAS-profiled) ───────────────────────────────────────────

export async function searchDeviceRequests(patientId: string): Promise<PASDeviceRequest[]> {
  return pasClient.read().pASDeviceRequest().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored-on",
  })
}

// ── Medication Requests (PAS-profiled) ───────────────────────────────────────

export async function searchMedicationRequests(patientId: string): Promise<PASMedicationRequest[]> {
  return pasClient.read().pASMedicationRequest().searchAll({
    patient: `Patient/${patientId}`,
    intent: "order" satisfies MedicationrequestIntentCode,
    _count: 50,
    _sort: "-authoredon",
  })
}

// ── Tasks (PAS-profiled) ─────────────────────────────────────────────────────

export async function searchTasks(patientId: string): Promise<PASTask[]> {
  return pasClient.read().pASTask().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-modified",
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@max-health-inc/shared-ui"
