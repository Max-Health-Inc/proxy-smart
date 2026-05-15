import { t, type Static } from 'elysia'

/**
 * SMART Client Scope schemas — manage Keycloak client scopes
 * used for SMART on FHIR authorization.
 */

export const SmartScopeResponse = t.Object({
  id: t.String({ description: 'Keycloak client scope ID' }),
  name: t.String({ description: 'Scope name (e.g. user/Claim.cud, patient/*.read)' }),
  description: t.Optional(t.String({ description: 'Human-readable description' })),
  protocol: t.String({ description: 'Protocol (always openid-connect)' }),
  attributes: t.Optional(t.Record(t.String(), t.String(), { description: 'Scope attributes' })),
}, { title: 'SmartScopeResponse' })

export const SmartScopeListResponse = t.Object({
  scopes: t.Array(SmartScopeResponse),
  total: t.Number({ description: 'Total number of scopes' }),
  timestamp: t.String(),
}, { title: 'SmartScopeListResponse' })

export const CreateSmartScopeRequest = t.Object({
  name: t.String({ description: 'Scope name (e.g. user/Claim.cud, patient/Observation.rs)' }),
  description: t.Optional(t.String({ description: 'Human-readable description' })),
}, { title: 'CreateSmartScopeRequest' })

export const CreateSmartScopeBatchRequest = t.Object({
  scopes: t.Array(t.Object({
    name: t.String({ description: 'Scope name' }),
    description: t.Optional(t.String({ description: 'Description' })),
  }), { description: 'Scopes to create', minItems: 1 }),
}, { title: 'CreateSmartScopeBatchRequest' })

export const SmartScopeBatchResponse = t.Object({
  created: t.Array(SmartScopeResponse, { description: 'Successfully created scopes' }),
  existing: t.Array(t.String(), { description: 'Scope names that already existed' }),
  errors: t.Array(t.Object({
    name: t.String(),
    error: t.String(),
  }), { description: 'Scopes that failed to create' }),
  timestamp: t.String(),
}, { title: 'SmartScopeBatchResponse' })

export type SmartScopeResponseType = Static<typeof SmartScopeResponse>
export type SmartScopeListResponseType = Static<typeof SmartScopeListResponse>
export type CreateSmartScopeRequestType = Static<typeof CreateSmartScopeRequest>
export type CreateSmartScopeBatchRequestType = Static<typeof CreateSmartScopeBatchRequest>
export type SmartScopeBatchResponseType = Static<typeof SmartScopeBatchResponse>
