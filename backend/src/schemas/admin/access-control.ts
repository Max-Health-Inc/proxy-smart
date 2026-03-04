/**
 * Access Control Schemas
 * 
 * Provider-agnostic TypeBox schemas for the access control admin API.
 * Works with any AccessControlProvider (Kisi, UniFi Access, etc.)
 */

import { t, type Static } from 'elysia'

// ==================== Core Entities ====================

export const AccessLocationSchema = t.Object({
  id: t.String({ description: 'Location ID (provider-specific)' }),
  name: t.String({ description: 'Location name' }),
  address: t.Optional(t.String({ description: 'Address' })),
  description: t.Optional(t.String({ description: 'Description' })),
  metadata: t.Optional(t.Record(t.String(), t.Unknown(), { description: 'Provider-specific metadata' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'AccessLocation' })

export type AccessLocationSchemaType = Static<typeof AccessLocationSchema>

export const AccessDoorSchema = t.Object({
  id: t.String({ description: 'Door ID (provider-specific)' }),
  name: t.String({ description: 'Door/lock name' }),
  locationId: t.String({ description: 'Parent location ID' }),
  description: t.Optional(t.String({ description: 'Description' })),
  online: t.Boolean({ description: 'Whether the door controller is online' }),
  locked: t.Optional(t.Boolean({ description: 'Whether the door is locked' })),
  type: t.Optional(t.String({ description: 'Door/lock type' })),
  metadata: t.Optional(t.Record(t.String(), t.Unknown(), { description: 'Provider-specific metadata' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'AccessDoor' })

export type AccessDoorSchemaType = Static<typeof AccessDoorSchema>

export const AccessGroupSchema = t.Object({
  id: t.String({ description: 'Group ID' }),
  name: t.String({ description: 'Group name' }),
  description: t.Optional(t.String({ description: 'Description' })),
  locationId: t.Optional(t.String({ description: 'Location ID' })),
  metadata: t.Optional(t.Record(t.String(), t.Unknown(), { description: 'Provider-specific metadata' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'AccessGroup' })

export type AccessGroupSchemaType = Static<typeof AccessGroupSchema>

export const AccessMemberSchema = t.Object({
  id: t.String({ description: 'Member ID' }),
  name: t.Optional(t.String({ description: 'Display name' })),
  email: t.String({ description: 'Email address' }),
  groupIds: t.Optional(t.Array(t.String(), { description: 'Assigned group IDs' })),
  confirmed: t.Optional(t.Boolean({ description: 'Whether the member confirmed their account' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether the member is enabled' })),
  metadata: t.Optional(t.Record(t.String(), t.Unknown(), { description: 'Provider-specific metadata' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'AccessMember' })

export type AccessMemberSchemaType = Static<typeof AccessMemberSchema>

export const AccessGroupDoorSchema = t.Object({
  id: t.String({ description: 'Assignment ID' }),
  groupId: t.String({ description: 'Group ID' }),
  doorId: t.String({ description: 'Door ID' }),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'AccessGroupDoor' })

export type AccessGroupDoorSchemaType = Static<typeof AccessGroupDoorSchema>

export const AccessEventSchema = t.Object({
  id: t.String({ description: 'Event ID' }),
  action: t.String({ description: 'Event action (e.g., door.unlock, member.create)' }),
  actorType: t.Optional(t.String({ description: 'Actor entity type' })),
  actorId: t.Optional(t.String({ description: 'Actor ID' })),
  actorEmail: t.Optional(t.String({ description: 'Actor email' })),
  objectType: t.Optional(t.String({ description: 'Object entity type' })),
  objectId: t.Optional(t.String({ description: 'Object ID' })),
  doorId: t.Optional(t.String({ description: 'Related door ID' })),
  message: t.Optional(t.String({ description: 'Human-readable event message' })),
  createdAt: t.Optional(t.String({ description: 'Timestamp (ISO 8601)' })),
}, { title: 'AccessEvent' })

export type AccessEventSchemaType = Static<typeof AccessEventSchema>

// ==================== Pagination Wrapper ====================

function paginatedSchema<T extends ReturnType<typeof t.Object>>(itemSchema: T, title: string) {
  return t.Object({
    data: t.Array(itemSchema),
    pagination: t.Object({
      offset: t.Number({ description: 'Current offset' }),
      limit: t.Number({ description: 'Page size' }),
      count: t.Number({ description: 'Total item count' }),
    }),
  }, { title })
}

export const AccessLocationsResponse = paginatedSchema(AccessLocationSchema, 'AccessLocationsResponse')
export const AccessDoorsResponse = paginatedSchema(AccessDoorSchema, 'AccessDoorsResponse')
export const AccessGroupsResponse = paginatedSchema(AccessGroupSchema, 'AccessGroupsResponse')
export const AccessMembersResponse = paginatedSchema(AccessMemberSchema, 'AccessMembersResponse')
export const AccessGroupDoorsResponse = paginatedSchema(AccessGroupDoorSchema, 'AccessGroupDoorsResponse')
export const AccessEventsResponse = paginatedSchema(AccessEventSchema, 'AccessEventsResponse')

// ==================== Request / Operation Schemas ====================

export const CreateGroupRequest = t.Object({
  name: t.String({ description: 'Group name', minLength: 1 }),
  description: t.Optional(t.String({ description: 'Group description' })),
}, { title: 'CreateGroupRequest' })

export type CreateGroupRequestType = Static<typeof CreateGroupRequest>

export const CreateMemberRequest = t.Object({
  email: t.String({ description: 'Member email', format: 'email' }),
  name: t.Optional(t.String({ description: 'Display name' })),
}, { title: 'CreateMemberRequest' })

export type CreateMemberRequestType = Static<typeof CreateMemberRequest>

export const AssignDoorRequest = t.Object({
  groupId: t.String({ description: 'Group ID' }),
  doorId: t.String({ description: 'Door ID' }),
}, { title: 'AssignDoorRequest' })

export type AssignDoorRequestType = Static<typeof AssignDoorRequest>

// ==================== Sync Schemas ====================

export const SyncRequest = t.Object({
  roleMappings: t.Optional(t.Array(t.Object({
    keycloakRole: t.String({ description: 'Keycloak role name (or partial match pattern)' }),
    groupId: t.String({ description: 'Provider group ID to assign' }),
  }), { description: 'Role-to-group mapping rules' })),
}, { title: 'SyncRequest' })

export type SyncRequestType = Static<typeof SyncRequest>

export const SyncResponse = t.Object({
  created: t.Array(t.String(), { description: 'Emails of newly created members' }),
  skipped: t.Array(t.String(), { description: 'Emails already existing' }),
  failed: t.Array(t.Object({
    email: t.String(),
    error: t.String(),
  }), { description: 'Emails that failed to sync' }),
}, { title: 'SyncResponse' })

export type SyncResponseType = Static<typeof SyncResponse>

// ==================== Overview ====================

export const OverviewResponse = t.Object({
  locations: AccessLocationsResponse,
  doors: AccessDoorsResponse,
  groups: AccessGroupsResponse,
  members: AccessMembersResponse,
}, { title: 'AccessOverviewResponse' })

export type OverviewResponseType = Static<typeof OverviewResponse>

// ==================== Health ====================

export const AccessHealthResponse = t.Object({
  configured: t.Boolean({ description: 'Whether an access control provider is configured' }),
  connected: t.Boolean({ description: 'Whether the provider backend is reachable' }),
  provider: t.Optional(t.String({ description: 'Active provider name (kisi, unifi-access)' })),
  capabilities: t.Optional(t.Object({
    groups: t.Boolean(),
    members: t.Boolean(),
    sync: t.Boolean(),
    events: t.Boolean(),
    groupDoors: t.Boolean(),
    realtime: t.Boolean(),
  }, { description: 'Provider capabilities' })),
}, { title: 'AccessHealthResponse' })

export type AccessHealthResponseType = Static<typeof AccessHealthResponse>

// ==================== ID Param ====================

export const IdParam = t.Object({
  id: t.String({ description: 'Entity ID' }),
})

// ==================== Backward Compat Aliases ====================
// Keep old names available for any existing imports

export const KisiPlaceSchema = AccessLocationSchema
export const KisiLockSchema = AccessDoorSchema
export const KisiGroupSchema = AccessGroupSchema
export const KisiMemberSchema = AccessMemberSchema
export const KisiGroupLockSchema = AccessGroupDoorSchema
export const KisiEventSchema = AccessEventSchema
export const KisiPlacesResponse = AccessLocationsResponse
export const KisiLocksResponse = AccessDoorsResponse
export const KisiGroupsResponse = AccessGroupsResponse
export const KisiMembersResponse = AccessMembersResponse
export const KisiGroupLocksResponse = AccessGroupDoorsResponse
export const KisiEventsResponse = AccessEventsResponse
export const KisiCreateGroupRequest = CreateGroupRequest
export const KisiCreateMemberRequest = CreateMemberRequest
export const KisiAssignLockRequest = AssignDoorRequest
export const KisiSyncRequest = SyncRequest
export const KisiSyncResponse = SyncResponse
export const KisiOverviewResponse = OverviewResponse
export const KisiHealthResponse = AccessHealthResponse
export const KisiIdParam = IdParam
export type KisiSyncResponseType = SyncResponseType
export type KisiHealthResponseType = AccessHealthResponseType
