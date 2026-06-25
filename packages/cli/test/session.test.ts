import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { type ResolvedConfig, tokenCachePath } from '../src/config'
import {
  Session,
  readCachedToken,
  toCachedToken,
  writeCachedToken,
  type CachedToken,
} from '../src/session'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'proxy-smart-cli-session-'))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

/** Build a resolved config bound to the temp home dir. */
function config(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    url: 'https://proxy.example.com',
    clientId: 'admin-ui',
    scope: 'openid',
    directKeycloak: false,
    homeDir: home,
    ...overrides,
  }
}

/** A fetch that fails the test if it is ever called. */
const failingFetch: typeof fetch = () => {
  throw new Error('network access is not allowed in this test')
}

/** Build a Response carrying a JSON body, like the proxy discovery endpoint. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * A fetch stub that records the URLs it was asked for and returns the proxy's
 * rewritten OIDC discovery document (token + device endpoints point at the
 * proxy, not Keycloak).
 */
function discoveryFetch(metadata: Record<string, unknown>, status = 200) {
  const calls: string[] = []
  const impl: typeof fetch = (input) => {
    calls.push(typeof input === 'string' ? input : input.toString())
    return Promise.resolve(jsonResponse(metadata, status))
  }
  return { impl, calls }
}

describe('token cache round-trip', () => {
  it('returns undefined when no token is cached', () => {
    expect(readCachedToken(home)).toBeUndefined()
  })

  it('persists and reads back a token', () => {
    const token: CachedToken = { access_token: 'AT', refresh_token: 'RT', client_id: 'admin-ui', expires_at: 123 }
    writeCachedToken(home, token)
    expect(readCachedToken(home)).toEqual(token)
  })
})

describe('token cache robustness against concurrency / corruption', () => {
  it('treats a corrupt / partial token.json as "no token"', () => {
    // Simulate a half-written file from a racing process (truncated JSON).
    writeFileSync(tokenCachePath(home), '{"access_token": "AT", "refr')
    expect(readCachedToken(home)).toBeUndefined()
  })

  it('treats JSON without an access_token as "no token"', () => {
    writeFileSync(tokenCachePath(home), JSON.stringify({ not_a_token: true }))
    expect(readCachedToken(home)).toBeUndefined()
  })

  it('getAccessToken throws the friendly login error on a corrupt cache instead of crashing', async () => {
    writeFileSync(tokenCachePath(home), '{ this is not json')
    const session = new Session(config(), failingFetch)
    await expect(session.getAccessToken()).rejects.toThrow('login')
  })

  it('does not leave a corrupt file when writes interleave; the result still parses', () => {
    const a: CachedToken = { access_token: 'A', refresh_token: 'RA', client_id: 'admin-ui', expires_at: 111 }
    const b: CachedToken = { access_token: 'B', refresh_token: 'RB', client_id: 'admin-ui', expires_at: 222 }
    // Interleave two writes back-to-back, as racing processes would.
    for (let i = 0; i < 20; i++) {
      writeCachedToken(home, i % 2 === 0 ? a : b)
      const read = readCachedToken(home)
      // Every observed state must be one of the two whole tokens, never torn.
      expect(read).toBeDefined()
      expect([a.access_token, b.access_token]).toContain(read?.access_token)
    }
    // No temp files are left behind in the home dir.
    expect(existsSync(`${tokenCachePath(home)}.tmp`)).toBe(false)
  })

  it('does not leave the refresh lock file behind after a successful fresh-token read', async () => {
    const future = Math.floor(Date.now() / 1000) + 3_600
    writeCachedToken(home, { access_token: 'FRESH', client_id: 'admin-ui', expires_at: future })
    const session = new Session(config(), failingFetch)
    await session.getAccessToken()
    expect(existsSync(join(home, 'token.lock'))).toBe(false)
  })
})

describe('toCachedToken', () => {
  it('maps a token response onto a cached record with absolute expiries', () => {
    const cached = toCachedToken(
      { access_token: 'AT', refresh_token: 'RT', expires_in: 60, refresh_expires_in: 600, scope: 'openid' },
      'svc',
      1_000,
    )
    expect(cached).toEqual({
      access_token: 'AT',
      refresh_token: 'RT',
      expires_at: 1_060,
      refresh_expires_at: 1_600,
      scope: 'openid',
      client_id: 'svc',
    })
  })

  it('omits expiries when the response has no lifetimes', () => {
    const cached = toCachedToken({ access_token: 'AT' }, 'svc', 1_000)
    expect(cached.expires_at).toBeUndefined()
    expect(cached.refresh_expires_at).toBeUndefined()
  })
})

