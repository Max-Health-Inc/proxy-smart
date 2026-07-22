/**
 * Tests for ensureIntrospectionClientConfig — relaxes Keycloak 26.6.2+ (CVE-2026-37979)
 * introspection audience enforcement on the proxy's introspection client, so it can
 * introspect SMART tokens whose narrowed `aud` doesn't list it (otherwise every valid
 * token introspects as active:false).
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ensureIntrospectionClientConfig } from '../src/lib/kc-system-provisioning'

const ATTR = 'allow.token.introspection.without.audience.check'
const ENV_KEY = 'KEYCLOAK_ADMIN_CLIENT_ID'
let saved: string | undefined

function makeAdmin(existing: Record<string, unknown>[]) {
  const updates: { id: string; payload: Record<string, unknown> }[] = []
  const admin = {
    clients: {
      find: async ({ clientId }: { clientId: string }) =>
        existing.filter((c) => c.clientId === clientId),
      update: async ({ id }: { id: string }, payload: Record<string, unknown>) => {
        updates.push({ id, payload })
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { admin, updates }
}

describe('ensureIntrospectionClientConfig', () => {
  beforeEach(() => { saved = process.env[ENV_KEY]; process.env[ENV_KEY] = 'admin-service' })
  afterEach(() => { if (saved === undefined) delete process.env[ENV_KEY]; else process.env[ENV_KEY] = saved })

  it('sets the attribute when missing, preserving existing attributes', async () => {
    const { admin, updates } = makeAdmin([
      { id: 'uuid-1', clientId: 'admin-service', attributes: { 'access.token.lifespan': '3600' } },
    ])

    await ensureIntrospectionClientConfig(admin)

    expect(updates).toHaveLength(1)
    const attrs = updates[0].payload.attributes as Record<string, string>
    expect(attrs[ATTR]).toBe('true')
    expect(attrs['access.token.lifespan']).toBe('3600')
  })

  it('is a no-op when the attribute is already set (idempotent)', async () => {
    const { admin, updates } = makeAdmin([
      { id: 'uuid-1', clientId: 'admin-service', attributes: { [ATTR]: 'true' } },
    ])

    await ensureIntrospectionClientConfig(admin)

    expect(updates).toHaveLength(0)
  })

  it('is a no-op when the introspection client does not exist', async () => {
    const { admin, updates } = makeAdmin([])

    await ensureIntrospectionClientConfig(admin)

    expect(updates).toHaveLength(0)
  })

  it('does not throw when Keycloak rejects the update', async () => {
    const admin = {
      clients: {
        find: async () => [{ id: 'uuid-1', clientId: 'admin-service', attributes: {} }],
        update: async () => { throw new Error('kc down') },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    await expect(ensureIntrospectionClientConfig(admin)).resolves.toBeUndefined()
  })
})
