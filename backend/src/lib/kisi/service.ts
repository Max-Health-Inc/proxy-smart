/**
 * Kisi Service Layer
 * 
 * High-level operations that combine Kisi API calls with Keycloak identity
 * for user sync, access group mapping, and audit log correlation.
 */

import { type KisiClient, KisiApiError } from './client'
import type { KisiMember, KisiGroup, KisiEvent, KisiPaginatedResponse, KisiPlace, KisiLock, KisiListParams, KisiGroupLock } from './client'
import { logger } from '../logger'

export interface KeycloakUserIdentity {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  roles?: string[]
}

export interface SyncResult {
  created: string[]
  skipped: string[]
  failed: Array<{ email: string; error: string }>
}

export interface RoleMappingRule {
  /** Keycloak role name (or pattern) */
  keycloakRole: string
  /** Kisi group ID to assign when the role matches */
  kisiGroupId: number
}

export interface AccessOverview {
  places: KisiPaginatedResponse<KisiPlace>
  locks: KisiPaginatedResponse<KisiLock>
  groups: KisiPaginatedResponse<KisiGroup>
  members: KisiPaginatedResponse<KisiMember>
}

export class KisiService {
  constructor(private readonly client: KisiClient) {}

  // ==================== Dashboard / Overview ====================

  /** Get a high-level overview of all access control entities */
  async getOverview(): Promise<AccessOverview> {
    const [places, locks, groups, members] = await Promise.all([
      this.client.getPlaces({ limit: 100 }),
      this.client.getLocks({ limit: 100 }),
      this.client.getGroups({ limit: 100 }),
      this.client.getMembers({ limit: 100 }),
    ])

    return { places, locks, groups, members }
  }

  // ==================== User Sync (Keycloak → Kisi) ====================

  /**
   * Sync a list of Keycloak users to Kisi members.
   * Creates members that don't exist yet (matched by email).
   * Optionally assigns groups based on role mapping rules.
   */
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

  /** 
   * Assign Kisi groups to a member based on Keycloak roles and mapping rules.
   * A role matches if the user's role includes the rule pattern (case-insensitive).
   */
  private async assignGroupsByRoles(
    memberId: number,
    userRoles: string[],
    rules: RoleMappingRule[]
  ): Promise<void> {
    const groupIds = new Set<number>()

    for (const rule of rules) {
      const pattern = rule.keycloakRole.toLowerCase()
      if (userRoles.some(role => role.toLowerCase().includes(pattern))) {
        groupIds.add(rule.kisiGroupId)
      }
    }

    // TODO: Kisi group-member assignment API — once the exact endpoint is confirmed
    // Kisi assigns members to groups on member creation via group param, or 
    // through group-member-specific endpoints. For now log intent.
    if (groupIds.size > 0) {
      logger.debug('kisi', `Would assign member ${memberId} to groups`, {
        groups: Array.from(groupIds)
      })
    }
  }

  // ==================== Places ====================

  async getPlaces(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiPlace>> {
    return this.client.getPlaces(params)
  }

  async getPlace(id: number): Promise<KisiPlace> {
    return this.client.getPlace(id)
  }

  // ==================== Locks ====================

  async getLocks(params?: KisiListParams & { placeId?: number }): Promise<KisiPaginatedResponse<KisiLock>> {
    return this.client.getLocks(params)
  }

  async getLock(id: number): Promise<KisiLock> {
    return this.client.getLock(id)
  }

  async unlock(lockId: number): Promise<{ message: string }> {
    logger.info('kisi', `Unlock requested for lock ${lockId}`)
    return this.client.unlock(lockId)
  }

  // ==================== Groups ====================

  async getGroups(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiGroup>> {
    return this.client.getGroups(params)
  }

  async getGroup(id: number): Promise<KisiGroup> {
    return this.client.getGroup(id)
  }

  async createGroup(name: string, description?: string): Promise<KisiGroup> {
    return this.client.createGroup({ name, description })
  }

  async deleteGroup(id: number): Promise<void> {
    return this.client.deleteGroup(id)
  }

  // ==================== Group ↔ Lock ====================

  async getGroupLocks(params?: KisiListParams & { groupId?: number }): Promise<KisiPaginatedResponse<KisiGroupLock>> {
    return this.client.getGroupLocks(params)
  }

  async assignLockToGroup(groupId: number, lockId: number): Promise<KisiGroupLock> {
    return this.client.assignLockToGroup(groupId, lockId)
  }

  async removeLockFromGroup(id: number): Promise<void> {
    return this.client.removeLockFromGroup(id)
  }

  // ==================== Members ====================

  async getMembers(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiMember>> {
    return this.client.getMembers(params)
  }

  async getMember(id: number): Promise<KisiMember> {
    return this.client.getMember(id)
  }

  async createMember(email: string, name?: string): Promise<KisiMember> {
    return this.client.createMember({ email, name })
  }

  async deleteMember(id: number): Promise<void> {
    return this.client.deleteMember(id)
  }

  // ==================== Events (Audit) ====================

  async getEvents(params?: KisiListParams & { lockId?: number; actorEmail?: string }): Promise<KisiPaginatedResponse<KisiEvent>> {
    return this.client.getEvents(params)
  }

  // ==================== Health ====================

  async isHealthy(): Promise<boolean> {
    return this.client.ping()
  }
}
