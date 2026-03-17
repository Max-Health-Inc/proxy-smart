import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import {
  FhirClient,
  FhirResourceReader,
  FhirResourceWriterImpl,
} from "hl7.fhir.us.davinci-pas-generated/fhir-client"
import type {
  Patient,
  Practitioner,
  Questionnaire,
  QuestionnaireResponse,
  HumanName,
  ServiceRequest,
  Condition,
  QuestionnaireItem,
  QuestionnaireResponseItem,
} from "fhir/r4"
import type {
  PASClaim,
  PASCoverage,
  PASOrganization,
  PASServiceRequest,
  PASBeneficiary,
  PASInsurer,
  PASRequestor,
  PASPractitioner,
  PASEncounter,
  PASCommunicationRequest,
  PASRequestBundle,
  PASResponseBundle,
} from "hl7.fhir.us.davinci-pas-generated"
import type { PASClaimResponse } from "hl7.fhir.us.davinci-pas-generated/PASClaimResponse"

export type {
  Patient,
  Practitioner,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireItem,
  QuestionnaireResponseItem,
  ServiceRequest,
  Condition,
  PASClaim,
  PASClaimResponse,
  PASCoverage,
  PASOrganization,
  PASServiceRequest,
  PASBeneficiary,
  PASInsurer,
  PASRequestor,
  PASPractitioner,
  PASEncounter,
  PASCommunicationRequest,
  PASRequestBundle,
  PASResponseBundle,
}

// ── Generated FHIR client with authenticated fetch ───────────────────────────

const authFetch = smartAuth.createAuthenticatedFetch()
const client = new FhirClient(fhirBaseUrl, authFetch)

// Generic readers/writers for base R4 types not profiled in PAS
const patients = new FhirResourceReader<Patient>(fhirBaseUrl, "Patient", authFetch)
const practitioners = new FhirResourceReader<Practitioner>(fhirBaseUrl, "Practitioner", authFetch)
const questionnaires = new FhirResourceReader<Questionnaire>(fhirBaseUrl, "Questionnaire", authFetch)
const questionnaireResponses = new FhirResourceReader<QuestionnaireResponse>(fhirBaseUrl, "QuestionnaireResponse", authFetch)
const questionnaireResponseWriter = new FhirResourceWriterImpl<QuestionnaireResponse>(fhirBaseUrl, "QuestionnaireResponse", authFetch)
const conditions = new FhirResourceReader<Condition>(fhirBaseUrl, "Condition", authFetch)
const serviceRequests = new FhirResourceReader<ServiceRequest>(fhirBaseUrl, "ServiceRequest", authFetch)

// ── Patient ──────────────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<Patient> {
  return patients.read(id)
}

export async function searchPatients(query: string): Promise<Patient[]> {
  return patients.searchAll({ name: query, _count: 20, _sort: "-_lastUpdated" })
}

export async function searchPatientByIdentifier(identifier: string): Promise<Patient[]> {
  return patients.searchAll({ identifier, _count: 10 })
}

// ── Practitioner ─────────────────────────────────────────────────────────────

export async function getPractitioner(id: string): Promise<Practitioner> {
  return practitioners.read(id)
}

export async function searchPractitioners(name: string): Promise<Practitioner[]> {
  return practitioners.searchAll({ name, _count: 20 })
}

// ── Coverage (PAS-profiled — use generated client) ───────────────────────────

export async function searchCoverage(patientId: string): Promise<PASCoverage[]> {
  return client.read().pASCoverage().searchAll({
    patient: `Patient/${patientId}`,
    status: "active",
    _count: 20,
  })
}

// ── ServiceRequest ───────────────────────────────────────────────────────────

export async function searchServiceRequests(patientId: string): Promise<ServiceRequest[]> {
  return serviceRequests.searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-authored",
  })
}

export async function createServiceRequest(sr: PASServiceRequest): Promise<PASServiceRequest> {
  return client.write().pASServiceRequest().create(sr)
}

// ── Conditions ───────────────────────────────────────────────────────────────

export async function searchConditions(patientId: string): Promise<Condition[]> {
  return conditions.searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active",
    _count: 50,
  })
}

// ── Questionnaire ────────────────────────────────────────────────────────────

export async function getQuestionnaire(id: string): Promise<Questionnaire> {
  return questionnaires.read(id)
}

export async function searchQuestionnaires(context?: string): Promise<Questionnaire[]> {
  return questionnaires.searchAll({
    _count: 50,
    _sort: "-date",
    ...(context ? { context } : {}),
  })
}

// ── QuestionnaireResponse ────────────────────────────────────────────────────

export async function createQuestionnaireResponse(
  qr: QuestionnaireResponse
): Promise<QuestionnaireResponse> {
  return questionnaireResponseWriter.create(qr)
}

export async function searchQuestionnaireResponses(
  patientId: string
): Promise<QuestionnaireResponse[]> {
  return questionnaireResponses.searchAll({
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
  // Claim isn't profiled in the generated PAS client reader, use generic reader
  const claimReader = new FhirResourceReader<PASClaim>(fhirBaseUrl, "Claim", authFetch)
  return claimReader.searchAll({
    patient: `Patient/${patientId}`,
    use: "preauthorization",
    _count: 50,
    _sort: "-created",
  })
}

export async function searchClaimResponses(patientId: string): Promise<PASClaimResponse[]> {
  const crReader = new FhirResourceReader<PASClaimResponse>(fhirBaseUrl, "ClaimResponse", authFetch)
  return crReader.searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-created",
  })
}

// ── Organization ─────────────────────────────────────────────────────────────

export async function getOrganization(id: string): Promise<PASOrganization> {
  return client.read().pASOrganization().read(id)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatHumanName(name?: HumanName[]): string {
  if (!name?.length) return "Unknown"
  const n = name[0]
  const parts: string[] = []
  if (n.prefix?.length) parts.push(n.prefix.join(" "))
  if (n.given?.length) parts.push(n.given.join(" "))
  if (n.family) parts.push(n.family)
  return parts.join(" ") || n.text || "Unknown"
}
