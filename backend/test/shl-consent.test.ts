/**
 * SHL → Consent mirror: the built resource must conform to the
 * MaxHealthShareConsent profile so active SHLs surface correctly in the
 * consent portal.
 */
import { describe, it, expect } from 'bun:test'
import { validateMaxHealthShareConsent } from 'maxhealth.consent-0.1.0-generated'
import { buildShareConsent, SHL_CONSENT_IDENTIFIER_SYSTEM, SHL_CONSENT_CATEGORY_CODE } from '../src/lib/consent/shl-consent'
import { buildShlAccessAuditEvent } from '../src/lib/consent/shl-audit'
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

  it('omits provision.class for a whole-patient share (no fabricated type list)', () => {
    const consent = buildShareConsent(
      'shl-whole',
      makeSession({ shareScope: { excludedTypes: ['Condition'], excludedIds: [], excludedObservationCategories: [] } }),
    )
    // Empty class = all resources; the SHL proxy scope filter enforces exclusions.
    expect(consent.provision?.class).toBeUndefined()
  })

  it('carries no named recipient — actor is the anonymous link-holder grantee', () => {
    const consent = buildShareConsent('shl-anon', makeSession({ shl: { url: 'u', key: 'k' } }))
    const actor = consent.provision?.actor?.[0]
    expect(actor?.role?.coding?.[0]?.code).toBe('IRCP')
    expect(actor?.reference?.reference).toBeUndefined()
    expect(actor?.reference?.display).toBe('Any holder of the share link')
  })

  it('tags the consent as a SMART Health Link share for UI detection', () => {
    const consent = buildShareConsent('shl-cat', makeSession())
    const codes = consent.category?.flatMap((c) => c.coding?.map((x) => x.code) ?? []) ?? []
    expect(codes).toContain(SHL_CONSENT_CATEGORY_CODE)
  })
})

describe('buildShlAccessAuditEvent', () => {
  it('records a read access attributing the recipient and the SHL entity', () => {
    const audit = buildShlAccessAuditEvent({
      shlId: 'shl-a',
      session: makeSession(),
      recipient: 'Dr. Jones',
      ipAddress: '203.0.113.5',
    })
    expect(audit.resourceType).toBe('AuditEvent')
    expect(audit.action).toBe('R')
    expect(audit.agent[0]?.who?.display).toBe('Dr. Jones')
    expect(audit.agent[0]?.network?.address).toBe('203.0.113.5')
    const shlEntity = audit.entity?.find((e) => e.what?.identifier?.value === 'shl-a')
    expect(shlEntity).toBeDefined()
  })

  it('falls back to an anonymous recipient when none is supplied', () => {
    const audit = buildShlAccessAuditEvent({ shlId: 'shl-b', session: makeSession() })
    expect(audit.agent[0]?.who?.display).toBe('Anonymous share-link recipient')
  })
})
