import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import { config } from "@/config"
import { createAuthFetch } from "@proxy-smart/shared-ui"
import {
  FhirResourceReader,
  FhirResourceWriter,
} from "@babelfhir-ts/client-r4"
import type {
  Patient,
  Person,
  Consent,
  Practitioner,
  Task,
} from "fhir/r4"

export type { Patient, Person, Consent, Practitioner, Task }

// ── Generated FHIR client with authenticated fetch ───────────────────────────

const authFetch = createAuthFetch(smartAuth)

const persons = new FhirResourceReader<Person>(fhirBaseUrl, "Person", authFetch)
const patients = new FhirResourceReader<Patient>(fhirBaseUrl, "Patient", authFetch)
const practitioners = new FhirResourceReader<Practitioner>(fhirBaseUrl, "Practitioner", authFetch)
const consents = new FhirResourceReader<Consent>(fhirBaseUrl, "Consent", authFetch)
const consentWriter = new FhirResourceWriter<Consent>(fhirBaseUrl, "Consent", authFetch)
const tasks = new FhirResourceReader<Task>(fhirBaseUrl, "Task", authFetch)
const taskWriter = new FhirResourceWriter<Task>(fhirBaseUrl, "Task", authFetch)

// ── Resource operations ──────────────────────────────────────────────────────

export async function getPerson(id: string): Promise<Person> {
  return persons.read(id)
}

export async function getPatient(id: string): Promise<Patient> {
  return patients.read(id)
}

export async function getPractitioner(id: string): Promise<Practitioner> {
  return practitioners.read(id)
}

export async function searchPractitioners(name: string): Promise<Practitioner[]> {
  return practitioners.searchAll({ name, _count: 20 })
}

export async function searchConsents(patientId: string): Promise<Consent[]> {
  return consents.searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

export async function createConsent(consent: Consent): Promise<Consent> {
  return consentWriter.create(consent)
}

export async function updateConsent(id: string, consent: Consent): Promise<Consent> {
  return consentWriter.update({ ...consent, id } as Consent & { id: string })
}

export async function revokeConsent(id: string, consent: Consent): Promise<Consent> {
  const revoked: Consent = { ...consent, status: "inactive" }
  return updateConsent(id, revoked)
}

// ── Task operations ──────────────────────────────────────────────────────────

export async function searchTasksByPatient(patientId: string): Promise<Task[]> {
  return tasks.searchAll({
    patient: `Patient/${patientId}`,
    code: "access-request",
    _count: 50,
    _sort: "-authored-on",
  })
}

export async function searchTasksByRequester(practitionerRef: string): Promise<Task[]> {
  return tasks.searchAll({
    requester: practitionerRef,
    code: "access-request",
    _count: 50,
    _sort: "-authored-on",
  })
}

export async function createTask(task: Task): Promise<Task> {
  return taskWriter.create(task)
}

export async function updateTask(id: string, task: Task): Promise<Task> {
  return taskWriter.update({ ...task, id } as Task & { id: string })
}

// ── Patient search (for practitioner use) ────────────────────────────────────

export async function searchPatients(query: string): Promise<Patient[]> {
  return patients.searchAll({ name: query, _count: 20 })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract Patient references from Person.link[] */
export function extractPatientLinks(person: Person): Array<{ reference: string; display?: string }> {
  if (!person.link) return []
  return person.link
    .filter((l) => l.target?.reference?.startsWith("Patient/"))
    .map((l) => ({
      reference: l.target!.reference!,
      display: l.target?.display,
    }))
}

// Re-export from shared-ui to avoid duplication
export { formatHumanName } from "@proxy-smart/shared-ui"

// ── Backend API notifications ────────────────────────────────────────────────

const backendBase = `${config.proxyBase}/${config.proxyPrefix}`

export interface NotifyAccessRequestParams {
  patientReference: string
  patientName?: string
  practitionerName: string
  reason?: string
  resourceTypes?: string[]
}

/**
 * Notify a patient via email that a practitioner has requested access.
 * Fire-and-forget — failures are logged but don't block the UI flow.
 */
export async function notifyAccessRequest(params: NotifyAccessRequestParams): Promise<boolean> {
  try {
    const res = await authFetch(`${backendBase}/api/consent/notify-access-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    if (!res.ok) return false
    const data = await res.json() as { sent?: boolean }
    return data.sent === true
  } catch {
    return false
  }
}
