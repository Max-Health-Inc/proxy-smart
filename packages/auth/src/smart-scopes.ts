/**
 * @proxy-smart/auth — SMART Scopes Utilities
 *
 * Pure functions for detecting and gating SMART on FHIR scopes.
 * No side effects, no dependencies.
 */

/** SMART launch scopes that trigger callback interception */
const LAUNCH_SCOPES = new Set(['launch', 'launch/patient', 'launch/encounter'])

/** Parse a space-separated scope string into a Set */
export function parseScopes(scope: string | undefined | null): Set<string> {
  return new Set((scope || '').split(' ').filter(Boolean))
}

/** Detect whether the requested scopes indicate a SMART launch flow */
export function isSmartLaunch(scopes: Set<string>): boolean {
  for (const s of LAUNCH_SCOPES) {
    if (scopes.has(s)) return true
  }
  return false
}

/** Detect standalone launch (launch/patient without an EHR launch code) */
export function isStandaloneLaunch(scopes: Set<string>, hasLaunchCode: boolean): boolean {
  return scopes.has('launch/patient') && !hasLaunchCode
}

/** Check if the granted scopes allow returning patient context */
export function canReturnPatient(grantedScopes: Set<string>): boolean {
  return grantedScopes.has('launch/patient') || grantedScopes.has('launch')
}

/** Check if the granted scopes allow returning encounter context */
export function canReturnEncounter(grantedScopes: Set<string>): boolean {
  return grantedScopes.has('launch/encounter') || grantedScopes.has('launch')
}

/** Check if the granted scopes allow returning fhirUser */
export function canReturnFhirUser(grantedScopes: Set<string>): boolean {
  return grantedScopes.has('fhirUser') || grantedScopes.has('openid')
}
