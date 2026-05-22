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

export async function submitPatientSelection(session: string, code: string, patientId: string): Promise<string> {
  const data = await apiFetch<PatientSelectResult>("/auth/patient-select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, code, patient: patientId }),
  })
  return data.redirect_url
}
