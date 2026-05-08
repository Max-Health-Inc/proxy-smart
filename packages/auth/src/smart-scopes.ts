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

/** SMART v2 Scope regex for permission delegation (e.g. user/Patient.read) */
export const SMART_V2_SCOPE_RE = /^(user|patient|system)\/([\w*]+)\.(r|s|rs|read|write|crud|cruds|cud)$/

/**
 * Check if a specific requested scope is granted via a wildcard scope.
 * Implements SMART v2 scope delegation (e.g. user/Patient.read matches user/*.read)
 */
export function isScopeGranted(requested: string, granted: Set<string>): boolean {
  if (granted.has(requested)) return true

  const match = requested.match(SMART_V2_SCOPE_RE)
  if (!match) return false

  const [, compartment, resourceType, ops] = match

  // 1. Check for resource-type wildcard: user/*.read
  if (granted.has(`${compartment}/*.${ops}`)) return true

  // 2. Check for "all ops" wildcard: user/Patient.* or user/*.*
  if (granted.has(`${compartment}/${resourceType}.*`)) return true
  if (granted.has(`${compartment}/*.*`)) return true

  // 3. Handle common ops aliases (e.g. .rs includes .read)
  if (ops === 'read' || ops === 'r') {
    if (granted.has(`${compartment}/*.rs`) || granted.has(`${compartment}/*.crud`)) return true
  }

  return false
}

/**
 * Filter scopes, ensuring that for SMART v2 scopes, only those that are granted
 * (either directly or via wildcards) are allowed.
 */
export function filterScopes(requested: string | undefined, granted: string | undefined): string {
  if (!requested) return granted || ''
  const requestedSet = parseScopes(requested)
  const grantedSet = parseScopes(granted)
  const finalScopes: string[] = []

  for (const s of requestedSet) {
    if (isScopeGranted(s, grantedSet)) {
      finalScopes.push(s)
    }
  }

  // Preserve non-SMART-v2 scopes if they were granted
  for (const s of grantedSet) {
    // If it was already added because it was requested and matched, skip
    if (requestedSet.has(s)) continue
    
    // If it's a non-v2 scope (like openid, fhirUser, launch), preserve it
    if (!SMART_V2_SCOPE_RE.test(s)) {
      finalScopes.push(s)
    }
  }

  return finalScopes.join(' ')
}
