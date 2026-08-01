// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Keycloak client lookup helpers.
 *
 * Every admin route that addresses a client by its OAuth `clientId` has to
 * translate it into Keycloak's internal UUID first, because the admin REST API
 * keys clients (and everything hanging off them — protocol mappers, client
 * roles, scope assignments) by UUID rather than by client id. That translation
 * was open-coded as `admin.clients.find({ clientId })` in a dozen places, each
 * with its own "was the array empty?" handling.
 *
 * Centralizing it keeps the lookup, the `max: 1` narrowing, and the not-found
 * signal identical everywhere.
 */
import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'

/**
 * Find a client by its OAuth client id.
 * Returns `undefined` when no client in the realm carries that id.
 */
export async function findClientByClientId(
  admin: KcAdminClient,
  clientId: string
): Promise<ClientRepresentation | undefined> {
  const clients = await admin.clients.find({ clientId, max: 1 })
  return clients[0]
}

/**
 * Resolve a client id to Keycloak's internal UUID.
 * Returns `undefined` when the client does not exist (or carries no id, which
 * Keycloak should never do but the generated types allow).
 */
export async function resolveClientInternalId(
  admin: KcAdminClient,
  clientId: string
): Promise<string | undefined> {
  const client = await findClientByClientId(admin, clientId)
  return client?.id
}
