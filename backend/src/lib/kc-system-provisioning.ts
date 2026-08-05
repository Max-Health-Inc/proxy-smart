// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Runtime provisioning of Keycloak "system" clients that the proxy owns.
 *
 * These clients used to be baked into keycloak/realm-export.json WITH their
 * secrets in plaintext — a problem in a public repo, and a no-op on any existing
 * realm (Keycloak's --import-realm uses IGNORE_EXISTING). Instead the backend
 * reconciles them at startup as the admin-service service account (which holds
 * manage-clients), sourcing secrets from config/env. Idempotent and non-fatal:
 * a failure logs a warning and leaves the realm untouched.
 */
import type KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '../config'
import { logger } from './logger'

/** Keycloak client attribute: let this client introspect tokens it isn't in the aud of. */
const ALLOW_INTROSPECTION_WITHOUT_AUDIENCE = 'allow.token.introspection.without.audience.check'

/**
 * Keycloak client attribute the RFC 8707 post-processor binds into `aud` when a
 * token request carries a matching `resource` parameter.
 */
const RESOURCE_URL_ATTR = 'resource_url'

/**
 * Non-login "resource server" clients that exist only to hold a `resource_url`.
 *
 * WHY THIS IS RECONCILED AT RUNTIME. These were created by hand (and by
 * .github/scripts/deploy-beta-remote.sh section 10b) with URLs baked in per
 * environment. Production never ran that script, so its clients still carried
 * DEV defaults — an access token minted there came back with
 *
 *   aud: ["http://localhost:8445/mcp", "realm-management"]
 *
 * on the live production system. `http://localhost:8445/mcp` can never match
 * getMcpResourceAudience() in production, so audience binding silently pointed at
 * nothing. Deriving the URLs from config instead means they are correct in every
 * environment by construction, and cannot drift from what the proxy validates.
 */
const RESOURCE_SERVER_CLIENTS = [
  {
    clientId: 'fhir-resource-server',
    name: 'FHIR Resource Server (RFC 8707 resource indicator)',
    description: 'Non-login resource client. Holds resource_url = the proxy FHIR base.',
    /** Must equal the FHIR audience the proxy accepts (getFhirResourceAudiences). */
    resourceUrl: () => `${config.baseUrl}/${config.name}/`,
  },
  {
    clientId: 'mcp-resource-server',
    name: 'MCP Resource Server (RFC 8707 resource indicator)',
    description: 'Non-login resource client. Holds resource_url = the proxy MCP URL.',
    /** Must equal getMcpResourceAudience(). */
    resourceUrl: () => `${config.baseUrl}${config.mcp.path}`,
  },
] as const

/**
 * Ensure the RFC 8707 resource-server clients exist with the CURRENT environment's
 * resource URLs.
 *
 * Idempotent: creates what is missing, and updates `resource_url` when it drifts
 * (for example after a domain change, or on an environment seeded from another's
 * export). Non-fatal — a failure leaves the realm untouched and logs a warning,
 * because audience binding degrading is preferable to the backend refusing to boot.
 */
export async function ensureResourceServerClients(admin: KcAdminClient): Promise<void> {
  for (const spec of RESOURCE_SERVER_CLIENTS) {
    const resourceUrl = spec.resourceUrl()
    try {
      const existing = await admin.clients.find({ clientId: spec.clientId, max: 1 })

      if (existing.length === 0) {
        await admin.clients.create({
          clientId: spec.clientId,
          name: spec.name,
          description: spec.description,
          enabled: true,
          protocol: 'openid-connect',
          clientAuthenticatorType: 'client-secret',
          publicClient: false,
          bearerOnly: false,
          // A resource client is never logged into and never mints tokens; it
          // exists purely as a named audience.
          standardFlowEnabled: false,
          implicitFlowEnabled: false,
          directAccessGrantsEnabled: false,
          serviceAccountsEnabled: false,
          authorizationServicesEnabled: false,
          fullScopeAllowed: false,
          attributes: { [RESOURCE_URL_ATTR]: resourceUrl },
        })
        logger.keycloak.info('Created resource-server client', { clientId: spec.clientId, resourceUrl })
        continue
      }

      const client = existing[0]
      if (client.attributes?.[RESOURCE_URL_ATTR] === resourceUrl) {
        logger.keycloak.debug('Resource-server client already correct', { clientId: spec.clientId })
        continue
      }

      await admin.clients.update(
        { id: client.id! },
        { clientId: spec.clientId, attributes: { ...(client.attributes ?? {}), [RESOURCE_URL_ATTR]: resourceUrl } },
      )
      logger.keycloak.info('Reconciled resource_url on resource-server client', {
        clientId: spec.clientId,
        resourceUrl,
        previous: client.attributes?.[RESOURCE_URL_ATTR] ?? '(unset)',
      })
    } catch (error) {
      logger.keycloak.warn('Failed to reconcile resource-server client', {
        clientId: spec.clientId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * Ensure the proxy's introspection client (admin-service) may introspect tokens
 * whose `aud` does not list it.
 *
 * Keycloak 26.6.2+ (CVE-2026-37979 hardening) only lets a client introspect
 * tokens that carry it in `aud`. The proxy introspects on behalf of resource
 * servers as `admin-service`, which is never in a SMART token's audience — and
 * with RFC 8707 the `aud` is narrowed to the bare resource URL, so NO client
 * qualifies. Result: every valid token introspects as `active:false`. Relaxing
 * the check for admin-service (the proxy's own trusted client) restores correct
 * introspection without widening the trust boundary. Declared in realm-export
 * too; this reconciles the existing realm (import is a no-op once it exists).
 */
export async function ensureIntrospectionClientConfig(admin: KcAdminClient): Promise<void> {
  const clientId = config.keycloak.adminClientId
  if (!clientId) return
  try {
    const found = await admin.clients.find({ clientId })
    if (found.length === 0) return
    const client = found[0]
    const attributes = { ...(client.attributes ?? {}) }
    if (attributes[ALLOW_INTROSPECTION_WITHOUT_AUDIENCE] === 'true') return
    attributes[ALLOW_INTROSPECTION_WITHOUT_AUDIENCE] = 'true'
    await admin.clients.update({ id: client.id! }, { clientId, attributes })
    logger.keycloak.info('Enabled introspection-without-audience-check on introspection client', { clientId })
  } catch (error) {
    logger.keycloak.warn('Failed to reconcile introspection client config', {
      clientId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Ensure the SHL token-exchange client exists and its secret matches config.
 *
 * The SHL flow authenticates as this confidential service-account client to mint
 * scoped, short-lived tokens (RFC 8693). Its secret lives ONLY in config (env /
 * secret store); this reconciles the Keycloak side to it so the two never drift
 * and no secret is committed to the repo. No-op when SHL is not configured.
 */
export async function ensureShlExchangeClient(admin: KcAdminClient): Promise<void> {
  if (!config.shlExchange.isConfigured) {
    logger.keycloak.info('SHL exchange client secret not configured — skipping SHL client reconcile')
    return
  }

  const clientId = config.shlExchange.clientId
  const secret = config.shlExchange.clientSecret!

  try {
    const existing = await admin.clients.find({ clientId })
    const desired = {
      clientId,
      name: 'SHL Token Exchange',
      description:
        'Service account for SMART Health Link token exchange (RFC 8693). Mints scoped, short-lived tokens for QR-based patient data sharing.',
      enabled: true,
      protocol: 'openid-connect',
      clientAuthenticatorType: 'client-secret',
      secret,
      publicClient: false,
      bearerOnly: false,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: true,
      authorizationServicesEnabled: false,
      fullScopeAllowed: false,
      defaultClientScopes: ['web-origins', 'acr', 'profile', 'roles', 'email'],
      optionalClientScopes: [],
      attributes: { 'access.token.lifespan': '3600' },
    }

    if (existing.length === 0) {
      await admin.clients.create(desired)
      logger.keycloak.info('Created SHL exchange client', { clientId })
      return
    }

    // Reconcile the secret on the existing client so Keycloak matches config.
    const internalId = existing[0].id!
    await admin.clients.update({ id: internalId }, { clientId, secret })
    logger.keycloak.debug('Reconciled SHL exchange client secret', { clientId })
  } catch (error) {
    logger.keycloak.warn('Failed to reconcile SHL exchange client', {
      clientId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
