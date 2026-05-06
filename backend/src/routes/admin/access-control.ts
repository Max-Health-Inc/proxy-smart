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
import { accessControlPlugin, resetAccessControlPlugin } from '@/lib/access-control/plugin'
import { detectProvider, createProvider } from '@/lib/access-control/factory'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin, ConfigurationError } from '@/lib/admin-utils'
import { handleAdminError } from '@/lib/admin-error-handler'
import { validateToken, validateAdminToken } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { config } from '@/config'
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
  CreateGroupRequest,
  CreateMemberRequest,
  AssignDoorRequest,
  SyncRequest,
  SyncResponse,
  OverviewResponse,
  AccessHealthResponse,
  AccessControlConfigStatus,
  TestAccessControlConfigRequest,
  TestAccessControlConfigResponse,
  SaveAccessControlConfigRequest,
  SaveAccessControlConfigResponse,
  IdParam,
} from '@/schemas/admin/access-control'
import type { SyncResponseType, AccessHealthResponseType, TestAccessControlConfigResponseType, SaveAccessControlConfigResponseType } from '@/schemas/admin/access-control'
import type { ErrorResponseType } from '@/schemas'
import type { KeycloakUserIdentity, AccessControlProvider, AccessMember, AccessGroupDoor } from '@/lib/access-control/types'
import fs from 'fs'
import path from 'path'

type DecisionEventRecorder = {
  recordDecisionEvent?: (input: {
    allowed: boolean
    actorEmail?: string
    actorId?: string
    doorId: string
    reason: string
  }) => void
}

const TAG = 'access-control'
const TAGS = ['admin', TAG]
const NOT_SUPPORTED = { error: 'Not supported by current provider', details: 'This capability is not available with the active access control provider.' }

const ENV_FILE_PATH = path.join(process.cwd(), '.env')

async function getAllMembers(provider: AccessControlProvider): Promise<AccessMember[]> {
  if (!provider.getMembers) return []

  const data: AccessMember[] = []
  let offset = 0
  const batchSize = 200

  while (true) {
    const page = await provider.getMembers({ limit: batchSize, offset })
    data.push(...page.data)
    offset += page.data.length

    if (page.data.length === 0 || offset >= page.pagination.count) {
      break
    }
  }

  return data
}

async function getAllGroupDoors(provider: AccessControlProvider): Promise<AccessGroupDoor[]> {
  if (!provider.getGroupDoors) return []

  const data: AccessGroupDoor[] = []
  let offset = 0
  const batchSize = 200

  while (true) {
    const page = await provider.getGroupDoors({ limit: batchSize, offset })
    data.push(...page.data)
    offset += page.data.length

    if (page.data.length === 0 || offset >= page.pagination.count) {
      break
    }
  }

  return data
}

/**
 * Update access control environment variables in .env file and process.env
 */
function updateAccessControlConfig(body: {
  provider: 'kisi' | 'unifi-access'
  kisiApiKey?: string
  kisiBaseUrl?: string
  unifiHost?: string
  unifiUsername?: string
  unifiPassword?: string
}): void {
  let envContent = ''
  if (fs.existsSync(ENV_FILE_PATH)) {
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
  }

  // Parse existing env vars, preserving comments and structure
  const envVars = new Map<string, string>()
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        envVars.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim())
      }
    }
  })

  // Set provider
  envVars.set('ACCESS_CONTROL_PROVIDER', body.provider)
  process.env.ACCESS_CONTROL_PROVIDER = body.provider

  if (body.provider === 'kisi') {
    if (body.kisiApiKey) {
      envVars.set('KISI_API_KEY', body.kisiApiKey)
      process.env.KISI_API_KEY = body.kisiApiKey
    }
    if (body.kisiBaseUrl) {
      envVars.set('KISI_BASE_URL', body.kisiBaseUrl)
      process.env.KISI_BASE_URL = body.kisiBaseUrl
    }
  } else {
    if (body.unifiHost) {
      envVars.set('UNIFI_ACCESS_HOST', body.unifiHost)
      process.env.UNIFI_ACCESS_HOST = body.unifiHost
    }
    if (body.unifiUsername) {
      envVars.set('UNIFI_ACCESS_USERNAME', body.unifiUsername)
      process.env.UNIFI_ACCESS_USERNAME = body.unifiUsername
    }
    if (body.unifiPassword) {
      envVars.set('UNIFI_ACCESS_PASSWORD', body.unifiPassword)
      process.env.UNIFI_ACCESS_PASSWORD = body.unifiPassword
    }
  }

  // Rebuild .env – keep all existing keys, overwrite the ones we touched
  const lines: string[] = []
  for (const [key, value] of envVars) {
    lines.push(`${key}=${value}`)
  }
  fs.writeFileSync(ENV_FILE_PATH, lines.join('\n') + '\n')
}

