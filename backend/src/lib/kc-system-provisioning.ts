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
