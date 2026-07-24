/**
 * SHL → Consent mirror: the built resource must conform to the
 * MaxHealthShareConsent profile so active SHLs surface correctly in the
 * consent portal.
 */
import { describe, it, expect } from 'bun:test'
import { validateMaxHealthShareConsent } from 'maxhealth.consent-0.1.0-generated'
import { buildShareConsent, SHL_CONSENT_IDENTIFIER_SYSTEM } from '../src/lib/consent/shl-consent'
import type { ShlSession } from '../src/lib/shl-session-store'

function makeSession(overrides: Partial<ShlSession> = {}): ShlSession {
  return {
    shl: { url: 'https://example.test/shl', key: 'k', label: 'Dr. Smith' },
    jwe: 'jwe',
    sessionToken: 'tok',
    patientId: 'patient-123',
    fhirServerUrl: 'https://fhir.test/fhir',
    expiresAt: Date.now() + 60 * 60 * 1000,
    verifiedOnly: false,
    accessCount: 0,
    ...overrides,
  }
}

describe('buildShareConsent', () => {
  it('produces a profile-valid, active, permit Consent tied to the SHL id', async () => {
    const consent = buildShareConsent('shl-abc', makeSession())

    expect(consent.resourceType).toBe('Consent')
    expect(consent.status).toBe('active')
    expect(consent.provision?.type).toBe('permit')
    expect(consent.identifier?.[0]).toEqual({ system: SHL_CONSENT_IDENTIFIER_SYSTEM, value: 'shl-abc' })
    expect(consent.patient?.reference).toBe('Patient/patient-123')
    expect(consent.provision?.period?.end).toBeString()

    const { errors } = await validateMaxHealthShareConsent(consent)
    expect(errors).toEqual([])
  })

  it('maps period.end to the SHL expiry', () => {
    const expiresAt = Date.parse('2030-01-01T00:00:00.000Z')
    const consent = buildShareConsent('shl-x', makeSession({ expiresAt }))
    expect(consent.provision?.period?.end).toBe(new Date(expiresAt).toISOString())
  })

  it('scopes provision.class to ImagingStudy for a study-scoped share', () => {
    const consent = buildShareConsent('shl-study', makeSession({ studyInstanceUID: '1.2.3' }))
    const codes = consent.provision?.class?.map((c) => c.code)
    expect(codes).toEqual(['ImagingStudy'])
  })

  it('omits de-selected resource types from provision.class', () => {
    const consent = buildShareConsent(
      'shl-scoped',
      makeSession({ shareScope: { excludedTypes: ['Condition'], excludedIds: [], excludedObservationCategories: [] } }),
    )
    const codes = consent.provision?.class?.map((c) => c.code) ?? []
    expect(codes).not.toContain('Condition')
    expect(codes).toContain('Observation')
  })
})
