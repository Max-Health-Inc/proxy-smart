/**
 * SMART Access Control Tests
 *
 * Tests for scope enforcement, write blocking, and role-based filtering.
 * These features are opt-in (disabled by default) and configured via env vars.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { enforceScopeAccess, enforceWriteBlocking, enforceRoleBasedFiltering, type AccessControlContext } from '../src/lib/smart-access-control'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<AccessControlContext> = {}): AccessControlContext {
  return {
    tokenPayload: { scope: 'openid patient/Patient.read', fhirUser: 'Practitioner/dr-smith' },
    resourcePath: 'Patient',
    method: 'GET',
    serverUrl: 'https://fhir.example.com',
    serverId: 'test-server',
    serverName: 'test-fhir',
    authHeader: 'Bearer test-token',
    upstreamFetch: mock(() => Promise.resolve(new Response(JSON.stringify({ resourceType: 'Bundle', entry: [] }), { status: 200 }))),
    ...overrides,
  }
}

/** Mock upstream fetch that returns a bundle with entries */
function mockFetchWithEntries(entries: Array<{ resource: { id: string; resourceType: string } }>) {
  return mock(() => Promise.resolve(new Response(
    JSON.stringify({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries }),
    { status: 200, headers: { 'Content-Type': 'application/fhir+json' } },
  )))
}

/** Mock upstream fetch that returns an empty bundle */
function mockFetchEmpty() {
  return mock(() => Promise.resolve(new Response(
    JSON.stringify({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] }),
    { status: 200, headers: { 'Content-Type': 'application/fhir+json' } },
  )))
}

/** Mock upstream fetch that fails */
function mockFetchError() {
  return mock(() => Promise.resolve(new Response('Internal Server Error', { status: 500 })))
}

// ── Environment helpers ──────────────────────────────────────────────────────

const originalEnv = { ...process.env }

function setEnv(vars: Record<string, string>) {
  for (const [key, val] of Object.entries(vars)) {
    process.env[key] = val
  }
}

