/**
 * Proxy OIDC / OAuth discovery sanitizer.
 *
 * Keycloak's `/.well-known/openid-configuration` advertises endpoints that point
 * straight at Keycloak (`.../realms/<realm>/protocol/openid-connect/...`) plus an
 * `mtls_endpoint_aliases` object with mTLS-bound variants. When the proxy mirrors
 * that document it MUST NOT leak those Keycloak-direct URLs: a client (or an mTLS
 * client) that reads them would bypass the proxy's auth layer entirely (SMART
 * launch-context enrichment, Backend Services JWT validation, audience binding).
 *
 * This module is the single source of truth for turning Keycloak's discovery doc
 * into a proxy-safe one. Every spread-based discovery handler funnels through
 * {@link sanitizeDiscoveryDocument} so the rewrite/strip rules stay DRY and
 * consistent across all variants.
 */

/** Marker that identifies a Keycloak-direct OpenID Connect endpoint URL. */
const KEYCLOAK_DIRECT_MARKER = '/protocol/openid-connect/'

/**
 * Endpoint keys the proxy actually fronts with a dedicated `/auth/*` route.
 * Each is rewritten to the proxy origin so clients transit the proxy.
 */
function proxyEndpointOverrides(baseUrl: string): Record<string, string> {
  return {
    authorization_endpoint: `${baseUrl}/auth/authorize`,
    token_endpoint: `${baseUrl}/auth/token`,
    device_authorization_endpoint: `${baseUrl}/auth/device`,
    introspection_endpoint: `${baseUrl}/auth/introspect`,
    userinfo_endpoint: `${baseUrl}/auth/userinfo`,
    registration_endpoint: `${baseUrl}/auth/register`,
    // RP-Initiated Logout is fronted by the proxy's /auth/logout route, which
    // proxies the Keycloak end-session call server-side.
    end_session_endpoint: `${baseUrl}/auth/logout`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
  }
}

/**
 * Keys to remove outright because the proxy does NOT front them. Advertising
 * Keycloak's own URL for these would be a bypass, and the proxy has no route to
 * rewrite them to — so they are dropped rather than leaked.
 *
 *  - mtls_endpoint_aliases: nested object of mTLS-bound Keycloak endpoints. The
 *    proxy does not front mTLS-bound endpoints at all.
 *  - revocation_endpoint / pushed_authorization_request_endpoint /
 *    backchannel_authentication_endpoint: no corresponding proxy route exists.
 */
const UNSUPPORTED_LEAK_KEYS = [
  'mtls_endpoint_aliases',
  'revocation_endpoint',
  'pushed_authorization_request_endpoint',
  'backchannel_authentication_endpoint',
] as const

/**
 * Produce a proxy-safe discovery document from Keycloak's parsed OIDC config.
 *
 * Rewrites the endpoints the proxy fronts to the proxy origin, removes the
 * unsupported endpoints the proxy cannot front, and then defensively drops ANY
 * remaining top-level value that still points at a Keycloak-direct
 * `/protocol/openid-connect/` URL. The result contains no Keycloak-direct URLs
 * and no `mtls_endpoint_aliases` key.
 *
 * @param oidcConfig Keycloak's parsed `/.well-known/openid-configuration` body.
 * @param baseUrl    Proxy origin (no trailing slash).
 * @returns A new object safe to advertise from the proxy's discovery endpoints.
 */
export function sanitizeDiscoveryDocument(
  oidcConfig: Record<string, unknown>,
  baseUrl: string,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    ...oidcConfig,
    ...proxyEndpointOverrides(baseUrl),
  }

  // Drop the endpoints the proxy does not front.
  for (const key of UNSUPPORTED_LEAK_KEYS) {
    delete sanitized[key]
  }

  // Defensive sweep: remove any leftover top-level value that still advertises a
  // Keycloak-direct openid-connect URL (covers fields not enumerated above, e.g.
  // check_session_iframe / frontchannel_logout endpoints Keycloak may add).
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string' && value.includes(KEYCLOAK_DIRECT_MARKER)) {
      delete sanitized[key]
    }
  }

  return sanitized
}
