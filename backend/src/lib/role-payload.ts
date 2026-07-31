// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Role attribute payload helpers.
 *
 * Realm roles and client roles carry the same descriptive metadata (the
 * `smart_role` marker, the `fhir_scopes` label, and the optional represented
 * scope-set link) and therefore need the same create/update attribute
 * handling. Keeping that in one place means a client role behaves exactly like
 * a realm role instead of drifting into a second, subtly different encoding.
 *
 * As with everything in role-metadata.ts: these attributes are DESCRIPTIVE.
 * They never grant or deny access — FHIR/MCP enforcement stays scope-based.
 */
import type RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js'
import { REPRESENTED_SCOPE_SET_ATTR, FHIR_SCOPES_ATTR } from './role-metadata'

/** Fields both CreateRoleRequest and UpdateRoleRequest may carry. */
export interface RoleMetadataInput {
  description?: string
  fhirScopes?: string[]
  /** Empty string clears the link; undefined leaves it untouched on update. */
  representedScopeSetId?: string
}

/** Marker attribute set on every role this API creates. */
const SMART_ROLE_ATTR = 'smart_role'

/** Build the attribute map for a newly created role. */
export function buildRoleAttributes(input: RoleMetadataInput): RoleRepresentation['attributes'] {
  return {
    [SMART_ROLE_ATTR]: ['true'],
    [FHIR_SCOPES_ATTR]: input.fhirScopes ?? [],
    ...(input.representedScopeSetId
      ? { [REPRESENTED_SCOPE_SET_ATTR]: [input.representedScopeSetId] }
      : {})
  }
}

/**
 * Merge an update onto an existing role.
 *
 * The represented scope-set link is tri-state, which is the part worth stating
 * explicitly: `undefined` leaves it as-is, `''` clears it, and any other value
 * sets it.
 */
export function mergeRoleUpdate(existing: RoleRepresentation, input: RoleMetadataInput): RoleRepresentation {
  const existingScopeSet = existing.attributes?.[REPRESENTED_SCOPE_SET_ATTR]

  let scopeSetAttr: Record<string, string[]>
  if (input.representedScopeSetId === undefined) {
    scopeSetAttr = existingScopeSet ? { [REPRESENTED_SCOPE_SET_ATTR]: existingScopeSet } : {}
  } else if (input.representedScopeSetId === '') {
    scopeSetAttr = {}
  } else {
    scopeSetAttr = { [REPRESENTED_SCOPE_SET_ATTR]: [input.representedScopeSetId] }
  }

  const { [REPRESENTED_SCOPE_SET_ATTR]: _replaced, ...attrsWithoutScopeSet } = existing.attributes ?? {}

  return {
    ...existing,
    description: input.description ?? existing.description,
    attributes: {
      ...attrsWithoutScopeSet,
      [FHIR_SCOPES_ATTR]: input.fhirScopes ?? existing.attributes?.[FHIR_SCOPES_ATTR] ?? [],
      ...scopeSetAttr
    }
  }
}
