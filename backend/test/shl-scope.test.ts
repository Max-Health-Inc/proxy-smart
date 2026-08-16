// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * SHL Scope Enforcement — unit tests for the pure access-control decisions.
 *
 * SECURITY-CRITICAL. Proves that a study-scoped SHL exposes ONLY the shared
 * study (DICOMweb) and ONLY that ImagingStudy + Patient (FHIR), default-deny
 * on everything else, while whole-patient shares (no studyInstanceUID) pass
 * through unchanged.
 */
import { describe, expect, it } from 'bun:test'
import {
  isDicomPathAllowed,
  scopeFhirRequest,
  isCompleteShare,
  isSelectiveScopeActive,
  shareQueryHints,
  preScreenSelectiveRequest,
  applySelectiveFilter,
  isResourceExcluded,
  emptySearchBundle,
  type SelectiveScope,
} from '../src/lib/shl-scope'

const STUDY = '1.2.840.113619.2.55.3.604688119.971.1600000000.100'
const OTHER_STUDY = '9.9.999.999999.9.99.9.999999999.999.9999999999.999'
const PATIENT = 'patient-abc'

// ── DICOMweb ────────────────────────────────────────────────────────────────

describe('isDicomPathAllowed — no study scope (whole-patient share)', () => {
  it('passes through any path unchanged when studyInstanceUID is undefined', () => {
    expect(isDicomPathAllowed('studies', '', undefined)).toEqual({ allowed: true })
    expect(isDicomPathAllowed(`studies/${OTHER_STUDY}/series`, '', undefined)).toEqual({ allowed: true })
    expect(isDicomPathAllowed('anything/at/all', '?foo=bar', undefined)).toEqual({ allowed: true })
  })
})

describe('isDicomPathAllowed — study-scoped (WADO retrieve)', () => {
  it('allows the target study', () => {
    expect(isDicomPathAllowed(`studies/${STUDY}`, '', STUDY)).toEqual({ allowed: true })
    expect(isDicomPathAllowed(`studies/${STUDY}/series/1.2/instances/3.4`, '', STUDY))
      .toEqual({ allowed: true })
  })

  it('denies a different study (403)', () => {
    expect(isDicomPathAllowed(`studies/${OTHER_STUDY}`, '', STUDY)).toEqual({ allowed: false })
    expect(isDicomPathAllowed(`studies/${OTHER_STUDY}/series/1.2`, '', STUDY))
      .toEqual({ allowed: false })
  })
})

describe('isDicomPathAllowed — study-scoped (QIDO study list)', () => {
  it('injects StudyInstanceUID when absent', () => {
    const d = isDicomPathAllowed('studies', '', STUDY)
    expect(d.allowed).toBe(true)
    expect(d.rewrittenSearch).toBe(`?StudyInstanceUID=${STUDY}`)
  })

  it('injects StudyInstanceUID while preserving other query params', () => {
    const d = isDicomPathAllowed('studies', '?includefield=all&limit=10', STUDY)
    expect(d.allowed).toBe(true)
    const params = new URLSearchParams(d.rewrittenSearch!.slice(1))
    expect(params.get('StudyInstanceUID')).toBe(STUDY)
    expect(params.get('includefield')).toBe('all')
    expect(params.get('limit')).toBe('10')
  })

  it('allows a matching StudyInstanceUID filter without rewrite', () => {
    const d = isDicomPathAllowed('studies', `?StudyInstanceUID=${STUDY}`, STUDY)
    expect(d).toEqual({ allowed: true })
  })

  it('denies a conflicting StudyInstanceUID filter (403)', () => {
    expect(isDicomPathAllowed('studies', `?StudyInstanceUID=${OTHER_STUDY}`, STUDY))
      .toEqual({ allowed: false })
  })
})

describe('isDicomPathAllowed — study-scoped default-deny', () => {
  it('denies root-level series/instances and unknown paths', () => {
    expect(isDicomPathAllowed('series', '', STUDY)).toEqual({ allowed: false })
    expect(isDicomPathAllowed('instances', '', STUDY)).toEqual({ allowed: false })
    expect(isDicomPathAllowed('', '', STUDY)).toEqual({ allowed: false })
    expect(isDicomPathAllowed('patients', '', STUDY)).toEqual({ allowed: false })
  })
})

// ── FHIR ────────────────────────────────────────────────────────────────────

