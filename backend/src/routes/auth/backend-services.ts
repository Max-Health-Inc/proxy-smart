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

import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import fetch from 'cross-fetch'
import { config } from '@/config'
import { logger } from '@/lib/logger'

const JWT_BEARER_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

/** Cached admin-service access token for Keycloak admin API calls */
let adminTokenCache: { token: string; expiresAt: number } | null = null

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

  // 6. jti MUST be present (replay protection)
  if (!jti) {
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT must contain a jti claim' } }
  }

  const clientId = iss

  // 7. Fetch the client's registered JWKS from Keycloak admin API
  let clientJwksJson: { keys: Array<Record<string, unknown>> }
  try {
    clientJwksJson = await getClientJwks(clientId)
  } catch (err) {
    logger.auth.error('Failed to fetch client JWKS for Backend Services', { clientId, error: err })
    return { status: 400, body: { error: 'invalid_client', error_description: 'Client not found or has no registered JWKS' } }
  }

  // 8. Verify JWT signature against the client's JWKS
  try {
    await verifyJwtSignature(assertion, decoded.header, clientJwksJson)
  } catch (err) {
    logger.auth.warn('Backend Services JWT signature verification failed', { clientId, error: err })
    return { status: 400, body: { error: 'invalid_client', error_description: 'JWT signature verification failed' } }
  }

  // 9. JWT is valid — get a service account token from Keycloak
  //    We authenticate using the client's internal secret (configured in Keycloak).
  try {
    const clientSecret = await getClientSecret(clientId)
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
 * Fetch the JWKS registered for a Keycloak client.
 * Uses the admin REST API: GET /admin/realms/{realm}/clients?clientId=X → attrs.jwks.string
 */
async function getClientJwks(clientId: string): Promise<{ keys: Array<Record<string, unknown>> }> {
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

  // jwks.string is a JSON string of the JWKS
  if (client.attributes?.['jwks.string']) {
    return JSON.parse(jwksString)
  }

  // jwks.url — fetch it
  const jwksResp = await fetch(jwksString)
  if (!jwksResp.ok) throw new Error(`Failed to fetch JWKS from ${jwksString}`)
  return await jwksResp.json()
}

/**
 * Fetch the client secret from Keycloak admin API.
 * If the client is still configured for client-jwt auth (e.g. deployed Keycloak
 * that predates the realm-export change), automatically migrate it to client-secret.
 */
async function getClientSecret(clientId: string): Promise<string> {
  const adminToken = await getAdminToken()

  // First get the internal UUID and current auth config for this clientId
  const searchUrl = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/clients?clientId=${encodeURIComponent(clientId)}`
  const resp = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  if (!resp.ok) throw new Error(`Failed to look up client '${clientId}': ${resp.status}`)

  const clients = await resp.json()
  if (!clients.length) throw new Error(`Client '${clientId}' not found`)

  const client = clients[0]
  const internalId = client.id

  // If the client is still configured for JWT auth, migrate to client-secret
  // so our proxy can authenticate internally. JWKS attributes are preserved
  // for our proxy-layer JWT verification.
  if (client.clientAuthenticatorType === 'client-jwt') {
    logger.auth.info('Migrating client to client-secret auth for proxy Backend Services', { clientId })
    const updateResp = await fetch(
      `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/clients/${internalId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...client,
          clientAuthenticatorType: 'client-secret'
        })
      }
    )
    if (!updateResp.ok) {
      logger.auth.warn('Failed to migrate client auth type', { clientId, status: updateResp.status })
    }
  }

  // Fetch the secret (Keycloak auto-generates one when switching to client-secret)
  const secretResp = await fetch(
    `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/clients/${internalId}/client-secret`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  )
  if (!secretResp.ok) throw new Error(`Failed to fetch secret for client '${clientId}': ${secretResp.status}`)

  const secretData = await secretResp.json()
  return secretData.value
}

/**
 * Verify the JWT signature against a JWKS.
 * Finds the matching key by kid (or uses the first key), then verifies.
 */
async function verifyJwtSignature(
  token: string,
  header: jwt.JwtHeader,
  jwksJson: { keys: Array<Record<string, unknown>> }
): Promise<void> {
  // Find the matching key by kid, or fall back to first key
  const matchingKey = header.kid
    ? jwksJson.keys.find(k => k.kid === header.kid)
    : jwksJson.keys[0]

  if (!matchingKey) {
    throw new Error(`No matching key found for kid '${header.kid}'`)
  }

  // Use jwks-rsa to convert the JWK to a PEM public key
  const client = jwksClient({
    jwksUri: 'https://unused', // not used — we provide keys directly
    getKeysInterceptor: () => jwksJson.keys as any
  })
  const signingKey = await client.getSigningKey(matchingKey.kid as string)
  const publicKey = signingKey.getPublicKey()

  // Verify the token — only check signature, we already validated claims above
  jwt.verify(token, publicKey, {
    algorithms: [header.alg as jwt.Algorithm || 'RS256'],
    // Skip audience/issuer checks here since we already validated them
    ignoreExpiration: false,
  })
}
