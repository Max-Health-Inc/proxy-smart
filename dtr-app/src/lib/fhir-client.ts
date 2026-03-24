import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import { reportAuthError } from "@/lib/auth-error"
import { FhirClient } from "hl7.fhir.us.davinci-pas-generated/fhir-client"
import type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  HumanName,
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
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireItem,
  QuestionnaireResponseItem,
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

// ── FHIR client with authenticated fetch (@babelfhir-ts/client-r4) ──────────

const baseFetch = smartAuth.createAuthenticatedFetch()

/** Wraps the SMART authenticated fetch to detect permanent auth failures */
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
  return client.read().pASPractitioner().read(id)
}

export async function searchPractitioners(name: string): Promise<PASPractitioner[]> {
  return client.read().pASPractitioner().searchAll({ name, _count: 20 })
}

// ── Coverage (PAS-profiled — use generated client) ───────────────────────────

export async function searchCoverage(patientId: string): Promise<PASCoverage[]> {
  return client.read().pASCoverage().searchAll({
    patient: `Patient/${patientId}`,
    status: "active",
    _count: 20,
  })
}

// ── ServiceRequest (PAS-profiled) ────────────────────────────────────────────

export async function searchServiceRequests(patientId: string): Promise<PASServiceRequest[]> {
  return client.read().pASServiceRequest().searchAll({
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