describe('scopeFhirRequest — no study scope (whole-patient share)', () => {
  it('passes through unchanged when studyInstanceUID is undefined', () => {
    expect(scopeFhirRequest('Observation', '', { patientId: PATIENT })).toEqual({ allowed: true })
    expect(scopeFhirRequest('ImagingStudy/anything', '', { patientId: PATIENT }))
      .toEqual({ allowed: true })
  })
})

describe('scopeFhirRequest — study-scoped whitelist', () => {
  const opts = { patientId: PATIENT, studyInstanceUID: STUDY }

  it('allows the capability statement (metadata)', () => {
    expect(scopeFhirRequest('metadata', '', opts)).toEqual({ allowed: true })
  })

  it('allows reading the session Patient', () => {
    expect(scopeFhirRequest(`Patient/${PATIENT}`, '', opts)).toEqual({ allowed: true })
  })

  it('denies reading a different Patient (403)', () => {
    expect(scopeFhirRequest('Patient/someone-else', '', opts)).toEqual({ allowed: false })
  })

  it('denies a bare Patient search (403)', () => {
    expect(scopeFhirRequest('Patient', '', opts)).toEqual({ allowed: false })
  })

  it('injects identifier on ImagingStudy search when absent', () => {
    const d = scopeFhirRequest('ImagingStudy', '', opts)
    expect(d.allowed).toBe(true)
    expect(d.rewrittenSearch).toBe(`?identifier=urn%3Aoid%3A${STUDY}`)
    // Decoded round-trip must be the exact urn:oid identifier.
    const params = new URLSearchParams(d.rewrittenSearch!.slice(1))
    expect(params.get('identifier')).toBe(`urn:oid:${STUDY}`)
  })

  it('injects identifier while preserving other query params', () => {
    const d = scopeFhirRequest('ImagingStudy', '?_include=ImagingStudy:patient', opts)
    expect(d.allowed).toBe(true)
    const params = new URLSearchParams(d.rewrittenSearch!.slice(1))
    expect(params.get('identifier')).toBe(`urn:oid:${STUDY}`)
    expect(params.get('_include')).toBe('ImagingStudy:patient')
  })

  it('allows a matching identifier filter without rewrite', () => {
    const d = scopeFhirRequest('ImagingStudy', `?identifier=urn:oid:${STUDY}`, opts)
    expect(d).toEqual({ allowed: true })
  })

  it('denies a conflicting identifier filter (403)', () => {
    expect(scopeFhirRequest('ImagingStudy', `?identifier=urn:oid:${OTHER_STUDY}`, opts))
      .toEqual({ allowed: false })
  })

  it('denies a direct ImagingStudy/{id} read (403)', () => {
    expect(scopeFhirRequest('ImagingStudy/some-fhir-id', '', opts)).toEqual({ allowed: false })
  })

  it('denies other resource types (403)', () => {
    expect(scopeFhirRequest('Observation', '', opts)).toEqual({ allowed: false })
    expect(scopeFhirRequest('DiagnosticReport', '?patient=' + PATIENT, opts))
      .toEqual({ allowed: false })
    expect(scopeFhirRequest('Binary/abc', '', opts)).toEqual({ allowed: false })
  })

  it('denies the base/pagination route (403)', () => {
    expect(scopeFhirRequest('', '?_getpages=xyz', opts)).toEqual({ allowed: false })
  })
})

// ── Selective sharing (record / category de-selection) ────────────────────────

const emptyScope: SelectiveScope = { excludedTypes: [], excludedIds: [], excludedObservationCategories: [] }
function scope(partial: Partial<SelectiveScope>): SelectiveScope {
  return { ...emptyScope, ...partial }
}

describe('isSelectiveScopeActive', () => {
  it('is false for an all-empty scope (share everything)', () => {
    expect(isSelectiveScopeActive(emptyScope)).toBe(false)
  })
  it('is true when any list is non-empty', () => {
    expect(isSelectiveScopeActive(scope({ excludedTypes: ['Condition'] }))).toBe(true)
    expect(isSelectiveScopeActive(scope({ excludedIds: ['Observation/1'] }))).toBe(true)
    expect(isSelectiveScopeActive(scope({ excludedObservationCategories: ['vital-signs'] }))).toBe(true)
  })
})

