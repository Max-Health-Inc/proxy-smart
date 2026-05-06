import { describe, it, expect } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

describe('Auth Routes', () => {
  it('should return auth config with keycloak info', async () => {
    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') || '').toContain('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')

    if ('clientId' in data.keycloak && data.keycloak.clientId !== undefined && data.keycloak.clientId !== null) {
      expect(typeof data.keycloak.clientId).toBe('string')
    }
  })

  it('should return 404 for unknown auth routes', async () => {
    const res = await authRoutes.handle(new Request('http://localhost/auth/does-not-exist'))
    expect(res.status).toBe(404)
  })
})
