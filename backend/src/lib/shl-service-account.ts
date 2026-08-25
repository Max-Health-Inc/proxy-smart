// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * SHL Service Account — the `shlExchange` client, plus the default upstream
 * FHIR server URL.
 *
 * The SHL proxy and the SHL→Consent mirror both need a service-account token
 * for the same client, so the binding to `shlExchange` lives here once. The
 * grant itself is generic and shared with other machine callers — see
 * `@/lib/service-account`.
 */
import { config } from '@/config'
import { getAllServers } from '@/lib/fhir-server-store'
import { requestServiceAccountToken } from '@/lib/service-account'

/** Default scope: read-only patient data (SHL proxy fetches). */
const DEFAULT_SCOPE = 'openid patient/*.read'

/**
 * Get a Keycloak service account token for the `shlExchange` client, cached per
 * scope until near-expiry. Pass a wider scope (e.g. including `patient/*.write`)
 * for write operations such as mirroring an SHL into a Consent resource.
 */
export async function getServiceAccountToken(scope: string = DEFAULT_SCOPE): Promise<string> {
  return requestServiceAccountToken({
    clientId: config.shlExchange.clientId,
    clientSecret: config.shlExchange.clientSecret,
    scope,
  })
}

/** Resolve the first available upstream FHIR server URL. */
export async function getDefaultFhirServerUrl(): Promise<string> {
  const servers = await getAllServers()
  if (servers.length > 0) return servers[0].url
  return config.fhir.serverBases[0] || 'http://localhost:8081/fhir'
}
