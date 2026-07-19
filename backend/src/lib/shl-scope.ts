/**
 * SHL Scope Enforcement — pure, testable access-control decisions
 *
 * SECURITY-CRITICAL. These functions decide whether a request coming through an
 * SHL proxy is inside the share's scope. They are DEFAULT-DENY: when a session
 * is study-scoped, anything not explicitly whitelisted is rejected.
 *
 * Two modes:
 *  - No `studyInstanceUID` on the session  → whole-patient share (unchanged
 *    legacy behavior; these helpers return `{ allowed: true }` and the caller
 *    keeps its existing patient-scope checks).
 *  - `studyInstanceUID` set                → single-study share. DICOMweb exposes
 *    ONLY that study; FHIR exposes ONLY that ImagingStudy (identifier-filtered)
 *    plus the session Patient and the capability statement.
 *
 * Kept free of I/O so the decisions are unit-testable and reviewable in isolation.
 */

/** Result of a scope decision. `rewrittenSearch` (when present) MUST be used as the upstream query string. */
export interface ScopeDecision {
  allowed: boolean
  /** Replacement query string (includes leading `?`, or `''` for none). Present only when the caller must override the incoming query to enforce scope. */
  rewrittenSearch?: string
}

/** Normalize a proxy sub-path into clean, non-empty segments (strips leading/trailing slashes). */
function pathSegments(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0)
}

/** Serialize URLSearchParams back into a query string with a leading `?` (or `''` when empty). */
function toSearch(params: URLSearchParams): string {
  const s = params.toString()
  return s ? `?${s}` : ''
}

/**
 * Decide whether a DICOMweb request (path after `/shl/dicomweb/`) is inside the study scope.
 *
 * @param pathAfterDicomweb path segment(s) after the `/dicomweb/` prefix, e.g. `studies/1.2.3/series/...`
 * @param search            the incoming query string (with or without leading `?`)
 * @param studyInstanceUID  the session's study scope, or undefined for whole-patient shares
 */
export function isDicomPathAllowed(
  pathAfterDicomweb: string,
  search: string,
  studyInstanceUID?: string,
): ScopeDecision {
  // Whole-patient share: unchanged passthrough.
  if (!studyInstanceUID) return { allowed: true }

  const segments = pathSegments(pathAfterDicomweb)

  // WADO-RS / retrieve-style paths: studies/{uid}/...
  // Allowed ONLY when the study UID in the path matches the shared study.
  if (segments[0] === 'studies' && segments.length >= 2) {
    return segments[1] === studyInstanceUID ? { allowed: true } : { allowed: false }
  }

  // QIDO-RS study list: exactly `studies` (optionally with a query).
  // Force the result set down to the single shared study.
  if (segments.length === 1 && segments[0] === 'studies') {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const existing = params.get('StudyInstanceUID')
    if (existing !== null && existing !== studyInstanceUID) {
      // Caller is asking for a different study — deny outright.
      return { allowed: false }
    }
    if (existing === null) {
      params.set('StudyInstanceUID', studyInstanceUID)
      return { allowed: true, rewrittenSearch: toSearch(params) }
    }
    // Already correctly filtered.
    return { allowed: true }
  }

  // Anything else (series/instances at root, metadata roots, etc.) → default-deny.
  return { allowed: false }
}

/**
 * Decide whether a FHIR request (path after `/shl/fhir/`) is inside scope.
 *
 * When `studyInstanceUID` is undefined this returns `{ allowed: true }` and the
 * caller retains its legacy patient-scope logic. When set, only a strict
 * whitelist is permitted (default-deny).
 *
 * @param fhirPath path segment(s) after the `/fhir/` prefix, e.g. `Patient/123` or `ImagingStudy`
 * @param search   the incoming query string (with or without leading `?`)
 * @param opts     patientId (session patient) and studyInstanceUID (study scope)
 */
export function scopeFhirRequest(
  fhirPath: string,
  search: string,
  opts: { patientId: string; studyInstanceUID?: string },
): ScopeDecision {
  const { patientId, studyInstanceUID } = opts

  // Whole-patient share: unchanged — caller keeps its existing patient checks.
  if (!studyInstanceUID) return { allowed: true }

  const segments = pathSegments(fhirPath)

  // Capability statement — safe metadata, needed by viewers.
  if (segments.length === 1 && segments[0] === 'metadata') {
    return { allowed: true }
  }

  // The session Patient (and ONLY that patient) may be read directly.
  if (segments[0] === 'Patient') {
    if (segments.length === 2 && segments[1] === patientId) {
      return { allowed: true }
    }
    return { allowed: false }
  }

  // ImagingStudy: allow SEARCH only, forced to the shared study's identifier.
  if (segments[0] === 'ImagingStudy') {
    // Direct read `ImagingStudy/{id}` — cannot verify the id maps to the study
    // UID without an upstream lookup, so force the viewer to use search. Deny.
    if (segments.length >= 2) {
      return { allowed: false }
    }

    // Search: `ImagingStudy` (with or without a query). Force the identifier filter.
    const wanted = `urn:oid:${studyInstanceUID}`
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const existing = params.get('identifier')
    if (existing !== null && existing !== wanted) {
      // Conflicting identifier filter — deny.
      return { allowed: false }
    }
    if (existing === null) {
      params.set('identifier', wanted)
      return { allowed: true, rewrittenSearch: toSearch(params) }
    }
    return { allowed: true }
  }

  // Everything else (other resource types, other patients, base/pagination) → default-deny.
  return { allowed: false }
}
