/**
 * FHIR MCP Tools — Unit Tests
 *
 * Tests the registerFhirTools function and the proxyFhirRequest internal logic.
 * Mocks upstream FHIR server responses to test the full tool flow without
 * needing a real FHIR server.
 */

import { describe, it, expect, beforeEach, mock, afterAll } from 'bun:test'

// ── Mock modules before importing ────────────────────────────────────────────

const mockValidateToken = mock(async (_token: string) => ({
  sub: 'test-user',
  azp: 'test-client',
  iss: 'http://localhost:8080/realms/proxy-smart',
  realm_access: { roles: ['admin'] },
  resource_access: {},
  scope: 'openid user/Patient.read user/Patient.write user/Observation.read',
}))

mock.module('../src/lib/auth', () => ({
  validateToken: mockValidateToken,
}))

const mockFetch = mock(async (_url: string, _opts?: unknown) =>
  new Response(JSON.stringify({ resourceType: 'Patient', id: '123', name: [{ family: 'Test' }] }), {
    status: 200,
    headers: { 'content-type': 'application/fhir+json' },
  }),
)

mock.module('cross-fetch', () => ({
  default: mockFetch,
  Headers: globalThis.Headers,
}))

mock.module('../src/lib/fhir-server-store', () => ({
  getAllServers: async () => [
    { identifier: 'hapi', name: 'HAPI FHIR', url: 'http://localhost:8081/fhir' },
  ],
  getServerInfoByName: async (name: string) => {
    if (name === 'hapi' || !name) {
      return {
        identifier: 'hapi',
        name: 'HAPI FHIR',
        url: 'http://localhost:8081/fhir',
        strictCapabilities: false,
      }
    }
    return null
  },
  fhirServerStore: { getAllServers: () => [] },
}))

mock.module('../src/lib/consent', () => ({
  checkConsentWithIal: async () => ({ decision: 'permit' }),
  getConsentConfig: () => ({ mode: 'disabled' }),
}))

mock.module('../src/lib/smart-access-control', () => ({
  enforceScopeAccess: () => ({ allowed: true }),
  enforceRoleBasedFiltering: async (_ctx: unknown, qs: string) => ({ allowed: true, modifiedQueryString: qs }),
}))

mock.module('../src/lib/fhir-capabilities', () => ({
  getServerCapabilities: async () => null,
  normalizeSearchParams: () => ({ normalizedParams: new URLSearchParams(), strippedParams: [], strippedIncludes: [] }),
  parseFhirPath: (path: string, method: string) => ({
    resourceType: path.split('/')[0],
    hasSearchSemantics: method === 'GET' && !path.includes('/'),
    isOperation: false,
    isHistory: false,
    isInstance: path.includes('/'),
  }),
  isInteractionSupported: () => true,
}))

mock.module('../../routes/fhir-servers', () => ({
  fetchWithMtls: async () => new Response('{}', { status: 200 }),
  getMtlsConfig: async () => ({ enabled: false }),
}))

// Fix: mock the correct relative path that fhir-tools.ts uses
mock.module('../src/routes/fhir-servers', () => ({
  fetchWithMtls: async () => new Response('{}', { status: 200 }),
  getMtlsConfig: async () => ({ enabled: false }),
}))

mock.module('../src/lib/fhir-proxy-metrics-logger', () => ({
  fhirProxyMetricsLogger: {
    logRequest: () => {},
  },
}))

mock.module('../src/lib/mcp-endpoint-config', () => ({
  isToolExposed: () => true,
  loadMcpEndpointConfig: () => ({ enabled: true, exposeResourcesAsTools: true, disabledTools: [], disabledResources: [] }),
}))

process.env.MCP_ENDPOINT_ENABLED = 'true'
process.env.KEYCLOAK_BASE_URL = 'http://localhost:8080'
process.env.KEYCLOAK_PUBLIC_URL = 'http://localhost:8080'
process.env.KEYCLOAK_REALM = 'proxy-smart'

// ── Import after mocks ──────────────────────────────────────────────────────

const { registerFhirTools } = await import('../src/lib/ai/fhir-tools')

// ── Mock McpServer ──────────────────────────────────────────────────────────

