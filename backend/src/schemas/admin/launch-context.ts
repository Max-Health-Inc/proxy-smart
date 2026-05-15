import { t, type Static } from 'elysia'
import { ServerScopeLiteral } from './common'

/**
 * Launch Context Management schemas for SMART App Launch
 */

/**
 * FHIR resource reference for launch context
 */
const FhirContextReference = t.Object({
  type: t.String({ description: 'FHIR resource type (e.g., Patient, Encounter)' }),
  reference: t.String({ description: 'FHIR resource reference (e.g., Patient/123)' }),
  display: t.Optional(t.String({ description: 'Human-readable display text' }))
})

export const LaunchContext = t.Object({
  id: t.String({ description: 'Launch context ID' }),
  name: t.String({ description: 'Context name' }),
  description: t.Optional(t.String({ description: 'Context description' })),
  intent: t.String({ description: 'SMART intent (e.g., reconcile-medications)' }),
  fhirServerName: t.Optional(t.String({ description: 'Associated FHIR server name' })),
  supportedServers: t.Optional(t.Array(t.String(), { description: 'List of supported FHIR servers' })),
  serverScope: t.Optional(ServerScopeLiteral),
  targetClientIds: t.Optional(t.Array(t.String(), { description: 'Target SMART app client IDs' })),
  embedLocation: t.Optional(t.String({ description: 'EHR embed location identifier' })),
  fhirContextTemplate: t.Optional(t.Array(FhirContextReference, { description: 'FHIR resources in context' })),
  requiredScopes: t.Optional(t.Array(t.String(), { description: 'Required SMART scopes' })),
  optionalScopes: t.Optional(t.Array(t.String(), { description: 'Optional SMART scopes' })),
  needPatientBanner: t.Optional(t.Boolean({ description: 'Whether patient banner is needed' })),
  needEncounterContext: t.Optional(t.Boolean({ description: 'Whether encounter context is needed' })),
  smartStyleUrl: t.Optional(t.String({ description: 'URL to SMART styling CSS' })),
  parameters: t.Optional(t.Record(t.String(), t.String())),
  isActive: t.Optional(t.Boolean({ description: 'Whether this context is active' })),
  createdBy: t.Optional(t.String({ description: 'User who created this context' })),
  createdAt: t.Optional(t.String({ description: 'Creation timestamp (ISO 8601)' })),
  lastModified: t.Optional(t.String({ description: 'Last modification timestamp (ISO 8601)' }))
}, { title: 'LaunchContext' })

export const RuntimeLaunchContext = t.Object({
  id: t.String({ description: 'Runtime context ID (launch token)' }),
  configId: t.String({ description: 'Associated launch config ID' }),
  fhirServerName: t.String({ description: 'FHIR server name' }),
  fhirServerUrl: t.String({ description: 'FHIR server base URL' }),
  clientId: t.String({ description: 'SMART app client ID' }),
  userId: t.String({ description: 'User ID' }),
  patientId: t.Optional(t.String({ description: 'Patient ID in context' })),
  encounterId: t.Optional(t.String({ description: 'Encounter ID in context' })),
  launchUrl: t.String({ description: 'Generated launch URL' }),
  createdAt: t.String({ description: 'Creation timestamp (ISO 8601)' }),
  expiresAt: t.Optional(t.String({ description: 'Expiration timestamp (ISO 8601)' }))
}, { title: 'RuntimeLaunchContext' })

export const ServerContextAssociation = t.Object({
  id: t.String({ description: 'Association ID' }),
  fhirServerName: t.String({ description: 'FHIR server name' }),
  launchContextId: t.String({ description: 'Launch context ID' }),
  isDefault: t.Optional(t.Boolean({ description: 'Whether this is the default context for the server' })),
  customParameters: t.Optional(t.Record(t.String(), t.String())),
  createdAt: t.Optional(t.String({ description: 'Creation timestamp (ISO 8601)' }))
}, { title: 'ServerContextAssociation' })

// Launch Context Request Schemas
export const SetFhirContextRequest = t.Object({
  fhirContext: t.String({ description: 'Additional FHIR resources in context (JSON array of objects)' })
}, { title: 'SetFhirContextRequest' })

export const SetIntentRequest = t.Object({
  intent: t.String({ description: 'Intent string (e.g., reconcile-medications)' })
}, { title: 'SetIntentRequest' })

export const SetNeedPatientBannerRequest = t.Object({
  needPatientBanner: t.Boolean({ description: 'Whether patient banner is required' })
}, { title: 'SetNeedPatientBannerRequest' })

export const SetSmartStyleUrlRequest = t.Object({
  styleUrl: t.String({ description: 'URL to CSS stylesheet for styling' })
}, { title: 'SetSmartStyleUrlRequest' })

export const SetTenantRequest = t.Object({
  tenant: t.String({ description: 'Tenant identifier' })
}, { title: 'SetTenantRequest' })

// ==================== Response Schemas ====================

export const LaunchContextUser = t.Object({
  userId: t.String({ description: 'User ID' }),
  username: t.String({ description: 'Username' }),
  fhirUser: t.Optional(t.String({ description: 'FHIR resource representing the current user (e.g., Practitioner/123)' })),
  patient: t.Optional(t.String({ description: 'Patient context (e.g., Patient/456)' })),
  encounter: t.Optional(t.String({ description: 'Encounter context (e.g., Encounter/789)' })),
  fhirContext: t.Optional(t.String({ description: 'Additional FHIR resources in context (JSON array)' })),
  intent: t.Optional(t.String({ description: 'Intent string (e.g., reconcile-medications)' })),
  smartStyleUrl: t.Optional(t.String({ description: 'URL to CSS stylesheet for styling' })),
  tenant: t.Optional(t.String({ description: 'Tenant identifier' })),
  needPatientBanner: t.Optional(t.Boolean({ description: 'Whether patient banner is required' })),
}, { title: 'LaunchContextUser' })

// TypeScript type inference helpers
export type LaunchContextType = Static<typeof LaunchContext>
export type RuntimeLaunchContextType = Static<typeof RuntimeLaunchContext>
export type ServerContextAssociationType = Static<typeof ServerContextAssociation>
export type SetFhirContextRequestType = Static<typeof SetFhirContextRequest>
export type SetIntentRequestType = Static<typeof SetIntentRequest>
export type SetNeedPatientBannerRequestType = Static<typeof SetNeedPatientBannerRequest>
export type SetSmartStyleUrlRequestType = Static<typeof SetSmartStyleUrlRequest>
export type SetTenantRequestType = Static<typeof SetTenantRequest>
export type LaunchContextUserType = Static<typeof LaunchContextUser>
