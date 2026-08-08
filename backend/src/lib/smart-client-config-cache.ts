// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * SMART Client Config Cache
 *
 * Lightweight in-memory cache of per-client configuration relevant to
 * token-time decisions (e.g., patientFacing flag for fhirUser resolution).
 *
 * Populated lazily from Keycloak client attributes on first request.
 * Avoids hitting Keycloak admin API on every token exchange.
 */

import KcAdminClient from '@keycloak/keycloak-admin-client'
import { isCimdClientId, resolveCimdRedirectUris, type SmartProxyLogger } from '@proxy-smart/auth'
import { config } from '@/config'
import { logger } from '@/lib/logger'

/** The lib takes a flat logger; adapt our structured one once, here. */
const smartLogger: SmartProxyLogger = {
  debug: (msg, meta) => logger.auth.debug(msg, meta),
  info: (msg, meta) => logger.auth.info(msg, meta),
  warn: (msg, meta) => logger.auth.warn(msg, meta),
  error: (msg, meta) => logger.auth.error(msg, meta),
}

export interface SmartClientConfig {
  /** If true → resolve fhirUser to Patient. If false → Practitioner. If undefined → no resolution (backward compat). */
  patientFacing?: boolean
  /**
   * The redirect URIs registered for this client in Keycloak.
   * Used to validate the authorize/callback redirect_uri (RFC 6749 §3.1.2.3)
   * so the proxy never forwards an authorization code to an unregistered URI.
   * Empty array → no registered URIs (or client unknown) → reject all.
   */
  redirectUris: string[]
}

interface CacheEntry {
  config: SmartClientConfig
  expiresAt: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

const cache = new Map<string, CacheEntry>()

/**
 * Get the SMART client config for a given clientId.
 * Returns cached value if available; otherwise fetches from Keycloak.
 */
export async function getSmartClientConfig(clientId: string): Promise<SmartClientConfig> {
  const now = Date.now()
  const cached = cache.get(clientId)

  if (cached && now < cached.expiresAt) {
    return cached.config
  }

  // Fetch from Keycloak
  const fetched = await fetchClientConfig(clientId)
  cache.set(clientId, { config: fetched, expiresAt: now + DEFAULT_TTL_MS })
  return fetched
}

/**
 * Get the redirect URIs registered for a client (RFC 6749 §3.1.2.3).
 *
 * TWO SOURCES, because a client can register two ways and only one of them puts
 * anything in Keycloak:
 *
 *   CIMD  — `client_id` is an https URL and the client publishes its own
 *           `redirect_uris` there. Keycloak holds no record of the client, so the
 *           document is the only source of truth. This is the RECOMMENDED
 *           registration method as of MCP 2026-07-28.
 *   DCR   — `client_id` is a Keycloak client id; ask Keycloak. Deprecated by the
 *           same spec revision, still the path SMART apps use.
 *
 * Routing both through one function is what lets the authorize interceptor stay
 * uniform: it asks "what may this client redirect to" and does not care how the
 * client registered. An earlier attempt special-cased CIMD at the interception
 * site instead, which silently delegated an authorization-server MUST to Keycloak.
 *
 * Returns an empty array for unknown clients, an unverifiable metadata document,
 * or an unavailable Keycloak — the caller treats an empty allowlist as "reject
 * every redirect_uri" (fail-closed).
 *
 * Wired into `@proxy-smart/auth`'s `getRegisteredRedirectUris` dependency.
 */
export async function getRegisteredRedirectUris(clientId: string): Promise<string[]> {
  if (!clientId) return []
  if (isCimdClientId(clientId)) {
    return resolveCimdRedirectUris(clientId, { logger: smartLogger })
  }
  const { redirectUris } = await getSmartClientConfig(clientId)
  return redirectUris
}

/**
 * Invalidate cache for a specific client (call after admin updates).
 */
export function invalidateClientConfig(clientId: string): void {
  cache.delete(clientId)
}

/**
 * Clear the entire client config cache.
 */
export function clearClientConfigCache(): void {
  cache.clear()
}

async function fetchClientConfig(clientId: string): Promise<SmartClientConfig> {
  if (!config.keycloak.isConfigured || !config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    return { redirectUris: [] }
  }

  try {
    const admin = new KcAdminClient({
      baseUrl: config.keycloak.baseUrl!,
      realmName: config.keycloak.realm!,
    })
    await admin.auth({
      grantType: 'client_credentials',
      clientId: config.keycloak.adminClientId,
      clientSecret: config.keycloak.adminClientSecret,
    })

    const clients = await admin.clients.find({ clientId, max: 1 })
    if (!clients || clients.length === 0) {
      return { redirectUris: [] }
    }

    const attrs = clients[0].attributes || {}
    const patientFacingRaw = attrs['patient_facing']?.[0] ?? attrs['patient_facing']
    const patientFacing = patientFacingRaw === 'true' ? true
      : patientFacingRaw === 'false' ? false
      : undefined

    const redirectUris = Array.isArray(clients[0].redirectUris) ? clients[0].redirectUris : []

    return { patientFacing, redirectUris }
  } catch (error) {
    logger.auth.warn('Failed to fetch client config from Keycloak', {
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return { redirectUris: [] }
  }
}