function resetEnv() {
  // Remove test-specific env vars
  delete process.env.SCOPE_ENFORCEMENT_MODE
  delete process.env.ROLE_BASED_FILTERING_MODE
  delete process.env.READ_ONLY_FOR_USERS
  delete process.env.PATIENT_SCOPED_RESOURCES
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. SMART Scope Enforcement
// ══════════════════════════════════════════════════════════════════════════════

describe('SMART Scope Enforcement', () => {
  afterEach(resetEnv)

  describe('when disabled (default)', () => {
    it('should allow any request regardless of scopes', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '' } })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('when mode = enforce', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    // ── v1 scopes ──

    it('should allow GET with patient/*.read scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'openid patient/*.read' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow GET with user/Patient.read scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'user/Patient.read' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny GET when only write scope is present', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.write' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
      expect(result.body?.error).toBe('insufficient_scope')
    })

    it('should allow POST with patient/Observation.write scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.write' }, resourcePath: 'Observation', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny POST when only read scope is present', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.read' }, resourcePath: 'Observation', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should allow any operation with wildcard permission (*)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.*' }, resourcePath: 'Observation', method: 'DELETE' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow any resource with wildcard resource (*)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/*.read' }, resourcePath: 'Condition', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny when scope resource does not match requested resource', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.read' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    // ── v2 scopes (cruds characters) ──

    it('should allow GET with v2 scope containing "r" (read)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.rs' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST with v2 scope containing "c" (create)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.cru' }, resourcePath: 'Observation', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow PUT with v2 scope containing "u" (update)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.u' }, resourcePath: 'Observation', method: 'PUT' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow DELETE with v2 scope containing "d" (delete)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.d' }, resourcePath: 'Observation', method: 'DELETE' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow GET with v2 scope containing only "s" (search)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.s' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny DELETE when v2 scope only has "cru" (no d)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.cru' }, resourcePath: 'Observation', method: 'DELETE' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should allow full cruds scope for any method', () => {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.cruds' }, resourcePath: 'Observation', method })
        const result = enforceScopeAccess(ctx)
        expect(result.allowed).toBe(true)
      }
    })

    // ── system scope context ──

    it('should allow system scopes', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'system/Patient.read' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    // ── Edge cases ──

    it('should skip scope check for metadata endpoint', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '' }, resourcePath: 'metadata', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should skip scope check for empty resource path', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '' }, resourcePath: '', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle missing scope claim gracefully', () => {
      const ctx = makeCtx({ tokenPayload: {}, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should deny when scope has non-SMART format', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'openid profile email' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should extract resource type from paths with ID (Patient/123)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.read' }, resourcePath: 'Patient/123', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should extract resource type from paths with query (Patient?name=test)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.read' }, resourcePath: 'Patient?name=test', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle multiple scopes where one matches', () => {
      const ctx = makeCtx({
        tokenPayload: { scope: 'openid fhirUser patient/Condition.read patient/Observation.read' },
        resourcePath: 'Observation',
        method: 'GET',
      })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('when mode = audit-only', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'audit-only' }))

    it('should allow request even when scope check fails (logs only)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Write Blocking
// ══════════════════════════════════════════════════════════════════════════════

describe('Write Blocking', () => {
  afterEach(resetEnv)

  describe('when disabled (default)', () => {
    it('should allow write operations', () => {
      const ctx = makeCtx({ method: 'POST', resourcePath: 'Observation' })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe('when READ_ONLY_FOR_USERS = true', () => {
    beforeEach(() => setEnv({ READ_ONLY_FOR_USERS: 'true' }))

    it('should block POST for users with fhirUser', () => {
      const ctx = makeCtx({ method: 'POST', tokenPayload: { fhirUser: 'Patient/123' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
      expect(result.body?.error).toBe('access_denied')
    })

    it('should block PUT for users with fhirUser', () => {
      const ctx = makeCtx({ method: 'PUT', tokenPayload: { fhirUser: 'Practitioner/dr-1' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should block PATCH for users with fhirUser', () => {
      const ctx = makeCtx({ method: 'PATCH', tokenPayload: { fhirUser: 'Patient/p1' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should block DELETE for users with fhirUser', () => {
      const ctx = makeCtx({ method: 'DELETE', tokenPayload: { fhirUser: 'Patient/p1' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should allow GET even with fhirUser', () => {
      const ctx = makeCtx({ method: 'GET', tokenPayload: { fhirUser: 'Patient/123' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow writes for tokens WITHOUT fhirUser (admin/service accounts)', () => {
      const ctx = makeCtx({ method: 'POST', tokenPayload: { scope: 'openid' } })
      const result = enforceWriteBlocking(ctx)
      expect(result.allowed).toBe(true)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. Role-Based Filtering
// ══════════════════════════════════════════════════════════════════════════════

describe('Role-Based Filtering', () => {
  afterEach(resetEnv)

  describe('when disabled (default)', () => {
    it('should pass through without modification', async () => {
      const ctx = makeCtx()
      const result = await enforceRoleBasedFiltering(ctx, '?_count=10')
      expect(result.allowed).toBe(true)
      expect(result.modifiedQueryString).toBe('?_count=10')
    })
  })

  describe('when mode = enforce', () => {
    beforeEach(() => setEnv({ ROLE_BASED_FILTERING_MODE: 'enforce' }))

    // ── No fhirUser ──

    it('should allow request when no fhirUser claim present', async () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'openid' } })
      const result = await enforceRoleBasedFiltering(ctx, '')
      expect(result.allowed).toBe(true)
    })

    // ── fhirUser normalization ──

    it('should handle relative fhirUser references (Patient/123)', async () => {
      const ctx = makeCtx({
        tokenPayload: { fhirUser: 'Patient/test-patient' },
        resourcePath: 'Patient',
        method: 'GET',
      })
      const result = await enforceRoleBasedFiltering(ctx, '')
      expect(result.allowed).toBe(true)
      expect(result.modifiedQueryString).toContain('_id=test-patient')
    })

    it('should handle absolute URL fhirUser (https://fhir.example.com/Patient/123)', async () => {
      const ctx = makeCtx({
        tokenPayload: { fhirUser: 'https://fhir.example.com/Patient/test-patient' },
        resourcePath: 'Patient',
        method: 'GET',
      })
      const result = await enforceRoleBasedFiltering(ctx, '')
      expect(result.allowed).toBe(true)
      expect(result.modifiedQueryString).toContain('_id=test-patient')
    })

    it('should handle absolute URL fhirUser for Practitioner', async () => {
      const ctx = makeCtx({
        tokenPayload: { fhirUser: 'https://fhir.example.com/Practitioner/dr-smith' },
        resourcePath: 'Patient',
        method: 'GET',
      })
      const result = await enforceRoleBasedFiltering(ctx, '')
      expect(result.allowed).toBe(true)
      expect(result.modifiedQueryString).toContain('general-practitioner=Practitioner%2Fdr-smith')
    })

    // ── Practitioner filtering ──

    describe('Practitioner', () => {
      it('should inject general-practitioner filter on Patient search', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toContain('general-practitioner=Practitioner%2Fdr-smith')
      })

      it('should append to existing query string', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '?name=John')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toBe('?name=John&general-practitioner=Practitioner%2Fdr-smith')
      })

      it('should allow direct Patient read when assigned', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient/p1',
          method: 'GET',
          upstreamFetch: mockFetchWithEntries([{ resource: { id: 'p1', resourceType: 'Patient' } }]),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should deny direct Patient read when NOT assigned', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient/p999',
          method: 'GET',
          upstreamFetch: mockFetchEmpty(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(403)
        expect(result.body?.error).toBe('access_denied')
      })

      it('should skip FHIR operations (Patient/$everything)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient/$everything',
          method: 'GET',
          upstreamFetch: mockFetchEmpty(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        // $ operations should be skipped (allowed through)
        expect(result.allowed).toBe(true)
      })

      it('should inject patient filter on patient-scoped resource search', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Observation',
          method: 'GET',
          upstreamFetch: mockFetchWithEntries([
            { resource: { id: 'p1', resourceType: 'Patient' } },
            { resource: { id: 'p2', resourceType: 'Patient' } },
          ]),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toContain('patient=Patient/p1,Patient/p2')
      })

      it('should return empty bundle when practitioner has no assigned patients (resource search)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-lonely' },
          resourcePath: 'Observation',
          method: 'GET',
          upstreamFetch: mockFetchEmpty(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.body?.resourceType).toBe('Bundle')
        expect(result.body?.total).toBe(0)
      })

      it('should return 502 when upstream fails during patient lookup (enforce)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient/p1',
          method: 'GET',
          upstreamFetch: mockFetchError(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(502)
      })

      it('should not filter non-patient-scoped resources', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Practitioner',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '?name=test')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toBe('?name=test') // unchanged
      })

      it('should deny direct read of patient-scoped resource when not assigned (Observation/123)', async () => {
        // First call returns practitioner's patients, second checks resource assignment
        let callCount = 0
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Observation/obs-999',
          method: 'GET',
          upstreamFetch: mock(() => {
            callCount++
            if (callCount === 1) {
              // Return assigned patients
              return Promise.resolve(new Response(JSON.stringify({
                resourceType: 'Bundle', entry: [{ resource: { id: 'p1', resourceType: 'Patient' } }],
              }), { status: 200 }))
            }
            // Resource check — no match
            return Promise.resolve(new Response(JSON.stringify({
              resourceType: 'Bundle', entry: [],
            }), { status: 200 }))
          }),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(403)
      })

      it('should allow direct read of patient-scoped resource when assigned', async () => {
        let callCount = 0
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Observation/obs-1',
          method: 'GET',
          upstreamFetch: mock(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve(new Response(JSON.stringify({
                resourceType: 'Bundle', entry: [{ resource: { id: 'p1', resourceType: 'Patient' } }],
              }), { status: 200 }))
            }
            return Promise.resolve(new Response(JSON.stringify({
              resourceType: 'Bundle', entry: [{ resource: { id: 'obs-1', resourceType: 'Observation' } }],
            }), { status: 200 }))
          }),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })
    })

    // ── Patient filtering ──

    describe('Patient', () => {
      it('should restrict Patient search to own record', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toContain('_id=p1')
      })

      it('should allow direct read of own Patient record', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient/p1',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should deny direct read of another Patient record', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient/p2',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(403)
        expect(result.body?.message).toContain('your own patient record')
      })

      it('should allow Patient/$everything (FHIR operation)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient/$everything',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should inject patient filter on patient-scoped resource search', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toContain('patient=Patient/p1')
      })

      it('should append to existing query string for patient-scoped resources', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '?code=8302-2')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toBe('?code=8302-2&patient=Patient/p1')
      })

      it('should allow direct read of own patient-scoped resource', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation/obs-1',
          method: 'GET',
          upstreamFetch: mockFetchWithEntries([{ resource: { id: 'obs-1', resourceType: 'Observation' } }]),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should deny direct read of unowned patient-scoped resource', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation/obs-other',
          method: 'GET',
          upstreamFetch: mockFetchEmpty(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(403)
        expect(result.body?.message).toContain('does not belong to your patient record')
      })

      it('should return 502 when upstream fails during ownership check', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation/obs-1',
          method: 'GET',
          upstreamFetch: mockFetchError(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(502)
      })

      it('should not filter non-patient-scoped resources', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Practitioner',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '?name=Smith')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toBe('?name=Smith')
      })

      it('should handle fhirUser as full URL', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'https://fhir.example.com/Patient/p1' },
          resourcePath: 'Patient/p2',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(false)
        expect(result.status).toBe(403)
      })
    })

    // ── audit-only mode ──

    describe('audit-only mode', () => {
      beforeEach(() => setEnv({ ROLE_BASED_FILTERING_MODE: 'audit-only' }))

      it('should allow denied Patient access (logs warning only)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient/p2',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should allow denied Practitioner access (logs warning only)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Practitioner/dr-smith' },
          resourcePath: 'Patient/p999',
          method: 'GET',
          upstreamFetch: mockFetchEmpty(),
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
      })

      it('should still inject filter params on Patient search (audit-only)', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Patient',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.allowed).toBe(true)
        expect(result.modifiedQueryString).toContain('_id=p1')
      })
    })

    // ── Custom patient-scoped resources ──

    describe('custom PATIENT_SCOPED_RESOURCES', () => {
      beforeEach(() => setEnv({
        ROLE_BASED_FILTERING_MODE: 'enforce',
        PATIENT_SCOPED_RESOURCES: 'Observation,MedicationRequest',
      }))

      it('should filter configured resources', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Observation',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        expect(result.modifiedQueryString).toContain('patient=Patient/p1')
      })

      it('should NOT filter resources not in the custom list', async () => {
        const ctx = makeCtx({
          tokenPayload: { fhirUser: 'Patient/p1' },
          resourcePath: 'Condition',
          method: 'GET',
        })
        const result = await enforceRoleBasedFiltering(ctx, '')
        // Condition is in defaults but NOT in our custom override
        expect(result.modifiedQueryString).toBe('')
      })
    })
  })
})
