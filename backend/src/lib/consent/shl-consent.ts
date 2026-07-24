/**
 * SHL → Consent mirror
 *
 * A SMART Health Link (SHL) is a patient-initiated data share, i.e. a consent
 * grant. To surface active shares in the consent portal (and evaluate them in
 * the enforcement engine) alongside every other consent, we mirror each minted
 * SHL into a FHIR `Consent` conforming to the `MaxHealthShareConsent` profile
 * (see fhir/input/fsh/consent.fsh, generated into maxhealth.consent-*-generated).
 *
 * The mirror is best-effort: a failure here never blocks SHL creation. The SHL
 * itself keeps working; only its consent-portal reflection is missing, which a
 * later reconciliation can repair.
 *
 * Revocation-by-expiry is automatic: the Consent's `provision.period.end` equals
 * the SHL's `expiresAt`, so an expired share is already inactive by period and
 * needs no status flip. Explicit revoke wiring (portal revoke → kill SHL session
 * + SHL-access enforcement consulting the Consent) is a follow-up.
 */
import type { MaxHealthShareConsent } from 'maxhealth.consent-0.1.0-generated'
import { validateMaxHealthShareConsent } from 'maxhealth.consent-0.1.0-generated'
import type { ShlSession } from '@/lib/shl-session-store'
import { getServiceAccountToken, getDefaultFhirServerUrl } from '@/lib/shl-service-account'
import { invalidateConsentCache } from '@/lib/consent/consent-service'
import { logger } from '@/lib/logger'

/** Identifier system that ties a Consent back to its SHL session id. */
export const SHL_CONSENT_IDENTIFIER_SYSTEM = 'https://maxhealth.tech/fhir/shl-session'

// Short-lived cache so the revocation check costs at most one FHIR round-trip
// per SHL per window, not one per proxied request. Revocation propagates within
// this window.
const REVOCATION_TTL_MS = 30_000
const revocationCache = new Map<string, { revoked: boolean; at: number }>()

const RESOURCE_TYPES_SYSTEM = 'http://hl7.org/fhir/resource-types'

/**
 * Clinical resource types a whole-patient share exposes by default. Used to
 * populate `provision.class` (which the portal renders and the enforcement
 * engine matches on) when the share is not scoped to a single imaging study.
 */
const DEFAULT_SHARED_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'MedicationRequest',
  'AllergyIntolerance',
  'Immunization',
  'Procedure',
  'DiagnosticReport',
  'DocumentReference',
]

/** Resource types this share exposes, as Consent.provision.class codings. */
function sharedClasses(session: ShlSession) {
  const codes = session.studyInstanceUID
    ? ['ImagingStudy']
    : DEFAULT_SHARED_TYPES.filter((t) => !(session.shareScope?.excludedTypes ?? []).includes(t))
  return codes.map((code) => ({ system: RESOURCE_TYPES_SYSTEM, code }))
}

/**
 * Build a `MaxHealthShareConsent` resource representing an SHL.
 * Pure: no I/O, no clock reads beyond the timestamps passed in via the session.
 */
export function buildShareConsent(shlId: string, session: ShlSession): MaxHealthShareConsent {
  const nowIso = new Date().toISOString()
  const patientRef = `Patient/${session.patientId}`
  const recipientDisplay = session.shl.label?.trim() || 'SMART Health Link recipient'

  return {
    resourceType: 'Consent',
    status: 'active',
    identifier: [{ system: SHL_CONSENT_IDENTIFIER_SYSTEM, value: shlId }],
    scope: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }],
    },
    category: [
      {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes', code: '59284-0', display: 'Patient Consent' },
        ],
      },
    ],
    patient: { reference: patientRef },
    dateTime: nowIso,
    // The patient created the share.
    performer: [{ reference: patientRef }],
    // FHIR invariant ppc-1 requires a policy or policyRule. A patient-initiated
    // share is an opt-in consent directive.
    policyRule: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'OPTIN', display: 'opt-in' }],
    },
    provision: {
      type: 'permit',
      period: { start: nowIso, end: new Date(session.expiresAt).toISOString() },
      actor: [
        {
          role: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'IRCP',
                display: 'Information Recipient',
              },
            ],
          },
          // A link has no pre-known identity; carry a human label for the portal.
          reference: { display: recipientDisplay },
        },
      ],
      action: [
        { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentaction', code: 'access' }] },
      ],
      class: sharedClasses(session),
    },
  }
}

/**
 * Has this SHL's backing Consent been revoked? True ONLY when a Consent tied to
 * this SHL id exists and its status is not `active` (e.g. the patient hit revoke
 * in the consent portal, flipping it to `inactive`). Fail-open: a missing mirror
 * or an unreachable FHIR server returns false so a best-effort mirror gap never
 * breaks an otherwise-valid share — the SHL session TTL remains the hard gate.
 */
export async function isShareConsentRevoked(shlId: string, fhirServerUrl: string): Promise<boolean> {
  const cached = revocationCache.get(shlId)
  if (cached && Date.now() - cached.at < REVOCATION_TTL_MS) return cached.revoked

  let revoked = false
  try {
    const token = await getServiceAccountToken()
    const query = encodeURIComponent(`${SHL_CONSENT_IDENTIFIER_SYSTEM}|${shlId}`)
    const resp = await fetch(`${fhirServerUrl}/Consent?identifier=${query}&_count=1`, {
      headers: { Accept: 'application/fhir+json', Authorization: `Bearer ${token}` },
    })
    if (resp.ok) {
      const bundle = (await resp.json().catch(() => null)) as { entry?: { resource?: { resourceType?: string; status?: string } }[] } | null
      const resource = bundle?.entry?.[0]?.resource
      if (resource?.resourceType === 'Consent' && resource.status && resource.status !== 'active') {
        revoked = true
      }
    }
  } catch (error) {
    logger.consent.debug('SHL revocation check failed (fail-open)', { shlId, error: error instanceof Error ? error.message : String(error) })
  }

  revocationCache.set(shlId, { revoked, at: Date.now() })
  return revoked
}

/**
 * Mirror a minted SHL into a FHIR Consent (best-effort — never throws).
 * Returns the created Consent id on success, or null if the mirror failed.
 */
export async function emitShareConsent(shlId: string, session: ShlSession): Promise<string | null> {
  try {
    const consent = buildShareConsent(shlId, session)

    // Compile-time conformance is enforced by the type; validate at runtime too
    // so profile drift surfaces as a warning rather than silently bad data.
    try {
      const { errors } = await validateMaxHealthShareConsent(consent)
      if (errors.length) {
        logger.consent.warn('SHL share consent failed profile validation', { shlId, errors })
      }
    } catch (err) {
      logger.consent.debug('SHL share consent validation skipped', { shlId, error: err instanceof Error ? err.message : String(err) })
    }

    const fhirServerUrl = session.fhirServerUrl || (await getDefaultFhirServerUrl())
    const token = await getServiceAccountToken('openid patient/*.read patient/*.write')

    const resp = await fetch(`${fhirServerUrl}/Consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(consent),
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      logger.consent.warn('SHL share consent write failed', { shlId, status: resp.status, detail: detail.slice(0, 300) })
      return null
    }

    const created = (await resp.json().catch(() => null)) as { id?: string } | null
    // The new active consent must be visible immediately in the portal/engine.
    invalidateConsentCache(session.patientId)
    logger.consent.info('SHL mirrored to Consent', { shlId, consentId: created?.id, patientId: session.patientId })
    return created?.id ?? null
  } catch (error) {
    logger.consent.warn('SHL share consent mirror error', { shlId, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
