/**
 * Tests for ensureShlExchangeClient — reconciles the SHL token-exchange client's
 * secret in Keycloak from config, so no SHL secret is committed to realm-export
 * and Keycloak never drifts from what the backend authenticates with.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ensureShlExchangeClient } from '../src/lib/kc-system-provisioning'

const ENV_KEY = 'SHL_EXCHANGE_CLIENT_SECRET'
let savedSecret: string | undefined

/** Mock KcAdminClient recording create/update calls; `existing` seeds find(). */
function makeAdmin(existing: { id?: string; clientId?: string }[]) {
  const created: Record<string, unknown>[] = []
  const updated: { id: string; payload: Record<string, unknown> }[] = []
  const admin = {
    clients: {
      find: async ({ clientId }: { clientId: string }) =>
        existing.filter((c) => c.clientId === clientId),
      create: async (rep: Record<string, unknown>) => { created.push(rep) },
      update: async ({ id }: { id: string }, payload: Record<string, unknown>) => {
        updated.push({ id, payload })
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { admin, created, updated }
}

describe('ensureShlExchangeClient', () => {
  beforeEach(() => { savedSecret = process.env[ENV_KEY] })
  afterEach(() => {
    if (savedSecret === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = savedSecret
  })

  it('creates the client with the config secret when it does not exist', async () => {
    process.env[ENV_KEY] = 'strong-secret-123'
    const { admin, created, updated } = makeAdmin([])

    await ensureShlExchangeClient(admin)

    expect(created).toHaveLength(1)
    expect(updated).toHaveLength(0)
    expect(created[0].clientId).toBe('shl-exchange')
    expect(created[0].secret).toBe('strong-secret-123')
    expect(created[0].serviceAccountsEnabled).toBe(true)
    expect(created[0].publicClient).toBe(false)
  })

  it('reconciles the secret on an existing client without recreating it', async () => {
    process.env[ENV_KEY] = 'rotated-secret-456'
    const { admin, created, updated } = makeAdmin([{ id: 'uuid-1', clientId: 'shl-exchange' }])

    await ensureShlExchangeClient(admin)

    expect(created).toHaveLength(0)
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe('uuid-1')
    expect(updated[0].payload.secret).toBe('rotated-secret-456')
  })

  it('is a no-op when no secret is configured (SHL disabled)', async () => {
    delete process.env[ENV_KEY]
    const { admin, created, updated } = makeAdmin([])

    await ensureShlExchangeClient(admin)

    expect(created).toHaveLength(0)
    expect(updated).toHaveLength(0)
  })

  it('does not throw when Keycloak rejects the operation', async () => {
    process.env[ENV_KEY] = 'strong-secret-123'
    const admin = {
      clients: { find: async () => { throw new Error('kc down') } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    await expect(ensureShlExchangeClient(admin)).resolves.toBeUndefined()
  })
})
