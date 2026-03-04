/**
 * UniFi Access Control Provider
 * 
 * Wraps the `unifi-access` npm package (hjdhjd/unifi-access) into the
 * generic AccessControlProvider interface.
 * 
 * Capabilities:
 *   - Locations (floors), Doors, Unlock   ✅
 *   - Groups, Members, Events, Sync       ❌ (not supported by UniFi Access API)
 *   - Real-time events via WebSocket      ✅
 * 
 * Architecture notes:
 *   - Auth: username/password → local controller (CSRF + cookie)
 *   - Topology loaded via single bootstrap call (floors → doors → devices)
 *   - unlock() requires the full device config object, matched by door → device
 *   - WebSocket heartbeat every 5 s; automatic reconnect on failure
 */

import { AccessApi } from 'unifi-access'
import type { AccessDoorConfig, AccessFloorConfig, AccessDeviceConfig } from 'unifi-access'
import { logger } from '../../logger'
import type {
  AccessControlProvider, ProviderCapabilities,
  AccessLocation, AccessDoor,
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
    groups: false,
    members: false,
    sync: false,
    events: false,   // events come via WebSocket, not REST — future enhancement
    groupDoors: false,
    realtime: true,
  }

  private api: AccessApi
  private config: UnifiAccessConfig
  private bootstrapped = false

  constructor(config: UnifiAccessConfig) {
    this.config = config

    // Wire library logging to our logger
    this.api = new AccessApi({
      debug: (msg, ...args) => logger.debug('unifi-access', msg, { args }),
      info: (msg, ...args) => logger.info('unifi-access', msg, { args }),
      warn: (msg, ...args) => logger.warn('unifi-access', msg, { args }),
      error: (msg, ...args) => logger.error('unifi-access', msg, { args }),
    })
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
