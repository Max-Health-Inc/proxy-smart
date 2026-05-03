/** Parse and validate session/code URL parameters for the patient picker. */
export function getPickerParams(): { session: string; code: string } | null {
  const params = new URLSearchParams(window.location.search)
  const session = params.get("session")
  const code = params.get("code")
  if (!session || !code) return null
  return { session, code }
}
