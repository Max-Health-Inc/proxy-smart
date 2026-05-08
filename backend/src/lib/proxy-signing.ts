/**
 * Proxy Signing Key Infrastructure
 *
 * Manages an RSA keypair for the proxy to sign federated client assertions.
 * The proxy validates incoming client JWTs, then re-signs a new assertion
 * with its own key before forwarding to Keycloak's federated client auth.
 *
 * Key lifecycle:
 *   - Auto-generated at startup (ephemeral, dev-friendly)
 *   - Override via PROXY_SIGNING_KEY_PEM / PROXY_SIGNING_KEY_ID env vars
 *   - Public key exposed at /.well-known/jwks.json for KC to fetch
 */

import { generateKeyPairSync, createPublicKey, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { logger } from '@/lib/logger'

// ─── Key Material ───────────────────────────────────────────────────────────

interface ProxyKeyPair {
  privateKeyPem: string
  publicKeyPem: string
  kid: string
  jwk: Record<string, unknown>
}

let _keyPair: ProxyKeyPair | null = null

/** The algorithm used for proxy-signed assertions */
export const PROXY_SIGNING_ALG = 'RS256' as const

/**
 * Initialize or return the proxy signing key pair.
 *
 * Thread-safe: if called concurrently before init completes,
 * only one keypair is generated.
 */
export function getProxyKeyPair(): ProxyKeyPair {
  if (_keyPair) return _keyPair

  const envKey = process.env.PROXY_SIGNING_KEY_PEM
  const envKid = process.env.PROXY_SIGNING_KEY_ID || 'proxy-signing-key-1'

  if (envKey) {
    logger.server.info('Using proxy signing key from PROXY_SIGNING_KEY_PEM env var', { kid: envKid })
    const publicKeyObject = createPublicKey(envKey)
    _keyPair = {
      privateKeyPem: envKey,
      publicKeyPem: publicKeyObject.export({ type: 'spki', format: 'pem' }) as string,
      kid: envKid,
      jwk: { ...publicKeyObject.export({ format: 'jwk' }), kid: envKid, use: 'sig', alg: PROXY_SIGNING_ALG },
    }
  } else {
    logger.server.info('Generating ephemeral proxy signing RSA keypair (set PROXY_SIGNING_KEY_PEM for persistence)')
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    const publicKeyObject = createPublicKey(publicKey)
    _keyPair = {
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
      kid: envKid,
      jwk: { ...publicKeyObject.export({ format: 'jwk' }), kid: envKid, use: 'sig', alg: PROXY_SIGNING_ALG },
    }
  }

  return _keyPair
}

/**
 * Return the proxy's public JWKS (for exposure at /.well-known/jwks.json).
 * Contains only the proxy's signing key — callers merge with KC keys if needed.
 */
export function getProxyJwks(): { keys: Record<string, unknown>[] } {
  const kp = getProxyKeyPair()
  return { keys: [kp.jwk] }
}

/**
 * Sign a new federated client assertion on behalf of a client.
 *
 * The proxy acts as the assertion issuer. Keycloak's federated client auth
 * validates this JWT against the proxy's JWKS.
 *
 * Claims per KC Federated Client Authentication (26.6.0):
 *   iss = proxy issuer URL (matches the OIDC IdP alias issuer in KC)
 *   sub = clientId (matches the "federated subject" configured on the KC client)
 *   aud = Keycloak realm issuer URL (required by KC)
 *   exp = now + 60s (short-lived)
 *   jti = fresh UUID
 *   iat = now
 */
export function signProxyAssertion(clientId: string): string {
  const kp = getProxyKeyPair()
  const now = Math.floor(Date.now() / 1000)

  const kcRealmIssuer = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`

  const payload = {
    iss: config.baseUrl,
    sub: clientId,
    aud: kcRealmIssuer,
    exp: now + 60,
    iat: now,
    jti: randomUUID(),
  }

  return jwt.sign(payload, kp.privateKeyPem, {
    algorithm: PROXY_SIGNING_ALG,
    header: {
      alg: PROXY_SIGNING_ALG,
      kid: kp.kid,
      typ: 'JWT',
    },
  })
}

/** Reset key pair (for testing only). */
export function _resetKeyPair(): void {
  _keyPair = null
}
