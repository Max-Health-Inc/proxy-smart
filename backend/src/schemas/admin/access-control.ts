/**
 * Kisi Access Control Schemas
 * 
 * TypeBox schemas for Kisi entities exposed through the admin API.
 */

import { t, type Static } from 'elysia'

// ==================== Core Entities ====================

export const KisiPlaceSchema = t.Object({
  id: t.Number({ description: 'Kisi place ID' }),
  name: t.String({ description: 'Place name' }),
  address: t.Optional(t.String({ description: 'Address' })),
  description: t.Optional(t.String({ description: 'Description' })),
  latitude: t.Optional(t.Number({ description: 'Latitude' })),
  longitude: t.Optional(t.Number({ description: 'Longitude' })),
  timeZone: t.Optional(t.String({ description: 'IANA time zone' })),
  organizationId: t.Optional(t.Number({ description: 'Organization ID' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'KisiPlace' })

export type KisiPlaceSchemaType = Static<typeof KisiPlaceSchema>

export const KisiLockSchema = t.Object({
  id: t.Number({ description: 'Kisi lock ID' }),
  name: t.String({ description: 'Lock/door name' }),
  placeId: t.Number({ description: 'Parent place ID' }),
  description: t.Optional(t.String({ description: 'Description' })),
  online: t.Boolean({ description: 'Whether the lock controller is online' }),
  locked: t.Optional(t.Boolean({ description: 'Whether the door is locked' })),
  type: t.Optional(t.String({ description: 'Lock type' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'KisiLock' })

export type KisiLockSchemaType = Static<typeof KisiLockSchema>

export const KisiGroupSchema = t.Object({
  id: t.Number({ description: 'Kisi group ID' }),
  name: t.String({ description: 'Group name' }),
  description: t.Optional(t.String({ description: 'Description' })),
  organizationId: t.Optional(t.Number({ description: 'Organization ID' })),
  placeId: t.Optional(t.Number({ description: 'Place ID' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'KisiGroup' })

export type KisiGroupSchemaType = Static<typeof KisiGroupSchema>

export const KisiMemberSchema = t.Object({
  id: t.Number({ description: 'Kisi member ID' }),
  name: t.Optional(t.String({ description: 'Display name' })),
  email: t.String({ description: 'Email address' }),
  organizationId: t.Optional(t.Number({ description: 'Organization ID' })),
  groupIds: t.Optional(t.Array(t.Number(), { description: 'Assigned group IDs' })),
  confirmed: t.Optional(t.Boolean({ description: 'Whether the member confirmed their account' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether the member is enabled' })),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'KisiMember' })

export type KisiMemberSchemaType = Static<typeof KisiMemberSchema>

export const KisiGroupLockSchema = t.Object({
  id: t.Number({ description: 'Assignment ID' }),
  groupId: t.Number({ description: 'Group ID' }),
  lockId: t.Number({ description: 'Lock ID' }),
  createdAt: t.Optional(t.String({ description: 'Created timestamp (ISO 8601)' })),
  updatedAt: t.Optional(t.String({ description: 'Updated timestamp (ISO 8601)' })),
}, { title: 'KisiGroupLock' })

export type KisiGroupLockSchemaType = Static<typeof KisiGroupLockSchema>

export const KisiEventSchema = t.Object({
  id: t.Number({ description: 'Event ID' }),
  action: t.String({ description: 'Event action (e.g., lock.unlock, member.create)' }),
  actorType: t.Optional(t.String({ description: 'Actor entity type' })),
  actorId: t.Optional(t.Number({ description: 'Actor ID' })),
  actorEmail: t.Optional(t.String({ description: 'Actor email' })),
  objectType: t.Optional(t.String({ description: 'Object entity type' })),
  objectId: t.Optional(t.Number({ description: 'Object ID' })),
  lockId: t.Optional(t.Number({ description: 'Related lock ID' })),
  message: t.Optional(t.String({ description: 'Human-readable event message' })),
  createdAt: t.Optional(t.String({ description: 'Timestamp (ISO 8601)' })),
}, { title: 'KisiEvent' })

export type KisiEventSchemaType = Static<typeof KisiEventSchema>

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

export const KisiPlacesResponse = paginatedSchema(KisiPlaceSchema, 'KisiPlacesResponse')
export const KisiLocksResponse = paginatedSchema(KisiLockSchema, 'KisiLocksResponse')
export const KisiGroupsResponse = paginatedSchema(KisiGroupSchema, 'KisiGroupsResponse')
export const KisiMembersResponse = paginatedSchema(KisiMemberSchema, 'KisiMembersResponse')
export const KisiGroupLocksResponse = paginatedSchema(KisiGroupLockSchema, 'KisiGroupLocksResponse')
export const KisiEventsResponse = paginatedSchema(KisiEventSchema, 'KisiEventsResponse')

// ==================== Request / Operation Schemas ====================

export const KisiCreateGroupRequest = t.Object({
  name: t.String({ description: 'Group name', minLength: 1 }),
  description: t.Optional(t.String({ description: 'Group description' })),
}, { title: 'KisiCreateGroupRequest' })

export type KisiCreateGroupRequestType = Static<typeof KisiCreateGroupRequest>

export const KisiCreateMemberRequest = t.Object({
  email: t.String({ description: 'Member email', format: 'email' }),
  name: t.Optional(t.String({ description: 'Display name' })),
}, { title: 'KisiCreateMemberRequest' })

export type KisiCreateMemberRequestType = Static<typeof KisiCreateMemberRequest>

export const KisiAssignLockRequest = t.Object({
  groupId: t.Number({ description: 'Group ID' }),
  lockId: t.Number({ description: 'Lock ID' }),
}, { title: 'KisiAssignLockRequest' })

export type KisiAssignLockRequestType = Static<typeof KisiAssignLockRequest>

export const KisiUnlockRequest = t.Object({
  lockId: t.Number({ description: 'Lock ID to unlock' }),
}, { title: 'KisiUnlockRequest' })

export type KisiUnlockRequestType = Static<typeof KisiUnlockRequest>

// ==================== Sync Schemas ====================

export const KisiSyncRequest = t.Object({
  roleMappings: t.Optional(t.Array(t.Object({
    keycloakRole: t.String({ description: 'Keycloak role name (or partial match pattern)' }),
    kisiGroupId: t.Number({ description: 'Kisi group ID to assign' }),
  }), { description: 'Role-to-group mapping rules' })),
}, { title: 'KisiSyncRequest' })

export type KisiSyncRequestType = Static<typeof KisiSyncRequest>

export const KisiSyncResponse = t.Object({
  created: t.Array(t.String(), { description: 'Emails of newly created members' }),
  skipped: t.Array(t.String(), { description: 'Emails already existing in Kisi' }),
  failed: t.Array(t.Object({
    email: t.String(),
    error: t.String(),
  }), { description: 'Emails that failed to sync' }),
}, { title: 'KisiSyncResponse' })

export type KisiSyncResponseType = Static<typeof KisiSyncResponse>

// ==================== Overview ====================

export const KisiOverviewResponse = t.Object({
  places: KisiPlacesResponse,
  locks: KisiLocksResponse,
  groups: KisiGroupsResponse,
  members: KisiMembersResponse,
}, { title: 'KisiOverviewResponse' })

export type KisiOverviewResponseType = Static<typeof KisiOverviewResponse>

// ==================== Health ====================

export const KisiHealthResponse = t.Object({
  configured: t.Boolean({ description: 'Whether Kisi integration is configured' }),
  connected: t.Boolean({ description: 'Whether the Kisi API is reachable' }),
}, { title: 'KisiHealthResponse' })

export type KisiHealthResponseType = Static<typeof KisiHealthResponse>

// ==================== ID Param ====================

export const KisiIdParam = t.Object({
  id: t.Numeric({ description: 'Kisi entity ID' }),
})
