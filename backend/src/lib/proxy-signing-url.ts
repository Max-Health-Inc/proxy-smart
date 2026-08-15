// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Where Keycloak fetches this backend's JWKS to verify proxy-signed assertions.
 *
 * Keycloak reaches it through the `proxy-smart-signing` IdP, and the URL was derived as
 * `http://backend:<port>` whenever Keycloak's host was not loopback — a docker-compose service name.
 * On ECS nothing answers to `backend`, so Keycloak could verify nothing and every private_key_jwt
 * client failed with `invalid_client`.
 *
 * Its own module so the rules are testable without importing `init`, whose import starts a server.
 */

/** Hosts that only ever mean "this container", and so can never be another service's address. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/**
 * The JWKS URL to advertise, given where Keycloak lives.
 *
 * `configured` wins, because only the deployment knows how its network is wired. Without it the
 * docker-compose assumption is kept — a non-loopback Keycloak means a compose network where this
 * backend answers to `backend` — which is what beta runs on and must keep working.
 */
export function proxySigningJwksUrl(
  keycloakHost: string,
  configured: string | null,
  port: number | string,
): string {
  if (configured) return configured;
  const host = LOOPBACK.has(keycloakHost) ? 'localhost' : 'backend';
  return `http://${host}:${port}/.well-known/jwks.json`;
}

/**
 * Whether Keycloak could plausibly fetch this URL.
 *
 * The one case worth refusing is a loopback JWKS URL while Keycloak lives somewhere else: that is
 * always wrong and always silent, and it is what production held. Anything else is the deployment's
 * business — a compose service name is unresolvable from here and perfectly resolvable from there.
 */
export function isReachableFromKeycloak(jwksUrl: string, keycloakHost: string): boolean {
  let host: string;
  try {
    host = new URL(jwksUrl).hostname;
  } catch {
    return false;
  }
  return !LOOPBACK.has(host) || LOOPBACK.has(keycloakHost);
}
