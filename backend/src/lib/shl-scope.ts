// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

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

// ── Selective sharing (record / category de-selection) ────────────────────────
//
// Applies ONLY to whole-patient shares (no studyInstanceUID). The patient starts
// with everything selected and may hide whole categories (→ resource types and/or
// Observation category codes) and individual records (→ `Type/id`). Absent scope
// (or an all-empty one) means "share everything" and these helpers become no-ops,
// preserving the legacy behavior byte-for-byte.
//
// This is about WHAT the patient chose to share, not verification: an unverified
// record the patient selects is shared like any other. Verification is a display
// signal for the recipient ("verified by …"), never an access filter here.
//
// Enforcement is two-phase:
//   1. preScreenSelectiveRequest — decide BEFORE hitting upstream (deny a read of
//      a hidden resource; short-circuit a hidden-type/category search to an empty
//      Bundle so no data is fetched at all).
//   2. applySelectiveFilter — post-filter the upstream payload (drop hidden
//      entries from search Bundles; 404 a single hidden read) as defense-in-depth
//      and to cover searches that mix kept + hidden items.

/** A whole-patient share's selective scope. */
export interface SelectiveScope {
  /** FHIR resource types fully hidden. */
  excludedTypes: readonly string[]
  /** Individually hidden resources, as `ResourceType/id`. */
  excludedIds: readonly string[]
  /** Observation `category` codes fully hidden (e.g. `vital-signs`, `laboratory`). */
  excludedObservationCategories: readonly string[]
}

/** What the proxy should do with a request before contacting upstream. */
export type SelectivePreAction =
  | { action: 'passthrough' }
  | { action: 'deny' }
  | { action: 'empty-bundle' }

/** Minimal shape of a FHIR resource this module inspects. */
interface FhirResourceLike {
  resourceType?: string
  id?: string
  category?: Array<{ coding?: Array<{ code?: string }> }>
  [key: string]: unknown
}

/** Minimal shape of a FHIR Bundle this module filters. */
interface FhirBundleLike {
  resourceType?: string
  total?: number
  entry?: Array<{ resource?: FhirResourceLike; [key: string]: unknown }>
  [key: string]: unknown
}

/**
 * True only when NOTHING narrows the share.
 *
 * The recipient is told "complete summary — the patient shared their full health
 * record" on the strength of this, so every dimension that narrows a share has to
 * be counted here. It lives beside the scope rules rather than inline at the mint
 * site because that is how it drifted: it knew about selective de-selection and
 * not about study scoping, so a single-study link claimed to carry everything
 * while the proxy answered almost every query with 403 — which the viewer drew as
 * "no allergies, no medications, no conditions".
 */
export function isCompleteShare(narrowing: {
  selectiveScope?: unknown
  studyInstanceUID?: string
}): boolean {
  return !narrowing.selectiveScope && !narrowing.studyInstanceUID
}

/** True when the scope actually narrows anything (else all helpers are no-ops). */
export function isSelectiveScopeActive(scope: SelectiveScope): boolean {
  return (
    scope.excludedTypes.length > 0 ||
    scope.excludedIds.length > 0 ||
    scope.excludedObservationCategories.length > 0
  )
}

/** Collect the Observation `category` codes present on a resource. */
function observationCategoryCodes(resource: FhirResourceLike): string[] {
  if (!Array.isArray(resource.category)) return []
  const codes: string[] = []
  for (const concept of resource.category) {
    for (const coding of concept?.coding ?? []) {
      if (coding?.code) codes.push(coding.code)
    }
  }
  return codes
}

