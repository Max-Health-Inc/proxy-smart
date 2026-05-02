import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { authRoutes } from '../src/routes/auth'

const ENV_KEYS = [
  'KEYCLOAK_BASE_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
  'KEYCLOAK_REDIRECT_URI',
  'KEYCLOAK_SCOPE'
] as const

type EnvKey = typeof ENV_KEYS[number]

const snapshotEnv = () => {
  const snap: Partial<Record<EnvKey, string>> = {}
  for (const k of ENV_KEYS) snap[k] = process.env[k]
  return snap
}

const restoreEnv = (snap: Partial<Record<EnvKey, string>>) => {
  for (const k of ENV_KEYS) {
    const v = snap[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('Auth Config Route Edge Cases', () => {
  let envSnap: Partial<Record<EnvKey, string>>

  beforeEach(() => {
    envSnap = snapshotEnv()
  })

  afterEach(() => {
    restoreEnv(envSnap)
  })

  it('returns isConfigured=false when Keycloak is not configured', async () => {
    // Unset all Keycloak-related envs
    for (const k of ENV_KEYS) delete process.env[k]

    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')?.toLowerCase() || ''
    expect(contentType).toContain('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('keycloak')
    expect(typeof data.keycloak).toBe('object')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(typeof data.keycloak.isConfigured).toBe('boolean')
    expect(data.keycloak.isConfigured).toBe(false)
  })

  it('returns isConfigured=true when KEYCLOAK_BASE_URL is provided and preserves JSON shape', async () => {
    process.env.KEYCLOAK_BASE_URL = 'http://localhost:8080'
    process.env.KEYCLOAK_REALM = 'test-realm'
    process.env.KEYCLOAK_CLIENT_ID = 'test-client'

    const res = await authRoutes.handle(new Request('http://localhost/auth/config'))
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')?.toLowerCase() || ''
    expect(contentType).toContain('application/json')

    const data = await res.json()
    expect(data).toHaveProperty('keycloak')
    expect(data.keycloak).toHaveProperty('isConfigured')
    expect(data.keycloak.isConfigured).toBe(true)

    // If implementation exposes fields, ensure they are strings when present
    const optionalStringProps = ['baseUrl', 'realm', 'clientId', 'redirectUri', 'scope'] as const
    for (const p of optionalStringProps) {
      if (p in data.keycloak && data.keycloak[p] !== undefined && data.keycloak[p] !== null) {
        expect(typeof data.keycloak[p]).toBe('string')
      }
    }
  })
})
