/**
 * Role Descriptive-Metadata Tests
 *
 * Covers the DESCRIPTIVE role metadata helpers:
 *  - isTechnicalRole: hides plumbing roles (offline_access, default-roles-*, uma_authorization)
 *  - enrichRole: resolves the represented scope set (name + scopes) as a LABEL only
 *
 * This metadata is never used for access enforcement; it is a human-readable label
 * of the "typical scopes a role represents".
 */

import { describe, it, expect, afterEach } from 'bun:test'
import type RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js'
import { isTechnicalRole, enrichRole, REPRESENTED_SCOPE_SET_ATTR } from '../src/lib/role-metadata'
import { createScopeSet, deleteScopeSet, loadScopeSets } from '../src/lib/scope-sets-store'

afterEach(() => {
  // Remove any non-template scope sets created during tests.
  for (const set of [...loadScopeSets()]) {
    if (!set.isTemplate) deleteScopeSet(set.id)
  }
})

describe('isTechnicalRole', () => {
  it('flags offline_access and uma_authorization as technical', () => {
    expect(isTechnicalRole({ name: 'offline_access' })).toBe(true)
    expect(isTechnicalRole({ name: 'uma_authorization' })).toBe(true)
  })

  it('flags default-roles-* as technical', () => {
    expect(isTechnicalRole({ name: 'default-roles-proxy-smart' })).toBe(true)
  })

  it('does not flag normal roles as technical', () => {
    expect(isTechnicalRole({ name: 'user' })).toBe(false)
    expect(isTechnicalRole({ name: 'admin' })).toBe(false)
    expect(isTechnicalRole({ name: 'practitioner' })).toBe(false)
  })
})

describe('enrichRole', () => {
  it('adds isTechnical and passes through core fields', () => {
    const role: RoleRepresentation = { id: 'r1', name: 'user', description: 'Standard user', composite: false }
    const enriched = enrichRole(role)
    expect(enriched.name).toBe('user')
    expect(enriched.description).toBe('Standard user')
    expect(enriched.isTechnical).toBe(false)
    expect(enriched.representedScopeSetId).toBeUndefined()
  })

  it('resolves the represented scope set name + scopes when linked', () => {
    const scopeSet = createScopeSet({
      name: 'Clinician Read',
      scopes: ['patient/*.read', 'user/Practitioner.read'],
    })

    const role: RoleRepresentation = {
      id: 'r2',
      name: 'practitioner',
      attributes: { [REPRESENTED_SCOPE_SET_ATTR]: [scopeSet.id] },
    }

    const enriched = enrichRole(role)
    expect(enriched.representedScopeSetId).toBe(scopeSet.id)
    expect(enriched.representedScopeSetName).toBe('Clinician Read')
    expect(enriched.representedScopes).toEqual(['patient/*.read', 'user/Practitioner.read'])
  })

  it('merges scope-set scopes with the role fhir_scopes attribute (deduped)', () => {
    const scopeSet = createScopeSet({ name: 'Base', scopes: ['patient/*.read'] })

    const role: RoleRepresentation = {
      id: 'r3',
      name: 'mixed',
      attributes: {
        [REPRESENTED_SCOPE_SET_ATTR]: [scopeSet.id],
        fhir_scopes: ['patient/*.read', 'launch/patient'],
      },
    }

    const enriched = enrichRole(role)
    expect(enriched.representedScopes).toEqual(['patient/*.read', 'launch/patient'])
  })

  it('falls back to fhir_scopes when no scope set is linked', () => {
    const role: RoleRepresentation = {
      id: 'r4',
      name: 'scoped',
      attributes: { fhir_scopes: ['system/*.read'] },
    }
    const enriched = enrichRole(role)
    expect(enriched.representedScopeSetId).toBeUndefined()
    expect(enriched.representedScopeSetName).toBeUndefined()
    expect(enriched.representedScopes).toEqual(['system/*.read'])
  })

  it('gracefully handles a dangling scope-set reference', () => {
    const role: RoleRepresentation = {
      id: 'r5',
      name: 'dangling',
      attributes: { [REPRESENTED_SCOPE_SET_ATTR]: ['scope-does-not-exist'] },
    }
    const enriched = enrichRole(role)
    expect(enriched.representedScopeSetId).toBe('scope-does-not-exist')
    expect(enriched.representedScopeSetName).toBeUndefined()
    expect(enriched.representedScopes).toBeUndefined()
  })
})
