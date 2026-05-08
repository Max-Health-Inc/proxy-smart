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
}

export const JWT_BEARER_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

/** Maximum JWT lifetime allowed (5 minutes per SMART STU2.2 spec) */
const MAX_JWT_LIFETIME_SECONDS = 300

/**
 * Structured error thrown by validateClientAssertion.
 * Carries the OAuth 2.0 error code and HTTP status for direct use in responses.
 */
export class ClientAssertionError extends Error {
  constructor(
    readonly oauthError: string,
    readonly description: string,
    readonly httpStatus: number = 400
  ) {
    super(description)
    this.name = 'ClientAssertionError'
  }
}

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
 *
 * A client_assertion (private_key_jwt) can also be used for regular
 * authorization_code grants by confidential clients (RFC 7523 §2.2).
 * Only treat it as Backend Services when grant_type=client_credentials.
 */
export function isBackendServicesRequest(body: Record<string, string | undefined>): boolean {
  const grantType = body.grant_type || body.grantType
  return grantType === 'client_credentials'
    && body.client_assertion_type === JWT_BEARER_TYPE
    && !!body.client_assertion
}

/**
 * Validate a private_key_jwt client assertion per RFC 7523 §3 and SMART STU2.2 §4.1.5.
 *
 * Checks: JWT structure, iss/sub equality, aud (proxy token endpoint), exp, jti
 * uniqueness (replay protection), optional body client_id match, and signature
 * against the client's registered JWKS in Keycloak.
 *
 * Throws ClientAssertionError on any violation.
 * Returns { clientId, internalId } on success.
 */
export async function validateClientAssertion(
  assertion: string,
  bodyClientId?: string
): Promise<{ clientId: string; internalId: string }> {
  const decoded = jwt.decode(assertion, { complete: true }) as {
    header: jwt.JwtHeader
    payload: jwt.JwtPayload
  } | null

  if (!decoded?.payload || !decoded?.header) {
    throw new ClientAssertionError('invalid_client', 'client_assertion is not a valid JWT')
  }

  const { iss, sub, aud, exp, jti } = decoded.payload

  // iss and sub MUST equal the client_id (RFC 7523 §3)
  if (!iss || iss !== sub) {
    throw new ClientAssertionError('invalid_client', 'JWT iss and sub must be present and equal')
  }

  // aud MUST include the proxy's token endpoint
  const expectedAud = `${config.baseUrl}/auth/token`
  const audList = Array.isArray(aud) ? aud : [aud]
  if (!audList.includes(expectedAud)) {
    logger.auth.warn('JWT client assertion audience mismatch', { aud, expectedAud })
    throw new ClientAssertionError('invalid_client', 'Invalid token audience')
  }

  // exp MUST be present and not expired (allow 30s clock skew)
  if (!exp || exp < Date.now() / 1000 - 30) {
    throw new ClientAssertionError('invalid_client', 'JWT has expired')
  }

  // exp ceiling: MUST be ≤5 minutes in the future (SMART STU2.2 §4.1.5.1)
  const now = Math.floor(Date.now() / 1000)
  if (exp > now + MAX_JWT_LIFETIME_SECONDS + 30) { // +30s clock skew tolerance
    throw new ClientAssertionError('invalid_client', 'JWT exp must not be more than 5 minutes in the future')
  }

  // jti MUST be present and unique (SMART STU2.2 §4.1.5.2.1)
  if (!jti) {
    throw new ClientAssertionError('invalid_client', 'JWT must contain a jti claim')
  }

  purgeExpiredJtis()
  const jtiKey = `${iss}:${jti}`
  if (usedJtis.has(jtiKey)) {
    logger.auth.warn('JWT client assertion replay detected', { clientId: iss, jti })
    throw new ClientAssertionError('invalid_client', 'JWT jti has already been used')
  }
  usedJtis.set(jtiKey, exp)

  // If client_id was provided in the request body, it MUST match the JWT iss
  if (bodyClientId && bodyClientId !== iss) {
    throw new ClientAssertionError('invalid_client', 'client_id does not match JWT iss claim')
  }

  const clientId = iss

  // Fetch the client's registered JWKS from Keycloak admin API
  let clientMeta: ClientMetadata
  try {
    clientMeta = await getClientMetadata(clientId)
  } catch (err) {
    logger.auth.error('Failed to fetch client JWKS for assertion validation', { clientId, error: err })
    throw new ClientAssertionError('invalid_client', 'Client not found or has no registered JWKS')
  }

  // Verify JWT signature against the client's JWKS
  try {
    await verifyJwtSignature(assertion, decoded.header, clientMeta.jwks)
  } catch (err) {
    logger.auth.warn('JWT client assertion signature verification failed', { clientId, error: err })
    throw new ClientAssertionError('invalid_client', 'JWT signature verification failed')
  }

  return { clientId, internalId: clientMeta.internalId }
}

/**
 * Validate a private_key_jwt assertion and resolve the client's Keycloak secret.
 *
 * The proxy terminates the assertion (clients address aud to the proxy URL),
 * then this function returns the internal client_secret so callers can
 * authenticate to Keycloak with client_secret instead, keeping Keycloak
 * transparent to SMART clients.
 *
 * Throws ClientAssertionError if the assertion is invalid.
 */
export async function resolveClientSecretForAssertion(
  assertion: string,
  bodyClientId?: string
): Promise<{ clientId: string; clientSecret: string }> {
  const { clientId, internalId } = await validateClientAssertion(assertion, bodyClientId)
  const clientSecret = await getClientSecret(clientId, internalId)
  return { clientId, clientSecret }
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

  // grant_type MUST be client_credentials
  if (grantType !== 'client_credentials') {
    return {
      status: 400,
      body: { error: 'unsupported_grant_type', error_description: 'Backend Services requires grant_type=client_credentials' }
    }
  }

  // Validate the assertion and retrieve the client secret
  let clientId: string
  let clientSecret: string
  try {
    ;({ clientId, clientSecret } = await resolveClientSecretForAssertion(assertion, body.client_id))
  } catch (err) {
    if (err instanceof ClientAssertionError) {
      return { status: err.httpStatus, body: { error: err.oauthError, error_description: err.description } }
    }
    logger.auth.error('Unexpected error during assertion validation', { error: err })
    return { status: 500, body: { error: 'server_error', error_description: 'Internal error during assertion validation' } }
  }

  // JWT is valid — get a service account token from Keycloak.
  // Internally we authenticate with client_secret; Keycloak never sees the assertion.
  try {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
    const formData = new URLSearchParams()
    formData.append('grant_type', 'client_credentials')
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    if (scope) formData.append('scope', scope)

    const resp = await fetch(kcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const data = await resp.json()
    if (resp.status !== 200) {
      logger.auth.warn('Keycloak rejected Backend Services token request', { clientId, error: data.error, desc: data.error_description })
      return { status: resp.status, body: data }
    }

    logger.auth.info('Backend Services token issued', { clientId, scope: data.scope })
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