/**
 * Access Control admin routes — mounted under /admin/access-control
 */
export const accessControlRoutes = new Elysia({ prefix: '/access-control', tags: TAGS })
  .use(accessControlPlugin)
  .use(keycloakPlugin)
  .onError(({ error, set }) => {
    if (error instanceof ConfigurationError) {
      set.status = 503
      return { error: 'Access control not configured', details: error.message }
    }
  })

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
      tags: TAGS,
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
      return handleAdminError(error, set)
    }
  }, {
    response: { 200: OverviewResponse, 500: ErrorResponse },
    detail: {
      summary: 'Access Control Overview',
      description: 'Get a high-level overview of all locations, doors, groups, and members',
      tags: TAGS,
    }
  })

  // ==================== Locations ====================
  .get('/locations', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getLocations({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessLocationsResponse, 500: ErrorResponse },
    detail: { summary: 'List Locations', tags: TAGS }
  })

  .get('/locations/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getLocation(params.id)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: { 200: AccessLocationSchema, 500: ErrorResponse },
    detail: { summary: 'Get Location', tags: TAGS }
  })

  // ==================== Doors ====================
  .get('/doors', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getDoors({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessDoorsResponse, 500: ErrorResponse },
    detail: { summary: 'List Doors', tags: TAGS }
  })

  .get('/doors/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      return await provider.getDoor(params.id)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: { 200: AccessDoorSchema, 500: ErrorResponse },
    detail: { summary: 'Get Door', tags: TAGS }
  })

  .post('/doors/:id/unlock', async ({ getAccessControl, params, headers, set }) => {
    try {
      const provider = getAccessControl()
      const decisionRecorder = provider as AccessControlProvider & DecisionEventRecorder

      // Enforce group-based unlock authorization for UniFi before unlock execution.
      if (provider.name === 'unifi-access' && provider.getMembers && provider.getGroupDoors) {
        const token = extractBearerToken(headers)
        if (!token) {
          decisionRecorder.recordDecisionEvent?.({
            allowed: false,
            doorId: params.id,
            reason: 'Unlock denied: missing bearer token',
          })
          set.status = 401
          return UNAUTHORIZED_RESPONSE
        }

        const jwtPayload = await validateToken(token)
        const actorEmail = typeof jwtPayload.email === 'string'
          ? jwtPayload.email.toLowerCase()
          : null
        const actorId = typeof jwtPayload.sub === 'string' ? jwtPayload.sub : undefined

        if (!actorEmail) {
          decisionRecorder.recordDecisionEvent?.({
            allowed: false,
            actorId,
            doorId: params.id,
            reason: 'Unlock denied: token missing email claim',
          })
          set.status = 403
          return { error: 'Unlock denied', details: 'Token does not include a user email claim.' }
        }

        const [members, groupDoors] = await Promise.all([
          getAllMembers(provider),
          getAllGroupDoors(provider),
        ])

        const member = members.find(m => m.email.toLowerCase() === actorEmail && (m.enabled ?? true))
        if (!member) {
          decisionRecorder.recordDecisionEvent?.({
            allowed: false,
            actorEmail,
            actorId,
            doorId: params.id,
            reason: 'Unlock denied: no active door management membership',
          })
          set.status = 403
          return { error: 'Unlock denied', details: 'No active door management membership found for this user.' }
        }

        const memberGroupIds = new Set(member.groupIds ?? [])
        const allowed = groupDoors.some(link => link.doorId === params.id && memberGroupIds.has(link.groupId))

        if (!allowed) {
          logger.warn('access-control', 'Unlock denied by group policy', {
            provider: provider.name,
            actorEmail,
            doorId: params.id,
            memberGroupIds: Array.from(memberGroupIds),
          })
          decisionRecorder.recordDecisionEvent?.({
            allowed: false,
            actorEmail,
            actorId,
            doorId: params.id,
            reason: 'Unlock denied: user has no group assignment for this door',
          })
          set.status = 403
          return { error: 'Unlock denied', details: 'User is not authorized for this door.' }
        }

        decisionRecorder.recordDecisionEvent?.({
          allowed: true,
          actorEmail,
          actorId,
          doorId: params.id,
          reason: 'Unlock allowed: user group mapped to door',
        })
      }

      return await provider.unlock(params.id)
    } catch (error) {
      const provider = getAccessControl()
      const decisionRecorder = provider as AccessControlProvider & DecisionEventRecorder
      decisionRecorder.recordDecisionEvent?.({
        allowed: false,
        doorId: params.id,
        reason: `Unlock denied: runtime error (${String(error)})`,
      })
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ message: t.String() }),
      401: ErrorResponse,
      403: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Unlock Door', description: 'Send an unlock command to a specific door', tags: TAGS }
  })

  // ==================== Groups (optional) ====================
  .get('/groups', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroups) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroups({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessGroupsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Groups', tags: TAGS }
  })

  .get('/groups/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroup(params.id)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: { 200: AccessGroupSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Get Group', tags: TAGS }
  })

  .post('/groups', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.createGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.createGroup(body.name, body.description)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: CreateGroupRequest,
    response: { 200: AccessGroupSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Create Group', tags: TAGS }
  })

  .delete('/groups/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.deleteGroup) { set.status = 501; return NOT_SUPPORTED }
      await provider.deleteGroup(params.id)
      return { success: true, message: 'Group deleted' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Group', tags: TAGS }
  })

  // ==================== Group ↔ Door (optional) ====================
  .get('/group-doors', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getGroupDoors) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getGroupDoors({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessGroupDoorsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Group-Door Assignments', tags: TAGS }
  })

  .post('/group-doors', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.assignDoorToGroup) { set.status = 501; return NOT_SUPPORTED }
      return await provider.assignDoorToGroup(body.groupId, body.doorId)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: AssignDoorRequest,
    response: { 200: AccessGroupDoorSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Assign Door to Group', tags: TAGS }
  })

  .delete('/group-doors/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.removeDoorFromGroup) { set.status = 501; return NOT_SUPPORTED }
      await provider.removeDoorFromGroup(params.id)
      return { success: true, message: 'Door removed from group' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Remove Door from Group', tags: TAGS }
  })

  // ==================== Members (optional) ====================
  .get('/members', async ({ getAccessControl, query, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getMembers) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getMembers({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessMembersResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Members', tags: TAGS }
  })

  .get('/members/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.getMember) { set.status = 501; return NOT_SUPPORTED }
      return await provider.getMember(params.id)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: { 200: AccessMemberSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Get Member', tags: TAGS }
  })

  .post('/members', async ({ getAccessControl, body, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.createMember) { set.status = 501; return NOT_SUPPORTED }
      return await provider.createMember(body.email, body.name)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: CreateMemberRequest,
    response: { 200: AccessMemberSchema, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'Create Member', tags: TAGS }
  })

  .delete('/members/:id', async ({ getAccessControl, params, set }) => {
    try {
      const provider = getAccessControl()
      if (!provider.deleteMember) { set.status = 501; return NOT_SUPPORTED }
      await provider.deleteMember(params.id)
      return { success: true, message: 'Member deleted' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: IdParam,
    response: {
      200: t.Object({ success: t.Boolean(), message: t.String() }),
      501: ErrorResponse,
      500: ErrorResponse,
    },
    detail: { summary: 'Delete Member', tags: TAGS }
  })

  // ==================== Events (optional) ====================
  .get('/events', async ({ getAccessControl, query, set }) => {
    const provider = getAccessControl()
    if (!provider.getEvents) { set.status = 501; return NOT_SUPPORTED }
    try {
      return await provider.getEvents({ limit: query.limit, offset: query.offset })
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: { 200: AccessEventsResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: { summary: 'List Access Events', description: 'Retrieve physical access audit log', tags: TAGS }
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
      return handleAdminError(error, set)
    }
  }, {
    body: SyncRequest,
    response: { 200: SyncResponse, 401: ErrorResponse, 501: ErrorResponse, 500: ErrorResponse },
    detail: {
      summary: 'Sync Users from Keycloak',
      description: 'Sync all Keycloak realm users to the access control provider. Optionally map Keycloak roles to access groups.',
      tags: TAGS,
    }
  })

  // ==================== Configuration ====================

  .get('/config/status', async ({ headers, set }) => {
    const token = extractBearerToken(headers)
    if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }
    await validateAdminToken(token)
    const providerType = detectProvider()
    return {
      configured: !!providerType,
      provider: providerType,
      kisi: {
        hasApiKey: !!config.kisi.apiKey,
        baseUrl: config.kisi.baseUrl,
      },
      unifiAccess: {
        hasHost: !!config.unifiAccess.host,
        hasCredentials: !!(config.unifiAccess.username && config.unifiAccess.password),
        host: config.unifiAccess.host ? config.unifiAccess.host.replace(/\/\/([^:]+):?.*@/, '//$1:***@') : null,
      },
    }
  }, {
    response: { 200: AccessControlConfigStatus, 401: ErrorResponse },
    detail: {
      summary: 'Get Door Management Config Status',
      description: 'Get current door management provider configuration status (credentials are redacted)',
      tags: TAGS,
    }
  })

  .post('/config/test', async ({ body, set, headers }): Promise<TestAccessControlConfigResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { success: false, error: 'Bearer token required' } }
      await validateAdminToken(token)
      // Temporarily set env vars to test the provider
      const originalEnv: Record<string, string | undefined> = {}
      const envKeys = ['ACCESS_CONTROL_PROVIDER', 'KISI_API_KEY', 'KISI_BASE_URL', 'UNIFI_ACCESS_HOST', 'UNIFI_ACCESS_USERNAME', 'UNIFI_ACCESS_PASSWORD']
      for (const key of envKeys) {
        originalEnv[key] = process.env[key]
      }

      try {
        process.env.ACCESS_CONTROL_PROVIDER = body.provider
        if (body.provider === 'kisi') {
          if (body.kisiApiKey) process.env.KISI_API_KEY = body.kisiApiKey
          if (body.kisiBaseUrl) process.env.KISI_BASE_URL = body.kisiBaseUrl
        } else {
          if (body.unifiHost) process.env.UNIFI_ACCESS_HOST = body.unifiHost
          if (body.unifiUsername) process.env.UNIFI_ACCESS_USERNAME = body.unifiUsername
          if (body.unifiPassword) process.env.UNIFI_ACCESS_PASSWORD = body.unifiPassword
        }

        const provider = createProvider(body.provider)
        const healthy = await provider.isHealthy()

        if (!healthy) {
          set.status = 400
          return { success: false, error: 'Provider is reachable but health check failed' }
        }

        return {
          success: true,
          message: `Successfully connected to ${body.provider} provider`,
          provider: provider.name,
          capabilities: provider.capabilities,
        }
      } finally {
        // Restore original env vars
        for (const key of envKeys) {
          if (originalEnv[key] === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = originalEnv[key]
          }
        }
      }
    } catch (error) {
      logger.error('access-control', 'Config test failed', { error })
      set.status = 400
      return { success: false, error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}` }
    }
  }, {
    body: TestAccessControlConfigRequest,
    response: { 200: TestAccessControlConfigResponse, 400: TestAccessControlConfigResponse },
    detail: {
      summary: 'Test Door Management Config',
      description: 'Test connection to a door management provider without saving configuration',
      tags: TAGS,
    }
  })

  .post('/config/configure', async ({ body, set, headers }): Promise<SaveAccessControlConfigResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { success: false, error: 'Bearer token required' } }
      await validateAdminToken(token)
      // First test the connection with the provided credentials
      const originalEnv: Record<string, string | undefined> = {}
      const envKeys = ['ACCESS_CONTROL_PROVIDER', 'KISI_API_KEY', 'KISI_BASE_URL', 'UNIFI_ACCESS_HOST', 'UNIFI_ACCESS_USERNAME', 'UNIFI_ACCESS_PASSWORD']
      for (const key of envKeys) {
        originalEnv[key] = process.env[key]
      }

      let testPassed = false
      try {
        process.env.ACCESS_CONTROL_PROVIDER = body.provider
        if (body.provider === 'kisi') {
          if (body.kisiApiKey) process.env.KISI_API_KEY = body.kisiApiKey
          if (body.kisiBaseUrl) process.env.KISI_BASE_URL = body.kisiBaseUrl
        } else {
          if (body.unifiHost) process.env.UNIFI_ACCESS_HOST = body.unifiHost
          if (body.unifiUsername) process.env.UNIFI_ACCESS_USERNAME = body.unifiUsername
          if (body.unifiPassword) process.env.UNIFI_ACCESS_PASSWORD = body.unifiPassword
        }

        const provider = createProvider(body.provider)
        testPassed = await provider.isHealthy()
      } finally {
        // Restore before deciding
        for (const key of envKeys) {
          if (originalEnv[key] === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = originalEnv[key]
          }
        }
      }

      if (!testPassed) {
        set.status = 400
        return { success: false, error: 'Connection test failed. Please verify your credentials.' }
      }

      // Persist config to .env and process.env
      updateAccessControlConfig(body)

      // Reset cached provider so it picks up new config
      resetAccessControlPlugin()

      logger.admin.info('Door management provider configured', { provider: body.provider })

      return {
        success: true,
        message: `${body.provider} provider configured successfully`,
        restartRequired: false,
      }
    } catch (error) {
      logger.error('access-control', 'Failed to configure provider', { error })
      set.status = 500
      return { success: false, error: `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}` }
    }
  }, {
    body: SaveAccessControlConfigRequest,
    response: { 200: SaveAccessControlConfigResponse, 400: SaveAccessControlConfigResponse, 500: SaveAccessControlConfigResponse },
    detail: {
      summary: 'Configure Door Management Provider',
      description: 'Save door management provider configuration. Tests connection first, then persists to environment.',
      tags: TAGS,
    }
  })
