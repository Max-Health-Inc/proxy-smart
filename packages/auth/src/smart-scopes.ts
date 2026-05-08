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

/** SMART v2 Scope regex for permission delegation (e.g. user/Patient.read)
 *  Ops group accepts: any 1-5 char subset of [cruds] (v2), or v1 "read"/"write".
 */
export const SMART_V2_SCOPE_RE = /^(user|patient|system)\/([\w*]+)\.([cruds]{1,5}|read|write)$/

/**
 * Expand granular SMART v2 scopes to their wildcard equivalents for forwarding to the IdP.
 * e.g. "user/Patient.read" → "user/*.read", "user/ImagingStudy.rs" → "user/*.rs"
 *
 * The IdP only has wildcards registered. We send wildcards upstream so it doesn't reject
 * the request, then restore the specific scopes in the token response.
 *
 * Non-SMART-v2 scopes (openid, fhirUser, launch, etc.) are passed through unchanged.
 */
export function expandScopesToWildcards(scope: string | undefined): string {
  if (!scope) return ''
  return parseScopes(scope)
    .values()
    .map(s => {
      const match = s.match(SMART_V2_SCOPE_RE)
      if (!match) return s
      const [, compartment, , ops] = match
      return `${compartment}/*.${ops}`
    })
    .toArray()
    // Deduplicate — multiple granular scopes may collapse to the same wildcard
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .join(' ')
}

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

  // 3. v1/v2 ops aliases — "upward" matching from specific to broader grants

  // v1 *.read covers all v2 read-type ops: .r, .s, .rs
  if (ops === 'r' || ops === 's' || ops === 'rs' || ops === 'read') {
    if (granted.has(`${compartment}/*.read`)) return true
  }

  // v2 *.rs covers individual read ops: .r, .s
  if (ops === 'r' || ops === 's') {
    if (granted.has(`${compartment}/*.rs`)) return true
  }

  // v2 *.crud/cruds cover .r (read is the 'r' in cruds)
  if (ops === 'r' || ops === 'read') {
    if (granted.has(`${compartment}/*.crud`) || granted.has(`${compartment}/*.cruds`)) return true
  }

  // v1 *.write covers all v2 write ops: any subset of [cud]
  if (/^[cud]+$/.test(ops) || ops === 'write') {
    if (granted.has(`${compartment}/*.write`)) return true
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
