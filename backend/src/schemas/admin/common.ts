import { t, type Static } from 'elysia'

/**
 * Common/Shared schemas used across admin modules
 */

/**
 * Common string/array attribute type used across Keycloak entities
 */
export const AttributeValue = t.Union([t.String(), t.Array(t.String())])

/**
 * Reusable attributes map for Keycloak entities
 */
export const AttributesMap = t.Record(t.String(), AttributeValue)

/**
 * Common endpoints structure for FHIR servers
 */
export const FhirEndpoints = t.Object({
  base: t.String({ description: 'Base FHIR endpoint URL' }),
  smartConfig: t.String({ description: 'SMART configuration endpoint URL' }),
  metadata: t.String({ description: 'FHIR capability statement endpoint URL' }),
  authorize: t.Optional(t.String({ description: 'OAuth2 authorization endpoint' })),
  token: t.Optional(t.String({ description: 'OAuth2 token endpoint' })),
  registration: t.Optional(t.String({ description: 'Dynamic client registration endpoint (RFC 7591)' })),
  manage: t.Optional(t.String({ description: 'Token management endpoint' })),
  introspection: t.Optional(t.String({ description: 'Token introspection endpoint' })),
  revocation: t.Optional(t.String({ description: 'Token revocation endpoint' }))
})

/**
 * Certificate details structure (reused in mTLS)
 */
export const CertificateDetails = t.Object({
  subject: t.String({ description: 'Certificate subject DN' }),
  issuer: t.String({ description: 'Certificate issuer DN' }),
  validFrom: t.String({ description: 'Certificate validity start date (ISO 8601)' }),
  validTo: t.String({ description: 'Certificate validity end date (ISO 8601)' }),
  fingerprint: t.String({ description: 'Certificate fingerprint (SHA-256)' })
})

/**
 * App type literal values for SMART applications
 */
export const AppTypeLiteral = t.UnionEnum([
  'standalone-app',
  'ehr-launch',
  'backend-service',
  'agent'
])

/**
 * Client type literal values for OAuth2 clients
 */
export const ClientTypeLiteral = t.UnionEnum([
  'public',
  'confidential',
  'backend-service'
])

/**
 * Server scope literal values for launch contexts
 */
export const ServerScopeLiteral = t.UnionEnum([
  'global',
  'specific',
  'single'
])

// TypeScript type inference helpers
export type AttributeValueType = Static<typeof AttributeValue>
export type AttributesMapType = Static<typeof AttributesMap>
export type FhirEndpointsType = Static<typeof FhirEndpoints>
export type CertificateDetailsType = Static<typeof CertificateDetails>
export type AppType = Static<typeof AppTypeLiteral>
export type ClientType = Static<typeof ClientTypeLiteral>
export type ServerScopeType = Static<typeof ServerScopeLiteral>
