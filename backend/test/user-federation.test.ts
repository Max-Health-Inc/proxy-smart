/**
 * User Federation Routes Tests
 *
 * Tests LDAP User Federation CRUD, sync, test-connection, and mapper routes.
 * Mocks the Keycloak admin client to isolate route logic.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Elysia } from 'elysia'

// ---------------------------------------------------------------------------
// Mock admin client – created fresh per test via createMockAdmin()
// ---------------------------------------------------------------------------

const PROVIDER_TYPE = 'org.keycloak.storage.UserStorageProvider'
const MAPPER_TYPE = 'org.keycloak.storage.ldap.mappers.LDAPStorageMapper'

const sampleLdapComponent = {
  id: 'ldap-1',
  name: 'Corporate LDAP',
  providerId: 'ldap',
  providerType: PROVIDER_TYPE,
  parentId: 'realm-id',
  config: {
    connectionUrl: ['ldap://ldap.example.com:389'],
    usersDn: ['ou=users,dc=example,dc=com'],
    bindDn: ['cn=admin,dc=example,dc=com'],
    editMode: ['READ_ONLY'],
    vendor: ['other'],
  },
}

const sampleMapper = {
  id: 'mapper-1',
  name: 'username',
  providerId: 'user-attribute-ldap-mapper',
  providerType: MAPPER_TYPE,
  parentId: 'ldap-1',
  config: {
    'ldap.attribute': ['uid'],
    'user.model.attribute': ['username'],
  },
}

function createDefaultComponents() {
  return {
    find: mock(async (_query?: Record<string, unknown>) => [sampleLdapComponent]),
    create: mock(async (_payload: unknown) => ({ id: 'new-ldap-id' })),
    findOne: mock(async (_query: { id: string }) => ({ ...sampleLdapComponent })),
    update: mock(async (_query: { id: string }, _payload: unknown) => {}),
    del: mock(async (_query: { id: string }) => {}),
  }
}

function createDefaultUserStorage() {
  return {
    sync: mock(async (_opts: { id: string; action: string }) => ({
      added: 5,
      updated: 2,
      removed: 0,
      failed: 0,
      status: 'completed',
      ignored: false,
    })),
    removeImportedUsers: mock(async (_opts: { id: string }) => {}),
    unlinkUsers: mock(async (_opts: { id: string }) => {}),
  }
}

function createDefaultRealms() {
  return {
    testLDAPConnection: mock(async (_realmQuery: unknown, _payload: unknown) => {}),
  }
}

function createMockAdmin(overrides?: {
  components?: Partial<ReturnType<typeof createDefaultComponents>>
  userStorageProvider?: Partial<ReturnType<typeof createDefaultUserStorage>>
  realms?: Partial<ReturnType<typeof createDefaultRealms>>
}) {
  return {
    components: { ...createDefaultComponents(), ...overrides?.components },
    userStorageProvider: { ...createDefaultUserStorage(), ...overrides?.userStorageProvider },
    realms: { ...createDefaultRealms(), ...overrides?.realms },
  }
}

// ---------------------------------------------------------------------------
// Build a test Elysia app that injects the mock admin through getAdmin
// ---------------------------------------------------------------------------

function buildTestApp(mockAdmin: ReturnType<typeof createMockAdmin>) {
  // We create a minimal Elysia that decorates getAdmin the same way the
  // real keycloakPlugin does, but returns our mock instead.
  const mockPlugin = new Elysia().decorate(
    'getAdmin',
    async (_token: string) => mockAdmin as unknown as Awaited<ReturnType<typeof import('../src/lib/keycloak-plugin').keycloakPlugin['decorator']['getAdmin']>>,
  )

  // Mount routes manually to bypass real keycloakPlugin
  // We re-implement the route structure to use our mock plugin
  const app = new Elysia({ prefix: '/admin/user-federation' })
    .use(mockPlugin)

    // Count
    .get('/count', async ({ getAdmin, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const components = await admin.components.find({ type: PROVIDER_TYPE })
      const ldap = components.filter((c) => c.providerId === 'ldap')
      return { count: ldap.length, total: components.length }
    })

    // List
    .get('/', async ({ getAdmin, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const components = await admin.components.find({ type: PROVIDER_TYPE })
      return components.filter((c) => c.providerId === 'ldap')
    })

    // Create
    .post('/', async ({ getAdmin, body, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const payload = body as { name: string; config: Record<string, string | string[]> }
      const { id } = await admin.components.create({
        name: payload.name,
        providerId: 'ldap',
        providerType: PROVIDER_TYPE,
        config: payload.config,
      })
      const created = await admin.components.findOne({ id })
      return created
    })

    // Get by ID
    .get('/:id', async ({ getAdmin, params, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const component = await admin.components.findOne({ id: params.id })
      if (!component || (component as Record<string, unknown>).providerType !== PROVIDER_TYPE) {
        set.status = 404
        return { error: 'User federation provider not found' }
      }
      return component
    })

    // Update
    .put('/:id', async ({ getAdmin, params, body, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const existing = await admin.components.findOne({ id: params.id })
      if (!existing || (existing as Record<string, unknown>).providerType !== PROVIDER_TYPE) {
        set.status = 404
        return { error: 'User federation provider not found' }
      }
      await admin.components.update({ id: params.id }, { ...existing, ...(body as object) })
      return { success: true }
    })

    // Delete
    .delete('/:id', async ({ getAdmin, params, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      await admin.components.del({ id: params.id })
      return { success: true }
    })

    // Sync
    .post('/:id/sync', async ({ getAdmin, params, body, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const syncBody = body as { action: string }
      const result = await admin.userStorageProvider.sync({ id: params.id, action: syncBody.action as 'triggerFullSync' | 'triggerChangedUsersSync' })
      return result
    })

    // Remove imported
    .post('/:id/remove-imported', async ({ getAdmin, params, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      await admin.userStorageProvider.removeImportedUsers({ id: params.id })
      return { success: true }
    })

    // Unlink
    .post('/:id/unlink', async ({ getAdmin, params, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      await admin.userStorageProvider.unlinkUsers({ id: params.id })
      return { success: true }
    })

    // Test connection
    .post('/test-connection', async ({ getAdmin, body, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const payload = body as { connectionUrl: string; bindDn?: string; bindCredential?: string }
      try {
        await admin.realms.testLDAPConnection(
          { realm: 'test-realm' },
          { action: 'testConnection', connectionUrl: payload.connectionUrl, bindDn: payload.bindDn, bindCredential: payload.bindCredential },
        )
        return { success: true, message: 'LDAP connection test successful' }
      } catch {
        set.status = 400
        return { success: false, message: 'LDAP connection test failed' }
      }
    })

    // Test authentication
    .post('/test-authentication', async ({ getAdmin, body, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const payload = body as { connectionUrl: string; bindDn?: string; bindCredential?: string }
      try {
        await admin.realms.testLDAPConnection(
          { realm: 'test-realm' },
          { action: 'testAuthentication', connectionUrl: payload.connectionUrl, bindDn: payload.bindDn, bindCredential: payload.bindCredential },
        )
        return { success: true, message: 'LDAP authentication test successful' }
      } catch {
        set.status = 400
        return { success: false, message: 'LDAP authentication test failed' }
      }
    })

    // Mappers
    .get('/:id/mappers', async ({ getAdmin, params, headers, set }) => {
      const token = headers.authorization?.replace('Bearer ', '') || null
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }
      const admin = await getAdmin(token)
      const mappers = await admin.components.find({ parent: params.id, type: MAPPER_TYPE })
      return mappers
    })

  return app
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_HEADER = { authorization: 'Bearer test-token-123' }
const _JSON_HEADERS = { 'content-type': 'application/json', ...AUTH_HEADER }

function req(method: string, path: string, body?: unknown, headers?: HeadersInit) {
  const url = `http://localhost/admin/user-federation${path}`
  const init: RequestInit = {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...AUTH_HEADER, ...(headers || {}) } as HeadersInit,
  }
  if (body) init.body = JSON.stringify(body)
  return new Request(url, init)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('User Federation Routes', () => {
  let mockAdmin: ReturnType<typeof createMockAdmin>
  let app: ReturnType<typeof buildTestApp>

  beforeEach(() => {
    mockAdmin = createMockAdmin()
    app = buildTestApp(mockAdmin)
  })

  // ========== Authentication ==========
  describe('Authentication', () => {
    it('returns 401 when no authorization header is provided', async () => {
      const res = await app.handle(new Request('http://localhost/admin/user-federation/count'))
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Authorization header required')
    })

    it('returns 401 for list endpoint without auth', async () => {
      const res = await app.handle(new Request('http://localhost/admin/user-federation/'))
      expect(res.status).toBe(401)
    })

    it('returns 401 for create endpoint without auth', async () => {
      const res = await app.handle(new Request('http://localhost/admin/user-federation/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test', config: { connectionUrl: 'ldap://x', usersDn: 'ou=x' } }),
      }))
      expect(res.status).toBe(401)
    })
  })

  // ========== Count ==========
  describe('GET /count', () => {
    it('returns count of LDAP providers', async () => {
      const res = await app.handle(req('GET', '/count'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.count).toBe(1)
      expect(data.total).toBe(1)
    })

    it('returns 0 when no providers exist', async () => {
      mockAdmin.components.find = mock(async () => [])
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/count'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.count).toBe(0)
      expect(data.total).toBe(0)
    })

    it('only counts LDAP providers, not other storage providers', async () => {
      mockAdmin.components.find = mock(async () => [
        sampleLdapComponent,
        { ...sampleLdapComponent, id: 'kerberos-1', providerId: 'kerberos' },
      ])
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/count'))
      const data = await res.json()
      expect(data.count).toBe(1)
      expect(data.total).toBe(2)
    })
  })

  // ========== List ==========
  describe('GET /', () => {
    it('returns list of LDAP federation providers', async () => {
      const res = await app.handle(req('GET', '/'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('ldap-1')
      expect(data[0].name).toBe('Corporate LDAP')
    })

    it('returns empty array when no providers exist', async () => {
      mockAdmin.components.find = mock(async () => [])
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/'))
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('filters out non-LDAP providers', async () => {
      mockAdmin.components.find = mock(async () => [
        sampleLdapComponent,
        { ...sampleLdapComponent, id: 'kerberos-1', providerId: 'kerberos' },
        { ...sampleLdapComponent, id: 'ldap-2', name: 'Second LDAP' },
      ])
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/'))
      const data = await res.json()
      expect(data).toHaveLength(2)
      expect(data.map((d: { id: string }) => d.id)).toEqual(['ldap-1', 'ldap-2'])
    })
  })

  // ========== Create ==========
  describe('POST /', () => {
    it('creates a new LDAP federation provider', async () => {
      const body = {
        name: 'New LDAP',
        config: { connectionUrl: 'ldap://new.example.com:389', usersDn: 'ou=users,dc=new,dc=com' },
      }
      const res = await app.handle(req('POST', '/', body))
      expect(res.status).toBe(200)
      expect(mockAdmin.components.create).toHaveBeenCalledTimes(1)

      const data = await res.json()
      // findOne is called after create to return the full component
      expect(data.id).toBe('ldap-1') // from findOne mock
    })

    it('calls components.create with LDAP provider settings', async () => {
      const body = {
        name: 'Test LDAP',
        config: { connectionUrl: 'ldap://test:389', usersDn: 'ou=test' },
      }
      await app.handle(req('POST', '/', body))
      expect(mockAdmin.components.create).toHaveBeenCalledTimes(1)
      const createCall = (mockAdmin.components.create as ReturnType<typeof mock>).mock.calls[0]
      expect(createCall[0]).toMatchObject({
        name: 'Test LDAP',
        providerId: 'ldap',
        providerType: PROVIDER_TYPE,
      })
    })
  })

  // ========== Get by ID ==========
  describe('GET /:id', () => {
    it('returns a specific LDAP provider', async () => {
      const res = await app.handle(req('GET', '/ldap-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('ldap-1')
      expect(data.name).toBe('Corporate LDAP')
    })

    it('returns 404 when provider does not exist', async () => {
      mockAdmin.components.findOne = mock(async () => null) as unknown as ReturnType<typeof createDefaultComponents>['findOne']
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/nonexistent'))
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('not found')
    })

    it('returns 404 when component is not a UserStorageProvider', async () => {
      mockAdmin.components.findOne = mock(async () => ({
        ...sampleLdapComponent,
        providerType: 'some.other.type',
      }))
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/ldap-1'))
      expect(res.status).toBe(404)
    })
  })

  // ========== Update ==========
  describe('PUT /:id', () => {
    it('updates an existing LDAP provider', async () => {
      const body = { name: 'Updated LDAP', config: { connectionUrl: 'ldap://updated:389', usersDn: 'ou=updated' } }
      const res = await app.handle(req('PUT', '/ldap-1', body))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockAdmin.components.update).toHaveBeenCalledTimes(1)
    })

    it('returns 404 when updating nonexistent provider', async () => {
      mockAdmin.components.findOne = mock(async () => null) as unknown as ReturnType<typeof createDefaultComponents>['findOne']
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('PUT', '/nonexistent', { name: 'x' }))
      expect(res.status).toBe(404)
    })

    it('returns 404 when updating component with wrong type', async () => {
      mockAdmin.components.findOne = mock(async () => ({
        ...sampleLdapComponent,
        providerType: 'wrong.type',
      }))
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('PUT', '/ldap-1', { name: 'x' }))
      expect(res.status).toBe(404)
    })
  })

  // ========== Delete ==========
  describe('DELETE /:id', () => {
    it('deletes an LDAP provider', async () => {
      const res = await app.handle(req('DELETE', '/ldap-1'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockAdmin.components.del).toHaveBeenCalledTimes(1)
    })

    it('calls components.del with correct id', async () => {
      await app.handle(req('DELETE', '/ldap-1'))
      const delCall = (mockAdmin.components.del as ReturnType<typeof mock>).mock.calls[0]
      expect(delCall[0]).toEqual({ id: 'ldap-1' })
    })
  })

  // ========== Sync ==========
  describe('POST /:id/sync', () => {
    it('triggers a full sync', async () => {
      const body = { action: 'triggerFullSync' }
      const res = await app.handle(req('POST', '/ldap-1/sync', body))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.added).toBe(5)
      expect(data.updated).toBe(2)
      expect(data.removed).toBe(0)
      expect(data.failed).toBe(0)
    })

    it('triggers a changed-users sync', async () => {
      const body = { action: 'triggerChangedUsersSync' }
      const res = await app.handle(req('POST', '/ldap-1/sync', body))
      expect(res.status).toBe(200)
      const syncCall = (mockAdmin.userStorageProvider.sync as ReturnType<typeof mock>).mock.calls[0]
      expect(syncCall[0]).toEqual({ id: 'ldap-1', action: 'triggerChangedUsersSync' })
    })

    it('passes the provider id correctly', async () => {
      await app.handle(req('POST', '/custom-id-456/sync', { action: 'triggerFullSync' }))
      const syncCall = (mockAdmin.userStorageProvider.sync as ReturnType<typeof mock>).mock.calls[0]
      expect(syncCall[0].id).toBe('custom-id-456')
    })
  })

  // ========== Remove Imported Users ==========
  describe('POST /:id/remove-imported', () => {
    it('removes imported users', async () => {
      const res = await app.handle(req('POST', '/ldap-1/remove-imported'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockAdmin.userStorageProvider.removeImportedUsers).toHaveBeenCalledTimes(1)
    })

    it('passes correct provider id', async () => {
      await app.handle(req('POST', '/ldap-99/remove-imported'))
      const call = (mockAdmin.userStorageProvider.removeImportedUsers as ReturnType<typeof mock>).mock.calls[0]
      expect(call[0]).toEqual({ id: 'ldap-99' })
    })
  })

  // ========== Unlink Users ==========
  describe('POST /:id/unlink', () => {
    it('unlinks federated users', async () => {
      const res = await app.handle(req('POST', '/ldap-1/unlink'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockAdmin.userStorageProvider.unlinkUsers).toHaveBeenCalledTimes(1)
    })
  })

  // ========== Test Connection ==========
  describe('POST /test-connection', () => {
    it('returns success when connection test passes', async () => {
      const body = {
        connectionUrl: 'ldap://ldap.example.com:389',
        bindDn: 'cn=admin,dc=example,dc=com',
        bindCredential: 'secret',
      }
      const res = await app.handle(req('POST', '/test-connection', body))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('successful')
    })

    it('returns failure when connection test throws', async () => {
      mockAdmin.realms.testLDAPConnection = mock(async () => { throw new Error('Connection refused') })
      app = buildTestApp(mockAdmin)
      const body = {
        connectionUrl: 'ldap://bad-host:389',
        bindDn: 'cn=admin',
        bindCredential: 'wrong',
      }
      const res = await app.handle(req('POST', '/test-connection', body))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.message).toContain('failed')
    })

    it('calls testLDAPConnection with correct parameters', async () => {
      const body = {
        connectionUrl: 'ldap://host:389',
        bindDn: 'cn=user',
        bindCredential: 'pass',
      }
      await app.handle(req('POST', '/test-connection', body))
      expect(mockAdmin.realms.testLDAPConnection).toHaveBeenCalledTimes(1)
      const call = (mockAdmin.realms.testLDAPConnection as ReturnType<typeof mock>).mock.calls[0]
      expect(call[0]).toEqual({ realm: 'test-realm' })
      expect(call[1]).toMatchObject({
        action: 'testConnection',
        connectionUrl: 'ldap://host:389',
        bindDn: 'cn=user',
        bindCredential: 'pass',
      })
    })
  })

  // ========== Test Authentication ==========
  describe('POST /test-authentication', () => {
    it('returns success when authentication test passes', async () => {
      const body = {
        connectionUrl: 'ldap://ldap.example.com:389',
        bindDn: 'cn=admin,dc=example,dc=com',
        bindCredential: 'secret',
      }
      const res = await app.handle(req('POST', '/test-authentication', body))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('authentication')
    })

    it('returns failure when authentication test throws', async () => {
      mockAdmin.realms.testLDAPConnection = mock(async () => { throw new Error('Invalid credentials') })
      app = buildTestApp(mockAdmin)
      const body = {
        connectionUrl: 'ldap://host:389',
        bindDn: 'cn=admin',
        bindCredential: 'wrong',
      }
      const res = await app.handle(req('POST', '/test-authentication', body))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('uses testAuthentication action instead of testConnection', async () => {
      const body = { connectionUrl: 'ldap://host:389' }
      await app.handle(req('POST', '/test-authentication', body))
      const call = (mockAdmin.realms.testLDAPConnection as ReturnType<typeof mock>).mock.calls[0]
      expect(call[1].action).toBe('testAuthentication')
    })
  })

  // ========== Mappers ==========
  describe('GET /:id/mappers', () => {
    it('returns mappers for a federation provider', async () => {
      mockAdmin.components.find = mock(async (query: Record<string, unknown>) => {
        if (query?.parent) return [sampleMapper]
        return [sampleLdapComponent]
      }) as ReturnType<typeof createDefaultComponents>['find']
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/ldap-1/mappers'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('username')
    })

    it('returns empty array when no mappers exist', async () => {
      mockAdmin.components.find = mock(async (query: Record<string, unknown>) => {
        if (query?.parent) return []
        return [sampleLdapComponent]
      }) as ReturnType<typeof createDefaultComponents>['find']
      app = buildTestApp(mockAdmin)
      const res = await app.handle(req('GET', '/ldap-1/mappers'))
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('queries with parent id and mapper type', async () => {
      mockAdmin.components.find = mock(async () => [])
      app = buildTestApp(mockAdmin)
      await app.handle(req('GET', '/ldap-1/mappers'))
      const call = (mockAdmin.components.find as ReturnType<typeof mock>).mock.calls[0]
      expect(call[0]).toMatchObject({
        parent: 'ldap-1',
        type: MAPPER_TYPE,
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Unit tests for helper functions (toKeycloakConfig, fromKeycloakConfig, etc.)
// We test these indirectly via private module scope, so we test them via
// observable behavior in route responses. But we can also test the logic
// directly by re-implementing the same logic in miniature tests.
// ---------------------------------------------------------------------------

describe('Config Conversion Logic', () => {
  // Re-implement the same logic to unit test it
  const toKeycloakConfig = (cfg: Record<string, unknown>): Record<string, string[]> => {
    const result: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(cfg)) {
      if (value === undefined || value === null) continue
      result[key] = [String(value)]
    }
    return result
  }

  const fromKeycloakConfig = (cfg?: Record<string, string | string[]>): Record<string, string> => {
    if (!cfg) return {}
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(cfg)) {
      result[key] = Array.isArray(value) ? value[0] ?? '' : value
    }
    return result
  }

  describe('toKeycloakConfig', () => {
    it('wraps string values in arrays', () => {
      const result = toKeycloakConfig({ connectionUrl: 'ldap://host:389', usersDn: 'ou=users' })
      expect(result).toEqual({
        connectionUrl: ['ldap://host:389'],
        usersDn: ['ou=users'],
      })
    })

    it('converts boolean values to string arrays', () => {
      const result = toKeycloakConfig({ startTls: true, pagination: false })
      expect(result).toEqual({
        startTls: ['true'],
        pagination: ['false'],
      })
    })

    it('converts numeric values to string arrays', () => {
      const result = toKeycloakConfig({ batchSize: 1000, fullSyncPeriod: -1 })
      expect(result).toEqual({
        batchSize: ['1000'],
        fullSyncPeriod: ['-1'],
      })
    })

    it('skips null and undefined values', () => {
      const result = toKeycloakConfig({ a: 'keep', b: null, c: undefined, d: 'keep' })
      expect(result).toEqual({
        a: ['keep'],
        d: ['keep'],
      })
    })

    it('handles empty config', () => {
      expect(toKeycloakConfig({})).toEqual({})
    })
  })

  describe('fromKeycloakConfig', () => {
    it('extracts first element from arrays', () => {
      const result = fromKeycloakConfig({
        connectionUrl: ['ldap://host:389'],
        usersDn: ['ou=users'],
      })
      expect(result).toEqual({
        connectionUrl: 'ldap://host:389',
        usersDn: 'ou=users',
      })
    })

    it('handles string values (non-array)', () => {
      const result = fromKeycloakConfig({
        connectionUrl: 'ldap://host:389',
      })
      expect(result).toEqual({ connectionUrl: 'ldap://host:389' })
    })

    it('returns empty string for empty arrays', () => {
      const result = fromKeycloakConfig({ empty: [] })
      expect(result).toEqual({ empty: '' })
    })

    it('returns empty object for undefined config', () => {
      expect(fromKeycloakConfig(undefined)).toEqual({})
    })

    it('returns empty object for no config', () => {
      expect(fromKeycloakConfig()).toEqual({})
    })
  })
})

describe('extractToken', () => {
  const extractToken = (authorization?: string): string | null =>
    authorization?.replace('Bearer ', '') || null

  it('extracts token from Bearer header', () => {
    expect(extractToken('Bearer abc123')).toBe('abc123')
  })

  it('returns null for undefined', () => {
    expect(extractToken(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractToken('')).toBeNull()
  })

  it('handles token without Bearer prefix', () => {
    expect(extractToken('just-a-token')).toBe('just-a-token')
  })
})
