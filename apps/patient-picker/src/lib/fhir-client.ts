import { FhirResourceReader } from "@babelfhir-ts/client-r4"
import { fhirBaseUrl } from "@/config"
import type { Patient } from "fhir/r4"

export type { Patient }

/**
 * Unauthenticated FHIR Patient reader.
 *
 * The patient picker is shown mid-OAuth-flow (before any access token exists).
 * The backend FHIR proxy allows unauthenticated Patient search for this purpose.
 */
const patients = new FhirResourceReader<Patient>(fhirBaseUrl, "Patient", fetch)

/** Search patients by name, returning up to `count` results. */
export async function searchPatients(query: string, count = 20): Promise<Patient[]> {
  return patients.searchAll({ name: query, _count: count })
}

/** Read a single patient by ID. */
export async function getPatient(id: string): Promise<Patient> {
  return patients.read(id)
}

/** Search patients and return the raw Bundle (for pagination metadata). */
export async function searchPatientsBundle(query: string, count = 20) {
  return patients.search({ name: query, _count: count })
}
