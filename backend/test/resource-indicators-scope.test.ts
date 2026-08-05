/**
 * Unit tests for assignResourceIndicatorsScope — the shared helper that attaches
 * the RFC 8707 `resource-indicators` client scope to every SMART client the
 * backend provisions (DCR + admin API). Without this default scope, Keycloak's
 * resource-indicators post-processor cannot bind a requested `resource` into the
 * token `aud` and token exchange fails with `invalid_target`.
 */
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  assignResourceIndicatorsScope,
  RESOURCE_INDICATORS_SCOPE,
} from '../src/lib/smart-client-enrichment'
import { RESOURCE_AUDIENCE_CLIENT_IDS } from '../src/lib/kc-system-provisioning'

/** Minimal KcAdminClient stub recording addDefaultClientScope calls. */
function makeAdmin(realmScopes: { id?: string; name?: string }[]) {
  const added: { id: string; clientScopeId: string }[] = []
  const admin = {
    clientScopes: { find: async () => realmScopes },
    clients: {
      addDefaultClientScope: async (args: { id: string; clientScopeId: string }) => {
        added.push(args)
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { admin, added }
}

describe('assignResourceIndicatorsScope', () => {
  it('attaches the resource-indicators scope by its resolved id', async () => {
    const { admin, added } = makeAdmin([
      { id: 'scope-openid', name: 'openid' },
      { id: 'scope-ri', name: RESOURCE_INDICATORS_SCOPE },
    ])

    await assignResourceIndicatorsScope(admin, 'client-uuid', 'my-client')

    expect(added).toHaveLength(1)
    expect(added[0]).toEqual({ id: 'client-uuid', clientScopeId: 'scope-ri' })
  })

  it('reuses a provided scope list instead of re-fetching', async () => {
    const { admin, added } = makeAdmin([]) // find() would return nothing
    const preloaded = [{ id: 'scope-ri', name: RESOURCE_INDICATORS_SCOPE }]

    await assignResourceIndicatorsScope(admin, 'client-uuid', 'my-client', preloaded)

    expect(added).toHaveLength(1)
    expect(added[0].clientScopeId).toBe('scope-ri')
  })

  it('is a safe no-op when the scope is absent from the realm', async () => {
    // Correct locally, but it is why production went unnoticed: nothing CREATED
    // the scope, so this branch ran for every client. ensureResourceIndicatorsScope
    // now guarantees it exists first.
    const { admin, added } = makeAdmin([{ id: 'scope-openid', name: 'openid' }])

    await assignResourceIndicatorsScope(admin, 'client-uuid', 'my-client')

    expect(added).toHaveLength(0)
  })

  it('does not throw when Keycloak rejects the attachment', async () => {
    const admin = {
      clientScopes: { find: async () => [{ id: 'scope-ri', name: RESOURCE_INDICATORS_SCOPE }] },
      clients: { addDefaultClientScope: async () => { throw new Error('kc failure') } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    // Errors are swallowed and logged — provisioning must not fail on this.
    await expect(
      assignResourceIndicatorsScope(admin, 'client-uuid', 'my-client'),
    ).resolves.toBeUndefined()
  })
})

/** The reconciler creates the scope; the export declares it. They must agree. */
describe.each(['keycloak/realm-export.json', 'deploy/prod/realm-export.json'])('%s', (path) => {
  interface Scope {
    name?: string
    protocolMappers?: { protocolMapper?: string; config?: Record<string, string> }[]
  }
  const repo = join(import.meta.dir, '..', '..')
  const scope = (JSON.parse(readFileSync(join(repo, path), 'utf8')).clientScopes as Scope[] | undefined)
    ?.find((s) => s.name === RESOURCE_INDICATORS_SCOPE)

  it('declares the resource-indicators scope', () => {
    expect(scope).toBeDefined()
  })

  it('maps exactly the audiences the reconciler creates', () => {
    const audiences = (scope?.protocolMappers ?? [])
      .filter((m) => m.protocolMapper === 'oidc-audience-mapper')
      .map((m) => m.config?.['included.client.audience'])
      .filter(Boolean)
      .sort()

    expect(audiences).toEqual([...RESOURCE_AUDIENCE_CLIENT_IDS].sort())
  })
})
