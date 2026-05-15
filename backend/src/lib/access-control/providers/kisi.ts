/**
 * Kisi Access Control Provider
 * 
 * Adapts the existing KisiClient + KisiService into the
 * generic AccessControlProvider interface. Kisi supports all
 * capabilities: groups, members, events, sync.
 */

import { type KisiClient, KisiApiError } from '../../kisi/client'
import type {
  KisiPlace, KisiLock, KisiGroup, KisiMember,
  KisiGroupLock, KisiEvent, KisiListParams
} from '../../kisi/client'
import { logger } from '../../logger'
import type {
  AccessControlProvider, ProviderCapabilities,
  AccessLocation, AccessDoor, AccessGroup, AccessMember,
  AccessGroupDoor, AccessEvent, AccessOverview,
  ListParams, PaginatedResponse,
  KeycloakUserIdentity, RoleMappingRule, SyncResult
} from '../types'

// ==================== Mappers (Kisi → Generic) ====================

function mapPlace(p: KisiPlace): AccessLocation {
  return {
    id: String(p.id),
    name: p.name,
    address: p.address,
    description: p.description,
    metadata: {
      latitude: p.latitude,
      longitude: p.longitude,
      timeZone: p.timeZone,
      organizationId: p.organizationId,
    },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function mapLock(l: KisiLock): AccessDoor {
  return {
    id: String(l.id),
    name: l.name,
    locationId: String(l.placeId),
    description: l.description,
    online: l.online,
    locked: l.locked,
    type: l.type,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }
}

function mapGroup(g: KisiGroup): AccessGroup {
  return {
    id: String(g.id),
    name: g.name,
    description: g.description,
    locationId: g.placeId ? String(g.placeId) : undefined,
    metadata: { organizationId: g.organizationId },
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }
}

function mapMember(m: KisiMember): AccessMember {
  return {
    id: String(m.id),
    name: m.name,
    email: m.email,
    groupIds: m.groupIds?.map(String),
    confirmed: m.confirmed,
    enabled: m.enabled,
    metadata: { organizationId: m.organizationId },
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

function mapGroupLock(gl: KisiGroupLock): AccessGroupDoor {
  return {
    id: String(gl.id),
    groupId: String(gl.groupId),
    doorId: String(gl.lockId),
    createdAt: gl.createdAt,
    updatedAt: gl.updatedAt,
  }
}

function mapEvent(e: KisiEvent): AccessEvent {
  return {
    id: String(e.id),
    action: e.action,
    actorType: e.actorType,
    actorId: e.actorId ? String(e.actorId) : undefined,
    actorEmail: e.actorEmail,
    objectType: e.objectType,
    objectId: e.objectId ? String(e.objectId) : undefined,
    doorId: e.lockId ? String(e.lockId) : undefined,
    message: e.message,
    createdAt: e.createdAt,
  }
}

function mapPaginated<TIn, TOut>(
  response: { data: TIn[]; pagination: { offset: number; limit: number; count: number } },
  mapper: (item: TIn) => TOut
): PaginatedResponse<TOut> {
  return {
    data: response.data.map(mapper),
    pagination: response.pagination,
  }
}

// ==================== Provider ====================

export class KisiAccessProvider implements AccessControlProvider {
  readonly name = 'kisi' as const
  readonly displayName = 'Kisi'
  readonly capabilities: ProviderCapabilities = {
    groups: true,
    members: true,
    sync: true,
    events: true,
    groupDoors: true,
    realtime: false, // Kisi uses webhooks, not persistent WS
  }

  constructor(private readonly client: KisiClient) {}

  // ---- Core ----

  async isHealthy(): Promise<boolean> {
    return this.client.ping()
  }

  async getLocations(params?: ListParams): Promise<PaginatedResponse<AccessLocation>> {
    const res = await this.client.getPlaces(params as KisiListParams)
    return mapPaginated(res, mapPlace)
  }

  async getLocation(id: string): Promise<AccessLocation> {
    return mapPlace(await this.client.getPlace(Number(id)))
  }

  async getDoors(params?: ListParams): Promise<PaginatedResponse<AccessDoor>> {
    const res = await this.client.getLocks(params as KisiListParams & { placeId?: number })
    return mapPaginated(res, mapLock)
  }

  async getDoor(id: string): Promise<AccessDoor> {
    return mapLock(await this.client.getLock(Number(id)))
  }

  async unlock(doorId: string): Promise<{ message: string }> {
    logger.info('kisi', `Unlock requested for lock ${doorId}`)
    return this.client.unlock(Number(doorId))
  }

  // ---- Groups ----

  async getGroups(params?: ListParams): Promise<PaginatedResponse<AccessGroup>> {
    const res = await this.client.getGroups(params as KisiListParams)
    return mapPaginated(res, mapGroup)
  }

  async getGroup(id: string): Promise<AccessGroup> {
    return mapGroup(await this.client.getGroup(Number(id)))
  }

  async createGroup(name: string, description?: string): Promise<AccessGroup> {
    return mapGroup(await this.client.createGroup({ name, description }))
  }

  async deleteGroup(id: string): Promise<void> {
    return this.client.deleteGroup(Number(id))
  }

  // ---- Group ↔ Door ----

  async getGroupDoors(params?: ListParams): Promise<PaginatedResponse<AccessGroupDoor>> {
    const res = await this.client.getGroupLocks(params as KisiListParams & { groupId?: number })
    return mapPaginated(res, mapGroupLock)
  }

  async assignDoorToGroup(groupId: string, doorId: string): Promise<AccessGroupDoor> {
    return mapGroupLock(await this.client.assignLockToGroup(Number(groupId), Number(doorId)))
  }

  async removeDoorFromGroup(id: string): Promise<void> {
    return this.client.removeLockFromGroup(Number(id))
  }

  // ---- Members ----

  async getMembers(params?: ListParams): Promise<PaginatedResponse<AccessMember>> {
    const res = await this.client.getMembers(params as KisiListParams)
    return mapPaginated(res, mapMember)
  }

  async getMember(id: string): Promise<AccessMember> {
    return mapMember(await this.client.getMember(Number(id)))
  }

  async createMember(email: string, name?: string): Promise<AccessMember> {
    return mapMember(await this.client.createMember({ email, name }))
  }

  async deleteMember(id: string): Promise<void> {
    return this.client.deleteMember(Number(id))
  }

  // ---- Events ----

  async getEvents(params?: ListParams): Promise<PaginatedResponse<AccessEvent>> {
    const res = await this.client.getEvents(params as KisiListParams & { lockId?: number; actorEmail?: string })
    return mapPaginated(res, mapEvent)
  }

  // ---- Overview ----

  async getOverview(): Promise<AccessOverview> {
    const [locations, doors, groups, members] = await Promise.all([
      this.getLocations({ limit: 100 }),
      this.getDoors({ limit: 100 }),
      this.getGroups({ limit: 100 }),
      this.getMembers({ limit: 100 }),
    ])
    return { locations, doors, groups, members }
  }

  // ---- Keycloak Sync ----

  async syncUsersFromKeycloak(
    users: KeycloakUserIdentity[],
    roleMappings?: RoleMappingRule[]
  ): Promise<SyncResult> {
    const result: SyncResult = { created: [], skipped: [], failed: [] }

    // Get existing Kisi members for dedup
    const existingMembers = await this.client.getMembers({ limit: 500 })
    const existingEmails = new Set(existingMembers.data.map(m => m.email.toLowerCase()))

    for (const user of users) {
      const email = user.email.toLowerCase()

      if (existingEmails.has(email)) {
        result.skipped.push(email)
        continue
      }

      try {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || email
        const member = await this.client.createMember({ email, name })
        result.created.push(email)

        // Assign groups based on role mappings
        if (roleMappings && user.roles) {
          await this.assignGroupsByRoles(member.id, user.roles, roleMappings)
        }

        logger.info('kisi', `Synced user ${email} → Kisi member ${member.id}`)
      } catch (error) {
        const message = error instanceof KisiApiError ? error.reason || error.message : String(error)
        result.failed.push({ email, error: message })
        logger.warn('kisi', `Failed to sync user ${email}`, { error: message })
      }
    }

    logger.info('kisi', 'User sync complete', {
      created: result.created.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
    })

    return result
  }

  private async assignGroupsByRoles(
    memberId: number,
    userRoles: string[],
    rules: RoleMappingRule[]
  ): Promise<void> {
    const groupIds = new Set<string>()

    for (const rule of rules) {
      const pattern = rule.keycloakRole.toLowerCase()
      if (userRoles.some(role => role.toLowerCase().includes(pattern))) {
        groupIds.add(rule.groupId)
      }
    }

    if (groupIds.size > 0) {
      logger.debug('kisi', `Would assign member ${memberId} to groups`, {
        groups: Array.from(groupIds)
      })
    }
  }
}
