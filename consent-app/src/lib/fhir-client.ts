import { smartAuth, fhirBaseUrl } from "@/lib/smart-auth"
import {
  FhirResourceReader,
  FhirResourceWriterImpl,
} from "hl7.fhir.us.davinci-pas-generated/fhir-client"
import type {
  Patient,
  Person,
  Consent,
  Practitioner,
  HumanName,
} from "fhir/r4"

export type { Patient, Person, Consent, Practitioner }

// ── Generated FHIR client with authenticated fetch ───────────────────────────

const authFetch = smartAuth.createAuthenticatedFetch()

const persons = new FhirResourceReader<Person>(fhirBaseUrl, "Person", authFetch)
const patients = new FhirResourceReader<Patient>(fhirBaseUrl, "Patient", authFetch)
const practitioners = new FhirResourceReader<Practitioner>(fhirBaseUrl, "Practitioner", authFetch)
const consents = new FhirResourceReader<Consent>(fhirBaseUrl, "Consent", authFetch)
const consentWriter = new FhirResourceWriterImpl<Consent>(fhirBaseUrl, "Consent", authFetch)

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

/** Get the display name from a FHIR HumanName */
export function formatHumanName(name?: HumanName[]): string {
  if (!name?.length) return "Unknown"
  const n = name[0]
  const parts: string[] = []
  if (n.prefix?.length) parts.push(n.prefix.join(" "))
  if (n.given?.length) parts.push(n.given.join(" "))
  if (n.family) parts.push(n.family)
  return parts.join(" ") || n.text || "Unknown"
}
