// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Role attribute payload tests.
 *
 * Realm roles and client roles share this encoding, so a regression here would
 * silently change role metadata on both. The behaviour worth pinning is the
 * tri-state represented-scope-set link (leave / clear / set) and the fact that
 * an update never drops attributes it was not asked about.
 */

import { describe, it, expect } from 'bun:test'
import { buildRoleAttributes, mergeRoleUpdate } from '@/lib/role-payload'
import { REPRESENTED_SCOPE_SET_ATTR, FHIR_SCOPES_ATTR } from '@/lib/role-metadata'

describe('buildRoleAttributes', () => {
  it('marks the role and defaults the scope label to empty', () => {
    expect(buildRoleAttributes({})).toEqual({
      smart_role: ['true'],
      [FHIR_SCOPES_ATTR]: [],
    })
  })

  it('carries the scopes and the represented scope set when supplied', () => {
    expect(buildRoleAttributes({
      fhirScopes: ['patient/*.read'],
      representedScopeSetId: 'set-1',
    })).toEqual({
      smart_role: ['true'],
      [FHIR_SCOPES_ATTR]: ['patient/*.read'],
      [REPRESENTED_SCOPE_SET_ATTR]: ['set-1'],
    })
  })

  it('omits the scope-set link rather than writing an empty one', () => {
    expect(buildRoleAttributes({ representedScopeSetId: '' })?.[REPRESENTED_SCOPE_SET_ATTR]).toBeUndefined()
  })
})

describe('mergeRoleUpdate', () => {
  const existing = {
    id: 'r1',
    name: 'clinician',
    description: 'Clinical staff',
    attributes: {
      smart_role: ['true'],
      [FHIR_SCOPES_ATTR]: ['patient/*.read'],
      [REPRESENTED_SCOPE_SET_ATTR]: ['set-1'],
      custom_attr: ['keep-me'],
    },
  }

  it('leaves the scope-set link untouched when the field is absent', () => {
    const merged = mergeRoleUpdate(existing, { description: 'Updated' })
    expect(merged.attributes?.[REPRESENTED_SCOPE_SET_ATTR]).toEqual(['set-1'])
    expect(merged.description).toBe('Updated')
  })

  it('clears the scope-set link on an empty string', () => {
    const merged = mergeRoleUpdate(existing, { representedScopeSetId: '' })
    expect(merged.attributes?.[REPRESENTED_SCOPE_SET_ATTR]).toBeUndefined()
  })

  it('replaces the scope-set link on a new value', () => {
    const merged = mergeRoleUpdate(existing, { representedScopeSetId: 'set-2' })
    expect(merged.attributes?.[REPRESENTED_SCOPE_SET_ATTR]).toEqual(['set-2'])
  })

  it('keeps unrelated attributes and the existing description', () => {
    const merged = mergeRoleUpdate(existing, {})
    expect(merged.attributes?.custom_attr).toEqual(['keep-me'])
    expect(merged.description).toBe('Clinical staff')
    expect(merged.attributes?.[FHIR_SCOPES_ATTR]).toEqual(['patient/*.read'])
  })

  it('replaces the scopes when new ones are supplied', () => {
    const merged = mergeRoleUpdate(existing, { fhirScopes: ['user/*.read'] })
    expect(merged.attributes?.[FHIR_SCOPES_ATTR]).toEqual(['user/*.read'])
  })

  it('starts from an empty scope list when the role carried none', () => {
    const merged = mergeRoleUpdate({ name: 'bare' }, {})
    expect(merged.attributes?.[FHIR_SCOPES_ATTR]).toEqual([])
  })
})