describe('preScreenSelectiveRequest', () => {
  it('passes through metadata and pagination', () => {
    const s = scope({ excludedTypes: ['Condition'] })
    expect(preScreenSelectiveRequest('metadata', '', s)).toEqual({ action: 'passthrough' })
    expect(preScreenSelectiveRequest('', '?_getpages=x', s)).toEqual({ action: 'passthrough' })
  })

  it('empties a search for an excluded type, denies a read of it', () => {
    const s = scope({ excludedTypes: ['Condition'] })
    expect(preScreenSelectiveRequest('Condition', '?patient=Patient/1', s)).toEqual({ action: 'empty-bundle' })
    expect(preScreenSelectiveRequest('Condition/abc', '', s)).toEqual({ action: 'deny' })
  })

  it('passes through kept types', () => {
    const s = scope({ excludedTypes: ['Condition'] })
    expect(preScreenSelectiveRequest('AllergyIntolerance', '?patient=Patient/1', s)).toEqual({ action: 'passthrough' })
  })

  it('denies a read of an individually excluded record but not its siblings', () => {
    const s = scope({ excludedIds: ['MedicationStatement/42'] })
    expect(preScreenSelectiveRequest('MedicationStatement/42', '', s)).toEqual({ action: 'deny' })
    expect(preScreenSelectiveRequest('MedicationStatement/43', '', s)).toEqual({ action: 'passthrough' })
    // The list search is passed through; individual exclusions are post-filtered.
    expect(preScreenSelectiveRequest('MedicationStatement', '?patient=Patient/1', s)).toEqual({ action: 'passthrough' })
  })

  it('empties an Observation search filtered solely to excluded categories', () => {
    const s = scope({ excludedObservationCategories: ['vital-signs'] })
    expect(preScreenSelectiveRequest('Observation', '?patient=Patient/1&category=vital-signs', s))
      .toEqual({ action: 'empty-bundle' })
  })

  it('passes through an Observation search that includes a kept category', () => {
    const s = scope({ excludedObservationCategories: ['vital-signs'] })
    // Mixed / kept category → passthrough, post-filter handles any excluded entries.
    expect(preScreenSelectiveRequest('Observation', '?patient=Patient/1&category=laboratory', s))
      .toEqual({ action: 'passthrough' })
    expect(preScreenSelectiveRequest('Observation', '?patient=Patient/1', s))
      .toEqual({ action: 'passthrough' })
  })
})

describe('isResourceExcluded', () => {
  it('excludes by type, id, and Observation category', () => {
    expect(isResourceExcluded({ resourceType: 'Condition', id: '1' }, scope({ excludedTypes: ['Condition'] }))).toBe(true)
    expect(isResourceExcluded({ resourceType: 'Condition', id: '1' }, scope({ excludedIds: ['Condition/1'] }))).toBe(true)
    expect(isResourceExcluded(
      { resourceType: 'Observation', id: '9', category: [{ coding: [{ code: 'vital-signs' }] }] },
      scope({ excludedObservationCategories: ['vital-signs'] }),
    )).toBe(true)
  })

  it('keeps resources outside the scope', () => {
    expect(isResourceExcluded({ resourceType: 'AllergyIntolerance', id: '1' }, scope({ excludedTypes: ['Condition'] }))).toBe(false)
    expect(isResourceExcluded(
      { resourceType: 'Observation', id: '9', category: [{ coding: [{ code: 'laboratory' }] }] },
      scope({ excludedObservationCategories: ['vital-signs'] }),
    )).toBe(false)
  })
})

