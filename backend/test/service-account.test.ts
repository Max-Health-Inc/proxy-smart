// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Service Account Token Tests
 *
 * The token cache is shared by every machine caller — the SHL exchange client
 * and the LLM Gateway client both go through it — so its key has to separate
 * them. A cache keyed on scope alone would hand one client's token to another.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { requestServiceAccountToken } from '../src/lib/service-account'

const originalFetch = globalThis.fetch

/** Record every token request and answer with a token naming the client. */
function stubKeycloak() {
  const calls: { clientId: string; scope: string }[] = []
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body ?? ''))
    const clientId = body.get('client_id') ?? ''
    const scope = body.get('scope') ?? ''
    calls.push({ clientId, scope })
    return new Response(
      JSON.stringify({ access_token: `token-for-${clientId}-${scope}`, expires_in: 300 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof globalThis.fetch
  return calls
}

describe('requestServiceAccountToken', () => {
  beforeEach(() => {
    process.env.KEYCLOAK_BASE_URL = 'https://kc.example.test'
    process.env.KEYCLOAK_REALM = 'test-realm'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('does not serve one client the token minted for another', async () => {
    const calls = stubKeycloak()

    const shl = await requestServiceAccountToken({
      clientId: 'shl-exchange',
      clientSecret: 'secret-a',
      scope: 'openid',
    })
    const gateway = await requestServiceAccountToken({
      clientId: 'llm-gateway',
      clientSecret: 'secret-b',
      scope: 'openid',
    })

    expect(shl).not.toBe(gateway)
    expect(calls).toHaveLength(2)
    expect(calls.map((c) => c.clientId)).toEqual(['shl-exchange', 'llm-gateway'])
  })

  it('reuses a cached token for the same client and scope', async () => {
    const calls = stubKeycloak()
    const request = { clientId: 'cache-me', clientSecret: 's', scope: 'openid' }

    const first = await requestServiceAccountToken(request)
    const second = await requestServiceAccountToken(request)

    expect(second).toBe(first)
    expect(calls).toHaveLength(1)
  })

  it('refuses a client that has no secret configured', async () => {
    stubKeycloak()
    await expect(
      requestServiceAccountToken({ clientId: 'unconfigured', clientSecret: null, scope: 'openid' }),
    ).rejects.toThrow(/no client secret/i)
  })
})
