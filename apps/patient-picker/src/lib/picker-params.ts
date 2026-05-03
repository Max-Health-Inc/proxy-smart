/** Parsed URL parameters for the patient picker. */
export interface PickerParams {
  session: string
  code: string
  /** FHIR server base URL from the aud parameter (per SMART App Launch spec §2.1.9). */
  aud: string
}

/** Parse and validate session/code/aud URL parameters for the patient picker. */
export function getPickerParams(): PickerParams | null {
  const params = new URLSearchParams(window.location.search)
  const session = params.get("session")
  const code = params.get("code")
  const aud = params.get("aud")
  if (!session || !code || !aud) return null
  return { session, code, aud }
}
