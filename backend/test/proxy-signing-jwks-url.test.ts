// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Where Keycloak is told to fetch this backend's JWKS.
 *
 * THE OUTAGE THIS PINS. Keycloak verifies proxy-signed assertions by fetching that JWKS through the
 * `proxy-smart-signing` IdP. The URL was derived as `http://backend:${port}` whenever Keycloak's host
 * was not loopback — a docker-compose service name. On ECS nothing answers to `backend`, so Keycloak
 * could not verify anything and EVERY private_key_jwt client failed with `invalid_client`. Production
 * ran that way for months, and the reconciler would have overwritten a hand-fix with the same value.
 *
 * Both rules below exist to stop a reconcile from making things worse than leaving them alone.
 */
import { describe, it, expect } from 'bun:test'
import { proxySigningJwksUrl, isReachableFromKeycloak } from '../src/lib/proxy-signing-url'

const jwksUrlFor = proxySigningJwksUrl
const reachable = isReachableFromKeycloak

describe('the JWKS URL Keycloak is given', () => {
  it('uses the configured URL when one is set', () => {
    // The only thing that knows how the network is wired is the deployment.
    const url = jwksUrlFor(
      'keycloak.proxy-smart.internal',
      'https://api.proxy-smart.com/.well-known/jwks.json',
      8445,
    )

    expect(url).toBe('https://api.proxy-smart.com/.well-known/jwks.json')
  })

  it('keeps the docker-compose default when nothing is configured', () => {
    // Beta runs exactly this and must keep working.
    expect(jwksUrlFor('keycloak', null, 8445)).toBe('http://backend:8445/.well-known/jwks.json')
  })

  it('stays on localhost for a local Keycloak', () => {
    expect(jwksUrlFor('localhost', null, 8445)).toBe('http://localhost:8445/.well-known/jwks.json')
  })
})

describe('refusing to write an unreachable URL', () => {
  it('rejects a loopback JWKS URL when Keycloak is somewhere else', () => {
    // Production's actual state: the IdP pointed at localhost:8445, so Keycloak was asking itself.
    expect(reachable('http://localhost:8445/.well-known/jwks.json', 'keycloak.proxy-smart.internal')).toBe(false)
  })

  it('allows loopback when Keycloak is also local', () => {
    expect(reachable('http://localhost:8445/.well-known/jwks.json', 'localhost')).toBe(true)
  })

  it('allows a compose service name, which only Keycloak can resolve', () => {
    // Unresolvable from here and perfectly resolvable from there — not ours to second-guess.
    expect(reachable('http://backend:8445/.well-known/jwks.json', 'keycloak')).toBe(true)
  })

  it('allows the public URL', () => {
    expect(reachable('https://api.proxy-smart.com/.well-known/jwks.json', 'keycloak.proxy-smart.internal')).toBe(true)
  })

  it('rejects a malformed URL rather than writing it', () => {
    expect(reachable('not a url', 'keycloak')).toBe(false)
  })
})
