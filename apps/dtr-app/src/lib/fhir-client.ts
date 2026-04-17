import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
export { fhirBaseUrl }
import { reportAuthError } from "@/lib/auth-error"
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

const baseFetch = smartAuth.createAuthenticatedFetch()

/** Wraps the SMART authenticated fetch to detect permanent auth failures */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authFetch: any = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await baseFetch(input, init)
  } catch (err) {
    if (err instanceof Error && /no valid smart token/i.test(err.message)) {
      reportAuthError("Your session has expired. Please sign in again.")
    }
    throw err
  }
}

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
  return dtrClient.write().dTRQuestionnaireResponse().create(qr)
}

export async function searchQuestionnaireResponses(
  patientId: string
): Promise<QuestionnaireResponse[]> {
  return dtrClient.read().dTRQuestionnaireResponse().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  })
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
export { formatHumanName } from "@proxy-smart/shared-ui"
import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
export { fhirBaseUrl }
import { reportAuthError } from "@/lib/auth-error"
import { FhirClient } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"
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

// ── FHIR client with authenticated fetch (@babelfhir-ts/client-r4) ──────────

const baseFetch = smartAuth.createAuthenticatedFetch()

/** Wraps the SMART authenticated fetch to detect permanent auth failures */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authFetch: any = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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

export async function getPatient(id: string): Promise<Patient> {
  return client.read().patient().read(id)
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const bundle = await client.read().patient().search({ name: query, _count: 20, _sort: "-_lastUpdated" })
  const patients = bundle.entry?.filter(e => e.resource).map(e => e.resource!) ?? []
  // Deduplicate by id (some servers return the same patient across search results)
  const seen = new Set<string>()
  return patients.filter(p => p.id && !seen.has(p.id) && seen.add(p.id))
}

export async function searchPatientByIdentifier(identifier: string): Promise<Patient[]> {
  const bundle = await client.read().patient().search({ identifier, _count: 10 })
  const patients = bundle.entry?.filter(e => e.resource).map(e => e.resource!) ?? []
  const seen = new Set<string>()
  return patients.filter(p => p.id && !seen.has(p.id) && seen.add(p.id))
}

// ── Practitioner (PAS-profiled) ──────────────────────────────────────────────

export async function getPractitioner(id: string): Promise<PASPractitioner> {
  return client.read().practitioner().read(id) as Promise<PASPractitioner>
}

export async function searchPractitioners(name: string): Promise<PASPractitioner[]> {
  return client.read().practitioner().searchAll({ name, _count: 20 }) as Promise<PASPractitioner[]>
}

// ── Coverage (PAS-profiled — use generated client) ───────────────────────────

export async function searchCoverage(patientId: string): Promise<PASCoverage[]> {
  return client.read().coverage().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies FmStatusCode,
    _count: 20,
  }) as Promise<PASCoverage[]>
}

// ── ServiceRequest (PAS-profiled) ────────────────────────────────────────────

export async function searchServiceRequests(patientId: string): Promise<PASServiceRequest[]> {
  return client.read().serviceRequest().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  }) as Promise<PASServiceRequest[]>
}

export async function createServiceRequest(sr: PASServiceRequest): Promise<PASServiceRequest> {
  return client.write().serviceRequest().create(sr as fhir4.ServiceRequest) as Promise<PASServiceRequest>
}

// ── Conditions ───────────────────────────────────────────────────────────────

export async function searchConditions(patientId: string): Promise<Condition[]> {
  return client.read().condition().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active",
    _count: 50,
  })
}

// ── Questionnaire ────────────────────────────────────────────────────────────

export async function getQuestionnaire(id: string): Promise<Questionnaire> {
  return client.read().questionnaire().read(id)
}

export async function searchQuestionnaires(context?: string): Promise<Questionnaire[]> {
  return client.read().questionnaire().searchAll({
    _count: 50,
    _sort: "-date",
    ...(context ? { context } : {}),
  })
}

// ── QuestionnaireResponse ────────────────────────────────────────────────────

export async function createQuestionnaireResponse(
  qr: QuestionnaireResponse
): Promise<QuestionnaireResponse> {
  return client.write().questionnaireResponse().create(qr)
}

export async function searchQuestionnaireResponses(
  patientId: string
): Promise<QuestionnaireResponse[]> {
  return client.read().questionnaireResponse().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  })
}

// ── Claim / Prior Authorization ──────────────────────────────────────────────

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
  return client.read().claim().searchAll({
    patient: `Patient/${patientId}`,
    use: "preauthorization",
    _count: 50,
    _sort: "-created",
  }) as Promise<PASClaim[]>
}

export async function searchClaimResponses(patientId: string): Promise<PASClaimResponse[]> {
  return client.read().claimResponse().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-created",
  }) as Promise<PASClaimResponse[]>
}

// ── Organization ─────────────────────────────────────────────────────────────

export async function getOrganization(id: string): Promise<PASOrganization> {
  return client.read().organization().read(id) as Promise<PASOrganization>
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
  return client.read().deviceRequest().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored-on",
  }) as Promise<PASDeviceRequest[]>
}

// ── Medication Requests (PAS-profiled) ───────────────────────────────────────

export async function searchMedicationRequests(patientId: string): Promise<PASMedicationRequest[]> {
  return client.read().medicationRequest().searchAll({
    patient: `Patient/${patientId}`,
    intent: "order" satisfies MedicationrequestIntentCode,
    _count: 50,
    _sort: "-authoredon",
  }) as Promise<PASMedicationRequest[]>
}

// ── Tasks (PAS-profiled) ─────────────────────────────────────────────────────

export async function searchTasks(patientId: string): Promise<PASTask[]> {
  return client.read().task().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-modified",
  }) as Promise<PASTask[]>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@proxy-smart/shared-ui"
