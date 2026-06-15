/**
 * OAuth helpers for the CLI.
 *
 * By default the CLI talks to the proxy, not Keycloak directly. It discovers
 * endpoints from the proxy's `/auth/.well-known/openid-configuration` (which
 * deliberately rewrites token/authorize/device endpoints to the proxy itself,
 * see backend/src/routes/auth/index.ts) so every grant flows through the proxy
 * auth layer where audience binding, token enrichment, and access control
 * happen. The canonical Keycloak endpoints (`keycloakEndpoints`) are kept only
 * for the explicit direct-Keycloak escape hatch (config.directKeycloak).
 *
 * Two grants are supported, matching what the backend already accepts:
 *   - urn:ietf:params:oauth:grant-type:device_code (interactive humans)
 *   - client_credentials (CI / service accounts)
 *
 * The URL-building and metadata-shaping logic is kept as pure functions so it
 * can be unit tested without any network access. We avoid adding a schema
 * library here to keep the CLI dependency footprint minimal; the few response
 * shapes are validated with small, explicit type guards.
 */
import { createHash, randomBytes } from 'node:crypto'

/** Subset of an OIDC discovery document the CLI consumes. */
export interface OidcMetadata {
  issuer?: string
  authorization_endpoint?: string
  token_endpoint: string
  device_authorization_endpoint?: string
  userinfo_endpoint?: string
  end_session_endpoint?: string
}

/** Endpoints the CLI needs to drive the OAuth flows. */
export interface AuthEndpoints {
  tokenEndpoint: string
  deviceAuthorizationEndpoint?: string
  userinfoEndpoint?: string
}

/** RFC 8628 device authorization response. */
export interface DeviceAuthResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval?: number
}

/** Token endpoint success payload (only the fields the CLI consumes). */
export interface TokenSet {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  refresh_expires_in?: number
  scope?: string
  id_token?: string
}

/** Token endpoint error payload (RFC 6749 §5.2 / RFC 8628 §3.5). */
export interface TokenError {
  error: string
  error_description?: string
}

/** Narrow an unknown JSON value to a plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validate and narrow an unknown payload to OidcMetadata. */
export function parseOidcMetadata(value: unknown): OidcMetadata {
  if (!isObject(value) || typeof value.token_endpoint !== 'string') {
    throw new Error('Invalid OIDC metadata: missing token_endpoint')
  }
  return value as unknown as OidcMetadata
}

/** Validate and narrow an unknown payload to a DeviceAuthResponse. */
export function parseDeviceAuthResponse(value: unknown): DeviceAuthResponse {
  if (
    !isObject(value) ||
    typeof value.device_code !== 'string' ||
    typeof value.user_code !== 'string' ||
    typeof value.verification_uri !== 'string' ||
    typeof value.expires_in !== 'number'
  ) {
    throw new Error('Invalid device authorization response from server')
  }
  return value as unknown as DeviceAuthResponse
}

/** Validate and narrow an unknown payload to a TokenSet. */
export function parseTokenSet(value: unknown): TokenSet {
  if (!isObject(value) || typeof value.access_token !== 'string') {
    throw new Error('Token response did not include an access_token')
  }
  return value as unknown as TokenSet
}

/** Detect and narrow an unknown payload to a TokenError, else undefined. */
export function asTokenError(value: unknown): TokenError | undefined {
  if (isObject(value) && typeof value.error === 'string') {
    return value as unknown as TokenError
  }
  return undefined
}

/**
 * Build the canonical Keycloak OIDC discovery URL for a realm.
 * Pure — no network.
 */
export function keycloakDiscoveryUrl(keycloakUrl: string, realm: string): string {
  return `${keycloakUrl.replace(/\/+$/, '')}/realms/${realm}/.well-known/openid-configuration`
}

/**
 * Build the proxy's OIDC discovery URL.
 * The proxy serves a Keycloak-mirroring document at /auth/.well-known/...
 * Pure — no network.
 */
export function proxyDiscoveryUrl(proxyUrl: string): string {
  return `${proxyUrl.replace(/\/+$/, '')}/auth/.well-known/openid-configuration`
}

/**
 * Reduce an OIDC metadata document to the endpoints the CLI uses.
 * Pure — accepts already-parsed metadata.
 */
export function endpointsFromMetadata(meta: OidcMetadata): AuthEndpoints {
  return {
    tokenEndpoint: meta.token_endpoint,
    deviceAuthorizationEndpoint: meta.device_authorization_endpoint,
    userinfoEndpoint: meta.userinfo_endpoint,
  }
}

