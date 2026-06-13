/**
 * @proxy-smart/auth — Redirect URI Allowlist Validation
 *
 * RFC 6749 §3.1.2.3 / §10.6: the authorization server MUST validate the
 * client's `redirect_uri` against the URIs registered for that client and
 * reject any value that does not match. Without this, an attacker can
 * register a public client (or hijack an existing client_id) and have the
 * authorization code delivered to an attacker-controlled URI.
 *
 * The proxy intercepts the SMART flow and rewrites the redirect_uri sent to
 * the IdP with its own callback, so the IdP can no longer validate the real
 * client URI. The proxy therefore MUST perform this validation itself — at
 * authorize time (fail-closed) and again at callback time (defense in depth).
 *
 * Matching is EXACT per RFC 6749 §3.1.2.3 (simple string comparison). We do
 * not implement loopback port-flexibility because the rest of the codebase
 * does not, and exact match is the strictest, safest default.
 */

/**
 * Async source of a client's registered redirect URIs.
 * Returns the full list of redirect URIs registered for `clientId`
 * (e.g. from Keycloak's client config). An empty list means the client has
 * no registered URIs (or is unknown) — in which case every redirect_uri is
 * rejected.
 */
export type GetRegisteredRedirectUris = (clientId: string) => Promise<string[]>

/**
 * Validate a candidate `redirect_uri` against an allowlist by exact match.
 *
 * @returns true if `candidate` exactly equals one of `registered`.
 */
export function isRedirectUriRegistered(candidate: string, registered: readonly string[]): boolean {
  // Exact string match per RFC 6749 §3.1.2.3. No normalization, no prefix
  // matching — those would re-introduce open-redirect bypasses.
  return registered.includes(candidate)
}