/** The `category` codes requested in a search query (comma-separated, repeatable). */
function requestedObservationCategories(search: string): string[] {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return params
    .getAll('category')
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

/** Whether a single resource is hidden by the scope (type, id, or Observation category). */
export function isResourceExcluded(resource: FhirResourceLike, scope: SelectiveScope): boolean {
  const { resourceType, id } = resource
  if (resourceType && scope.excludedTypes.includes(resourceType)) return true
  if (resourceType && id && scope.excludedIds.includes(`${resourceType}/${id}`)) return true
  if (resourceType === 'Observation' && scope.excludedObservationCategories.length > 0) {
    const codes = observationCategoryCodes(resource)
    if (codes.some((c) => scope.excludedObservationCategories.includes(c))) return true
  }
  return false
}

/**
 * Decide what to do with an SHL FHIR request under a selective scope, BEFORE
 * calling upstream. Reads of hidden resources are denied; searches whose entire
 * result set is hidden (excluded type, or an Observation search filtered solely
 * to excluded categories) are short-circuited to an empty Bundle. Everything else
 * passes through and is post-filtered by {@link applySelectiveFilter}.
 *
 * @param fhirPath path after `/fhir/` (e.g. `Condition` or `Observation/123`)
 * @param search   incoming query string (with or without leading `?`)
 */
export function preScreenSelectiveRequest(
  fhirPath: string,
  search: string,
  scope: SelectiveScope,
): SelectivePreAction {
  const segments = pathSegments(fhirPath)
  // Base/pagination (`_getpages`) and capability statement: fetch, then post-filter.
  if (segments.length === 0 || segments[0] === 'metadata') return { action: 'passthrough' }

  const type = segments[0]
  const isRead = segments.length >= 2 // `Type/id` (or deeper, e.g. _history)

  // Whole-type exclusion.
  if (scope.excludedTypes.includes(type)) {
    return isRead ? { action: 'deny' } : { action: 'empty-bundle' }
  }

  // Individual resource exclusion on a direct read.
  if (isRead && scope.excludedIds.includes(`${type}/${segments[1]}`)) {
    return { action: 'deny' }
  }

  // Observation search filtered solely to excluded categories → empty result.
  if (type === 'Observation' && !isRead && scope.excludedObservationCategories.length > 0) {
    const requested = requestedObservationCategories(search)
    if (requested.length > 0 && requested.every((c) => scope.excludedObservationCategories.includes(c))) {
      return { action: 'empty-bundle' }
    }
  }

  return { action: 'passthrough' }
}

/** A spec-valid empty searchset Bundle, returned for fully-hidden searches. */
export function emptySearchBundle(): FhirBundleLike {
  return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] }
}

/** Result of post-filtering an upstream payload. */
export interface SelectiveFilterResult {
  /** The payload to return to the recipient (possibly with entries removed). */
  body: unknown
  /** When true, the whole payload is hidden — the caller must respond 404. */
  denied: boolean
}

/**
 * Post-filter an upstream FHIR JSON payload under a selective scope.
 *
 * - searchset/collection Bundle → drop hidden entries; `total` is
 *   removed so link-based pagination stays consistent.
 * - single resource → `denied: true` when the resource itself is hidden (caller
 *   returns 404); otherwise returned unchanged.
 * - anything else (OperationOutcome, etc.) → returned unchanged.
 */
export function applySelectiveFilter(payload: unknown, scope: SelectiveScope): SelectiveFilterResult {
  if (!isSelectiveScopeActive(scope) || payload === null || typeof payload !== 'object') {
    return { body: payload, denied: false }
  }

  const resource = payload as FhirBundleLike & FhirResourceLike

  if (resource.resourceType === 'Bundle' && Array.isArray(resource.entry)) {
    const kept = resource.entry.filter((e) => !e.resource || !isResourceExcluded(e.resource, scope))
    if (kept.length === resource.entry.length) return { body: resource, denied: false }
    const { total: _drop, ...rest } = resource
    return { body: { ...rest, entry: kept }, denied: false }
  }

  if (typeof resource.resourceType === 'string') {
    return { body: resource, denied: isResourceExcluded(resource, scope) }
  }

  return { body: payload, denied: false }
}
