/**
 * Kisi Access Control Admin Routes
 * 
 * Admin endpoints for managing physical access control via Kisi.
 * Provides CRUD for places, locks, groups, members, events,
 * and Keycloak → Kisi user sync.
 */

import { Elysia, t } from 'elysia'
import { kisiPlugin } from '@/lib/kisi/plugin'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'
import { config } from '@/config'
import { ErrorResponse, PaginationQuery } from '@/schemas'
import {
  KisiPlaceSchema,
  KisiPlacesResponse,
  KisiLockSchema,
  KisiLocksResponse,
  KisiGroupSchema,
  KisiGroupsResponse,
  KisiGroupLocksResponse,
  KisiMemberSchema,
  KisiMembersResponse,
  KisiEventsResponse,
  KisiGroupLockSchema,
  KisiEventSchema,
  KisiCreateGroupRequest,
  KisiCreateMemberRequest,
  KisiAssignLockRequest,
  KisiSyncRequest,
  KisiSyncResponse,
  KisiOverviewResponse,
  KisiHealthResponse,
  KisiIdParam,
} from '@/schemas/admin/access-control'
import type { KisiSyncResponseType, KisiHealthResponseType } from '@/schemas/admin/access-control'
import type { ErrorResponseType } from '@/schemas'
import type { KeycloakUserIdentity } from '@/lib/kisi/service'

const TAG = 'access-control'

/**
 * Access Control (Kisi) admin routes — mounted under /admin/access-control
 */
