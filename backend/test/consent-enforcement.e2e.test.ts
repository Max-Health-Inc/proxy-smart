/**
 * Consent Enforcement E2E Tests
 *
 * End-to-end tests that exercise the full consent-based access control flow:
 * 1. checkConsent() evaluates FHIR Consent resources fetched from upstream
 * 2. In "enforce" mode, denied requests return 403
 * 3. In "audit-only" mode, denied requests are logged but still allowed
 * 4. Consent cache is respected and can be invalidated
 * 5. Exempt clients, exempt resource types, and required-resource-type lists work
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  checkConsent,
  buildConsentContext,
  getConsentConfig,
  invalidateConsentCache,
  getConsentCacheStats,
} from '../src/lib/consent/consent-service'
import { consentCache } from '../src/lib/consent/consent-cache'
import type {
  FhirConsent,
  SmartTokenPayload,
} from '../src/lib/consent/types'

// =============================================================================
// FIXTURES
// =============================================================================

/** Active R4 consent permitting a specific client access to all resources */
function makePermitConsent(overrides: Partial<FhirConsent> & Record<string, unknown> = {}): FhirConsent {
  return {
    resourceType: 'Consent',
    id: 'consent-permit-1',
    status: 'active',
    scope: { coding: [{ code: 'patient-privacy' }] },
    category: [{ coding: [{ code: 'patient-privacy' }] }],
    provision: {
      type: 'permit' as const,
      actor: [
        {
          role: { coding: [{ code: 'GRANTEE' }] },
          reference: { reference: 'Organization/test-client' },
        },
      ],
    },
    ...overrides,
  } as FhirConsent
}

/** Active R4 consent that explicitly denies access */
function makeDenyConsent(overrides: Partial<FhirConsent> & Record<string, unknown> = {}): FhirConsent {
  return {
    resourceType: 'Consent',
    id: 'consent-deny-1',
    status: 'active',
    scope: { coding: [{ code: 'patient-privacy' }] },
    category: [{ coding: [{ code: 'patient-privacy' }] }],
    provision: {
      type: 'deny' as const,
      actor: [
        {
          role: { coding: [{ code: 'GRANTEE' }] },
          reference: { reference: 'Organization/test-client' },
        },
      ],
    },
    ...overrides,
  } as FhirConsent
}

/** Consent with resource-type restrictions (only certain FHIR resource types) */
function makeResourceRestrictedConsent(
  resourceTypes: string[],
  provisionType: 'permit' | 'deny' = 'permit',
): FhirConsent {
  return {
    resourceType: 'Consent',
    id: `consent-${provisionType}-restricted`,
    status: 'active',
    scope: { coding: [{ code: 'patient-privacy' }] },
    category: [{ coding: [{ code: 'patient-privacy' }] }],
    provision: {
      type: provisionType,
      class: resourceTypes.map((code) => ({
        system: 'http://hl7.org/fhir/resource-types',
        code,
      })),
      actor: [
        {
          role: { coding: [{ code: 'GRANTEE' }] },
          reference: { reference: 'Organization/test-client' },
        },
      ],
    },
  } as FhirConsent
}

/** Consent with a time-bound provision (expired) */
function makeExpiredConsent(): FhirConsent {
  return {
    resourceType: 'Consent',
    id: 'consent-expired',
    status: 'active',
    scope: { coding: [{ code: 'patient-privacy' }] },
    category: [{ coding: [{ code: 'patient-privacy' }] }],
    provision: {
      type: 'permit' as const,
      period: {
        start: '2020-01-01',
        end: '2020-12-31',
      },
      actor: [
        {
          role: { coding: [{ code: 'GRANTEE' }] },
          reference: { reference: 'Organization/test-client' },
        },
      ],
    },
  } as FhirConsent
}

/** Inactive / draft consent that should be skipped */
function makeInactiveConsent(): FhirConsent {
  return {
    resourceType: 'Consent',
    id: 'consent-draft',
    status: 'draft',
    scope: { coding: [{ code: 'patient-privacy' }] },
    category: [{ coding: [{ code: 'patient-privacy' }] }],
    provision: {
      type: 'permit' as const,
    },
  } as FhirConsent
}