interface RegisteredTool {
  name: string
  config: { description: string; inputSchema?: unknown; annotations?: unknown }
  handler: (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>
}

function createMockMcpServer() {
  const tools: RegisteredTool[] = []
  return {
    tools,
    registerTool(
      name: string,
      config: RegisteredTool['config'],
      handler: RegisteredTool['handler'],
    ) {
      tools.push({ name, config, handler })
    },
    getTool(name: string) {
      return tools.find((t) => t.name === name)
    },
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('FHIR MCP Tools', () => {
  let server: ReturnType<typeof createMockMcpServer>
  const tokenRef = { current: 'valid-test-token' }

  beforeEach(() => {
    server = createMockMcpServer()
    mockValidateToken.mockClear()
    mockFetch.mockClear()

    mockValidateToken.mockImplementation(async () => ({
      sub: 'test-user',
      azp: 'test-client',
      iss: 'http://localhost:8080/realms/proxy-smart',
      realm_access: { roles: ['admin'] },
      resource_access: {},
      scope: 'openid user/Patient.read user/Patient.write user/Observation.read',
    }))

    mockFetch.mockImplementation(async (_url: string) =>
      new Response(JSON.stringify({ resourceType: 'Patient', id: '123', name: [{ family: 'Test' }] }), {
        status: 200,
        headers: { 'content-type': 'application/fhir+json' },
      }),
    )
  })

  describe('registerFhirTools', () => {
    it('registers all 6 FHIR tools', () => {
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)

      const names = server.tools.map((t) => t.name)
      expect(names).toContain('fhir_read')
      expect(names).toContain('fhir_search')
      expect(names).toContain('fhir_create')
      expect(names).toContain('fhir_update')
      expect(names).toContain('fhir_delete')
      expect(names).toContain('fhir_capabilities')
    })

    it('marks read-only tools with readOnlyHint annotation', () => {
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)

      const readTool = server.getTool('fhir_read')
      expect(readTool?.config.annotations).toEqual({ readOnlyHint: true, idempotentHint: true })

      const searchTool = server.getTool('fhir_search')
      expect(searchTool?.config.annotations).toEqual({ readOnlyHint: true, idempotentHint: true })

      // Mutating tools should NOT have readOnlyHint
      const createTool = server.getTool('fhir_create')
      expect(createTool?.config.annotations).toBeUndefined()
    })
  })

  describe('fhir_read', () => {
    it('reads a Patient by ID', async () => {
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_read')!

      const result = await tool.handler({ resourceType: 'Patient', id: '123' })
      expect(result.isError).toBeUndefined()

      const data = JSON.parse(result.content[0].text)
      expect(data.resourceType).toBe('Patient')
      expect(data.id).toBe('123')

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalled()
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('/Patient/123')
    })

    it('returns error when no auth token', async () => {
      const noTokenRef = { current: undefined as string | undefined }
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], noTokenRef)
      const tool = server.getTool('fhir_read')!

      const result = await tool.handler({ resourceType: 'Patient', id: '123' })
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Authentication required')
    })
  })

  describe('fhir_search', () => {
    it('searches for Observations with query params', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 2,
            entry: [
              { resource: { resourceType: 'Observation', id: '1' } },
              { resource: { resourceType: 'Observation', id: '2' } },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_search')!

      const result = await tool.handler({
        resourceType: 'Observation',
        queryParams: 'patient=Patient/123&code=http://loinc.org|8867-4',
      })
      expect(result.isError).toBeUndefined()

      const data = JSON.parse(result.content[0].text)
      expect(data.resourceType).toBe('Bundle')
      expect(data.total).toBe(2)

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('/Observation')
      expect(callUrl).toContain('patient=Patient')
    })

    it('searches without query params', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] }),
          { status: 200, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_search')!

      const result = await tool.handler({ resourceType: 'Patient' })
      expect(result.isError).toBeUndefined()
    })
  })

  describe('fhir_create', () => {
    it('creates a new Observation', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({ resourceType: 'Observation', id: 'new-1', status: 'final' }),
          { status: 201, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_create')!

      const result = await tool.handler({
        resourceType: 'Observation',
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: '8867-4' }] },
          subject: { reference: 'Patient/123' },
        },
      })
      expect(result.isError).toBeUndefined()

      // Verify POST method was used
      const callOpts = mockFetch.mock.calls[0][1] as { method: string }
      expect(callOpts.method).toBe('POST')
    })
  })

  describe('fhir_update', () => {
    it('updates an existing Patient', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({ resourceType: 'Patient', id: '123', name: [{ family: 'Updated' }] }),
          { status: 200, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_update')!

      const result = await tool.handler({
        resourceType: 'Patient',
        id: '123',
        resource: { resourceType: 'Patient', id: '123', name: [{ family: 'Updated' }] },
      })
      expect(result.isError).toBeUndefined()

      const callOpts = mockFetch.mock.calls[0][1] as { method: string }
      expect(callOpts.method).toBe('PUT')
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('/Patient/123')
    })
  })

  describe('fhir_delete', () => {
    it('deletes a resource', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({ resourceType: 'OperationOutcome', issue: [{ severity: 'information', code: 'deleted' }] }),
          { status: 200, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_delete')!

      const result = await tool.handler({ resourceType: 'Patient', id: '123' })
      expect(result.isError).toBeUndefined()

      const callOpts = mockFetch.mock.calls[0][1] as { method: string }
      expect(callOpts.method).toBe('DELETE')
    })
  })

  describe('fhir_capabilities', () => {
    it('returns CapabilityStatement', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({
            resourceType: 'CapabilityStatement',
            status: 'active',
            fhirVersion: '4.0.1',
            rest: [{ mode: 'server', resource: [{ type: 'Patient' }] }],
          }),
          { status: 200, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_capabilities')!

      const result = await tool.handler({})
      expect(result.isError).toBeUndefined()

      const data = JSON.parse(result.content[0].text)
      expect(data.resourceType).toBe('CapabilityStatement')
    })
  })

  describe('server resolution', () => {
    it('uses explicit server name when provided', async () => {
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_read')!

      await tool.handler({ resourceType: 'Patient', id: '123', serverName: 'hapi' })
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toStartWith('http://localhost:8081/fhir/')
    })

    it('returns error for unknown server', async () => {
      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_read')!

      const result = await tool.handler({ resourceType: 'Patient', id: '123', serverName: 'nonexistent' })
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('error handling', () => {
    it('reports upstream 404 as error', async () => {
      mockFetch.mockImplementation(async () =>
        new Response(
          JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found' }],
          }),
          { status: 404, headers: { 'content-type': 'application/fhir+json' } },
        ),
      )

      registerFhirTools(server as unknown as Parameters<typeof registerFhirTools>[0], tokenRef)
      const tool = server.getTool('fhir_read')!

      const result = await tool.handler({ resourceType: 'Patient', id: '999' })
      expect(result.isError).toBe(true)
    })
  })
})
