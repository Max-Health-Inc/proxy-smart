/**
 * SMART Backend Services (client_credentials + private_key_jwt) handler
 *
 * Our proxy IS the token endpoint advertised in .well-known/smart-configuration.
 * Clients send JWT assertions with aud = our proxy's token URL.
 * Keycloak can't validate this because it expects its own endpoint URL as the audience.
 *
 * Solution: validate the JWT assertion at the proxy layer, then authenticate
 * to Keycloak using the client's internal secret for the actual token issuance.
 *
 * Flow:
 *   1. Decode & validate the client's JWT assertion (aud, iss, sub, exp, jti)
 *   2. Fetch the client's registered public JWKS from Keycloak admin API
 *   3. Verify the JWT signature against the JWKS
 *   4. Forward a client_secret-authenticated request to Keycloak to get the service account token
 *   5. Return the token to the client
 */

import { createPublicKey } from 'crypto'
import jwt from 'jsonwebtoken'
import fetch from 'cross-fetch'
import { config } from '@/config'
import { logger } from '@/lib/logger'

/** A JSON Web Key with required kty and optional kid, plus any additional JWK fields */
interface JwkKey { kty: string; kid?: string; [key: string]: unknown }

/** Metadata returned by the client lookup helper */
interface ClientMetadata {
  jwks: { keys: JwkKey[] }
  internalId: string
  authenticatorType: string // 'client-secret' | 'client-jwt' | 'client-x509' | ...
}

const JWT_BEARER_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

/** Maximum JWT lifetime allowed (5 minutes per SMART STU2.2 spec) */
const MAX_JWT_LIFETIME_SECONDS = 300

/** TTL for JWKS/secret cache entries (60 seconds) */
const CACHE_TTL_MS = 60_000

/** Cached admin-service access token for Keycloak admin API calls */
let adminTokenCache: { token: string; expiresAt: number } | null = null

// ─── jti replay protection ──────────────────────────────────────────────────
// Map of `${iss}:${jti}` → expiration timestamp (seconds since epoch).
// Entries are kept until the JWT's exp passes, preventing replay within the
// token's lifetime window (max 5 minutes per spec).
const usedJtis = new Map<string, number>()

/** Purge expired jti entries to prevent unbounded memory growth. */
function purgeExpiredJtis(): void {
  const now = Math.floor(Date.now() / 1000)
  for (const [key, exp] of usedJtis) {
    if (exp <= now) usedJtis.delete(key)
  }
}

/** Clear jti cache (exposed for testing). */
export function clearJtiCache(): void {
  usedJtis.clear()
  jwksCache.clear()
  secretCache.clear()
  adminTokenCache = null
}

// ─── Client config cache (metadata + secret) ───────────────────────────────
interface CacheEntry<T> { value: T; expiresAt: number }
const jwksCache = new Map<string, CacheEntry<ClientMetadata>>()
const secretCache = new Map<string, CacheEntry<string>>()

/**
 * Detect whether a token request is a Backend Services flow.
 */
export function isBackendServicesRequest(body: Record<string, string | undefined>): boolean {
  return body.client_assertion_type === JWT_BEARER_TYPE && !!body.client_assertion
}

/**
 * Handle the Backend Services token request end-to-end.
 * Returns { status, body } for the caller to set on the response.
 */
