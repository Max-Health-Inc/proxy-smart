/**
 * Access Control Routes Tests
 *
 * Route-level tests for the access-control admin API.
 * Mocks the AccessControlProvider to isolate route/handler logic
 * including capability negotiation (501 for unsupported ops),
 * error handling, and the UniFi group-based unlock authorization flow.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Elysia } from 'elysia'
import type {
  AccessControlProvider,
  AccessLocation,
  AccessDoor,
  AccessGroup,
  AccessMember,
  AccessGroupDoor,
  AccessEvent,
  PaginatedResponse,
  ProviderCapabilities,
} from '../src/lib/access-control/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const paginated = <T>(data: T[], count?: number): PaginatedResponse<T> => ({
  data,
  pagination: { offset: 0, limit: 100, count: count ?? data.length },
})

const sampleLocation: AccessLocation = {
  id: 'loc-1', name: 'Ground Floor', address: '123 Main St',
}

const sampleDoor: AccessDoor = {
  id: 'door-1', name: 'Main Entrance', locationId: 'loc-1', online: true,
}

const sampleDoor2: AccessDoor = {
  id: 'door-2', name: 'Server Room', locationId: 'loc-1', online: false,
}

const sampleGroup: AccessGroup = {
  id: 'grp-1', name: 'Doctors',
}

const sampleMember: AccessMember = {
  id: 'mem-1', name: 'Dr. Smith', email: 'smith@hospital.com', groupIds: ['grp-1'], enabled: true,
}

const sampleGroupDoor: AccessGroupDoor = {
  id: 'gd-1', groupId: 'grp-1', doorId: 'door-1',
}

const sampleEvent: AccessEvent = {
  id: 'evt-1', action: 'door.unlock', doorId: 'door-1', actorEmail: 'smith@hospital.com',
}

const FULL_CAPABILITIES: ProviderCapabilities = {
  groups: true, members: true, sync: true, events: true, groupDoors: true, realtime: false,
}

const MINIMAL_CAPABILITIES: ProviderCapabilities = {
  groups: false, members: false, sync: false, events: false, groupDoors: false, realtime: true,
}

// ---------------------------------------------------------------------------
// Mock provider factory — returns a full-capability provider by default
// ---------------------------------------------------------------------------

function createMockProvider(overrides?: Partial<AccessControlProvider>): AccessControlProvider {
  return {
    name: 'mock',
    displayName: 'Mock Provider',
    capabilities: FULL_CAPABILITIES,

    isHealthy: mock(async () => true),
    getLocations: mock(async () => paginated([sampleLocation])),
    getLocation: mock(async (id: string) => ({ ...sampleLocation, id })),
    getDoors: mock(async () => paginated([sampleDoor, sampleDoor2])),
    getDoor: mock(async (id: string) => (id === 'door-1' ? sampleDoor : sampleDoor2)),
    unlock: mock(async (id: string) => ({ message: `Unlocked ${id}` })),

    getGroups: mock(async () => paginated([sampleGroup])),
    getGroup: mock(async (id: string) => ({ ...sampleGroup, id })),
    createGroup: mock(async (name: string, desc?: string) => ({ id: 'grp-new', name, description: desc })),
    deleteGroup: mock(async () => {}),

    getGroupDoors: mock(async () => paginated([sampleGroupDoor])),
    assignDoorToGroup: mock(async (gid: string, did: string) => ({ id: 'gd-new', groupId: gid, doorId: did })),
    removeDoorFromGroup: mock(async () => {}),

    getMembers: mock(async () => paginated([sampleMember])),
    getMember: mock(async (id: string) => ({ ...sampleMember, id })),
    createMember: mock(async (email: string, name?: string) => ({ id: 'mem-new', email, name, groupIds: [] })),
    deleteMember: mock(async () => {}),

    getEvents: mock(async () => paginated([sampleEvent])),

    syncUsersFromKeycloak: mock(async () => ({ created: ['new@hospital.com'], skipped: ['smith@hospital.com'], failed: [] })),

    getOverview: mock(async () => ({
      locations: paginated([sampleLocation]),
      doors: paginated([sampleDoor, sampleDoor2]),
      groups: paginated([sampleGroup]),
      members: paginated([sampleMember]),
    })),

    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Build a test Elysia app that injects the mock provider through getAccessControl
// ---------------------------------------------------------------------------

function buildTestApp(provider: AccessControlProvider) {
  const mockPlugin = new Elysia()
    .decorate('getAccessControl', () => provider)
    .decorate('getAdmin', async (_token: string) => ({} as Record<string, unknown>))

  const PREFIX = '/admin/access-control'

  const app = new Elysia({ prefix: PREFIX })
    .use(mockPlugin)

    // Health
    .get('/health', async ({ getAccessControl }) => {
      try {
        const p = getAccessControl()
        const connected = await p.isHealthy()
        return { configured: true, connected, provider: p.name, capabilities: p.capabilities }
      } catch {
        return { configured: false, connected: false }
      }
    })

    // Overview
    .get('/overview', async ({ getAccessControl, set }) => {
      try {
        const p = getAccessControl()
        if (p.getOverview) return await p.getOverview()
        const [locations, doors] = await Promise.all([p.getLocations({ limit: 100 }), p.getDoors({ limit: 100 })])
        const groups = p.getGroups ? await p.getGroups({ limit: 100 }) : paginated([])
        const members = p.getMembers ? await p.getMembers({ limit: 100 }) : paginated([])
        return { locations, doors, groups, members }
      } catch (e) {
        set.status = 500
        return { error: 'Failed to get overview', details: String(e) }
      }
    })

    // Locations
    .get('/locations', async ({ getAccessControl, query, set }) => {
      try { return await getAccessControl().getLocations(query) }
      catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .get('/locations/:id', async ({ getAccessControl, params, set }) => {
      try { return await getAccessControl().getLocation(params.id) }
      catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

    // Doors
    .get('/doors', async ({ getAccessControl, query, set }) => {
      try { return await getAccessControl().getDoors(query) }
      catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .get('/doors/:id', async ({ getAccessControl, params, set }) => {
      try { return await getAccessControl().getDoor(params.id) }
      catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .post('/doors/:id/unlock', async ({ getAccessControl, params, set }) => {
      try { return await getAccessControl().unlock(params.id) }
      catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

    // Groups (optional)
    .get('/groups', async ({ getAccessControl, query, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getGroups) { set.status = 501; return { error: 'Not supported' } }
        return await p.getGroups(query)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .get('/groups/:id', async ({ getAccessControl, params, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getGroup) { set.status = 501; return { error: 'Not supported' } }
        return await p.getGroup(params.id)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .post('/groups', async ({ getAccessControl, body, set }) => {
      try {
        const p = getAccessControl()
        if (!p.createGroup) { set.status = 501; return { error: 'Not supported' } }
        const b = body as { name: string; description?: string }
        return await p.createGroup(b.name, b.description)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .delete('/groups/:id', async ({ getAccessControl, params, set }) => {
      try {
        const p = getAccessControl()
        if (!p.deleteGroup) { set.status = 501; return { error: 'Not supported' } }
        await p.deleteGroup(params.id)
        return { success: true, message: 'Group deleted' }
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

    // Group-Doors
    .get('/group-doors', async ({ getAccessControl, query, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getGroupDoors) { set.status = 501; return { error: 'Not supported' } }
        return await p.getGroupDoors(query)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .post('/group-doors', async ({ getAccessControl, body, set }) => {
      try {
        const p = getAccessControl()
        if (!p.assignDoorToGroup) { set.status = 501; return { error: 'Not supported' } }
        const b = body as { groupId: string; doorId: string }
        return await p.assignDoorToGroup(b.groupId, b.doorId)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .delete('/group-doors/:id', async ({ getAccessControl, params, set }) => {
      try {
        const p = getAccessControl()
        if (!p.removeDoorFromGroup) { set.status = 501; return { error: 'Not supported' } }
        await p.removeDoorFromGroup(params.id)
        return { success: true, message: 'Door removed from group' }
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

    // Members
    .get('/members', async ({ getAccessControl, query, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getMembers) { set.status = 501; return { error: 'Not supported' } }
        return await p.getMembers(query)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .get('/members/:id', async ({ getAccessControl, params, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getMember) { set.status = 501; return { error: 'Not supported' } }
        return await p.getMember(params.id)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .post('/members', async ({ getAccessControl, body, set }) => {
      try {
        const p = getAccessControl()
        if (!p.createMember) { set.status = 501; return { error: 'Not supported' } }
        const b = body as { email: string; name?: string }
        return await p.createMember(b.email, b.name)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })
    .delete('/members/:id', async ({ getAccessControl, params, set }) => {
      try {
        const p = getAccessControl()
        if (!p.deleteMember) { set.status = 501; return { error: 'Not supported' } }
        await p.deleteMember(params.id)
        return { success: true, message: 'Member deleted' }
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

    // Events
    .get('/events', async ({ getAccessControl, query, set }) => {
      try {
        const p = getAccessControl()
        if (!p.getEvents) { set.status = 501; return { error: 'Not supported' } }
        return await p.getEvents(query)
      } catch (e) { set.status = 500; return { error: 'Failed', details: String(e) } }
    })

  return app
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = 'http://localhost/admin/access-control'

function req(method: string, path: string, body?: unknown) {
  const url = `${BASE}${path}`
  const init: RequestInit = { method }
  if (body) {
    init.headers = { 'content-type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return new Request(url, init)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Access Control Routes', () => {
  let provider: AccessControlProvider
  let app: ReturnType<typeof buildTestApp>

  beforeEach(() => {
    provider = createMockProvider()
    app = buildTestApp(provider)
  })

  // ========== Health ==========
  describe('GET /health', () => {
    it('returns health status with provider info', async () => {
      const res = await app.handle(req('GET', '/health'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.configured).toBe(true)
      expect(data.connected).toBe(true)
      expect(data.provider).toBe('mock')
      expect(data.capabilities).toBeDefined()
      expect(data.capabilities.groups).toBe(true)
    })

    it('returns connected=false when health check fails', async () => {
      provider = createMockProvider({ isHealthy: mock(async () => false) })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/health'))
      const data = await res.json()
      expect(data.connected).toBe(false)
    })
  })

  // ========== Overview ==========
  describe('GET /overview', () => {
    it('returns combined overview with all entity types', async () => {
      const res = await app.handle(req('GET', '/overview'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.locations.data).toHaveLength(1)
      expect(data.doors.data).toHaveLength(2)
      expect(data.groups.data).toHaveLength(1)
      expect(data.members.data).toHaveLength(1)
    })

    it('works without getOverview method (fallback path)', async () => {
      provider = createMockProvider({ getOverview: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/overview'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.locations.data).toHaveLength(1)
      expect(data.doors.data).toHaveLength(2)
    })

    it('returns 500 when provider throws', async () => {
      provider = createMockProvider({
        getOverview: mock(async () => { throw new Error('boom') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/overview'))
      expect(res.status).toBe(500)
    })
  })

  // ========== Locations ==========
  describe('GET /locations', () => {
    it('returns paginated locations', async () => {
      const res = await app.handle(req('GET', '/locations'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Ground Floor')
      expect(data.pagination.count).toBe(1)
    })
  })

  describe('GET /locations/:id', () => {
    it('returns a specific location', async () => {
      const res = await app.handle(req('GET', '/locations/loc-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('loc-1')
    })

    it('returns 500 when provider throws', async () => {
      provider = createMockProvider({
        getLocation: mock(async () => { throw new Error('not found') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/locations/bad-id'))
      expect(res.status).toBe(500)
    })
  })

  // ========== Doors ==========
  describe('GET /doors', () => {
    it('returns paginated doors', async () => {
      const res = await app.handle(req('GET', '/doors'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('Main Entrance')
      expect(data.data[0].online).toBe(true)
      expect(data.data[1].name).toBe('Server Room')
      expect(data.data[1].online).toBe(false)
    })
  })

  describe('GET /doors/:id', () => {
    it('returns a specific door', async () => {
      const res = await app.handle(req('GET', '/doors/door-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('door-1')
      expect(data.online).toBe(true)
    })
  })

  describe('POST /doors/:id/unlock', () => {
    it('unlocks a door successfully', async () => {
      const res = await app.handle(req('POST', '/doors/door-1/unlock'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('door-1')
    })

    it('delegates to provider.unlock with correct door id', async () => {
      await app.handle(req('POST', '/doors/door-42/unlock'))
      expect(provider.unlock).toHaveBeenCalledTimes(1)
      const call = (provider.unlock as ReturnType<typeof mock>).mock.calls[0]
      expect(call[0]).toBe('door-42')
    })

    it('returns 500 when unlock fails', async () => {
      provider = createMockProvider({
        unlock: mock(async () => { throw new Error('device offline') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('POST', '/doors/door-2/unlock'))
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('Failed')
    })
  })

  // ========== Groups ==========
  describe('GET /groups', () => {
    it('returns paginated groups', async () => {
      const res = await app.handle(req('GET', '/groups'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Doctors')
    })

    it('returns 501 when provider lacks group support', async () => {
      provider = createMockProvider({
        capabilities: MINIMAL_CAPABILITIES,
        getGroups: undefined,
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/groups'))
      expect(res.status).toBe(501)
    })
  })

  describe('GET /groups/:id', () => {
    it('returns a specific group', async () => {
      const res = await app.handle(req('GET', '/groups/grp-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('grp-1')
    })

    it('returns 501 without getGroup', async () => {
      provider = createMockProvider({ getGroup: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/groups/grp-1'))
      expect(res.status).toBe(501)
    })
  })

  describe('POST /groups', () => {
    it('creates a new group', async () => {
      const res = await app.handle(req('POST', '/groups', { name: 'Nurses', description: 'Night shift' }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Nurses')
      expect(data.id).toBe('grp-new')
    })

    it('returns 501 without createGroup', async () => {
      provider = createMockProvider({ createGroup: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('POST', '/groups', { name: 'x' }))
      expect(res.status).toBe(501)
    })
  })

  describe('DELETE /groups/:id', () => {
    it('deletes a group', async () => {
      const res = await app.handle(req('DELETE', '/groups/grp-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(provider.deleteGroup).toHaveBeenCalledTimes(1)
    })

    it('returns 501 without deleteGroup', async () => {
      provider = createMockProvider({ deleteGroup: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('DELETE', '/groups/grp-1'))
      expect(res.status).toBe(501)
    })
  })

  // ========== Group-Doors ==========
  describe('GET /group-doors', () => {
    it('returns group-door assignments', async () => {
      const res = await app.handle(req('GET', '/group-doors'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].groupId).toBe('grp-1')
      expect(data.data[0].doorId).toBe('door-1')
    })

    it('returns 501 without getGroupDoors', async () => {
      provider = createMockProvider({ getGroupDoors: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/group-doors'))
      expect(res.status).toBe(501)
    })
  })

  describe('POST /group-doors', () => {
    it('assigns a door to a group', async () => {
      const res = await app.handle(req('POST', '/group-doors', { groupId: 'grp-1', doorId: 'door-2' }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.groupId).toBe('grp-1')
      expect(data.doorId).toBe('door-2')
    })

    it('returns 501 without assignDoorToGroup', async () => {
      provider = createMockProvider({ assignDoorToGroup: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('POST', '/group-doors', { groupId: 'g', doorId: 'd' }))
      expect(res.status).toBe(501)
    })
  })

  describe('DELETE /group-doors/:id', () => {
    it('removes a door from a group', async () => {
      const res = await app.handle(req('DELETE', '/group-doors/gd-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 501 without removeDoorFromGroup', async () => {
      provider = createMockProvider({ removeDoorFromGroup: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('DELETE', '/group-doors/gd-1'))
      expect(res.status).toBe(501)
    })
  })

  // ========== Members ==========
  describe('GET /members', () => {
    it('returns paginated members', async () => {
      const res = await app.handle(req('GET', '/members'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].email).toBe('smith@hospital.com')
    })

    it('returns 501 without getMembers', async () => {
      provider = createMockProvider({ getMembers: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/members'))
      expect(res.status).toBe(501)
    })
  })

  describe('GET /members/:id', () => {
    it('returns a specific member', async () => {
      const res = await app.handle(req('GET', '/members/mem-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.email).toBe('smith@hospital.com')
    })

    it('returns 501 without getMember', async () => {
      provider = createMockProvider({ getMember: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/members/mem-1'))
      expect(res.status).toBe(501)
    })
  })

  describe('POST /members', () => {
    it('creates a new member', async () => {
      const res = await app.handle(req('POST', '/members', { email: 'nurse@hospital.com', name: 'Nurse Jane' }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.email).toBe('nurse@hospital.com')
      expect(data.id).toBe('mem-new')
    })

    it('returns 501 without createMember', async () => {
      provider = createMockProvider({ createMember: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('POST', '/members', { email: 'x@x.com' }))
      expect(res.status).toBe(501)
    })
  })

  describe('DELETE /members/:id', () => {
    it('deletes a member', async () => {
      const res = await app.handle(req('DELETE', '/members/mem-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 501 without deleteMember', async () => {
      provider = createMockProvider({ deleteMember: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('DELETE', '/members/mem-1'))
      expect(res.status).toBe(501)
    })
  })

  // ========== Events ==========
  describe('GET /events', () => {
    it('returns paginated events', async () => {
      const res = await app.handle(req('GET', '/events'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].action).toBe('door.unlock')
    })

    it('returns 501 without getEvents', async () => {
      provider = createMockProvider({ getEvents: undefined })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/events'))
      expect(res.status).toBe(501)
    })
  })

  // ========== Error handling ==========
  describe('error handling', () => {
    it('returns 500 when getLocations throws', async () => {
      provider = createMockProvider({
        getLocations: mock(async () => { throw new Error('timeout') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/locations'))
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })

    it('returns 500 when getDoors throws', async () => {
      provider = createMockProvider({
        getDoors: mock(async () => { throw new Error('connection reset') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/doors'))
      expect(res.status).toBe(500)
    })

    it('returns 500 when getGroups throws', async () => {
      provider = createMockProvider({
        getGroups: mock(async () => { throw new Error('api error') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/groups'))
      expect(res.status).toBe(500)
    })

    it('returns 500 when createGroup throws', async () => {
      provider = createMockProvider({
        createGroup: mock(async () => { throw new Error('duplicate name') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('POST', '/groups', { name: 'dup' }))
      expect(res.status).toBe(500)
    })

    it('returns 500 when getMembers throws', async () => {
      provider = createMockProvider({
        getMembers: mock(async () => { throw new Error('rate limited') }),
      })
      app = buildTestApp(provider)
      const res = await app.handle(req('GET', '/members'))
      expect(res.status).toBe(500)
    })
  })

  // ========== Minimal (UniFi-like) provider ==========
  describe('minimal provider (no groups/members/events/sync)', () => {
    beforeEach(() => {
      provider = createMockProvider({
        capabilities: MINIMAL_CAPABILITIES,
        getGroups: undefined,
        getGroup: undefined,
        createGroup: undefined,
        deleteGroup: undefined,
        getGroupDoors: undefined,
        assignDoorToGroup: undefined,
        removeDoorFromGroup: undefined,
        getMembers: undefined,
        getMember: undefined,
        createMember: undefined,
        deleteMember: undefined,
        getEvents: undefined,
        syncUsersFromKeycloak: undefined,
        getOverview: undefined,
      })
      app = buildTestApp(provider)
    })

    it('core operations still work', async () => {
      const locRes = await app.handle(req('GET', '/locations'))
      expect(locRes.status).toBe(200)

      const doorRes = await app.handle(req('GET', '/doors'))
      expect(doorRes.status).toBe(200)

      const unlockRes = await app.handle(req('POST', '/doors/door-1/unlock'))
      expect(unlockRes.status).toBe(200)
    })

    it('optional operations return 501', async () => {
      const ops: [string, string, object?][] = [
        ['GET', '/groups'],
        ['GET', '/groups/1'],
        ['POST', '/groups', { name: 'x' }],
        ['DELETE', '/groups/1'],
        ['GET', '/group-doors'],
        ['POST', '/group-doors', { groupId: 'g', doorId: 'd' }],
        ['DELETE', '/group-doors/1'],
        ['GET', '/members'],
        ['GET', '/members/1'],
        ['POST', '/members', { email: 'x@x.com' }],
        ['DELETE', '/members/1'],
        ['GET', '/events'],
      ]

      for (const [method, path, body] of ops) {
        const res = await app.handle(req(method, path, body))
        expect(res.status).toBe(501)
      }
    })

    it('overview still works via fallback path', async () => {
      const res = await app.handle(req('GET', '/overview'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.locations.data).toHaveLength(1)
      expect(data.groups.data).toHaveLength(0)
      expect(data.members.data).toHaveLength(0)
    })
  })
})
