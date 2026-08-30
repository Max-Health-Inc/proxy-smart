import { reportAuthError } from "@proxy-smart/shared-ui"
import { getPickerParams } from "./picker-params"
import type { Bundle, Patient } from "fhir/r4"

export type { Patient, Bundle }

// ── Fetch Wrapper ───────────────────────────────────────────────────────────

/**
 * Centralized fetch wrapper for the patient-picker.
 * On auth/session errors, reports through shared-ui's auth-error bus
 * so the app-level handler can show the appropriate UI.
 */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    reportAuthError("Unable to reach the server. Check your connection and try again.")
    throw new Error("Network error")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message = body.error_description || body.error || `Unexpected error (HTTP ${res.status})`

    // Session/auth errors → report globally via shared-ui bus
    const isAuthError = res.status === 401
      || body.error === "session_expired"
      || body.error_description?.toLowerCase().includes("expired")

    if (isAuthError) {
      reportAuthError(message)
    }

    throw new Error(message)
  }

  return res.json()
}

// ── Patient Search API ──────────────────────────────────────────────────────

function buildSearchUrl(params: Record<string, string | number>): string {
  const pickerParams = getPickerParams()
  const url = new URL("/auth/patient-search", window.location.origin)
  url.searchParams.set("session", pickerParams?.session ?? "")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.href
}

export async function searchPatients(query: string, count = 20): Promise<Patient[]> {
  const bundle = await apiFetch<Bundle>(buildSearchUrl({ name: query, _count: count }))
  return (bundle.entry ?? []).map((e) => e.resource as Patient).filter(Boolean)
}

export async function listPatients(offset: number, count = 10): Promise<Bundle> {
  return apiFetch<Bundle>(buildSearchUrl({ _count: count, _offset: offset, _sort: "family" }))
}

// ── Patient Select API ──────────────────────────────────────────────────────

interface PatientSelectResult {
  redirect_url: string
}

// ── Brand Context API ─────────────────────────────────────────────────────

interface BrandContext {
  primaryColor: string | null
  accentColor: string | null
}

/**
 * Best-effort brand colour for the current launch, used to theme the picker to
 * the launching organization. Never throws — theming is optional, so any
 * failure just leaves the default brand in place.
 */
export async function fetchBrandContext(): Promise<BrandContext | null> {
  const pickerParams = getPickerParams()
  if (!pickerParams?.session) return null
  try {
    const url = new URL("/auth/brand-context", window.location.origin)
    url.searchParams.set("session", pickerParams.session)
    const res = await fetch(url.href)
    if (!res.ok) return null
    return (await res.json()) as BrandContext
  } catch {
    return null
  }
}

export async function submitPatientSelection(session: string, code: string, patientId: string): Promise<string> {
  const data = await apiFetch<PatientSelectResult>("/auth/patient-select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, code, patient: patientId }),
  })
  return data.redirect_url
}

// ── Identity Select API ─────────────────────────────────────────────────────
//
// The second thing this bundle picks. Same session, same code, same redirect contract as the
// patient selection above — which is why it lives here rather than in an app of its own.

/** One identity the signed-in human may act as for this launch. */
export interface Identity {
  reference: string
  resourceType: string
}

/**
 * The identities this launch offered.
 *
 * The backend answers only from what it already put in the session, so nothing is searchable
 * here — unlike the patient directory, this is a list of the caller's own identities.
 */
export async function fetchIdentityOptions(): Promise<Identity[]> {
  const pickerParams = getPickerParams()
  const url = new URL("/auth/identity-options", window.location.origin)
  url.searchParams.set("session", pickerParams?.session ?? "")
  const data = await apiFetch<{ identities: Identity[] }>(url.href)
  return data.identities
}

export async function submitIdentitySelection(session: string, code: string, reference: string): Promise<string> {
  const data = await apiFetch<PatientSelectResult>("/auth/identity-select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, code, identity: reference }),
  })
  return data.redirect_url
}
