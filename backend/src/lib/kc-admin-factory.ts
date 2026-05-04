/**
 * Keycloak Admin Client Factory
 *
 * Creates and authenticates a KcAdminClient using service-account credentials.
 * Extracted to its own module so tests can mock it without needing to mock
 * the @keycloak/keycloak-admin-client npm package (which has inconsistent
 * mock.module behaviour across platforms in bun).
 */

import KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '@/config'

/** Create and authenticate a Keycloak admin client, or null if not configured. */
export async function getAdminClient(): Promise<KcAdminClient | null> {
  if (!config.keycloak.isConfigured) return null
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) return null

  const admin = new KcAdminClient({
    baseUrl: config.keycloak.baseUrl!,
    realmName: config.keycloak.realm!,
  })
  await admin.auth({
    grantType: 'client_credentials',
    clientId: config.keycloak.adminClientId,
    clientSecret: config.keycloak.adminClientSecret,
  })
  return admin
}