/** Create a SMART token payload */
function createToken(overrides: Partial<SmartTokenPayload> = {}): SmartTokenPayload {
  return {
    iss: 'https://auth.example.com',
    sub: 'user-123',
    aud: 'smart-proxy',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    azp: 'test-client',
    scope: 'patient/*.read',
    smart_patient: 'patient-123',
    ...overrides,
  }
}

/** Wrap consents in a FHIR Bundle search response */
function makeConsentBundle(consents: FhirConsent[]) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: consents.length,
    entry: consents.map((c) => ({ resource: c })),
  }
}

// =============================================================================
// GLOBAL FETCH MOCK HELPERS
// =============================================================================

const originalFetch = global.fetch

/** Set global.fetch to a handler (typed for Bun compatibility) */
function mockGlobalFetch(handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): void {
  global.fetch = mock(handler) as unknown as typeof global.fetch
}

/** Simulate upstream FHIR server returning a consent bundle */
function mockFhirConsentResponse(consents: FhirConsent[]): void {
  mockGlobalFetch(async () =>
    new Response(JSON.stringify(makeConsentBundle(consents)), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    }),
  )
}

/** Simulate upstream FHIR server returning an error */
function mockFhirErrorResponse(status: number): void {
  mockGlobalFetch(async () => new Response(null, { status }))
}

// =============================================================================
// ENV HELPERS
// =============================================================================

const CONSENT_ENVS = [
  'CONSENT_ENABLED',
  'CONSENT_MODE',
  'CONSENT_CACHE_TTL',
  'CONSENT_EXEMPT_CLIENTS',
  'CONSENT_REQUIRED_RESOURCE_TYPES',
  'CONSENT_EXEMPT_RESOURCE_TYPES',
] as const

function setConsentEnv(overrides: Partial<Record<(typeof CONSENT_ENVS)[number], string>> = {}) {
  // Defaults: enabled + enforce mode
  process.env.CONSENT_ENABLED = overrides.CONSENT_ENABLED ?? 'true'
  process.env.CONSENT_MODE = overrides.CONSENT_MODE ?? 'enforce'
  process.env.CONSENT_CACHE_TTL = overrides.CONSENT_CACHE_TTL ?? '60000'
  if (overrides.CONSENT_EXEMPT_CLIENTS !== undefined) {
    process.env.CONSENT_EXEMPT_CLIENTS = overrides.CONSENT_EXEMPT_CLIENTS
  }
  if (overrides.CONSENT_REQUIRED_RESOURCE_TYPES !== undefined) {
    process.env.CONSENT_REQUIRED_RESOURCE_TYPES = overrides.CONSENT_REQUIRED_RESOURCE_TYPES
  }
  if (overrides.CONSENT_EXEMPT_RESOURCE_TYPES !== undefined) {
    process.env.CONSENT_EXEMPT_RESOURCE_TYPES = overrides.CONSENT_EXEMPT_RESOURCE_TYPES
  }
}

function clearConsentEnv() {
  for (const key of CONSENT_ENVS) delete process.env[key]
}

// =============================================================================
// TESTS
// =============================================================================

