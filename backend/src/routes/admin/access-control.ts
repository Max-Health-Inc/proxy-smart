/**
 * Access Control Admin Routes
 * 
 * Provider-agnostic admin endpoints for managing physical access control.
 * Works with any AccessControlProvider backend (Kisi, UniFi Access, etc.)
 * 
 * Endpoints that require optional capabilities (groups, members, sync, events)
 * return 501 Not Implemented when the active provider doesn't support them.
 */

import { Elysia, t } from 'elysia'
import { accessControlPlugin } from '@/lib/access-control/plugin'
import { detectProvider } from '@/lib/access-control/factory'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'
import { ErrorResponse, PaginationQuery } from '@/schemas'
import {
  AccessLocationSchema,
  AccessLocationsResponse,
  AccessDoorSchema,
  AccessDoorsResponse,
  AccessGroupSchema,
  AccessGroupsResponse,
  AccessGroupDoorsResponse,
  AccessMemberSchema,
  AccessMembersResponse,
  AccessEventsResponse,
  AccessGroupDoorSchema,
  AccessEventSchema,
  CreateGroupRequest,
  CreateMemberRequest,
  AssignDoorRequest,
  SyncRequest,
  SyncResponse,
  OverviewResponse,
  AccessHealthResponse,
  IdParam,
} from '@/schemas/admin/access-control'
import type { SyncResponseType, AccessHealthResponseType } from '@/schemas/admin/access-control'
import type { ErrorResponseType } from '@/schemas'
import type { KeycloakUserIdentity } from '@/lib/access-control/types'

const TAG = 'access-control'
const NOT_SUPPORTED = { error: 'Not supported by current provider', details: 'This capability is not available with the active access control provider.' }

/**
 * Access Control admin routes — mounted under /admin/access-control
 */
