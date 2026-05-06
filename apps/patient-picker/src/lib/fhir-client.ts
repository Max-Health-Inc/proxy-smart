import type { Patient, Bundle } from "fhir/r4"
import { getPickerParams } from "./picker-params"

export type { Patient, Bundle }

/** Thrown when the backend returns session_expired (401). */
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

/**
 * Session-validated Patient search for the patient picker.
 *
 * The picker is shown mid-OAuth-flow before any access token exists.
 * Instead of calling the FHIR proxy directly (which requires Bearer auth),
 * we call /auth/patient-search which validates the session and proxies
 * to the upstream FHIR server using service-level access.
 */

function getSearchUrl(params: Record<string, string | number>): string {
  const pickerParams = getPickerParams()
  const url = new URL('/auth/patient-search', window.location.origin)
  url.searchParams.set('session', pickerParams?.session ?? '')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.href
}

async function fetchBundle(params: Record<string, string | number>): Promise<Bundle> {
  const res = await fetch(getSearchUrl(params))
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    if (res.status === 401 && err.error === 'session_expired') {
      throw new SessionExpiredError(err.error_description || 'Session expired')
    }
    throw new Error(err.error_description || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Search patients by name, returning up to `count` results. */
export async function searchPatients(_fhirBaseUrl: string, query: string, count = 20): Promise<Patient[]> {
  const bundle = await fetchBundle({ name: query, _count: count })
  return (bundle.entry ?? []).map((e) => e.resource as Patient).filter((r): r is Patient => r !== null)
}

/** Read a single patient by ID. */
export async function getPatient(_fhirBaseUrl: string, id: string): Promise<Patient> {
  const bundle = await fetchBundle({ _id: id, _count: 1 })
  const patient = bundle.entry?.[0]?.resource as Patient | undefined
  if (!patient) throw new Error(`Patient ${id} not found`)
  return patient
}

/** Search patients and return the raw Bundle (for pagination metadata). */
export async function searchPatientsBundle(_fhirBaseUrl: string, query: string, count = 20): Promise<Bundle> {
  return fetchBundle({ name: query, _count: count })
}

/** List patients with offset-based pagination. */
export async function listPatients(_fhirBaseUrl: string, offset: number, count = 10): Promise<Bundle> {
  return fetchBundle({ _count: count, _offset: offset, _sort: 'family' })
}