export async function handleBackendServicesToken(
  body: Record<string, string | undefined>
): Promise<{ status: number; body: Record<string, unknown> }> {
  const grantType = body.grant_type || body.grantType
  const assertion = body.client_assertion!
  const scope = body.scope || ''

  // 1. grant_type MUST be client_credentials
  if (grantType !== 'client_credentials') {
    return {
      status: 400,
      body: { error: 'unsupported_grant_type', error_description: 'Backend Services requires grant_type=client_credentials' }
    }
  }

  // 2. Decode JWT header + payload (without verification yet)
  const decoded = jwt.decode(assertion, { complete: true }) as {
    header: jwt.JwtHeader
    payload: jwt.JwtPayload
  } | null

  if (!decoded?.payload || !decoded?.header) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'client_assertion is not a valid JWT' } }
  }

  const { iss, sub, aud, exp, jti } = decoded.payload

  // 3. iss and sub MUST equal the client_id (RFC 7523 §3)
  if (!iss || iss !== sub) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT iss and sub must be present and equal' } }
  }

  // 4. aud MUST include our proxy's token endpoint
  const expectedAud = `${config.baseUrl}/auth/token`
  const audList = Array.isArray(aud) ? aud : [aud]
  if (!audList.includes(expectedAud)) {
    logger.auth.warn('Backend Services JWT audience mismatch', { aud, expectedAud })
    return { status: 400, body: { error: 'invalid_client', error_description: 'Invalid token audience' } }
  }

  // 5. exp MUST be present and not expired (allow 30s clock skew)
  if (!exp || exp < Date.now() / 1000 - 30) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT has expired' } }
  }

  // 5b. exp ceiling: MUST be no more than 5 minutes in the future (SMART STU2.2 §4.1.5.1)
  const now = Math.floor(Date.now() / 1000)
  if (exp > now + MAX_JWT_LIFETIME_SECONDS + 30) { // +30s clock skew tolerance
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT exp must not be more than 5 minutes in the future' } }
  }

  // 6. jti MUST be present (replay protection)
  if (!jti) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT must contain a jti claim' } }
  }

  // 6b. jti replay check: jti must not have been used before for this iss (SMART STU2.2 §4.1.5.2.1)
  purgeExpiredJtis()
  const jtiKey = `${iss}:${jti}`
  if (usedJtis.has(jtiKey)) {
    logger.auth.warn('Backend Services JWT replay detected', { clientId: iss, jti })
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT jti has already been used' } }
  }
  usedJtis.set(jtiKey, exp)

  // 6c. client_id body param validation (SMART STU2.2 §4.1.5.2.1)
  // If client_id is provided in the request body, it MUST match the JWT iss claim.
  if (body.client_id && body.client_id !== iss) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'client_id does not match JWT iss claim' } }
  }

  const clientId = iss

  // 7. Fetch the client's registered metadata (JWKS + auth type) from Keycloak admin API
  let clientMeta: ClientMetadata
  try {
    clientMeta = await getClientMetadata(clientId)
  } catch (err) {
    logger.auth.error('Failed to fetch client JWKS for Backend Services', { clientId, error: err })
    return { status: 400, body: { error: 'invalid_client', error_description: 'Client not found or has no registered JWKS' } }
  }

  // 8. Verify JWT signature against the client's JWKS
  try {
    await verifyJwtSignature(assertion, decoded.header, clientMeta.jwks)
  } catch (err) {
    logger.auth.warn('Backend Services JWT signature verification failed', { clientId, error: err })
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT signature verification failed' } }
  }

  // 9. JWT is valid — get a service account token from Keycloak.
  //    Strategy depends on the client's configured authentication method:
  //    - client-secret: use client_id + client_secret (standard)
  //    - client-jwt (private_key_jwt): forward the original assertion to Keycloak
  try {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
    const formData = new URLSearchParams()
    formData.append('grant_type', 'client_credentials')
    formData.append('client_id', clientId)
    if (scope) formData.append('scope', scope)

    if (clientMeta.authenticatorType === 'client-jwt') {
      // Client uses private_key_jwt — forward the validated assertion to Keycloak.
      // We already verified the signature, so Keycloak just needs to issue the token.
      // The aud claim targets our proxy, but Keycloak accepts it because we've
      // pre-validated and Keycloak is configured to trust its own token endpoint.
      formData.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
      formData.append('client_assertion', assertion)
    } else {
      // Client uses client_secret — standard approach
      const clientSecret = await getClientSecret(clientId, clientMeta.internalId)
      formData.append('client_secret', clientSecret)
    }

    const resp = await fetch(kcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const data = await resp.json()
    if (resp.status !== 200) {
      logger.auth.warn('Keycloak rejected Backend Services token request', { clientId, authenticatorType: clientMeta.authenticatorType, error: data.error, desc: data.error_description })
      return { status: resp.status, body: data }
    }

    logger.auth.info('Backend Services token issued', { clientId, scope: data.scope, authenticatorType: clientMeta.authenticatorType })
    return { status: 200, body: data }
  } catch (err) {
    logger.auth.error('Backend Services Keycloak token exchange failed', { clientId, error: err })
    return { status: 500, body: { error: 'server_error', error_description: 'Internal error during token issuance' } }
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/** Get an admin-service access token (cached). */
async function getAdminToken(): Promise<string> {
  const now = Date.now()
  if (adminTokenCache && adminTokenCache.expiresAt > now + 10_000) {
    return adminTokenCache.token
  }

  const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
  const resp = await fetch(kcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.keycloak.adminClientId ?? '',
      client_secret: config.keycloak.adminClientSecret ?? '',
    }).toString()
  })

  if (!resp.ok) {
    throw new Error(`Admin token request failed: ${resp.status}`)
  }

  const data = await resp.json()
  adminTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 30) * 1000 // refresh 30s before expiry
  }
  return data.access_token
}

