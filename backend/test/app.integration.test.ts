import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'

// Minimal app mirroring expected routes for integration-like tests
const createTestApp = () => {
  return new Elysia()
    .get('/', () => 'Proxy Smart Backend API')
    .get('/health', () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }))
    .get('/hello', () => 'hi')
    .post('/echo', ({ body }) => body)
}

describe('Basic app integration tests', () => {
  const app = createTestApp()
  const client = treaty(app)

  it('GET / returns string', async () => {
    const res = await client.get()  // Use client.get() instead of client.index.get()
    expect(res.status).toBe(200)
    expect(res.data).toBe('Proxy Smart Backend API')
  })

  it('GET /health returns healthy status', async () => {
    const res = await client.health.get()
    expect(res.status).toBe(200)
    expect(res.data).toBeTruthy()  // Add null check
    if (res.data) {  // Add null guard
      expect(res.data).toHaveProperty('status', 'healthy')
      const ts = (res.data as Record<string, unknown>).timestamp
      expect(typeof ts === 'string' || ts instanceof Date).toBe(true)
      expect(typeof res.data.uptime).toBe('number')
    }
  })

  it('GET /hello returns hi', async () => {
    const res = await client.hello.get()
    expect(res.status).toBe(200)
    expect(res.data).toBe('hi')
  })

  it('POST /echo echoes JSON body', async () => {
    const payload = { a: 1, b: 'two' }
    const res = await client.echo.post(payload)
    expect(res.status).toBe(200)
    expect(res.data).toEqual(payload)
  })
})
