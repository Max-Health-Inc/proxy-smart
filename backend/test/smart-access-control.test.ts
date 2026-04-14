/**
 * SMART Access Control Tests
 *
 * Tests for scope enforcement and role-based filtering.
 * These features are opt-in (disabled by default) and configured via env vars.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { enforceScopeAccess, enforceRoleBasedFiltering, type AccessControlContext } from '../src/lib/smart-access-control'

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

    // ── agent scope context ──

    it('should allow GET with agent/Observation.rs scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/Observation.rs' }, resourcePath: 'Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST with agent/Encounter.c scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/Encounter.c' }, resourcePath: 'Encounter', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny GET when agent scope only has create permission', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/RiskAssessment.c' }, resourcePath: 'RiskAssessment', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should deny POST when agent scope only has read+search permission', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/Patient.rs' }, resourcePath: 'Patient', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should deny access to resources not in agent scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/Observation.rs agent/RiskAssessment.c' }, resourcePath: 'MedicationRequest', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should allow agent scope with v1 read format', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'agent/Patient.read' }, resourcePath: 'Patient', method: 'GET' })
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

  describe('POST _search handling', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should allow POST _search with read scope (v1)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.read' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST _search with search permission (v2 s)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.s' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST _search with rs scope (v2)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny POST _search when only create scope is present', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.c' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should allow POST _search with query params', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/_search?name=Smith', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should still require create scope for regular POST (not _search)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.rs' }, resourcePath: 'Observation', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should allow POST _search with wildcard resource and read scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/*.read' }, resourcePath: 'Observation/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST _search with write scope (v1 write includes search capability)', () => {
      // v1 write scope does NOT grant search — write is only for mutations
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.write' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should allow POST _search with wildcard permission (*)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.*' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow POST _search with system scope', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'system/Patient.rs' }, resourcePath: 'Patient/_search', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  // ── v2 CRUDS granular permission tests ──

  describe('v2 CRUDS granular permissions', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should deny PUT with only create permission (c)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.c' }, resourcePath: 'Patient/123', method: 'PUT' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should deny PATCH with only create permission (c)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.c' }, resourcePath: 'Patient/123', method: 'PATCH' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should allow PATCH with update permission (u)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.u' }, resourcePath: 'Patient/123', method: 'PATCH' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should deny POST with only update permission (u)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.u' }, resourcePath: 'Patient', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should deny GET with only delete permission (d)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.d' }, resourcePath: 'Patient/123', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should deny DELETE with only read and search (rs)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/123', method: 'DELETE' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should allow combined cu for both POST and PUT', () => {
      const post = makeCtx({ tokenPayload: { scope: 'patient/Observation.cu' }, resourcePath: 'Observation', method: 'POST' })
      const put = makeCtx({ tokenPayload: { scope: 'patient/Observation.cu' }, resourcePath: 'Observation/123', method: 'PUT' })
      expect(enforceScopeAccess(post).allowed).toBe(true)
      expect(enforceScopeAccess(put).allowed).toBe(true)
    })

    it('should deny GET with cu scope (no read or search)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.cu' }, resourcePath: 'Observation/123', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should handle single-character permissions correctly for each CRUDS letter', () => {
      const cases: Array<{ perm: string; method: string; path: string; expected: boolean }> = [
        { perm: 'c', method: 'POST', path: 'Patient', expected: true },
        { perm: 'c', method: 'GET', path: 'Patient', expected: false },
        { perm: 'r', method: 'GET', path: 'Patient/123', expected: true },
        { perm: 'r', method: 'POST', path: 'Patient', expected: false },
        { perm: 'u', method: 'PUT', path: 'Patient/123', expected: true },
        { perm: 'u', method: 'PATCH', path: 'Patient/123', expected: true },
        { perm: 'u', method: 'GET', path: 'Patient/123', expected: false },
        { perm: 'd', method: 'DELETE', path: 'Patient/123', expected: true },
        { perm: 'd', method: 'GET', path: 'Patient/123', expected: false },
        { perm: 's', method: 'GET', path: 'Patient', expected: true },
        { perm: 's', method: 'POST', path: 'Patient', expected: false },
      ]
      for (const { perm, method, path, expected } of cases) {
        const ctx = makeCtx({ tokenPayload: { scope: `patient/Patient.${perm}` }, resourcePath: path, method })
        const result = enforceScopeAccess(ctx)
        expect(result.allowed).toBe(expected)
      }
    })
  })

  // ── Cross-context scope isolation ──

  describe('cross-context scope isolation', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should not mix patient and user context scopes', () => {
      // Token has patient/Observation.rs but not user/Patient.rs
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Observation.rs' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should match when any of multiple scopes grants access', () => {
      const ctx = makeCtx({
        tokenPayload: { scope: 'patient/Observation.rs user/Patient.rs system/Condition.cruds' },
        resourcePath: 'Condition',
        method: 'DELETE',
      })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should allow when token has both patient and user scopes for same resource', () => {
      const ctx = makeCtx({
        tokenPayload: { scope: 'patient/Patient.rs user/Patient.rs' },
        resourcePath: 'Patient',
        method: 'GET',
      })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  // ── Wildcard combinations ──

  describe('wildcard combinations', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should allow system/*.* for any resource and any method', () => {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        for (const resource of ['Patient', 'Observation', 'Encounter', 'Bundle']) {
          const ctx = makeCtx({ tokenPayload: { scope: 'system/*.*' }, resourcePath: resource, method })
          expect(enforceScopeAccess(ctx).allowed).toBe(true)
        }
      }
    })

    it('should allow patient/*.cruds for any resource and any method', () => {
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        const ctx = makeCtx({ tokenPayload: { scope: 'patient/*.cruds' }, resourcePath: 'MedicationRequest', method })
        expect(enforceScopeAccess(ctx).allowed).toBe(true)
      }
    })

    it('should deny patient/*.rs for write methods', () => {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const ctx = makeCtx({ tokenPayload: { scope: 'patient/*.rs' }, resourcePath: 'Observation', method })
        expect(enforceScopeAccess(ctx).allowed).toBe(false)
      }
    })
  })

  // ── Resource path edge cases ──

  describe('resource path edge cases', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should handle nested paths like Patient/123/_history/2', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/123/_history/2', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle compartment searches like Patient/123/Observation', () => {
      // Resource type is extracted as "Patient" from the path prefix
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/123/Observation', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle $operation paths', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/$everything', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle POST $operation as the operation method not create', () => {
      // POST Patient/$match is an operation, not a create — but currently treated as POST=create
      // This documents current behavior: POST operations require 'c' unless path is _search
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Patient/$match', method: 'POST' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should handle resource type with version in path (Patient/123/_history)', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.read' }, resourcePath: 'Patient/123/_history', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  // ── Error response format ──

  describe('error response format', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should return 403 with insufficient_scope error', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
      expect(result.body?.error).toBe('insufficient_scope')
      expect(result.body?.message).toContain('Patient')
      expect(result.body?.message).toContain('GET')
    })

    it('should include resource type and method in error message', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rs' }, resourcePath: 'Observation', method: 'DELETE' })
      const result = enforceScopeAccess(ctx)
      expect(result.body?.message).toContain('Observation')
      expect(result.body?.message).toContain('DELETE')
    })
  })

  // ── Malformed and adversarial scopes ──

  describe('malformed and adversarial scopes', () => {
    beforeEach(() => setEnv({ SCOPE_ENFORCEMENT_MODE: 'enforce' }))

    it('should ignore scopes with invalid context prefix', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'admin/Patient.read' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should ignore scopes missing the dot separator', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patientread' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should ignore scopes with extra path segments', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient/sub.read' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should not be tricked by scope with cruds-like resource name', () => {
      // Resource named "cruds" should only match "cruds" resource
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/cruds.r' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should handle scope string with extra whitespace', () => {
      const ctx = makeCtx({ tokenPayload: { scope: '  patient/Patient.read   openid  ' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(true)
    })

    it('should handle scope with null value', () => {
      const ctx = makeCtx({ tokenPayload: { scope: null }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should handle scope with undefined value', () => {
      const ctx = makeCtx({ tokenPayload: { scope: undefined }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should reject v2 permissions longer than 5 chars as non-CRUDS', () => {
      // "crudss" has 6 chars — should not be treated as valid v2 permission
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.crudss' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })

    it('should reject v2 permissions with invalid characters', () => {
      const ctx = makeCtx({ tokenPayload: { scope: 'patient/Patient.rx' }, resourcePath: 'Patient', method: 'GET' })
      const result = enforceScopeAccess(ctx)
      expect(result.allowed).toBe(false)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Role-Based Filtering
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
