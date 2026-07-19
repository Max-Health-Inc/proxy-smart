/**
 * SHL Scope Enforcement — unit tests for the pure access-control decisions.
 *
 * SECURITY-CRITICAL. Proves that a study-scoped SHL exposes ONLY the shared
 * study (DICOMweb) and ONLY that ImagingStudy + Patient (FHIR), default-deny
 * on everything else, while whole-patient shares (no studyInstanceUID) pass
 * through unchanged.
 */
import { describe, expect, it } from 'bun:test'
import { isDicomPathAllowed, scopeFhirRequest } from '../src/lib/shl-scope'

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
