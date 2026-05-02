/**
 * Kisi Service Tests
 * 
 * Unit tests for the Kisi service layer (Keycloak sync, overview, etc.)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { KisiService } from '../src/lib/kisi/service'
import type { KeycloakUserIdentity } from '../src/lib/kisi/service'
import { type KisiClient } from '../src/lib/kisi/client'

// ==================== Mock Client ====================

function createMockClient(): KisiClient & Record<string, unknown> {
  const client = {
    getPlaces: mock(() => Promise.resolve({ data: [{ id: 1, name: 'HQ' }], pagination: { offset: 0, limit: 100, count: 1 } })),
    getPlace: mock((id: number) => Promise.resolve({ id, name: 'HQ' })),
    getLocks: mock(() => Promise.resolve({ data: [{ id: 1, name: 'Front Door', placeId: 1, online: true }], pagination: { offset: 0, limit: 100, count: 1 } })),
    getLock: mock((id: number) => Promise.resolve({ id, name: 'Front Door', placeId: 1, online: true })),
    unlock: mock(() => Promise.resolve({ message: 'Unlocked' })),
    getGroups: mock(() => Promise.resolve({ data: [{ id: 1, name: 'Doctors' }], pagination: { offset: 0, limit: 100, count: 1 } })),
    getGroup: mock((id: number) => Promise.resolve({ id, name: 'Doctors' })),
    createGroup: mock((data: { name: string }) => Promise.resolve({ id: 2, name: data.name })),
    deleteGroup: mock(() => Promise.resolve(undefined)),
    getGroupLocks: mock(() => Promise.resolve({ data: [], pagination: { offset: 0, limit: 100, count: 0 } })),
    assignLockToGroup: mock(() => Promise.resolve({ id: 1, groupId: 1, lockId: 1 })),
    removeLockFromGroup: mock(() => Promise.resolve(undefined)),
    getMembers: mock(() => Promise.resolve({
      data: [{ id: 1, email: 'existing@hospital.com', name: 'Existing User' }],
      pagination: { offset: 0, limit: 500, count: 1 }
    })),
    getMember: mock((id: number) => Promise.resolve({ id, email: 'test@hospital.com' })),
    createMember: mock((data: { email: string; name?: string }) => Promise.resolve({ id: 99, email: data.email, name: data.name })),
    deleteMember: mock(() => Promise.resolve(undefined)),
    getEvents: mock(() => Promise.resolve({ data: [], pagination: { offset: 0, limit: 100, count: 0 } })),
    ping: mock(() => Promise.resolve(true)),
  }
  return client as unknown as KisiClient & Record<string, unknown>
}

// ==================== Tests ====================

describe('KisiService', () => {
  let service: KisiService
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
    service = new KisiService(mockClient)
  })

  describe('getOverview', () => {
    it('fetches all entity types in parallel', async () => {
      const overview = await service.getOverview()

      expect(overview.places.data).toHaveLength(1)
      expect(overview.locks.data).toHaveLength(1)
      expect(overview.groups.data).toHaveLength(1)
      expect(overview.members.data).toHaveLength(1)
    })
  })

  describe('syncUsersFromKeycloak', () => {
    it('creates new users and skips existing ones', async () => {
      const users: KeycloakUserIdentity[] = [
        { id: '1', email: 'existing@hospital.com', firstName: 'Existing', lastName: 'User' },
        { id: '2', email: 'new.doctor@hospital.com', firstName: 'New', lastName: 'Doctor' },
        { id: '3', email: 'new.nurse@hospital.com', firstName: 'New', lastName: 'Nurse' },
      ]

      const result = await service.syncUsersFromKeycloak(users)

      expect(result.skipped).toContain('existing@hospital.com')
      expect(result.created).toContain('new.doctor@hospital.com')
      expect(result.created).toContain('new.nurse@hospital.com')
      expect(result.created).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
    })

    it('handles creation failures gracefully', async () => {
      mockClient.createMember = mock(() => Promise.reject(new Error('API Error')))

      const users: KeycloakUserIdentity[] = [
        { id: '2', email: 'failing@hospital.com', firstName: 'Fail' },
      ]

      const result = await service.syncUsersFromKeycloak(users)

      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].email).toBe('failing@hospital.com')
      expect(result.created).toHaveLength(0)
    })

    it('deduplicates by email case-insensitively', async () => {
      const users: KeycloakUserIdentity[] = [
        { id: '1', email: 'EXISTING@HOSPITAL.COM' },
      ]

      const result = await service.syncUsersFromKeycloak(users)

      expect(result.skipped).toContain('existing@hospital.com')
      expect(result.created).toHaveLength(0)
    })

    it('accepts role mapping rules', async () => {
      const users: KeycloakUserIdentity[] = [
        { id: '2', email: 'new@hospital.com', roles: ['doctor', 'admin'] },
      ]

      const result = await service.syncUsersFromKeycloak(users, [
        { keycloakRole: 'doctor', kisiGroupId: 1 },
      ])

      expect(result.created).toContain('new@hospital.com')
    })
  })

  describe('passthrough operations', () => {
    it('delegates getPlaces', async () => {
      const result = await service.getPlaces({ limit: 10 })
      expect(result.data).toHaveLength(1)
    })

    it('delegates unlock', async () => {
      const result = await service.unlock(42)
      expect(result.message).toBe('Unlocked')
    })

    it('delegates createGroup', async () => {
      const result = await service.createGroup('Nurses', 'Night shift')
      expect(result.name).toBe('Nurses')
    })

    it('delegates createMember', async () => {
      const result = await service.createMember('test@hospital.com', 'Test User')
      expect(result.email).toBe('test@hospital.com')
    })

    it('delegates isHealthy', async () => {
      const result = await service.isHealthy()
      expect(result).toBe(true)
    })
  })
})