describe('applySelectiveFilter', () => {
  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 3,
    entry: [
      { resource: { resourceType: 'Condition', id: '1' } },
      { resource: { resourceType: 'Condition', id: '2' } },
      { resource: { resourceType: 'AllergyIntolerance', id: '3' } },
    ],
  }

  it('is a no-op for an inactive scope', () => {
    const result = applySelectiveFilter(bundle, emptyScope)
    expect(result).toEqual({ body: bundle, denied: false })
  })

  it('drops excluded entries from a search Bundle and removes total', () => {
    const result = applySelectiveFilter(bundle, scope({ excludedIds: ['Condition/2'] }))
    const body = result.body as { entry: unknown[]; total?: number }
    expect(result.denied).toBe(false)
    expect(body.entry).toHaveLength(2)
    expect(body.total).toBeUndefined()
  })

  it('drops a whole excluded type from a Bundle', () => {
    const result = applySelectiveFilter(bundle, scope({ excludedTypes: ['Condition'] }))
    const body = result.body as { entry: Array<{ resource: { resourceType: string } }> }
    expect(body.entry).toHaveLength(1)
    expect(body.entry[0].resource.resourceType).toBe('AllergyIntolerance')
  })

  it('flags a single excluded resource read as denied (→ 404)', () => {
    const result = applySelectiveFilter({ resourceType: 'Condition', id: '1' }, scope({ excludedTypes: ['Condition'] }))
    expect(result.denied).toBe(true)
  })

  it('passes a kept single resource through unchanged', () => {
    const resource = { resourceType: 'AllergyIntolerance', id: '3' }
    expect(applySelectiveFilter(resource, scope({ excludedTypes: ['Condition'] }))).toEqual({ body: resource, denied: false })
  })

  it('leaves an OperationOutcome untouched', () => {
    const oo = { resourceType: 'OperationOutcome', issue: [] }
    expect(applySelectiveFilter(oo, scope({ excludedTypes: ['Condition'] }))).toEqual({ body: oo, denied: false })
  })
})

describe('emptySearchBundle', () => {
  it('is a valid empty searchset', () => {
    expect(emptySearchBundle()).toEqual({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] })
  })
})

const scopeOf = (partial: Partial<SelectiveScope>): SelectiveScope => ({
  excludedTypes: [],
  excludedIds: [],
  excludedObservationCategories: [],
  ...partial,
})

/**
 * The spec's answer to what `complete` was invented for: a scoped link saying what
 * it IS rather than what it is not. The hint has to match the identifier filter
 * isFhirPathAllowed forces, or the recipient is told to run a query the proxy denies.
 */
describe('shareQueryHints — telling the recipient what the share covers', () => {
  it('points a study-scoped share at exactly that study', () => {
    expect(shareQueryHints({ studyInstanceUID: STUDY })).toEqual([
      `ImagingStudy?identifier=urn:oid:${STUDY}`,
    ])
  })

  it('agrees with the identifier the FHIR proxy forces', () => {
    const [hint] = shareQueryHints({ studyInstanceUID: STUDY }) ?? []
    const [path, search] = hint.split('?')
    const decision = scopeFhirRequest(path, `?${search}`, {
      patientId: PATIENT,
      studyInstanceUID: STUDY,
    })
    expect(decision.allowed).toBe(true)
    // Already filtered, so the proxy has nothing to rewrite.
    expect(decision.rewrittenSearch).toBeUndefined()
  })

  /** Naming the reachable types would name the withheld ones by omission. */
  it('offers no hints for a whole-patient share', () => {
    expect(shareQueryHints({})).toBeUndefined()
    expect(shareQueryHints({ studyInstanceUID: undefined })).toBeUndefined()
  })
})

describe('isCompleteShare — deprecated, kept until both viewers move off it', () => {
  it('is complete when nothing narrows the share', () => {
    expect(isCompleteShare({})).toBe(true)
    expect(isCompleteShare({ selectiveScope: undefined, studyInstanceUID: undefined })).toBe(true)
  })

  it('is NOT complete when the patient de-selected records', () => {
    expect(isCompleteShare({ selectiveScope: scopeOf({ excludedTypes: ['Condition'] }) })).toBe(false)
  })

  /**
   * The regression: a study-scoped link reported `complete: true`, so the viewer
   * showed "the patient shared their full health record" over a record whose every
   * other query the proxy answers with 403.
   */
  it('is NOT complete when the share is scoped to a single imaging study', () => {
    expect(isCompleteShare({ studyInstanceUID: STUDY })).toBe(false)
  })

  it('is NOT complete when both narrowings apply', () => {
    expect(
      isCompleteShare({ selectiveScope: scopeOf({ excludedTypes: ['Condition'] }), studyInstanceUID: STUDY }),
    ).toBe(false)
  })

  /**
   * Truthiness on the object read a present-but-empty scope as narrowing. The mint
   * site normalises that to undefined, so it never fired — but the invariant lived
   * at the call site rather than here, where the question is asked.
   */
  it('is complete when a scope is present but excludes nothing', () => {
    expect(isCompleteShare({ selectiveScope: scopeOf({}) })).toBe(true)
  })
})
