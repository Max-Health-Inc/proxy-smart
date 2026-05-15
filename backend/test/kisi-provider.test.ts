/**
 * Kisi Provider Adapter Tests
 * 
 * Tests the Kisi AccessControlProvider adapter that wraps KisiClient.
 * Verifies ID mapping (number → string), entity mapping, and capability flags.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { KisiAccessProvider } from '../src/lib/access-control/providers/kisi'
import { type KisiClient } from '../src/lib/kisi/client'

// ==================== Mock Client ====================

function createMockClient(): KisiClient & Record<string, unknown> {
  return {
    getPlaces: mock(() => Promise.resolve({
      data: [{ id: 1, name: 'HQ', address: '123 Main St', placeId: undefined, organizationId: 10 }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    getPlace: mock((id: number) => Promise.resolve({ id, name: 'HQ', address: '123 Main St' })),
    getLocks: mock(() => Promise.resolve({
      data: [{ id: 1, name: 'Front Door', placeId: 1, online: true }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    getLock: mock((id: number) => Promise.resolve({ id, name: 'Front Door', placeId: 1, online: true })),
    unlock: mock(() => Promise.resolve({ message: 'Unlocked' })),
    getGroups: mock(() => Promise.resolve({
      data: [{ id: 1, name: 'Doctors' }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    getGroup: mock((id: number) => Promise.resolve({ id, name: 'Doctors' })),
    createGroup: mock((data: { name: string }) => Promise.resolve({ id: 2, name: data.name })),
    deleteGroup: mock(() => Promise.resolve(undefined)),
    getGroupLocks: mock(() => Promise.resolve({
      data: [{ id: 1, groupId: 1, lockId: 1 }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    assignLockToGroup: mock(() => Promise.resolve({ id: 1, groupId: 1, lockId: 1 })),
    removeLockFromGroup: mock(() => Promise.resolve(undefined)),
    getMembers: mock(() => Promise.resolve({
      data: [{ id: 1, email: 'user@example.com', name: 'Test User' }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    getMember: mock((id: number) => Promise.resolve({ id, email: 'user@example.com' })),
    createMember: mock((data: { email: string; name?: string }) => Promise.resolve({ id: 99, email: data.email, name: data.name })),
    deleteMember: mock(() => Promise.resolve(undefined)),
    getEvents: mock(() => Promise.resolve({
      data: [{ id: 1, action: 'lock.unlock', lockId: 1, actorId: 2, createdAt: '2026-01-01T00:00:00Z' }],
      pagination: { offset: 0, limit: 100, count: 1 },
    })),
    ping: mock(() => Promise.resolve(true)),
  } as unknown as KisiClient & Record<string, unknown>
}

// ==================== Tests ====================

describe('KisiAccessProvider', () => {
  let provider: KisiAccessProvider
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
    provider = new KisiAccessProvider(mockClient)
  })

  describe('provider metadata', () => {
    it('reports correct name', () => {
      expect(provider.name).toBe('kisi')
      expect(provider.displayName).toBe('Kisi')
    })

    it('reports all capabilities as enabled', () => {
      expect(provider.capabilities.groups).toBe(true)
      expect(provider.capabilities.members).toBe(true)
      expect(provider.capabilities.sync).toBe(true)
      expect(provider.capabilities.events).toBe(true)
      expect(provider.capabilities.groupDoors).toBe(true)
      expect(provider.capabilities.realtime).toBe(false)
    })
  })

  describe('ID mapping (number → string)', () => {
    it('converts place IDs to strings', async () => {
      const result = await provider.getLocations()
      expect(result.data[0].id).toBe('1')
      expect(typeof result.data[0].id).toBe('string')
    })

    it('converts lock IDs to strings', async () => {
      const result = await provider.getDoors()
      expect(result.data[0].id).toBe('1')
      expect(result.data[0].locationId).toBe('1')
    })

    it('converts group IDs to strings', async () => {
      const result = await provider.getGroups!()
      expect(result.data[0].id).toBe('1')
    })

    it('converts member IDs to strings', async () => {
      const result = await provider.getMembers!()
      expect(result.data[0].id).toBe('1')
    })

    it('converts event IDs + doorId to strings', async () => {
      const result = await provider.getEvents!()
      expect(result.data[0].id).toBe('1')
      expect(result.data[0].doorId).toBe('1')
    })
  })

  describe('entity mapping', () => {
    it('maps Kisi place → AccessLocation', async () => {
      const loc = await provider.getLocation('1')
      expect(loc.name).toBe('HQ')
      expect(loc.address).toBe('123 Main St')
    })

    it('maps Kisi lock → AccessDoor', async () => {
      const door = await provider.getDoor('5')
      expect(door.online).toBe(true)
    })

    it('maps Kisi groupLock → AccessGroupDoor', async () => {
      const result = await provider.getGroupDoors!()
      expect(result.data[0].groupId).toBe('1')
      expect(result.data[0].doorId).toBe('1')
    })
  })

  describe('passthrough operations', () => {
    it('delegates unlock with number conversion', async () => {
      const result = await provider.unlock('42')
      expect(result.message).toBe('Unlocked')
      expect(mockClient.unlock).toHaveBeenCalledWith(42)
    })

    it('delegates createGroup', async () => {
      const result = await provider.createGroup!('Nurses', 'Night shift')
      expect(result.name).toBe('Nurses')
    })

    it('delegates createMember', async () => {
      const result = await provider.createMember!('new@example.com', 'New User')
      expect(result.email).toBe('new@example.com')
    })

    it('delegates isHealthy to ping', async () => {
      expect(await provider.isHealthy()).toBe(true)
    })
  })

  describe('getOverview', () => {
    it('assembles overview from all entity types', async () => {
      const overview = await provider.getOverview!()
      expect(overview.locations.data).toHaveLength(1)
      expect(overview.doors.data).toHaveLength(1)
      expect(overview.groups.data).toHaveLength(1)
      expect(overview.members.data).toHaveLength(1)
    })
  })

  describe('syncUsersFromKeycloak', () => {
    it('creates new users and skips existing', async () => {
      const result = await provider.syncUsersFromKeycloak!([
        { id: '1', email: 'user@example.com', firstName: 'Existing' },
        { id: '2', email: 'new@example.com', firstName: 'New', lastName: 'User' },
      ])
      expect(result.skipped).toContain('user@example.com')
      expect(result.created).toContain('new@example.com')
    })

    it('handles failures gracefully', async () => {
      mockClient.createMember = mock(() => Promise.reject(new Error('API Error')))
      const result = await provider.syncUsersFromKeycloak!([
        { id: '2', email: 'fail@example.com' },
      ])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].email).toBe('fail@example.com')
    })
  })
})
