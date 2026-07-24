/**
 * Resolve a SMART app's registered launch URL by OAuth client id.
 *
 * A SMART app's launch URL lives on its Keycloak client as the `launch_url`
 * attribute (set via the Smart Apps admin API — see routes/admin/smart-apps.ts).
 * This is the authoritative source for "where does this app live", used to route
 * an SHL recipient back into the app that minted the share (e.g. the DICOM
 * viewer) rather than the patient portal.
 *
 * Reads via a Keycloak service-account admin client (same pattern as
 * cors-origins.ts) and caches per-clientId with a short TTL so the SHL create
 * path doesn't pay an admin round-trip every time. Fails soft: any error or
 * missing attribute resolves to `null` so the caller falls back to the portal.
 */
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '@/config'
import { logger } from '@/lib/logger'
import { getAttr } from '@/lib/smart-client-enrichment'

interface CacheEntry {
  launchUrl: string | null
  at: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * The registered `launch_url` for the given OAuth client id, or `null` when the
 * client is unknown, has no launch URL, or Keycloak is unreachable. Cached.
 */
export async function resolveClientLaunchUrl(clientId: string): Promise<string | null> {
  if (!clientId) return null

  const hit = cache.get(clientId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.launchUrl

  let launchUrl: string | null = null
  try {
    const { adminClientId, adminClientSecret, baseUrl, realm } = config.keycloak
    if (adminClientId && adminClientSecret && baseUrl && realm) {
      const admin = new KcAdminClient({ baseUrl, realmName: realm })
      await admin.auth({
        grantType: 'client_credentials',
        clientId: adminClientId,
        clientSecret: adminClientSecret,
      })
      const clients = await admin.clients.find({ clientId, max: 1 })
      launchUrl = getAttr(clients[0]?.attributes, 'launch_url') ?? null
    }
  } catch (error) {
    logger.auth.warn('Failed to resolve client launch_url from Keycloak', {
      clientId,
      error: error instanceof Error ? error.message : String(error),
    })
    launchUrl = null
  }

  cache.set(clientId, { launchUrl, at: Date.now() })
  return launchUrl
}
