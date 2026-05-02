/**
 * Maps between Keycloak's internal clientAuthenticatorType values and
 * standard OAuth 2.0 token_endpoint_auth_method values (RFC 7591).
 *
 * Keycloak uses:
 *   - 'client-secret'  → for both client_secret_basic and client_secret_post
 *   - 'client-jwt'     → for private_key_jwt (client-signed JWT assertion)
 *   - 'none'           → public clients (no authentication)
 *
 * Our proxy additionally uses 'client-secret' for backend services that
 * authenticate via private_key_jwt externally — the proxy validates the JWT
 * itself, then uses client_secret internally with Keycloak. We detect this
 * case via serviceAccountsEnabled + registered JWKS attributes.
 *
 * Standard OAuth values (RFC 7591 / RFC 7523):
 *   - 'none'                → public client
 *   - 'client_secret_basic' → HTTP Basic with client_id:client_secret
 *   - 'client_secret_post'  → client_secret in POST body
 *   - 'private_key_jwt'     → JWT assertion signed with client's private key
 */

import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation'

/** Standard OAuth 2.0 token_endpoint_auth_method values */
export type TokenEndpointAuthMethod =
  | 'none'
  | 'client_secret_basic'
  | 'client_secret_post'
  | 'private_key_jwt'

/**
 * Convert Keycloak's internal clientAuthenticatorType to a standard OAuth
 * token_endpoint_auth_method value for external consumption.
 *
 * Uses client attributes (JWKS config, service account flag) to disambiguate
 * cases where Keycloak stores 'client-secret' but the external-facing method
 * is actually 'private_key_jwt'.
 */
export function toTokenEndpointAuthMethod(client: ClientRepresentation): TokenEndpointAuthMethod {
  const kcType = client.clientAuthenticatorType

  // Public client
  if (client.publicClient || kcType === 'none') {
    return 'none'
  }

  // Keycloak's 'client-jwt' maps directly to private_key_jwt
  if (kcType === 'client-jwt') {
    return 'private_key_jwt'
  }

  // Backend services with JWKS registered → proxy validates JWT, uses secret internally
  if (
    client.serviceAccountsEnabled &&
    hasJwksConfig(client)
  ) {
    return 'private_key_jwt'
  }

  // Default: confidential client with client_secret_basic
  return 'client_secret_basic'
}

/**
 * Convert a standard OAuth token_endpoint_auth_method to the Keycloak
 * clientAuthenticatorType value for storage.
 *
 * Note: For 'private_key_jwt' on backend services, we still store 'client-secret'
 * in Keycloak because the proxy handles JWT validation itself and uses the
 * secret for the internal Keycloak token exchange.
 */
export function toKeycloakAuthType(
  method: TokenEndpointAuthMethod | string | undefined,
  isBackendService: boolean
): string {
  switch (method) {
    case 'none':
      return 'none'
    case 'private_key_jwt':
      // Backend services: proxy validates JWT, authenticates to KC with secret
      if (isBackendService) return 'client-secret'
      return 'client-jwt'
    case 'client_secret_post':
    case 'client_secret_basic':
      return 'client-secret'
    default:
      // Unrecognized or undefined — default to client-secret for confidential
      return 'client-secret'
  }
}

/** Check if a client has JWKS configuration in its attributes */
function hasJwksConfig(client: ClientRepresentation): boolean {
  const attrs = client.attributes || {}
  return !!(
    attrs['use.jwks.url'] === 'true' ||
    attrs['jwks.url'] ||
    attrs['use.jwks.string'] === 'true' ||
    attrs['jwks.string']
  )
}
