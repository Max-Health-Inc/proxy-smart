import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  asTokenError,
  clientCredentialsBody,
  deriveCodeChallenge,
  deviceAuthBody,
  deviceTokenBody,
  endpointsFromMetadata,
  expiresAt,
  formEncode,
  generatePkcePair,
  isTokenFresh,
  keycloakDiscoveryUrl,
  keycloakEndpoints,
  parseDeviceAuthResponse,
  parseOidcMetadata,
  parseTokenSet,
  proxyDiscoveryUrl,
  refreshTokenBody,
} from '../src/oauth'

describe('discovery URL building', () => {
  it('builds the canonical Keycloak discovery URL and trims trailing slashes', () => {
    expect(keycloakDiscoveryUrl('https://kc.example.com/', 'master')).toBe(
      'https://kc.example.com/realms/master/.well-known/openid-configuration',
    )
  })

  it('builds the proxy discovery URL under /auth', () => {
    expect(proxyDiscoveryUrl('https://proxy.example.com/')).toBe(
      'https://proxy.example.com/auth/.well-known/openid-configuration',
    )
  })

  it('builds canonical Keycloak endpoints without a round-trip', () => {
    const endpoints = keycloakEndpoints('https://kc.example.com', 'app')
    expect(endpoints.tokenEndpoint).toBe('https://kc.example.com/realms/app/protocol/openid-connect/token')
    expect(endpoints.deviceAuthorizationEndpoint).toBe(
      'https://kc.example.com/realms/app/protocol/openid-connect/auth/device',
    )
    expect(endpoints.userinfoEndpoint).toBe('https://kc.example.com/realms/app/protocol/openid-connect/userinfo')
  })
})

describe('endpointsFromMetadata', () => {
  it('extracts the endpoints the CLI uses', () => {
    const endpoints = endpointsFromMetadata({
      token_endpoint: 'https://kc/token',
      device_authorization_endpoint: 'https://kc/device',
      userinfo_endpoint: 'https://kc/userinfo',
    })
    expect(endpoints).toEqual({
      tokenEndpoint: 'https://kc/token',
      deviceAuthorizationEndpoint: 'https://kc/device',
      userinfoEndpoint: 'https://kc/userinfo',
    })
  })
})

describe('form body building', () => {
  it('drops undefined and empty values', () => {
    expect(formEncode({ a: '1', b: undefined, c: '' })).toBe('a=1')
  })

  it('builds a device authorization body', () => {
    const body = new URLSearchParams(deviceAuthBody('admin-ui', 'openid profile'))
    expect(body.get('client_id')).toBe('admin-ui')
    expect(body.get('scope')).toBe('openid profile')
    expect(body.has('client_secret')).toBe(false)
  })

  it('includes a client secret when provided', () => {
    const body = new URLSearchParams(deviceAuthBody('svc', 'openid', 'shh'))
    expect(body.get('client_secret')).toBe('shh')
  })

  it('omits PKCE params from the device authorization body when no challenge is given', () => {
    const body = new URLSearchParams(deviceAuthBody('admin-ui', 'openid'))
    expect(body.has('code_challenge')).toBe(false)
    expect(body.has('code_challenge_method')).toBe(false)
  })

  it('includes the S256 PKCE params in the device authorization body when a challenge is given', () => {
    const body = new URLSearchParams(deviceAuthBody('admin-ui', 'openid', undefined, 'CHALLENGE'))
    expect(body.get('code_challenge')).toBe('CHALLENGE')
    expect(body.get('code_challenge_method')).toBe('S256')
  })

  it('builds a device token poll body with the RFC 8628 grant type', () => {
    const body = new URLSearchParams(deviceTokenBody('admin-ui', 'DEV-CODE'))
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')
    expect(body.get('device_code')).toBe('DEV-CODE')
  })

  it('includes the PKCE verifier in the device token poll body when one is given', () => {
    const body = new URLSearchParams(deviceTokenBody('admin-ui', 'DEV-CODE', undefined, 'VERIFIER'))
    expect(body.get('code_verifier')).toBe('VERIFIER')
  })

  it('omits the PKCE verifier from the device token poll body when none is given', () => {
    const body = new URLSearchParams(deviceTokenBody('admin-ui', 'DEV-CODE'))
    expect(body.has('code_verifier')).toBe(false)
  })

  it('builds a client_credentials body', () => {
    const body = new URLSearchParams(clientCredentialsBody('svc', 'secret', 'openid'))
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_id')).toBe('svc')
    expect(body.get('client_secret')).toBe('secret')
    expect(body.get('scope')).toBe('openid')
  })

  it('builds a refresh_token body', () => {
    const body = new URLSearchParams(refreshTokenBody('svc', 'RT'))
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('RT')
  })
})

