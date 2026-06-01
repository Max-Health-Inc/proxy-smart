import { t, type Static } from 'elysia'

/**
 * Scope Set schemas — reusable named collections of SMART scopes.
 * Persisted on the backend so they sync across admins/devices.
 */

export const ScopeSet = t.Object({
  id: t.String({ description: 'Unique identifier' }),
  name: t.String({ description: 'Human-readable name for the scope set' }),
  description: t.Optional(t.String({ description: 'Optional description' })),
  scopes: t.Array(t.String(), { description: 'List of SMART scopes in this set' }),
  isTemplate: t.Optional(t.Boolean({ description: 'Whether this is a built-in template' })),
  createdAt: t.String({ description: 'ISO 8601 creation timestamp' }),
  updatedAt: t.String({ description: 'ISO 8601 last-modified timestamp' }),
}, { title: 'ScopeSet' })

export const ScopeSetListResponse = t.Object({
  scopeSets: t.Array(ScopeSet),
  total: t.Number({ description: 'Total count' }),
}, { title: 'ScopeSetListResponse' })

export const CreateScopeSetRequest = t.Object({
  name: t.String({ minLength: 1, description: 'Name for the scope set' }),
  description: t.Optional(t.String({ description: 'Optional description' })),
  scopes: t.Array(t.String(), { minItems: 1, description: 'Scopes to include' }),
}, { title: 'CreateScopeSetRequest' })

export const UpdateScopeSetRequest = t.Object({
  name: t.Optional(t.String({ minLength: 1, description: 'Updated name' })),
  description: t.Optional(t.String({ description: 'Updated description' })),
  scopes: t.Optional(t.Array(t.String(), { minItems: 1, description: 'Updated scopes' })),
}, { title: 'UpdateScopeSetRequest' })

export type ScopeSetType = Static<typeof ScopeSet>
export type ScopeSetListResponseType = Static<typeof ScopeSetListResponse>
export type CreateScopeSetRequestType = Static<typeof CreateScopeSetRequest>
export type UpdateScopeSetRequestType = Static<typeof UpdateScopeSetRequest>