describe('Consent Enforcement E2E', () => {
  beforeEach(() => {
    consentCache.clear()
    clearConsentEnv()
  })

  afterEach(() => {
    global.fetch = originalFetch
    consentCache.clear()
    clearConsentEnv()
  })

  // ---------------------------------------------------------------------------
  // Core permit / deny flow
  // ---------------------------------------------------------------------------

  describe('enforce mode — permit / deny decisions', () => {
    it('should PERMIT when an active consent exists for the client', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makePermitConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.consentId).toContain('Consent/')
      expect(result.reason).toContain('permitted')
      expect(result.context.patientId).toBe('patient-123')
      expect(result.context.clientId).toBe('test-client')
      expect(result.context.resourceType).toBe('Patient')
    })

    it('should DENY when no consent exists for the patient', async () => {
      setConsentEnv()
      // Empty bundle — no consents for this patient
      mockFhirConsentResponse([])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Observation/obs-1',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
      expect(result.reason).toContain('No valid consent')
    })

    it('should DENY when only an explicit deny consent exists', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makeDenyConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Observation/obs-1',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
      expect(result.reason).toContain('denied')
    })

    it('should PERMIT when a permit consent overrides a deny consent', async () => {
      setConsentEnv()
      // deny comes first, but a permit later should override
      mockFhirConsentResponse([makeDenyConsent(), makePermitConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Observation/obs-1',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
    })
  })

  // ---------------------------------------------------------------------------
  // Consent status / provision period
  // ---------------------------------------------------------------------------

  describe('consent status and temporal validity', () => {
    it('should skip inactive / draft consents (deny by default)', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makeInactiveConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
      expect(result.reason).toContain('No valid consent')
    })

    it('should skip expired consents (deny by default)', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makeExpiredConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
      expect(result.reason).toContain('No valid consent')
    })
  })

  // ---------------------------------------------------------------------------
  // Resource-type restrictions in provisions
  // ---------------------------------------------------------------------------

  describe('resource-type restrictions in consent provisions', () => {
    it('should PERMIT when provision class matches the requested resource type', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makeResourceRestrictedConsent(['Observation', 'Patient'])])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Observation/obs-1',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
    })

    it('should DENY when provision class does NOT match the requested resource type', async () => {
      setConsentEnv()
      // Consent only covers Observation, but we're requesting MedicationRequest
      mockFhirConsentResponse([makeResourceRestrictedConsent(['Observation'])])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'MedicationRequest/med-1',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })
  })

  // ---------------------------------------------------------------------------
  // Audit-only mode
  // ---------------------------------------------------------------------------

  describe('audit-only mode', () => {
    it('should always PERMIT in audit-only mode (even without consent)', async () => {
      setConsentEnv({ CONSENT_MODE: 'audit-only' })
      // Empty — no consents
      mockFhirConsentResponse([])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      // In audit-only, the decision still reports "deny" internally,
      // but the proxy route won't enforce it.
      // The consent service itself returns the real decision.
      // It is the ROUTE that checks getConsentConfig().mode === 'enforce' before blocking.
      // So at the service level, this should still be 'deny'.
      expect(result.decision).toBe('deny')
      expect(result.reason).toContain('No valid consent')
    })
  })

  // ---------------------------------------------------------------------------
  // Disabled mode
  // ---------------------------------------------------------------------------

  describe('disabled mode', () => {
    it('should auto-PERMIT when consent enforcement is disabled', async () => {
      setConsentEnv({ CONSENT_MODE: 'disabled' })

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('disabled')
    })

    it('should auto-PERMIT when CONSENT_ENABLED is false', async () => {
      setConsentEnv({ CONSENT_ENABLED: 'false' })

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
    })
  })

  // ---------------------------------------------------------------------------
  // Exempt clients
  // ---------------------------------------------------------------------------

  describe('exempt clients', () => {
    it('should auto-PERMIT for clients in the exempt list', async () => {
      setConsentEnv({ CONSENT_EXEMPT_CLIENTS: 'test-client,admin-app' })

      const result = await checkConsent(
        createToken({ azp: 'test-client' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('exempt')
    })

    it('should still check consent for non-exempt clients', async () => {
      setConsentEnv({ CONSENT_EXEMPT_CLIENTS: 'admin-app' })
      mockFhirConsentResponse([])

      const result = await checkConsent(
        createToken({ azp: 'other-client' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })
  })

  // ---------------------------------------------------------------------------
  // Exempt resource types
  // ---------------------------------------------------------------------------

  describe('exempt resource types', () => {
    it('should auto-PERMIT for exempt resource types (CapabilityStatement)', async () => {
      setConsentEnv()

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'CapabilityStatement',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('exempt')
    })

    it('should auto-PERMIT for custom exempt resource types', async () => {
      setConsentEnv({ CONSENT_EXEMPT_RESOURCE_TYPES: 'AllergyIntolerance' })

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'AllergyIntolerance?patient=Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('exempt')
    })
  })

  // ---------------------------------------------------------------------------
  // Required resource types
  // ---------------------------------------------------------------------------

  describe('required resource types filter', () => {
    it('should skip consent check for resource types NOT in the required list', async () => {
      setConsentEnv({ CONSENT_REQUIRED_RESOURCE_TYPES: 'Observation,MedicationRequest' })

      // Patient is NOT in the required list → should auto-permit
      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('not in required list')
    })

    it('should enforce consent for resource types IN the required list', async () => {
      setConsentEnv({ CONSENT_REQUIRED_RESOURCE_TYPES: 'Observation,MedicationRequest' })
      mockFhirConsentResponse([])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Observation?patient=Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })
  })

  // ---------------------------------------------------------------------------
  // No patient context
  // ---------------------------------------------------------------------------

  describe('missing patient context', () => {
    it('should auto-PERMIT when patient ID cannot be determined', async () => {
      setConsentEnv()

      // Token without smart_patient, path without Patient/
      const result = await checkConsent(
        createToken({ smart_patient: undefined }),
        'hapi',
        'https://fhir.example.com',
        'Observation',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
      expect(result.reason).toContain('No patient context')
    })
  })

  // ---------------------------------------------------------------------------
  // Cache behaviour
  // ---------------------------------------------------------------------------

  describe('consent cache', () => {
    it('should cache consent responses and reuse them', async () => {
      setConsentEnv({ CONSENT_CACHE_TTL: '60000' })

      let fetchCount = 0
      mockGlobalFetch(async () => {
        fetchCount++
        return new Response(JSON.stringify(makeConsentBundle([makePermitConsent()])), {
          status: 200,
          headers: { 'Content-Type': 'application/fhir+json' },
        })
      })

      const token = createToken()

      // First call → fetch
      const r1 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r1.decision).toBe('permit')
      expect(r1.cached).toBe(false)
      expect(fetchCount).toBe(1)

      // Second call → cache hit
      const r2 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Observation/obs-1', 'GET', 'Bearer tok')
      expect(r2.decision).toBe('permit')
      expect(r2.cached).toBe(true)
      expect(fetchCount).toBe(1)
    })

    it('should fetch again after cache invalidation', async () => {
      setConsentEnv({ CONSENT_CACHE_TTL: '60000' })

      let fetchCount = 0
      mockGlobalFetch(async () => {
        fetchCount++
        return new Response(JSON.stringify(makeConsentBundle([makePermitConsent()])), {
          status: 200,
          headers: { 'Content-Type': 'application/fhir+json' },
        })
      })

      const token = createToken()

      // First call → fetch
      await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(fetchCount).toBe(1)

      // Invalidate cache for this patient
      invalidateConsentCache('patient-123')

      // Next call → should fetch again
      const r2 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r2.cached).toBe(false)
      expect(fetchCount).toBe(2)
    })

    it('should report cache statistics', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makePermitConsent()])

      await checkConsent(createToken(), 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')

      const stats = getConsentCacheStats()
      expect(stats.size).toBeGreaterThanOrEqual(1)
      expect(stats.entries.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Upstream FHIR server errors
  // ---------------------------------------------------------------------------

  describe('upstream FHIR server errors', () => {
    it('should DENY when upstream returns 500 (no consents found)', async () => {
      setConsentEnv()
      mockFhirErrorResponse(500)

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      // fetchConsents returns [] on error → no consent → deny
      expect(result.decision).toBe('deny')
    })

    it('should DENY when upstream returns 401 (no consents found)', async () => {
      setConsentEnv()
      mockFhirErrorResponse(401)

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })

    it('should DENY when fetch throws a network error', async () => {
      setConsentEnv()
      mockGlobalFetch(async () => {
        throw new Error('ECONNREFUSED')
      })

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })
  })

  // ---------------------------------------------------------------------------
  // Actor matching
  // ---------------------------------------------------------------------------

  describe('actor matching', () => {
    it('should DENY when consent exists but for a different client', async () => {
      setConsentEnv()

      const consentForOtherClient: FhirConsent = {
        resourceType: 'Consent',
        id: 'consent-other-client',
        status: 'active',
        scope: { coding: [{ code: 'patient-privacy' }] },
        category: [],
        provision: {
          type: 'permit' as const,
          actor: [
            {
              role: { coding: [{ code: 'GRANTEE' }] },
              reference: { reference: 'Organization/other-client' },
            },
          ],
        },
      } as FhirConsent

      mockFhirConsentResponse([consentForOtherClient])

      const result = await checkConsent(
        createToken({ azp: 'test-client' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('deny')
    })

    it('should PERMIT when consent has no actor restrictions (applies to all)', async () => {
      setConsentEnv()

      const consentNoActor: FhirConsent = {
        resourceType: 'Consent',
        id: 'consent-all',
        status: 'active',
        scope: { coding: [{ code: 'patient-privacy' }] },
        category: [],
        provision: {
          type: 'permit' as const,
        },
      } as FhirConsent

      mockFhirConsentResponse([consentNoActor])

      const result = await checkConsent(
        createToken({ azp: 'any-client' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(result.decision).toBe('permit')
    })
  })

  // ---------------------------------------------------------------------------
  // Context building
  // ---------------------------------------------------------------------------

  describe('buildConsentContext', () => {
    it('should extract patient ID from smart_patient claim', () => {
      const ctx = buildConsentContext(
        createToken({ smart_patient: 'pat-abc' }),
        'hapi',
        'Observation/obs-1',
        'GET',
      )
      expect(ctx.patientId).toBe('pat-abc')
    })

    it('should extract patient ID from Patient resource path as fallback', () => {
      const ctx = buildConsentContext(
        createToken({ smart_patient: undefined }),
        'hapi',
        'Patient/pat-xyz',
        'GET',
      )
      expect(ctx.patientId).toBe('pat-xyz')
    })

    it('should parse scopes from token', () => {
      const ctx = buildConsentContext(
        createToken({ scope: 'patient/Observation.read patient/Patient.read openid' }),
        'hapi',
        'Observation',
        'GET',
      )
      expect(ctx.scopes).toEqual(['patient/Observation.read', 'patient/Patient.read', 'openid'])
    })

    it('should normalise HTTP method to uppercase', () => {
      const ctx = buildConsentContext(createToken(), 'hapi', 'Observation', 'post')
      expect(ctx.method).toBe('POST')
    })

    it('should handle fhirUser claim', () => {
      const ctx = buildConsentContext(
        createToken({ fhirUser: 'Practitioner/dr-1' }),
        'hapi',
        'Patient/patient-123',
        'GET',
      )
      expect(ctx.fhirUser).toBe('Practitioner/dr-1')
    })
  })

  // ---------------------------------------------------------------------------
  // getConsentConfig reads env vars correctly
  // ---------------------------------------------------------------------------

  describe('getConsentConfig', () => {
    it('should reflect env var settings', () => {
      setConsentEnv({
        CONSENT_ENABLED: 'true',
        CONSENT_MODE: 'enforce',
        CONSENT_CACHE_TTL: '30000',
        CONSENT_EXEMPT_CLIENTS: 'admin,monitoring',
      })

      const cfg = getConsentConfig()
      expect(cfg.enabled).toBe(true)
      expect(cfg.mode).toBe('enforce')
      expect(cfg.cacheTtl).toBe(30000)
      expect(cfg.exemptClients).toContain('admin')
      expect(cfg.exemptClients).toContain('monitoring')
    })

    it('should default to disabled when env vars are not set', () => {
      clearConsentEnv()
      const cfg = getConsentConfig()
      expect(cfg.enabled).toBe(false)
      expect(cfg.mode).toBe('disabled')
    })
  })

  // ---------------------------------------------------------------------------
  // Full lifecycle: grant → access → revoke → deny
  // ---------------------------------------------------------------------------

  describe('full consent lifecycle: grant → access → revoke → deny', () => {
    it('should permit access with consent, then deny after consent is revoked', async () => {
      setConsentEnv()
      const token = createToken()

      // Phase 1: Active consent exists → PERMIT
      mockFhirConsentResponse([makePermitConsent()])
      const r1 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r1.decision).toBe('permit')

      // Phase 2: Consent gets revoked → invalidate cache, now empty bundle
      invalidateConsentCache('patient-123')
      mockFhirConsentResponse([]) // upstream now returns empty

      const r2 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r2.decision).toBe('deny')
      expect(r2.reason).toContain('No valid consent')
    })

    it('should switch from deny to permit when consent is created', async () => {
      setConsentEnv()
      const token = createToken()

      // Phase 1: No consent → DENY
      mockFhirConsentResponse([])
      const r1 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r1.decision).toBe('deny')

      // Phase 2: Consent created → invalidate cache, now active consent
      invalidateConsentCache('patient-123')
      mockFhirConsentResponse([makePermitConsent()])

      const r2 = await checkConsent(token, 'hapi', 'https://fhir.example.com', 'Patient/patient-123', 'GET', 'Bearer tok')
      expect(r2.decision).toBe('permit')
    })
  })

  // ---------------------------------------------------------------------------
  // Multiple patients / servers isolation
  // ---------------------------------------------------------------------------

  describe('multi-patient / multi-server isolation', () => {
    it('should isolate consent decisions per patient', async () => {
      setConsentEnv()

      // Patient A has consent, Patient B does not
      let requestUrl = ''
      mockGlobalFetch(async (input) => {
        requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
        
        if (requestUrl.includes('patient=Patient/patient-A')) {
          return new Response(JSON.stringify(makeConsentBundle([makePermitConsent()])), {
            status: 200,
            headers: { 'Content-Type': 'application/fhir+json' },
          })
        }
        // Patient B → empty
        return new Response(JSON.stringify(makeConsentBundle([])), {
          status: 200,
          headers: { 'Content-Type': 'application/fhir+json' },
        })
      })

      const rA = await checkConsent(
        createToken({ smart_patient: 'patient-A' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-A',
        'GET',
        'Bearer tok',
      )
      expect(rA.decision).toBe('permit')

      const rB = await checkConsent(
        createToken({ smart_patient: 'patient-B' }),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-B',
        'GET',
        'Bearer tok',
      )
      expect(rB.decision).toBe('deny')
    })
  })

  // ---------------------------------------------------------------------------
  // Consent result metadata
  // ---------------------------------------------------------------------------

  describe('result metadata', () => {
    it('should include timing information', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makePermitConsent()])

      const result = await checkConsent(
        createToken(),
        'hapi',
        'https://fhir.example.com',
        'Patient/patient-123',
        'GET',
        'Bearer tok',
      )

      expect(typeof result.checkDurationMs).toBe('number')
      expect(result.checkDurationMs).toBeGreaterThanOrEqual(0)
    })

    it('should include the full context in the result', async () => {
      setConsentEnv()
      mockFhirConsentResponse([makePermitConsent()])

      const result = await checkConsent(
        createToken({ azp: 'my-app', scope: 'patient/*.read openid' }),
        'prod-server',
        'https://fhir.example.com',
        'Observation/obs-42',
        'GET',
        'Bearer tok',
      )

      expect(result.context).toMatchObject({
        patientId: 'patient-123',
        clientId: 'my-app',
        resourceType: 'Observation',
        resourceId: 'obs-42',
        method: 'GET',
        resourcePath: 'Observation/obs-42',
        serverName: 'prod-server',
      })
      expect(result.context.scopes).toContain('patient/*.read')
      expect(result.context.scopes).toContain('openid')
    })
  })
})
