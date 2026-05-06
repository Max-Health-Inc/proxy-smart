/**
 * UniFi Access Provider Tests
 * 
 * Unit tests for the UniFi Access provider adapter.
 * Mocks the unifi-access AccessApi to test mapping + pagination logic.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { UnifiAccessProvider } from '../src/lib/access-control/providers/unifi-access'

// ==================== Mock AccessApi ====================

function createMockConfig() {
  return {
    host: '192.168.1.100',
    username: 'admin',
    password: 'password123',
  }
}

// Mock floor/door/device data matching UniFi Access types
const mockFloors = [
  {
    unique_id: 'floor-1',
    name: 'Ground Floor',
    full_name: 'Ground Floor',
    level: 0,
    location_type: 'floor',
    timezone: 'Europe/Vienna',
    extra_type: '',
    extras: {} as Record<string, unknown>,
    up_id: 'root',
    work_time_id: '',
    work_time: [],
    doors: [
      {
        unique_id: 'door-1',
        name: 'Main Entrance',
        full_name: 'Ground Floor > Main Entrance',
        up_id: 'floor-1',
        level: 1,
        location_type: 'door',
        timezone: 'Europe/Vienna',
        extra_type: '',
        extras: {} as Record<string, unknown>,
        work_time_id: '',
        work_time: [],
        camera_resource_ids: [],
        door_guard: [],
        hotel_devices: [],
        device_groups: [
          {
            unique_id: 'device-1',
            device_type: 'UA-G2-Pro',
            is_connected: true,
            is_online: true,
            adopt_time: 0,
            adopting: false,
            bom_rev: '',
            capabilities: [],
            connected_uah_id: '',
            door: {} as Record<string, unknown>,
            firmware_update_time: 0,
            firmware: '2.0.0',
            floor: {} as Record<string, unknown>,
            guid: '',
            hw_type: '',
            images: { l: '', m: '', s: '', xl: '', xs: '' },
            ip: '192.168.1.10',
            is_adopted: true,
            is_managed: true,
            is_rebooting: false,
            location: {} as Record<string, unknown>,
            location_id: 'door-1',
            mac: 'AA:BB:CC:DD:EE:FF',
            model: 'UA-G2-Pro',
            name: 'Main Lock',
            need_advisory: false,
            resource_name: 'device-1',
            revision_update_time: 0,
            revision: 1,
            security_check: true,
            source: '',
            source_id: '',
            start_time: 0,
            update: '',
            update_manual: {} as Record<string, unknown>,
            version_update_time: 0,
            version: '2.0.0',
          } as unknown,
        ],
      },
      {
        unique_id: 'door-2',
        name: 'Server Room',
        full_name: 'Ground Floor > Server Room',
        up_id: 'floor-1',
        level: 1,
        location_type: 'door',
        timezone: 'Europe/Vienna',
        extra_type: '',
        extras: {} as Record<string, unknown>,
        work_time_id: '',
        work_time: [],
        camera_resource_ids: [],
        door_guard: [],
        hotel_devices: [],
        device_groups: [
          {
            unique_id: 'device-2',
            device_type: 'UA-Hub',
            is_connected: false,
            is_online: false,
          } as unknown,
        ],
      },
    ],
  },
  {
    unique_id: 'floor-2',
    name: 'First Floor',
    full_name: 'First Floor',
    level: 1,
    location_type: 'floor',
    timezone: 'Europe/Vienna',
    extra_type: '',
    extras: {} as Record<string, unknown>,
    up_id: 'root',
    work_time_id: '',
    work_time: [],
    doors: [],
  },
]

const mockDoors = [
  mockFloors[0].doors[0],
  mockFloors[0].doors[1],
]

const mockDevices = [
  mockFloors[0].doors[0].device_groups[0],
  mockFloors[0].doors[1].device_groups[0],
]

// ==================== Tests ====================

describe('UnifiAccessProvider', () => {
  let provider: UnifiAccessProvider

  beforeEach(() => {
    provider = new UnifiAccessProvider(createMockConfig())

    // Inject mock data by accessing the private api field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private field for test setup
    const api = (provider as any).api
    Object.defineProperty(api, 'bootstrap', { get: () => ({ floors: mockFloors }) })
    Object.defineProperty(api, 'floors', { get: () => mockFloors })
    Object.defineProperty(api, 'doors', { get: () => mockDoors })
    Object.defineProperty(api, 'devices', { get: () => mockDevices })

    // Mark as bootstrapped so we skip login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private field for test setup
    ;(provider as any).bootstrapped = true
  })

  describe('provider metadata', () => {
    it('reports correct name and display name', () => {
      expect(provider.name).toBe('unifi-access')
      expect(provider.displayName).toBe('UniFi Access')
    })

    it('reports correct capabilities', () => {
      expect(provider.capabilities.groups).toBe(true)
      expect(provider.capabilities.members).toBe(true)
      expect(provider.capabilities.sync).toBe(true)
      expect(provider.capabilities.events).toBe(true)
      expect(provider.capabilities.groupDoors).toBe(true)
      expect(provider.capabilities.realtime).toBe(true)
    })

    it('has optional methods for groups, members, sync and events', () => {
      expect(typeof provider.getGroups).toBe('function')
      expect(typeof provider.getMembers).toBe('function')
      expect(typeof provider.syncUsersFromKeycloak).toBe('function')
      expect(typeof provider.getEvents).toBe('function')
    })
  })

  describe('getLocations', () => {
    it('returns all floors as locations', async () => {
      const result = await provider.getLocations()
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('floor-1')
      expect(result.data[0].name).toBe('Ground Floor')
      expect(result.data[1].id).toBe('floor-2')
      expect(result.pagination.count).toBe(2)
    })

    it('supports pagination', async () => {
      const result = await provider.getLocations({ limit: 1, offset: 0 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('floor-1')
      expect(result.pagination.count).toBe(2)
    })

    it('supports text search', async () => {
      const result = await provider.getLocations({ query: 'first' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('First Floor')
    })
  })

  describe('getLocation', () => {
    it('returns a specific floor by ID', async () => {
      const location = await provider.getLocation('floor-2')
      expect(location.name).toBe('First Floor')
    })

    it('throws for unknown ID', async () => {
      expect(provider.getLocation('no-such-floor')).rejects.toThrow('Floor not found')
    })
  })

  describe('getDoors', () => {
    it('returns all doors across all floors', async () => {
      const result = await provider.getDoors()
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Main Entrance')
      expect(result.data[1].name).toBe('Server Room')
    })

    it('maps online status from device_groups', async () => {
      const result = await provider.getDoors()
      // device-1 is_connected=true → online=true
      expect(result.data[0].online).toBe(true)
      // device-2 is_connected=false → online=false
      expect(result.data[1].online).toBe(false)
    })

    it('sets locationId from parent floor', async () => {
      const result = await provider.getDoors()
      expect(result.data[0].locationId).toBe('floor-1')
    })
  })

  describe('getDoor', () => {
    it('returns a specific door by ID', async () => {
      const door = await provider.getDoor('door-2')
      expect(door.name).toBe('Server Room')
    })

    it('throws for unknown ID', async () => {
      expect(provider.getDoor('no-door')).rejects.toThrow('Door not found')
    })
  })

  describe('unlock', () => {
    it('calls api.unlock with the correct device', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private field for test
      const api = (provider as any).api
      api.unlock = mock(() => Promise.resolve(true))

      const result = await provider.unlock('door-1')
      expect(result.message).toContain('door-1')
      expect(api.unlock).toHaveBeenCalledTimes(1)
    })

    it('throws when device not found', async () => {
      expect(provider.unlock('no-door')).rejects.toThrow('No device found')
    })

    it('throws when unlock command fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private field for test
      const api = (provider as any).api
      api.unlock = mock(() => Promise.resolve(false))

      expect(provider.unlock('door-1')).rejects.toThrow('Unlock command failed')
    })
  })

  describe('isHealthy', () => {
    it('returns true when bootstrapped', async () => {
      const result = await provider.isHealthy()
      expect(result).toBe(true)
    })
  })
})
