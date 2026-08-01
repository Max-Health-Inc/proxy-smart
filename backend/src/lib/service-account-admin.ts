// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * A Keycloak admin client authenticated as the SERVICE ACCOUNT, with no user in the picture.
 *
 * Distinct from `createAdminClient` in keycloak-plugin, which exchanges a caller's bearer token
 * and therefore acts as that user. This is for the paths where there is nobody to act as:
 *   - public dynamic client registration (RFC 7591 requires it be unauthenticated)
 *   - the background sweep that retires expired DCR clients
 *
 * Kept here rather than inside either caller so the two cannot drift into differently-configured
 * admin clients — which matters, because they operate on the same clients.
 */

import KcAdminClient from '@keycloak/keycloak-admin-client'

export async function getServiceAccountAdmin(): Promise<KcAdminClient> {
  const admin = new KcAdminClient({
    baseUrl: process.env.KEYCLOAK_BASE_URL!,
    realmName: process.env.KEYCLOAK_REALM!,
  })

  await admin.auth({
    grantType: 'client_credentials',
    clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-service',
    clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  })

  return admin
}
