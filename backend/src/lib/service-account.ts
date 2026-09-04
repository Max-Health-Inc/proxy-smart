// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Keycloak service-account tokens (client_credentials grant).
 *
 * Machine-to-machine callers that act as the DEPLOYMENT rather than as a user:
 * the SHL proxy reading upstream FHIR, the AI import bridge authenticating to
 * the LLM Gateway. Tokens are cached per client and scope until near expiry, so
 * a burst of requests costs one round trip.
 */
import { config } from '@/config'
import { logger } from '@/lib/logger'
import { TokenCache, type FetchedToken } from '@/lib/cache/token-cache'

export interface ServiceAccountRequest {
  /** Keycloak client id to authenticate as. */
  clientId: string
  /** Its secret. Null means the client was never configured. */
  clientSecret: string | null
  /** Scope to request. */
  scope: string
}

const tokenCache = new TokenCache()

/**
 * Get a cached service-account access token, fetching a new one when the cached
 * one is missing or within 30 seconds of expiry.
 */
export async function requestServiceAccountToken(request: ServiceAccountRequest): Promise<string> {
  const { clientId, scope } = request
  return tokenCache.get(`${clientId}\n${scope}`, () => fetchServiceAccountToken(request))
}

async function fetchServiceAccountToken(request: ServiceAccountRequest): Promise<FetchedToken> {
  const { clientId, clientSecret, scope } = request

  const kcBase = config.keycloak.baseUrl
  const realm = config.keycloak.realm
  if (!kcBase || !realm) throw new Error('Keycloak not configured')
  if (!clientSecret) throw new Error(`No client secret configured for service account "${clientId}"`)

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
    logger.auth.error('Service account token failed', {
      clientId,
      status: resp.status,
      error: err.error,
      description: err.error_description,
    })
    throw new Error(`Service account auth failed: ${err.error_description || resp.statusText}`)
  }

  const data = await resp.json() as { access_token: string; expires_in?: number }
  return { token: data.access_token, expiresInSeconds: data.expires_in }
}
