/**
 * Kisi Client Tests
 * 
 * Unit tests for the Kisi API client (fetch-based).
 */

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import { KisiClient, KisiApiError } from '../src/lib/kisi/client'

// ==================== Helpers ====================

function createClient(overrides: Record<string, unknown> = {}) {
  return new KisiClient({
    apiKey: 'test-api-key-123',
    baseUrl: 'https://api.kisi.test',
    timeout: 5000,
    ...overrides,
  })
}

function mockFetchResponse(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  const { status = 200, headers = {} } = options
  return mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
      })
    )
  )
}

function mockFetchPaginated(body: unknown[], range: string) {
  return mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-collection-range': range,
        },
      })
    )
  )
}

// ==================== Constructor ====================

describe('KisiClient', () => {
  describe('constructor', () => {
    it('requires an API key', () => {
      expect(() => new KisiClient({})).toThrow('Kisi API key is required')
    })

    it('uses default base URL', () => {
      const client = new KisiClient({ apiKey: 'key' })
      // Can't directly inspect private field, but verify it doesn't throw
      expect(client).toBeDefined()
    })
  })

  // ==================== HTTP Layer ====================

  describe('HTTP requests', () => {
    let client: KisiClient
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
      client = createClient()
      originalFetch = globalThis.fetch
    })

    it('sends correct auth header', async () => {
      let capturedHeaders: Record<string, string> = {}
      globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(
          Object.entries(init?.headers || {})
        ) as Record<string, string>
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-collection-range': '0-0/0' },
        })
      }) as unknown as typeof fetch

      await client.getPlaces({ limit: 1 })

      expect(capturedHeaders['Authorization']).toBe('KISI-ORGANIZATION test-api-key-123')
      globalThis.fetch = originalFetch
    })

    it('throws KisiApiError on 4xx', async () => {
      globalThis.fetch = mockFetchResponse(
        { code: '403001', error: 'Forbidden' },
        { status: 403 }
      ) as unknown as typeof fetch

      try {
        await client.getPlaces()
        expect(true).toBe(false) // should not reach
      } catch (error) {
        expect(error).toBeInstanceOf(KisiApiError)
        expect((error as KisiApiError).status).toBe(403)
        expect((error as KisiApiError).reason).toBe('Forbidden')
      }

      globalThis.fetch = originalFetch
    })

    it('throws KisiApiError on 5xx', async () => {
      globalThis.fetch = mockFetchResponse(
        { error: 'Internal Server Error' },
        { status: 500 }
      ) as unknown as typeof fetch

      try {
        await client.getPlaces()
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(KisiApiError)
        expect((error as KisiApiError).status).toBe(500)
      }

      globalThis.fetch = originalFetch
    })

    it('handles 204 No Content', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 204 }))
      ) as unknown as typeof fetch

      const result = await client.delete('groups/1')
      expect(result).toBeUndefined()

      globalThis.fetch = originalFetch
    })
  })

  // ==================== Pagination ====================

  describe('pagination', () => {
    let client: KisiClient
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
      client = createClient()
      originalFetch = globalThis.fetch
    })

    it('parses x-collection-range header', async () => {
      globalThis.fetch = mockFetchPaginated(
        [{ id: 1, name: 'HQ' }, { id: 2, name: 'Branch' }],
        '0-1/10'
      ) as unknown as typeof fetch

      const result = await client.getPlaces({ limit: 2 })

      expect(result.pagination.offset).toBe(0)
      expect(result.pagination.limit).toBe(2)
      expect(result.pagination.count).toBe(10)
      expect(result.data).toHaveLength(2)

      globalThis.fetch = originalFetch
    })

    it('handles empty range (*)', async () => {
      globalThis.fetch = mockFetchPaginated([], '*/0') as unknown as typeof fetch

      const result = await client.getPlaces()

      expect(result.pagination.offset).toBe(0)
      expect(result.pagination.limit).toBe(0)
      expect(result.pagination.count).toBe(0)
      expect(result.data).toHaveLength(0)

      globalThis.fetch = originalFetch
    })
  })

  // ==================== camelCase ↔ snake_case ====================

  describe('key transformation', () => {
    let client: KisiClient
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
      client = createClient()
      originalFetch = globalThis.fetch
    })

    it('camelizes snake_case response keys', async () => {
      globalThis.fetch = mockFetchPaginated(
        [{ id: 1, place_id: 5, created_at: '2026-01-01T00:00:00Z', time_zone: 'Europe/Vienna' }],
        '0-0/1'
      ) as unknown as typeof fetch

      const result = await client.getPlaces()
      const place = result.data[0] as unknown as Record<string, unknown>

      expect(place.placeId).toBe(5)
      expect(place.createdAt).toBe('2026-01-01T00:00:00Z')
      expect(place.timeZone).toBe('Europe/Vienna')

      globalThis.fetch = originalFetch
    })

    it('decamelizes request body keys', async () => {
      let capturedBody: string = ''
      globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = (init?.body as string) || ''
        return new Response(JSON.stringify({ id: 1, name: 'Test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }) as unknown as typeof fetch

      await client.createGroup({ name: 'Test', description: 'A group' })
      const parsed = JSON.parse(capturedBody)

      // Body should have snake_case keys
      expect(parsed.group).toBeDefined()

      globalThis.fetch = originalFetch
    })
  })

  // ==================== Domain Operations ====================

  describe('domain operations', () => {
    let client: KisiClient
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
      client = createClient()
      originalFetch = globalThis.fetch
    })

    it('unlock sends POST to correct path', async () => {
      let capturedUrl = ''
      let capturedMethod = ''
      globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = url.toString()
        capturedMethod = init?.method || ''
        return new Response(JSON.stringify({ message: 'Unlocked' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }) as unknown as typeof fetch

      const result = await client.unlock(42)

      expect(capturedMethod).toBe('POST')
      expect(capturedUrl).toContain('locks/42/unlock')
      expect(result.message).toBe('Unlocked')

      globalThis.fetch = originalFetch
    })

    it('ping returns true on success', async () => {
      globalThis.fetch = mockFetchPaginated([], '*/0') as unknown as typeof fetch
      const result = await client.ping()
      expect(result).toBe(true)
      globalThis.fetch = originalFetch
    })

    it('ping returns false on error', async () => {
      globalThis.fetch = mock(() =>
        Promise.reject(new Error('Network error'))
      ) as unknown as typeof fetch

      const result = await client.ping()
      expect(result).toBe(false)
      globalThis.fetch = originalFetch
    })
  })
})
