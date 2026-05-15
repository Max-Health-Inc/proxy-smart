/**
 * Dynamic CORS origins cache.
 * 
 * Derives allowed origins from registered SMART app webOrigins in Keycloak,
 * merged with static CORS_ORIGINS from env. Refreshed on startup and whenever
 * SMART apps are created/updated via admin API.
 */
import { config } from '@/config'
import { logger } from '@/lib/logger'
import KcAdminClient from '@keycloak/keycloak-admin-client'

/** Cached set of allowed origin patterns (exact URLs or substrings like "maxhealth.tech") */
let cachedOrigins: string[] = []
let lastRefresh = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get all allowed CORS origins (static env + dynamic from Keycloak clients).
 * Uses a cached value that refreshes every 5 minutes.
 */
export function getAllowedOrigins(): string[] {
  return cachedOrigins.length > 0 ? cachedOrigins : config.cors.origins
}

/**
 * Check if a given origin is allowed by the current CORS policy.
 * Uses substring matching (same as existing behavior).
 */
export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false
  return getAllowedOrigins().some(o => origin.includes(o))
}

/**
 * Refresh the CORS origins cache from Keycloak client webOrigins.
 * Called on startup and after SMART app mutations.
 */
export async function refreshCorsOrigins(): Promise<void> {
  try {
    if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
      cachedOrigins = config.cors.origins
      return
    }

    const admin = new KcAdminClient({
      baseUrl: config.keycloak.baseUrl!,
      realmName: config.keycloak.realm!,
    })

    await admin.auth({
      grantType: 'client_credentials',
      clientId: config.keycloak.adminClientId,
      clientSecret: config.keycloak.adminClientSecret,
    })

    const clients = await admin.clients.find()

    // Collect all unique webOrigins from Keycloak clients
    const dynamicOrigins = new Set<string>()
    for (const client of clients) {
      if (!client.webOrigins) continue
      for (const origin of client.webOrigins) {
        if (origin && origin !== '*' && origin !== '+') {
          dynamicOrigins.add(origin)
        }
      }
    }

    // Merge static (env) origins with dynamic (Keycloak) origins
    const staticOrigins = config.cors.origins
    cachedOrigins = [...new Set([...staticOrigins, ...dynamicOrigins])].filter(Boolean)
    lastRefresh = Date.now()

    logger.auth.debug('CORS origins refreshed', {
      static: staticOrigins.length,
      dynamic: dynamicOrigins.size,
      total: cachedOrigins.length,
    })
  } catch (error) {
    logger.auth.warn('Failed to refresh CORS origins from Keycloak, using static config', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Fallback to static origins on error
    if (cachedOrigins.length === 0) {
      cachedOrigins = config.cors.origins
    }
  }
}

/**
 * Refresh if cache is stale (older than TTL). Non-blocking.
 */
export function refreshIfStale(): void {
  if (Date.now() - lastRefresh > CACHE_TTL_MS) {
    refreshCorsOrigins().catch(() => {})
  }
}
