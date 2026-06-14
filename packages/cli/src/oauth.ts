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
 * Build the form body for the device authorization request (RFC 8628 §3.1).
 * Pure — no network.
 */
export function deviceAuthBody(clientId: string, scope: string, clientSecret?: string): string {
  return formEncode({ client_id: clientId, client_secret: clientSecret, scope })
}

/**
 * Build the form body to poll the token endpoint for a device grant
 * (RFC 8628 §3.4). Pure — no network.
 */
export function deviceTokenBody(clientId: string, deviceCode: string, clientSecret?: string): string {
  return formEncode({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: clientId,
    client_secret: clientSecret,
    device_code: deviceCode,
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
