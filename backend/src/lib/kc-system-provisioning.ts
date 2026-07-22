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