/**
 * Fetch client metadata from Keycloak admin API (with TTL cache).
 * Returns JWKS, internal UUID, and the client's authenticator type.
 * Uses: GET /admin/realms/{realm}/clients?clientId=X
 */
async function getClientMetadata(clientId: string): Promise<ClientMetadata> {
  const cached = jwksCache.get(clientId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const adminToken = await getAdminToken()
  const searchUrl = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/clients?clientId=${encodeURIComponent(clientId)}`

  const resp = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  if (!resp.ok) {
    throw new Error(`Failed to look up client '${clientId}': ${resp.status}`)
  }

  const clients = await resp.json()
  if (!Array.isArray(clients) || clients.length === 0) {
    throw new Error(`Client '${clientId}' not found in Keycloak`)
  }

  const client = clients[0]
  const jwksString = client.attributes?.['jwks.string'] || client.attributes?.['jwks.url']
  if (!jwksString) {
    throw new Error(`Client '${clientId}' has no registered JWKS`)
  }

  let jwks: { keys: JwkKey[] }

  // jwks.string is a JSON string of the JWKS
  if (client.attributes?.['jwks.string']) {
    jwks = JSON.parse(jwksString)
  } else {
    // jwks.url — fetch it
    const jwksResp = await fetch(jwksString)
    if (!jwksResp.ok) throw new Error(`Failed to fetch JWKS from ${jwksString}`)
    jwks = await jwksResp.json()
  }

  const result: ClientMetadata = {
    jwks,
    internalId: client.id,
    authenticatorType: client.clientAuthenticatorType || 'client-secret',
  }

  jwksCache.set(clientId, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}

/**
 * Fetch the client secret from Keycloak admin API (with TTL cache).
 * GET /admin/realms/{realm}/clients/{internalId}/client-secret
 */
async function getClientSecret(clientId: string, internalId: string): Promise<string> {
  const cached = secretCache.get(clientId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const adminToken = await getAdminToken()

  // Fetch the secret using the internal UUID
  const secretResp = await fetch(
    `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/clients/${internalId}/client-secret`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  )
  if (!secretResp.ok) throw new Error(`Failed to fetch secret for client '${clientId}': ${secretResp.status}`)

  const secretData = await secretResp.json()
  const secret = secretData.value

  secretCache.set(clientId, { value: secret, expiresAt: Date.now() + CACHE_TTL_MS })
  return secret
}

/**
 * Verify the JWT signature against a JWKS.
 * Finds the matching key by kid (or uses the first key), then verifies.
 * Uses crypto.createPublicKey to convert JWK → PEM directly (no network fallback).
 */
async function verifyJwtSignature(
  token: string,
  header: jwt.JwtHeader,
  jwksJson: { keys: JwkKey[] }
): Promise<void> {
  // Find the matching key by kid, or fall back to first key
  const matchingKey = header.kid
    ? jwksJson.keys.find(k => k.kid === header.kid)
    : jwksJson.keys[0]

  if (!matchingKey) {
    throw new Error(`No matching key found for kid '${header.kid}'`)
  }

  // Convert JWK to PEM public key using Node's built-in crypto
  const keyObject = createPublicKey({ key: matchingKey, format: 'jwk' })
  const publicKey = keyObject.export({ type: 'spki', format: 'pem' }) as string

  // Verify the token — only check signature, we already validated claims above
  jwt.verify(token, publicKey, {
    algorithms: [header.alg as jwt.Algorithm || 'RS256'],
    // Skip audience/issuer checks here since we already validated them
    ignoreExpiration: false,
  })
}