export const accessControlRoutes = new Elysia({ prefix: '/access-control', tags: [TAG] })
  .use(accessControlPlugin)
  .use(keycloakPlugin)

  // ==================== Health ====================
  .get('/health', async ({ getAccessControl }): Promise<AccessHealthResponseType> => {
    const providerType = detectProvider()
    if (!providerType) {
      return { configured: false, connected: false }
    }
    try {
      const provider = getAccessControl()
      const connected = await provider.isHealthy()
      return {
        configured: true,
        connected,
        provider: provider.name,
        capabilities: provider.capabilities,
      }
    } catch {
      return { configured: true, connected: false, provider: providerType }
    }
  }, {
    response: { 200: AccessHealthResponse },
    detail: {
      summary: 'Access Control Health Check',
      description: 'Check if the access control provider is configured and reachable',
      tags: [TAG],
    }
  })

  // ==================== Overview ====================
  .get('/overview', async ({ getAccessControl, set }) => {
    try {
      const provider = getAccessControl()
      if (provider.getOverview) {
        return await provider.getOverview()
      }
      // Fallback: assemble manually from core + optional
      const [locations, doors] = await Promise.all([
        provider.getLocations({ limit: 100 }),
        provider.getDoors({ limit: 100 }),
      ])
      const groups = provider.getGroups ? await provider.getGroups({ limit: 100 }) : { data: [], pagination: { offset: 0, limit: 0, count: 0 } }
      const members = provider.getMembers ? await provider.getMembers({ limit: 100 }) : { data: [], pagination: { offset: 0, limit: 0, count: 0 } }
      return { locations, doors, groups, members }
    } catch (error) {
      logger.error('access-control', 'Failed to get overview', { error })
      set.status = 500
      return { error: 'Failed to get access control overview', details: String(error) }
    }
  }, {
    response: { 200: OverviewResponse, 500: ErrorResponse },
    detail: {
      summary: 'Access Control Overview',
      description: 'Get a high-level overview of all locations, doors, groups, and members',
      tags: [TAG],
    }
  })

  // ==================== Locations ====================
  .get('/locations', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getLocations({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list locations', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessLocationsResponse, 500: ErrorResponse },
    detail: { summary: 'List Locations', tags: [TAG] }
  })

  .get('/locations/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getLocation(params.id)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get location', details: String(error) }
    }
  }, {
    params: IdParam,
    response: { 200: AccessLocationSchema, 500: ErrorResponse },
    detail: { summary: 'Get Location', tags: [TAG] }
  })

  // ==================== Doors ====================
  .get('/doors', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getDoors({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list doors', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessDoorsResponse, 500: ErrorResponse },
    detail: { summary: 'List Doors', tags: [TAG] }
  })

  .get('/doors/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getDoor(params.id)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get door', details: String(error) }
    }
  }, {
    params: IdParam,
    response: { 200: AccessDoorSchema, 500: ErrorResponse },
    detail: { summary: 'Get Door', tags: [TAG] }
  })

  .post('/doors/:id/unlock', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.unlock(params.id)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to unlock', details: String(error) }
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ message: t.String() }),
      500: ErrorResponse,
    },
    detail: { summary: 'Unlock Door', description: 'Send an unlock command to a specific door', tags: [TAG] }
  })

  // ==================== Groups (optional) ====================
  .get('/groups', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroups) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroups({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list groups', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessGroupsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Groups', tags: [TAG] }
  })

  .get('/groups/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroup(params.id)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get group', details: String(error) }
    }
  }, {
    params: IdParam,
    response: { 200: AccessGroupSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Get Group', tags: [TAG] }
  })

  .post('/groups', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.createGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.createGroup(body.name, body.description)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to create group', details: String(error) }
    }
  }, {
    body: CreateGroupRequest,
    response: { 200: AccessGroupSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Create Group', tags: [TAG] }
  })

  .delete('/groups/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.deleteGroup) { set.status = 501; return NOT_SUPPORTED }
      await provider.deleteGroup(params.id)
      return { success: true, message: 'Group deleted' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to delete group', details: String(error) }
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Group', tags: [TAG] }
  })

  // ==================== Group ↔ Door (optional) ====================
  .get('/group-doors', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroupDoors) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroupDoors({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list group-door assignments', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessGroupDoorsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Group-Door Assignments', tags: [TAG] }
  })

  .post('/group-doors', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.assignDoorToGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.assignDoorToGroup(body.groupId, body.doorId)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to assign door to group', details: String(error) }
    }
  }, {
    body: AssignDoorRequest,
    response: { 200: AccessGroupDoorSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Assign Door to Group', tags: [TAG] }
  })

  .delete('/group-doors/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.removeDoorFromGroup) { set.status = 501; return NOT_SUPPORTED }
      await provider.removeDoorFromGroup(params.id)
      return { success: true, message: 'Door removed from group' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to remove door from group', details: String(error) }
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Remove Door from Group', tags: [TAG] }
  })

  // ==================== Members (optional) ====================
  .get('/members', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getMembers) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getMembers({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list members', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessMembersResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Members', tags: [TAG] }
  })

  .get('/members/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getMember) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getMember(params.id)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get member', details: String(error) }
    }
  }, {
    params: IdParam,
    response: { 200: AccessMemberSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Get Member', tags: [TAG] }
  })

  .post('/members', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.createMember) { set.status = 501; return NOT_SUPPORTED }
      return await provider.createMember(body.email, body.name)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to create member', details: String(error) }
    }
  }, {
    body: CreateMemberRequest,
    response: { 200: AccessMemberSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Create Member', tags: [TAG] }
  })

  .delete('/members/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.deleteMember) { set.status = 501; return NOT_SUPPORTED }
      await provider.deleteMember(params.id)
      return { success: true, message: 'Member deleted' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to delete member', details: String(error) }
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Member', tags: [TAG] }
  })

  // ==================== Events (optional) ====================
  .get('/events', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getEvents) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getEvents({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list events', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessEventsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Access Events', description: 'Retrieve physical access audit log', tags: [TAG] }
  })

  // ==================== Keycloak Sync (optional) ====================
  .post('/sync', async ({ getAccessControl, getAdmin, headers, body, set }): Promise<SyncResponseType | ErrorResponseType> => {
    try {
      const provider = getAccessControl()
      if (!provider.syncUsersFromKeycloak) {
        set.status = 501
        return NOT_SUPPORTED
      }

      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)

      // Fetch all Keycloak users
      const keycloakUsers = await admin.users.find({ max: 500 })

      const identities: KeycloakUserIdentity[] = await Promise.all(
        keycloakUsers.map(async (user) => {
          let roles: string[] = []
          try {
            const roleMappings = await admin.users.listRealmRoleMappings({ id: user.id! })
            roles = roleMappings.map(r => r.name || '').filter(Boolean)
          } catch {
            logger.warn('access-control', `Failed to fetch roles for user ${user.email}`)
          }

          return {
            id: user.id!,
            email: user.email || '',
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            roles,
          }
        })
      )

      const validUsers = identities.filter(u => u.email)
      const result = await provider.syncUsersFromKeycloak(validUsers, body.roleMappings)
      return result
    } catch (error) {
      logger.error('access-control', 'Sync failed', { error })
      set.status = 500
      return { error: 'Keycloak sync failed', details: String(error) }
    }
  }, {
    body: SyncRequest,
    response: { 200: SyncResponse, 401: ErrorResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: {
      summary: 'Sync Users from Keycloak',
      description: 'Sync all Keycloak realm users to the access control provider. Optionally map Keycloak roles to access groups.',
      tags: [TAG],
    }
  })
