import { describe, expect, it } from 'bun:test'
import {
  asTokenError,
  clientCredentialsBody,
  deviceAuthBody,
  deviceTokenBody,
  endpointsFromMetadata,
  expiresAt,
  formEncode,
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
    const body = new URLSearchParams(deviceAuthBody('admin-cli', 'openid profile'))
    expect(body.get('client_id')).toBe('admin-cli')
    expect(body.get('scope')).toBe('openid profile')
    expect(body.has('client_secret')).toBe(false)
  })

  it('includes a client secret when provided', () => {
    const body = new URLSearchParams(deviceAuthBody('svc', 'openid', 'shh'))
    expect(body.get('client_secret')).toBe('shh')
  })

  it('builds a device token poll body with the RFC 8628 grant type', () => {
    const body = new URLSearchParams(deviceTokenBody('admin-cli', 'DEV-CODE'))
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')
    expect(body.get('device_code')).toBe('DEV-CODE')
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
