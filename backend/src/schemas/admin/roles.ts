import { t, type Static } from 'elysia'
import { AttributesMap } from './common'

/**
 * Role Management schemas
 *
 * NOTE on the role <-> scope-set link: this is DESCRIPTIVE metadata only. A role
 * may reference a named scope set (see scope-sets.ts) as a human-readable LABEL of
 * the "typical scopes this role represents". It is NOT wired into FHIR/MCP access
 * enforcement. FHIR access stays scope-based (smart-access-control.ts + fhirUser
 * filtering). The mapping never grants or denies access.
 */

export const Role = t.Object({
  id: t.Optional(t.String({ description: 'Role ID' })),
  name: t.Optional(t.String({ description: 'Role name' })),
  description: t.Optional(t.String({ description: 'Role description' })),
  attributes: t.Optional(AttributesMap)
}, { title: 'Role' })

export const RoleResponse = t.Object({
  id: t.Optional(t.String({ description: 'Role ID' })),
  name: t.Optional(t.String({ description: 'Role name' })),
  description: t.Optional(t.String({ description: 'Role description' })),
  composite: t.Optional(t.Boolean({ description: 'Whether this is a Keycloak composite role' })),
  clientRole: t.Optional(t.Boolean({ description: 'Whether this is a client-level role' })),
  attributes: t.Optional(AttributesMap),

  // ── Descriptive metadata (labels only, NOT access enforcement) ──────────────
  isTechnical: t.Optional(t.Boolean({
    description: 'True for plumbing roles (offline_access, default-roles-*, uma_authorization) the UI hides by default'
  })),
  representedScopeSetId: t.Optional(t.String({
    description: 'ID of a scope set this role represents (descriptive label only, not enforced)'
  })),
  representedScopeSetName: t.Optional(t.String({
    description: 'Resolved name of the represented scope set'
  })),
  representedScopes: t.Optional(t.Array(t.String(), {
    description: 'Resolved scopes the role typically represents (from the linked scope set and/or fhir_scopes attribute). Descriptive only.'
  }))
}, { title: 'RoleResponse' })

export const CreateRoleRequest = t.Object({
  name: t.String({ description: 'Role name (must be unique)' }),
  description: t.Optional(t.String({ description: 'Role description' })),
  fhirScopes: t.Optional(t.Array(t.String(), { description: 'FHIR scopes this role typically represents (descriptive label, not enforced)' })),
  representedScopeSetId: t.Optional(t.String({ description: 'ID of a scope set this role represents (descriptive label only)' }))
}, { title: 'CreateRoleRequest' })

export const UpdateRoleRequest = t.Object({
  description: t.Optional(t.String({ description: 'Role description' })),
  fhirScopes: t.Optional(t.Array(t.String(), { description: 'FHIR scopes this role typically represents (descriptive label, not enforced)' })),
  representedScopeSetId: t.Optional(t.String({ description: 'ID of a scope set this role represents (descriptive label only). Pass an empty string to clear.' }))
}, { title: 'UpdateRoleRequest' })

// TypeScript type inference helpers
export type RoleType = Static<typeof Role>
export type RoleResponseType = Static<typeof RoleResponse>
export type CreateRoleRequestType = Static<typeof CreateRoleRequest>
export type UpdateRoleRequestType = Static<typeof UpdateRoleRequest>