describe('Session.resolveEndpoints prefers the proxy', () => {
  it('discovers from the proxy and uses the proxy-rewritten endpoints by default', async () => {
    // The proxy rewrites token/device to itself so the CLI goes through it.
    const { impl, calls } = discoveryFetch({
      token_endpoint: 'https://proxy.example.com/auth/token',
      device_authorization_endpoint: 'https://proxy.example.com/auth/device',
      userinfo_endpoint: 'https://proxy.example.com/auth/userinfo',
    })
    const session = new Session(config(), impl)
    const endpoints = await session.resolveEndpoints()

    expect(calls).toEqual(['https://proxy.example.com/auth/.well-known/openid-configuration'])
    expect(endpoints.tokenEndpoint).toBe('https://proxy.example.com/auth/token')
    expect(endpoints.deviceAuthorizationEndpoint).toBe('https://proxy.example.com/auth/device')
    expect(endpoints.userinfoEndpoint).toBe('https://proxy.example.com/auth/userinfo')
  })

  it('discovers from the proxy even when realm + keycloakUrl happen to be set (no escape hatch)', async () => {
    const { impl, calls } = discoveryFetch({
      token_endpoint: 'https://proxy.example.com/auth/token',
      device_authorization_endpoint: 'https://proxy.example.com/auth/device',
    })
    const session = new Session(
      config({ realm: 'app', keycloakUrl: 'https://kc.example.com' }),
      impl,
    )
    const endpoints = await session.resolveEndpoints()

    // It must NOT build Keycloak endpoints just because realm/keycloakUrl exist.
    expect(calls).toEqual(['https://proxy.example.com/auth/.well-known/openid-configuration'])
    expect(endpoints.tokenEndpoint).toBe('https://proxy.example.com/auth/token')
    expect(endpoints.tokenEndpoint).not.toContain('kc.example.com')
  })

  it('picks up the proxy device endpoint from discovery metadata', async () => {
    const { impl } = discoveryFetch({
      token_endpoint: 'https://proxy.example.com/auth/token',
      device_authorization_endpoint: 'https://proxy.example.com/auth/device',
    })
    const session = new Session(config(), impl)
    const endpoints = await session.resolveEndpoints()
    expect(endpoints.deviceAuthorizationEndpoint).toBe('https://proxy.example.com/auth/device')
  })

  it('memoizes discovery: a second call does not hit the network again', async () => {
    const { impl, calls } = discoveryFetch({ token_endpoint: 'https://proxy.example.com/auth/token' })
    const session = new Session(config(), impl)
    await session.resolveEndpoints()
    await session.resolveEndpoints()
    expect(calls.length).toBe(1)
  })

  it('raises a friendly error when proxy discovery fails', async () => {
    const { impl } = discoveryFetch({ error: 'not_found' }, 404)
    const session = new Session(config(), impl)
    await expect(session.resolveEndpoints()).rejects.toThrow('proxy')
  })
})

describe('Session.resolveEndpoints direct-Keycloak escape hatch', () => {
  it('builds Keycloak endpoints with no network only when directKeycloak is opted in', async () => {
    const session = new Session(
      config({ directKeycloak: true, realm: 'app', keycloakUrl: 'https://kc.example.com' }),
      failingFetch,
    )
    const endpoints = await session.resolveEndpoints()
    expect(endpoints.tokenEndpoint).toBe('https://kc.example.com/realms/app/protocol/openid-connect/token')
    expect(endpoints.deviceAuthorizationEndpoint).toBe(
      'https://kc.example.com/realms/app/protocol/openid-connect/auth/device',
    )
  })

  it('rejects the escape hatch when realm or keycloakUrl is missing', async () => {
    const session = new Session(config({ directKeycloak: true, realm: 'app' }), failingFetch)
    await expect(session.resolveEndpoints()).rejects.toThrow('Keycloak')
  })
})

describe('Session.getAccessToken', () => {
  it('returns a cached, still-fresh access token without any network', async () => {
    const future = Math.floor(Date.now() / 1000) + 3_600
    writeCachedToken(home, { access_token: 'FRESH', client_id: 'admin-ui', expires_at: future })
    const session = new Session(config(), failingFetch)
    expect(await session.getAccessToken()).toBe('FRESH')
  })

  it('throws a friendly error when not authenticated and no secret is set', async () => {
    const session = new Session(config(), failingFetch)
    await expect(session.getAccessToken()).rejects.toThrow('login')
  })

  it('clears the cached token on logout', () => {
    writeCachedToken(home, { access_token: 'AT', client_id: 'admin-ui' })
    const session = new Session(config(), failingFetch)
    session.logout()
    expect(readCachedToken(home)).toBeUndefined()
  })
})
