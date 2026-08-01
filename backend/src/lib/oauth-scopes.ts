// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The standard OIDC scopes this deployment advertises, challenges for, and grants.
 *
 * ONE LIST, because the three have to agree and they did not. The MCP resource metadata
 * (RFC 9728) advertised `openid profile email offline_access`, the 401 challenge (RFC 6750)
 * asked for `openid profile email`, and dynamic client registration granted those scopes ONLY
 * when the registration request happened to name them in its optional `scope` field. A client
 * that registered without one — which RFC 7591 permits, and which is the correct thing to do
 * when you intend to read the scopes out of the resource metadata afterwards — got a client
 * with no OIDC scopes attached and was then told to request three of them. Keycloak answered
 * every authorize with `invalid_scope`, before the login page, so the failure looked like a
 * broken server rather than a client that had been provisioned wrong.
 *
 * Anything advertised here MUST be granted by {@link assignStandardOidcScopes}. The test
 * `dcr-standard-scopes.test.ts` asserts exactly that, so the two cannot drift apart again.
 *
 * SMART scopes (`patient/*.read`, `launch`, …) are NOT here. They are per-app, they are
 * granted as optional from the registration request, and they are enumerated in
 * `packages/auth/src/smart-scopes.ts`.
 */

/**
 * Attached to every client as DEFAULT scopes: always present in the token, never something the
 * client has to ask for. These are the scopes the 401 challenge names, so a client that follows
 * the challenge must already hold them.
 */
export const STANDARD_OIDC_DEFAULT_SCOPES = ['openid', 'profile', 'email'] as const

/**
 * Attached as OPTIONAL scopes: available, but only issued when the client asks. `offline_access`
 * is optional on purpose — a refresh token is not something to hand out by default.
 */
export const STANDARD_OIDC_OPTIONAL_SCOPES = ['offline_access'] as const

/**
 * The defaults for a SMART backend service, which authenticates as itself with no user present.
 *
 * `email` is deliberately absent: there is nobody whose address it could describe. Kept as its
 * own list rather than a filter over {@link STANDARD_OIDC_DEFAULT_SCOPES} so the reason is
 * legible at the definition instead of at the call site.
 */
export const BACKEND_SERVICE_DEFAULT_SCOPES = ['openid', 'profile'] as const

/**
 * Keycloak's own built-in default scopes. "Silent" (`include.in.token.scope=false`): they add
 * realm_access / resource_access / CORS origins / auth context to the token without appearing
 * in the OAuth `scope` parameter. Without them the backend cannot enforce RBAC.
 */
export const KEYCLOAK_BUILTIN_DEFAULT_SCOPES = ['roles', 'web-origins', 'acr'] as const

/** What the MCP resource metadata advertises as supported (RFC 9728 `scopes_supported`). */
export const MCP_SCOPES_SUPPORTED: readonly string[] = [
  ...STANDARD_OIDC_DEFAULT_SCOPES,
  ...STANDARD_OIDC_OPTIONAL_SCOPES,
]

/**
 * The `scope` value in the `WWW-Authenticate` challenge on a 401 from the MCP endpoint.
 *
 * Only the defaults: challenging for an optional scope would tell a client to request something
 * it may deliberately not have been granted.
 */
export const MCP_SCOPE_CHALLENGE: string = STANDARD_OIDC_DEFAULT_SCOPES.join(' ')