export const accessControlRoutes = new Elysia({ prefix: '/access-control', tags: [TAG] })
  .use(kisiPlugin)
  .use(keycloakPlugin)

  // ==================== Health ====================
  .get('/health', async ({ getKisi }): Promise<KisiHealthResponseType> => {
    const configured = config.kisi.isConfigured
    if (!configured) {
      return { configured: false, connected: false }
    }
    try {
      const kisi = getKisi()
      const connected = await kisi.isHealthy()
      return { configured: true, connected }
    } catch {
      return { configured: true, connected: false }
    }
  }, {
    response: { 200: KisiHealthResponse },
    detail: {
      summary: 'Kisi Health Check',
      description: 'Check if the Kisi integration is configured and reachable',
      tags: [TAG],
    }
  })

  // ==================== Overview ====================
  .get('/overview', async ({ getKisi, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getOverview()
    } catch (error) {
      logger.error('kisi', 'Failed to get overview', { error })
      set.status = 500
      return { error: 'Failed to get Kisi overview', details: String(error) }
    }
  }, {
    response: { 200: KisiOverviewResponse, 500: ErrorResponse },
    detail: {
      summary: 'Access Control Overview',
      description: 'Get a high-level overview of all places, locks, groups, and members',
      tags: [TAG],
    }
  })

  // ==================== Places ====================
  .get('/places', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getPlaces({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list places', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiPlacesResponse, 500: ErrorResponse },
    detail: { summary: 'List Places', tags: [TAG] }
  })

  .get('/places/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getPlace(Number(params.id))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get place', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: { 200: KisiPlaceSchema, 500: ErrorResponse },
    detail: { summary: 'Get Place', tags: [TAG] }
  })

  // ==================== Locks ====================
  .get('/locks', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getLocks({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list locks', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiLocksResponse, 500: ErrorResponse },
    detail: { summary: 'List Locks', tags: [TAG] }
  })

  .get('/locks/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getLock(Number(params.id))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get lock', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: { 200: KisiLockSchema, 500: ErrorResponse },
    detail: { summary: 'Get Lock', tags: [TAG] }
  })

  .post('/locks/:id/unlock', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.unlock(Number(params.id))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to unlock', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: {
      200: t.Object({ message: t.String() }),
      500: ErrorResponse,
    },
    detail: { summary: 'Unlock Door', description: 'Send an unlock command to a specific lock', tags: [TAG] }
  })

  // ==================== Groups ====================
  .get('/groups', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getGroups({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list groups', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiGroupsResponse, 500: ErrorResponse },
    detail: { summary: 'List Groups', tags: [TAG] }
  })

  .get('/groups/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getGroup(Number(params.id))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get group', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: { 200: KisiGroupSchema, 500: ErrorResponse },
    detail: { summary: 'Get Group', tags: [TAG] }
  })

  .post('/groups', async ({ getKisi, body, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.createGroup(body.name, body.description)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to create group', details: String(error) }
    }
  }, {
    body: KisiCreateGroupRequest,
    response: { 200: KisiGroupSchema, 500: ErrorResponse },
    detail: { summary: 'Create Group', tags: [TAG] }
  })

  .delete('/groups/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      await kisi.deleteGroup(Number(params.id))
      return { success: true, message: 'Group deleted' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to delete group', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Group', tags: [TAG] }
  })

  // ==================== Group ↔ Lock ====================
  .get('/group-locks', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getGroupLocks({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list group-lock assignments', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiGroupLocksResponse, 500: ErrorResponse },
    detail: { summary: 'List Group-Lock Assignments', tags: [TAG] }
  })

  .post('/group-locks', async ({ getKisi, body, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.assignLockToGroup(body.groupId, body.lockId)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to assign lock to group', details: String(error) }
    }
  }, {
    body: KisiAssignLockRequest,
    response: { 200: KisiGroupLockSchema, 500: ErrorResponse },
    detail: { summary: 'Assign Lock to Group', tags: [TAG] }
  })

  .delete('/group-locks/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      await kisi.removeLockFromGroup(Number(params.id))
      return { success: true, message: 'Lock removed from group' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to remove lock from group', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      500: ErrorResponse,
    },
    detail: { summary: 'Remove Lock from Group', tags: [TAG] }
  })

  // ==================== Members ====================
  .get('/members', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getMembers({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list members', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiMembersResponse, 500: ErrorResponse },
    detail: { summary: 'List Members', tags: [TAG] }
  })

  .get('/members/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getMember(Number(params.id))
    } catch (error) {
      set.status = 500
      return { error: 'Failed to get member', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: { 200: KisiMemberSchema, 500: ErrorResponse },
    detail: { summary: 'Get Member', tags: [TAG] }
  })

  .post('/members', async ({ getKisi, body, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.createMember(body.email, body.name)
    } catch (error) {
      set.status = 500
      return { error: 'Failed to create member', details: String(error) }
    }
  }, {
    body: KisiCreateMemberRequest,
    response: { 200: KisiMemberSchema, 500: ErrorResponse },
    detail: { summary: 'Create Member', tags: [TAG] }
  })

  .delete('/members/:id', async ({ getKisi, params, set }) => {
    try {
      const kisi = getKisi()
      await kisi.deleteMember(Number(params.id))
      return { success: true, message: 'Member deleted' }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to delete member', details: String(error) }
    }
  }, {
    params: KisiIdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Member', tags: [TAG] }
  })

  // ==================== Events (Audit Log) ====================
  .get('/events', async ({ getKisi, query, set }) => {
    try {
      const kisi = getKisi()
      return await kisi.getEvents({ limit: query.limit, offset: query.offset })
    } catch (error) {
      set.status = 500
      return { error: 'Failed to list events', details: String(error) }
    }
  }, {
    query: PaginationQuery,
    response: { 200: KisiEventsResponse, 500: ErrorResponse },
    detail: { summary: 'List Access Events', description: 'Retrieve physical access audit log from Kisi', tags: [TAG] }
  })

  // ==================== Keycloak → Kisi Sync ====================
  .post('/sync', async ({ getKisi, getAdmin, headers, body, set }): Promise<KisiSyncResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      const kisi = getKisi()

      // Fetch all Keycloak users
      const keycloakUsers = await admin.users.find({ max: 500 })
      
      const identities: KeycloakUserIdentity[] = await Promise.all(
        keycloakUsers.map(async (user) => {
          // Fetch realm role mappings for this user
          let roles: string[] = []
          try {
            const roleMappings = await admin.users.listRealmRoleMappings({ id: user.id! })
            roles = roleMappings.map(r => r.name || '').filter(Boolean)
          } catch {
            logger.warn('kisi', `Failed to fetch roles for user ${user.email}`)
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

      // Filter to users with email addresses
      const validUsers = identities.filter(u => u.email)

      const result = await kisi.syncUsersFromKeycloak(validUsers, body.roleMappings)
      return result
    } catch (error) {
      logger.error('kisi', 'Sync failed', { error })
      set.status = 500
      return { error: 'Keycloak→Kisi sync failed', details: String(error) }
    }
  }, {
    body: KisiSyncRequest,
    response: { 200: KisiSyncResponse, 401: ErrorResponse, 500: ErrorResponse },
    detail: {
      summary: 'Sync Users from Keycloak',
      description: 'Sync all Keycloak realm users to Kisi members. Optionally map Keycloak roles to Kisi groups.',
      tags: [TAG],
    }
  })
