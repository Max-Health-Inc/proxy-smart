/**
 * UniFi Access Control Provider
 * 
 * Wraps the `unifi-access` npm package (hjdhjd/unifi-access) into the
 * generic AccessControlProvider interface.
 * 
 * Capabilities:
 *   - Locations (floors), Doors, Unlock                ✅ (native UniFi)
 *   - Groups, Members, Group-Door, Sync               ✅ (proxy-managed state)
 *   - Real-time events via WebSocket                   ✅
 * 
 * Architecture notes:
 *   - Auth: username/password → local controller (CSRF + cookie)
 *   - Topology loaded via single bootstrap call (floors → doors → devices)
 *   - unlock() requires the full device config object, matched by door → device
 *   - WebSocket heartbeat every 5 s; automatic reconnect on failure
 *   - User/group data is managed by Proxy Smart and persisted in local state
 */

import { AccessApi } from 'unifi-access'
import type { AccessDoorConfig, AccessFloorConfig, AccessDeviceConfig } from 'unifi-access'
import { logger } from '../../logger'
import fs from 'fs'
import path from 'path'
import type {
  AccessControlProvider, ProviderCapabilities,
  AccessLocation, AccessDoor, AccessGroup, AccessMember, AccessGroupDoor, AccessEvent, SyncResult, KeycloakUserIdentity, RoleMappingRule,
  ListParams, PaginatedResponse,
} from '../types'

// ==================== Config ====================

export interface UnifiAccessConfig {
  /** Controller address (IP or FQDN, no protocol) */
  host: string
  /** Controller username */
  username: string
  /** Controller password */
  password: string
  /** Auto-reconnect on bootstrap failure (default: true) */
  autoReconnect?: boolean
}

// ==================== Mappers ====================

function mapFloor(f: AccessFloorConfig): AccessLocation {
  return {
    id: f.unique_id,
    name: f.name || f.full_name,
    description: `Floor (${f.location_type})`,
    metadata: {
      timezone: f.timezone,
      level: f.level,
      locationType: f.location_type,
      doorCount: f.doors?.length ?? 0,
    },
  }
}

function mapDoor(d: AccessDoorConfig, floorId?: string): AccessDoor {
  // Check if any device in the door group is online
  const devices = d.device_groups ?? []
  const anyOnline = devices.some(dev => dev.is_connected || dev.is_online)

  return {
    id: d.unique_id,
    name: d.name || d.full_name,
    locationId: floorId ?? d.up_id,
    description: d.full_name,
    online: anyOnline,
    type: 'unifi-access',
    metadata: {
      locationType: d.location_type,
      timezone: d.timezone,
      cameraResourceIds: d.camera_resource_ids,
      deviceCount: devices.length,
    },
  }
}

function paginate<T>(items: T[], params?: ListParams): PaginatedResponse<T> {
  const offset = params?.offset ?? 0
  const limit = params?.limit ?? items.length
  const page = items.slice(offset, offset + limit)
  return {
    data: page,
    pagination: { offset, limit: page.length, count: items.length },
  }
}

// ==================== Provider ====================

export class UnifiAccessProvider implements AccessControlProvider {
  readonly name = 'unifi-access' as const
  readonly displayName = 'UniFi Access'
  readonly capabilities: ProviderCapabilities = {
    groups: true,
    members: true,
    sync: true,
    events: true,
    groupDoors: true,
    realtime: true,
  }

  private api: AccessApi
  private config: UnifiAccessConfig
  private bootstrapped = false
  private readonly stateFilePath: string
  private state: {
    groups: Array<{
      id: string
      name: string
      description?: string
      doorIds: string[]
      createdAt: string
      updatedAt: string
    }>
    members: Array<{
      id: string
      email: string
      name?: string
      groupIds: string[]
      confirmed: boolean
      enabled: boolean
      createdAt: string
      updatedAt: string
    }>
    events: AccessEvent[]
  }

  constructor(config: UnifiAccessConfig) {
    this.config = config
    this.stateFilePath = path.join(process.cwd(), 'logs', 'access-control', 'unifi-provider-state.json')
    this.state = this.loadState()

    // Wire library logging to our logger
    this.api = new AccessApi({
      debug: (msg, ...args) => logger.debug('unifi-access', msg, { args }),
      info: (msg, ...args) => logger.info('unifi-access', msg, { args }),
      warn: (msg, ...args) => logger.warn('unifi-access', msg, { args }),
      error: (msg, ...args) => logger.error('unifi-access', msg, { args }),
    })
  }

  // ---- Proxy state for groups/members/sync ----