/**
 * Build canonical Keycloak endpoints directly from a known realm + base URL,
 * without a discovery round-trip. Pure — no network.
 */
export function keycloakEndpoints(keycloakUrl: string, realm: string): AuthEndpoints {
  const base = `${keycloakUrl.replace(/\/+$/, '')}/realms/${realm}/protocol/openid-connect`
  return {
    tokenEndpoint: `${base}/token`,
    deviceAuthorizationEndpoint: `${base}/auth/device`,
    userinfoEndpoint: `${base}/userinfo`,
  }
}

/** Encode a record as application/x-www-form-urlencoded, dropping empty values. */
export function formEncode(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  return search.toString()
}

/**
 * A PKCE (RFC 7636) verifier/challenge pair.
 *   - `verifier` is the high-entropy secret kept by the client and replayed on
 *     every token request.
 *   - `challenge` is the public value sent in the authorization request; it is
 *     `base64url(SHA-256(ASCII(verifier)))` for the S256 method.
 */
export interface PkcePair {
  verifier: string
  challenge: string
}

/** The only PKCE challenge method the CLI uses (RFC 7636 §4.3). */
export const PKCE_METHOD_S256 = 'S256' as const

/**
 * base64url-encode a byte buffer per RFC 4648 §5 (no padding, `+`->`-`,
 * `/`->`_`). RFC 7636 §3 requires this encoding for both the verifier (when
 * derived from random bytes) and the S256 challenge.
 */
function base64UrlEncode(bytes: Buffer): string {
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/**
 * Derive the S256 code challenge for a given verifier:
 * `base64url(SHA-256(ASCII(verifier)))` (RFC 7636 §4.2). Pure — no randomness,
 * so a test can assert the verifier/challenge relationship deterministically.
 */
export function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash('sha256').update(verifier, 'ascii').digest())
}

/**
 * Generate a PKCE pair for the S256 method (RFC 7636 §4.1-4.2). The verifier is
 * 32 random bytes base64url-encoded, yielding a 43-char string drawn entirely
 * from the unreserved set, well within the legal 43-128 range. `randomImpl` is
 * injectable so a test can pin the entropy and still get a real S256 challenge.
 */
export function generatePkcePair(randomImpl: (size: number) => Buffer = randomBytes): PkcePair {
  const verifier = base64UrlEncode(randomImpl(32))
  return { verifier, challenge: deriveCodeChallenge(verifier) }
}

/**
 * Build the form body for the device authorization request (RFC 8628 §3.1).
 * When `codeChallenge` is supplied it adds the PKCE parameters (RFC 7636 §4.3),
 * which Keycloak requires for public clients configured with
 * `pkce.code.challenge.method: S256`. Pure — no network.
 */
export function deviceAuthBody(
  clientId: string,
  scope: string,
  clientSecret?: string,
  codeChallenge?: string,
): string {
  return formEncode({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallenge ? PKCE_METHOD_S256 : undefined,
  })
}

/**
 * Build the form body to poll the token endpoint for a device grant
 * (RFC 8628 §3.4). When `codeVerifier` is supplied it adds the PKCE verifier
 * (RFC 7636 §4.5) so the server can confirm it against the challenge sent in the
 * authorization request. Pure — no network.
 */
export function deviceTokenBody(
  clientId: string,
  deviceCode: string,
  clientSecret?: string,
  codeVerifier?: string,
): string {
  return formEncode({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: clientId,
    client_secret: clientSecret,
    device_code: deviceCode,
    code_verifier: codeVerifier,
  })
}

/**
 * Build the form body for a client_credentials grant. Pure — no network.
 */
export function clientCredentialsBody(clientId: string, clientSecret: string, scope?: string): string {
  return formEncode({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  })
}

/**
 * Build the form body for a refresh_token grant. Pure — no network.
 */
export function refreshTokenBody(clientId: string, refreshToken: string, clientSecret?: string): string {
  return formEncode({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
}

/**
 * Compute an absolute expiry timestamp (epoch seconds) from an `expires_in`
 * value, relative to `now`. Pure when `now` is supplied.
 */
export function expiresAt(
  expiresIn: number | undefined,
  now: number = Math.floor(Date.now() / 1000),
): number | undefined {
  return typeof expiresIn === 'number' ? now + expiresIn : undefined
}

/**
 * Decide whether a token is still usable, applying a safety skew so we never
 * hand out a token that is about to expire mid-request. Pure when `now` is
 * supplied.
 */
export function isTokenFresh(
  expiresAtSeconds: number | undefined,
  skewSeconds = 30,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (expiresAtSeconds === undefined) return true
  return expiresAtSeconds - skewSeconds > now
}
