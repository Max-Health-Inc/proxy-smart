import { FhirResourceReader } from "@babelfhir-ts/client-r4"
import type { Patient } from "fhir/r4"

export type { Patient }

/**
 * Create an unauthenticated FHIR Patient reader for the given base URL.
 *
 * The patient picker is shown mid-OAuth-flow (before any access token exists).
 * The backend FHIR proxy allows unauthenticated Patient search for this purpose.
 *
 * @param fhirBaseUrl - The FHIR server base URL from the `aud` parameter
 */
function createPatientReader(fhirBaseUrl: string) {
  return new FhirResourceReader<Patient>(fhirBaseUrl, "Patient", fetch)
}

/** Search patients by name, returning up to `count` results. */
export async function searchPatients(fhirBaseUrl: string, query: string, count = 20): Promise<Patient[]> {
  return createPatientReader(fhirBaseUrl).searchAll({ name: query, _count: count })
}

/** Read a single patient by ID. */
export async function getPatient(fhirBaseUrl: string, id: string): Promise<Patient> {
  return createPatientReader(fhirBaseUrl).read(id)
}

/** Search patients and return the raw Bundle (for pagination metadata). */
export async function searchPatientsBundle(fhirBaseUrl: string, query: string, count = 20) {
  return createPatientReader(fhirBaseUrl).search({ name: query, _count: count })
}
