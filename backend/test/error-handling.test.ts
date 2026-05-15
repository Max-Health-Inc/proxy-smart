import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

const createErrorApp = () => {
  return new Elysia()
    .get('/throws', () => {
      throw new Error('boom')
    })
    .get('/async-throws', async () => {
      throw new Error('async boom')
    })
    .post('/validate', async ({ body }) => {
      const parsed = body as Record<string, unknown>
      if (!parsed || typeof parsed !== 'object' || !('name' in parsed) || !parsed.name) {
        return new Response(JSON.stringify({ error: 'name required' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    })
}

describe('Error handling and validation', () => {
  const app = createErrorApp()

  it('returns 500 for synchronous thrown errors', async () => {
    const res = await app.handle(new Request('http://localhost/throws'))
    expect(res.status).toBe(500)
  })

  it('returns 500 for async thrown errors', async () => {
    const res = await app.handle(new Request('http://localhost/async-throws'))
    expect(res.status).toBe(500)
  })

  it('validates request body and returns 400 when missing required field', async () => {
    const res = await app.handle(
      new Request('http://localhost/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      })
    )

    expect(res.status).toBe(400)
    expect(res.headers.get('content-type') || '').toContain('application/json')
    const payload = await res.json()
    expect(payload).toEqual({ error: 'name required' })
  })

  it('accepts valid payload and returns 200', async () => {
    const res = await app.handle(
      new Request('http://localhost/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'tester' })
      })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') || '').toContain('application/json')
    const payload = await res.json()
    expect(payload).toEqual({ ok: true })
  })
})
