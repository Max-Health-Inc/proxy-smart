// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * SHL Service Account — shared Keycloak client-credentials helper.
 *
 * The SHL proxy and the SHL→Consent mirror both need a service-account token
 * for the `shlExchange` client and the default upstream FHIR server URL. Kept
 * here (rather than in the route file) so both callers share one cache.
 */
import { config } from '@/config'
import { logger } from '@/lib/logger'
import { getAllServers } from '@/lib/fhir-server-store'

/** Default scope: read-only patient data (SHL proxy fetches). */
const DEFAULT_SCOPE = 'openid patient/*.read'

// Cache one token per requested scope string, refreshed near expiry.
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/**
 * Get a Keycloak service account token (client_credentials grant), cached per
 * scope until near-expiry. Pass a wider scope (e.g. including `patient/*.write`)
 * for write operations such as mirroring an SHL into a Consent resource.
 */
export async function getServiceAccountToken(scope: string = DEFAULT_SCOPE): Promise<string> {
  const cached = tokenCache.get(scope)
  if (cached && Date.now() < cached.expiresAt - 30_000) {
    return cached.token
  }

  const kcBase = config.keycloak.baseUrl
  const realm = config.keycloak.realm
  if (!kcBase || !realm) throw new Error('Keycloak not configured')

  const clientId = config.shlExchange.clientId
  const clientSecret = config.shlExchange.clientSecret
  if (!clientSecret) throw new Error('SHL_EXCHANGE_CLIENT_SECRET not configured')

  const tokenUrl = `${kcBase}/realms/${realm}/protocol/openid-connect/token`
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }).toString(),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>
    logger.auth.error('SHL service account token failed', {
      status: resp.status,
      error: err.error,
      description: err.error_description,
    })
    throw new Error(`Service account auth failed: ${err.error_description || resp.statusText}`)
  }

  const data = await resp.json() as { access_token: string; expires_in: number }
  tokenCache.set(scope, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  })
  return data.access_token
}

/** Resolve the first available upstream FHIR server URL. */
export async function getDefaultFhirServerUrl(): Promise<string> {
  const servers = await getAllServers()
  if (servers.length > 0) return servers[0].url
  return config.fhir.serverBases[0] || 'http://localhost:8081/fhir'
}