describe('PKCE (RFC 7636, S256)', () => {
  /** base64url(sha256(ascii(verifier))) computed independently of the source. */
  function expectedChallenge(verifier: string): string {
    return createHash('sha256').update(verifier, 'ascii').digest('base64url')
  }

  it('generates a verifier in the legal length and charset', () => {
    const { verifier } = generatePkcePair()
    // RFC 7636 §4.1: 43-128 chars drawn from the unreserved set. 32 random
    // bytes base64url-encoded (no padding) is exactly 43 chars.
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('derives a challenge equal to base64url(sha256(verifier))', () => {
    const { verifier, challenge } = generatePkcePair()
    expect(challenge).toBe(expectedChallenge(verifier))
    // The challenge is also base64url with no padding.
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('produces a different verifier on each call', () => {
    expect(generatePkcePair().verifier).not.toBe(generatePkcePair().verifier)
  })

  it('honours the injected randomness while still deriving a real S256 challenge', () => {
    const fixed = Buffer.alloc(32, 7)
    const { verifier, challenge } = generatePkcePair(() => fixed)
    expect(verifier).toBe(fixed.toString('base64url'))
    expect(challenge).toBe(expectedChallenge(verifier))
  })

  it('deriveCodeChallenge matches the RFC 7636 §4.2 worked example', () => {
    // The appendix B verifier and its known S256 challenge.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(deriveCodeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('token freshness', () => {
  it('treats tokens without expiry as fresh', () => {
    expect(isTokenFresh(undefined)).toBe(true)
  })

  it('applies the safety skew', () => {
    const now = 1_000
    expect(isTokenFresh(1_040, 30, now)).toBe(true)
    expect(isTokenFresh(1_020, 30, now)).toBe(false)
    expect(isTokenFresh(900, 30, now)).toBe(false)
  })

  it('computes absolute expiry from expires_in', () => {
    expect(expiresAt(60, 1_000)).toBe(1_060)
    expect(expiresAt(undefined, 1_000)).toBeUndefined()
  })
})

describe('payload parsing', () => {
  it('parses valid OIDC metadata', () => {
    expect(parseOidcMetadata({ token_endpoint: 'https://kc/token' }).token_endpoint).toBe('https://kc/token')
  })

  it('rejects OIDC metadata without a token endpoint', () => {
    expect(() => parseOidcMetadata({})).toThrow('token_endpoint')
  })

  it('parses a device authorization response', () => {
    const device = parseDeviceAuthResponse({
      device_code: 'd',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://kc/device',
      expires_in: 600,
    })
    expect(device.user_code).toBe('ABCD-EFGH')
  })

  it('rejects an incomplete device authorization response', () => {
    expect(() => parseDeviceAuthResponse({ device_code: 'd' })).toThrow()
  })

  it('parses a token set', () => {
    expect(parseTokenSet({ access_token: 'AT' }).access_token).toBe('AT')
  })

  it('rejects a token set without an access token', () => {
    expect(() => parseTokenSet({ token_type: 'Bearer' })).toThrow('access_token')
  })

  it('detects token errors and ignores success payloads', () => {
    expect(asTokenError({ error: 'authorization_pending' })?.error).toBe('authorization_pending')
    expect(asTokenError({ access_token: 'AT' })).toBeUndefined()
  })
})