  private loadState(): {
    groups: Array<{
      id: string
      name: string
      description?: string
      doorIds: string[]
      createdAt: string
      updatedAt: string
    }>
    members: Array<{
      id: string
      email: string
      name?: string
      groupIds: string[]
      confirmed: boolean
      enabled: boolean
      createdAt: string
      updatedAt: string
    }>
    events: AccessEvent[]
  } {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return { groups: [], members: [], events: [] }
      }
      const raw = fs.readFileSync(this.stateFilePath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        groups?: Array<{
          id: string
          name: string
          description?: string
          doorIds?: string[]
          createdAt?: string
          updatedAt?: string
        }>
        members?: Array<{
          id: string
          email: string
          name?: string
          groupIds?: string[]
          confirmed?: boolean
          enabled?: boolean
          createdAt?: string
          updatedAt?: string
        }>
        events?: AccessEvent[]
      }

      const now = new Date().toISOString()
      return {
        groups: (parsed.groups ?? []).map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          doorIds: Array.from(new Set(g.doorIds ?? [])),
          createdAt: g.createdAt ?? now,
          updatedAt: g.updatedAt ?? now,
        })),
        members: (parsed.members ?? []).map(m => ({
          id: m.id,
          email: m.email,
          name: m.name,
          groupIds: Array.from(new Set(m.groupIds ?? [])),
          confirmed: m.confirmed ?? true,
          enabled: m.enabled ?? true,
          createdAt: m.createdAt ?? now,
          updatedAt: m.updatedAt ?? now,
        })),
        events: (parsed.events ?? []).map(e => ({
          id: e.id,
          action: e.action,
          actorType: e.actorType,
          actorId: e.actorId,
          actorEmail: e.actorEmail,
          objectType: e.objectType,
          objectId: e.objectId,
          doorId: e.doorId,
          message: e.message,
          createdAt: e.createdAt ?? now,
        })),
      }
    } catch (error) {
      logger.warn('unifi-access', 'Failed to load proxy state, starting clean', { error })
      return { groups: [], members: [], events: [] }
    }
  }

  private persistState(): void {
    const dir = path.dirname(this.stateFilePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2) + '\n')
  }

  private createId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
  }

  /**
   * Record an allow/deny access decision for compliance/audit reporting.
   */
  recordDecisionEvent(input: {
    allowed: boolean
    actorEmail?: string
    actorId?: string
    doorId: string
    reason: string
  }): void {
    const event: AccessEvent = {
      id: this.createId('unifi_event'),
      action: input.allowed ? 'unlock_allow' : 'unlock_deny',
      actorType: 'user',
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      objectType: 'door',
      objectId: input.doorId,
      doorId: input.doorId,
      message: input.reason,
      createdAt: new Date().toISOString(),
    }

    this.state.events.unshift(event)
    // Keep bounded history in local state.
    if (this.state.events.length > 5000) {
      this.state.events = this.state.events.slice(0, 5000)
    }
    this.persistState()
  }

  private mapStateGroup(g: {
    id: string
    name: string
    description?: string
    doorIds: string[]
    createdAt: string
    updatedAt: string
  }): AccessGroup {
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      metadata: {
        source: 'proxy-smart',
        provider: this.name,
        doorCount: g.doorIds.length,
      },
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }
  }

  private mapStateMember(m: {
    id: string
    email: string
    name?: string
    groupIds: string[]
    confirmed: boolean
    enabled: boolean
    createdAt: string
    updatedAt: string
  }): AccessMember {
    return {
      id: m.id,
      email: m.email,
      name: m.name,
      groupIds: m.groupIds,
      confirmed: m.confirmed,
      enabled: m.enabled,
      metadata: {
        source: 'proxy-smart',
        provider: this.name,
      },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }
  }

  // ---- Lifecycle ----

  /** Ensure we're logged in and have bootstrap data. Lazy-called on first API use. */
  private async ensureBootstrapped(): Promise<void> {
    if (this.bootstrapped && this.api.bootstrap) return

    logger.info('unifi-access', 'Connecting to UniFi Access controller', {
      host: this.config.host,
    })

    const loginOk = await this.api.login(
      this.config.host,
      this.config.username,
      this.config.password
    )

    if (!loginOk) {
      throw new Error(`UniFi Access login failed for host ${this.config.host}`)
    }

    const bootstrapOk = await this.api.getBootstrap()
    if (!bootstrapOk) {
      throw new Error('UniFi Access bootstrap failed — controller may be unreachable')
    }

    this.bootstrapped = true
    logger.info('unifi-access', 'Bootstrap complete', {
      floors: this.api.floors?.length ?? 0,
      doors: this.api.doors?.length ?? 0,
      devices: this.api.devices?.length ?? 0,
    })
  }

  // ---- Core ----

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureBootstrapped()
      return !!this.api.bootstrap
    } catch {
      return false
    }
  }

  async getLocations(params?: ListParams): Promise<PaginatedResponse<AccessLocation>> {
    await this.ensureBootstrapped()
    const floors = (this.api.floors ?? []).map(f => mapFloor(f))

    // Optional text search
    const query = params?.query?.toLowerCase()
    const filtered = query
      ? floors.filter(f => f.name.toLowerCase().includes(query))
      : floors

    return paginate(filtered, params)
  }

  async getLocation(id: string): Promise<AccessLocation> {
    await this.ensureBootstrapped()
    const floor = (this.api.floors ?? []).find(f => f.unique_id === id)
    if (!floor) throw new Error(`Floor not found: ${id}`)
    return mapFloor(floor)
  }

  async getDoors(params?: ListParams): Promise<PaginatedResponse<AccessDoor>> {
    await this.ensureBootstrapped()

    // Build door list with floor association
    const doors: AccessDoor[] = []
    for (const floor of this.api.floors ?? []) {
      for (const door of floor.doors ?? []) {
        doors.push(mapDoor(door, floor.unique_id))
      }
    }

    const query = params?.query?.toLowerCase()
    const filtered = query
      ? doors.filter(d => d.name.toLowerCase().includes(query))
      : doors

    return paginate(filtered, params)
  }

  async getDoor(id: string): Promise<AccessDoor> {
    await this.ensureBootstrapped()

    for (const floor of this.api.floors ?? []) {
      const door = (floor.doors ?? []).find(d => d.unique_id === id)
      if (door) return mapDoor(door, floor.unique_id)
    }

    throw new Error(`Door not found: ${id}`)
  }

  async unlock(doorId: string): Promise<{ message: string }> {
    await this.ensureBootstrapped()

    // Find the door and its first device
    const device = this.findDeviceForDoor(doorId)
    if (!device) {
      throw new Error(`No device found for door ${doorId} — cannot unlock`)
    }

    logger.info('unifi-access', `Unlock requested for door ${doorId}`, {
      device: device.unique_id,
      deviceType: device.device_type,
    })

    const success = await this.api.unlock(device)
    if (!success) {
      throw new Error(`Unlock command failed for door ${doorId}`)
    }

    return { message: `Door ${doorId} unlocked via ${device.device_type}` }
  }

  // ---- Proxy-managed groups ----

  async getGroups(params?: ListParams): Promise<PaginatedResponse<AccessGroup>> {
    const query = params?.query?.toLowerCase()
    const groups = query
      ? this.state.groups.filter(g => g.name.toLowerCase().includes(query))
      : this.state.groups

    return paginate(groups.map(g => this.mapStateGroup(g)), params)
  }

  async getGroup(id: string): Promise<AccessGroup> {
    const group = this.state.groups.find(g => g.id === id)
    if (!group) throw new Error(`Group not found: ${id}`)
    return this.mapStateGroup(group)
  }

  async createGroup(name: string, description?: string): Promise<AccessGroup> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Group name is required')

    const now = new Date().toISOString()
    const group = {
      id: this.createId('unifi_group'),
      name: trimmed,
      description,
      doorIds: [],
      createdAt: now,
      updatedAt: now,
    }

    this.state.groups.push(group)
    this.persistState()
    return this.mapStateGroup(group)
  }

  async deleteGroup(id: string): Promise<void> {
    const idx = this.state.groups.findIndex(g => g.id === id)
    if (idx === -1) throw new Error(`Group not found: ${id}`)

    this.state.groups.splice(idx, 1)
    const now = new Date().toISOString()
    for (const member of this.state.members) {
      if (member.groupIds.includes(id)) {
        member.groupIds = member.groupIds.filter(gid => gid !== id)
        member.updatedAt = now
      }
    }
    this.persistState()
  }

  // ---- Proxy-managed group ↔ door ----

  async getGroupDoors(params?: ListParams): Promise<PaginatedResponse<AccessGroupDoor>> {
    const assignments: AccessGroupDoor[] = []
    for (const group of this.state.groups) {
      for (const doorId of group.doorIds) {
        assignments.push({
          id: `${group.id}:${doorId}`,
          groupId: group.id,
          doorId,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        })
      }
    }
    return paginate(assignments, params)
  }

  async assignDoorToGroup(groupId: string, doorId: string): Promise<AccessGroupDoor> {
    await this.ensureBootstrapped()

    const group = this.state.groups.find(g => g.id === groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)

    // Validate the door exists in UniFi topology before assigning.
    await this.getDoor(doorId)

    if (!group.doorIds.includes(doorId)) {
      group.doorIds.push(doorId)
      group.updatedAt = new Date().toISOString()
      this.persistState()
    }

    return {
      id: `${groupId}:${doorId}`,
      groupId,
      doorId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }
  }

  async removeDoorFromGroup(id: string): Promise<void> {
    const [groupId, doorId] = id.split(':')
    if (!groupId || !doorId) {
      throw new Error(`Invalid assignment id: ${id}`)
    }

    const group = this.state.groups.find(g => g.id === groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)

    group.doorIds = group.doorIds.filter(did => did !== doorId)
    group.updatedAt = new Date().toISOString()
    this.persistState()
  }

  // ---- Proxy-managed members ----

  async getMembers(params?: ListParams): Promise<PaginatedResponse<AccessMember>> {
    const query = params?.query?.toLowerCase()
    const members = query
      ? this.state.members.filter(m => m.email.toLowerCase().includes(query) || (m.name ?? '').toLowerCase().includes(query))
      : this.state.members

    return paginate(members.map(m => this.mapStateMember(m)), params)
  }

  async getMember(id: string): Promise<AccessMember> {
    const member = this.state.members.find(m => m.id === id)
    if (!member) throw new Error(`Member not found: ${id}`)
    return this.mapStateMember(member)
  }

  async createMember(email: string, name?: string): Promise<AccessMember> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) throw new Error('Member email is required')

    const existing = this.state.members.find(m => m.email.toLowerCase() === normalizedEmail)
    if (existing) {
      throw new Error(`Member already exists: ${normalizedEmail}`)
    }

    const now = new Date().toISOString()
    const member = {
      id: this.createId('unifi_member'),
      email: normalizedEmail,
      name,
      groupIds: [],
      confirmed: true,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }

    this.state.members.push(member)
    this.persistState()
    return this.mapStateMember(member)
  }

  async deleteMember(id: string): Promise<void> {
    const idx = this.state.members.findIndex(m => m.id === id)
    if (idx === -1) throw new Error(`Member not found: ${id}`)
    this.state.members.splice(idx, 1)
    this.persistState()
  }

  // ---- Audit events ----

  async getEvents(params?: ListParams): Promise<PaginatedResponse<AccessEvent>> {
    const query = params?.query?.toLowerCase()
    const events = query
      ? this.state.events.filter(e =>
        (e.actorEmail ?? '').toLowerCase().includes(query) ||
        (e.doorId ?? '').toLowerCase().includes(query) ||
        (e.message ?? '').toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query)
      )
      : this.state.events

    return paginate(events, params)
  }

  // ---- Keycloak sync ----

  async syncUsersFromKeycloak(users: KeycloakUserIdentity[], roleMappings?: RoleMappingRule[]): Promise<SyncResult> {
    const result: SyncResult = { created: [], skipped: [], failed: [] }
    const now = new Date().toISOString()

    for (const user of users) {
      const email = (user.email ?? '').trim().toLowerCase()
      if (!email) {
        result.failed.push({ email: '', error: 'Missing email' })
        continue
      }

      try {
        let member = this.state.members.find(m => m.email.toLowerCase() === email)

        if (!member) {
          member = {
            id: this.createId('unifi_member'),
            email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || email,
            groupIds: [],
            confirmed: true,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          }
          this.state.members.push(member)
          result.created.push(email)
        } else {
          result.skipped.push(email)
        }

        if (roleMappings && user.roles && user.roles.length > 0) {
          const assignableGroupIds = new Set<string>()
          for (const rule of roleMappings) {
            const pattern = rule.keycloakRole.toLowerCase()
            if (user.roles.some(role => role.toLowerCase().includes(pattern))) {
              const groupExists = this.state.groups.some(g => g.id === rule.groupId)
              if (groupExists) assignableGroupIds.add(rule.groupId)
            }
          }

          if (assignableGroupIds.size > 0) {
            member.groupIds = Array.from(new Set([...member.groupIds, ...Array.from(assignableGroupIds)]))
            member.updatedAt = now
          }
        }
      } catch (error) {
        result.failed.push({ email, error: error instanceof Error ? error.message : String(error) })
      }
    }

    this.persistState()

    logger.info('unifi-access', 'Keycloak sync complete (proxy-managed state)', {
      created: result.created.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
    })

    return result
  }

  // ---- Internal helpers ----

  /**
   * Find the primary device (hub/lock) for a given door ID.
   * Walks floors → doors → device_groups to find the first device.
   */
  private findDeviceForDoor(doorId: string): AccessDeviceConfig | null {
    for (const floor of this.api.floors ?? []) {
      for (const door of floor.doors ?? []) {
        if (door.unique_id === doorId) {
          const devices = door.device_groups ?? []
          return devices[0] ?? null
        }
      }
    }
    return null
  }
}
