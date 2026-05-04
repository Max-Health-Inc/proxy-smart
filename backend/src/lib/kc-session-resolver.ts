/**
 * Keycloak Session Resolver
 *
 * Resolves user identity from a Keycloak session_state parameter.
 * Used during SMART callback to determine if the logged-in user is a Patient
 * (and thus doesn't need the patient picker).
 *
 * Strategy: List active user-sessions on the OIDC client, find the one matching
 * the session_state from the callback, then look up the user's fhirUser attribute.
 *
 * Note: Keycloak's admin REST API has no GET /sessions/{id} endpoint — only DELETE.
 * We use GET /clients/{id}/user-sessions instead and match by session ID.
 */

import KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '@/config'
import { extractPatientFromFhirUser, type CallbackParams, type LaunchSession } from '@proxy-smart/auth'
import { logger } from '@/lib/logger'

/** Authenticate the admin client (client_credentials grant). */
async function getAdminClient(): Promise<KcAdminClient | null> {
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

/**
 * Find the userId that owns a given session_state by scanning the OIDC client's
 * active user-sessions. Returns null if not found.
 */
async function findUserIdBySession(
  admin: KcAdminClient,
  clientId: string,
  sessionState: string,
): Promise<string | null> {
  // Resolve the OIDC client's internal Keycloak UUID
  const clients = await admin.clients.find({ clientId, max: 1 })
  const kcClient = clients?.[0]
  if (!kcClient?.id) {
    logger.auth.debug('autoResolvePatient: OIDC client not found in Keycloak', { clientId })
    return null
  }

  // Page through active sessions (most recent first) looking for our session_state
  const pageSize = 50
  let offset = 0
  const maxPages = 10 // safety limit: 500 sessions max

  for (let page = 0; page < maxPages; page++) {
    const sessions = await admin.clients.listSessions({
      id: kcClient.id,
      first: offset,
      max: pageSize,
    })
    if (!sessions || sessions.length === 0) break

    const match = sessions.find(s => s.id === sessionState)
    if (match?.userId) return match.userId

    if (sessions.length < pageSize) break // last page
    offset += pageSize
  }

  logger.auth.debug('autoResolvePatient: session_state not found in client sessions', {
    clientId,
    sessionState: sessionState.slice(0, 8) + '...',
  })
  return null
}

/**
 * Look up the Keycloak user's fhirUser attribute via session_state.
 * If fhirUser is "Patient/*", return the patient ID.
 * Returns null on any failure (non-fatal).
 */
export async function autoResolvePatient(
  session: LaunchSession,
  params: CallbackParams,
): Promise<string | null> {
  const sessionState = params.session_state
  if (!sessionState) return null

  try {
    const admin = await getAdminClient()
    if (!admin) return null

    // Find the userId that owns this session
    const userId = await findUserIdBySession(admin, session.clientId, sessionState)
    if (!userId) return null

    // Look up the user's fhirUser attribute
    const user = await admin.users.findOne({ id: userId })
    const fhirUser = user?.attributes?.fhirUser?.[0]
    if (!fhirUser) return null

    // Store fhirUser on the session so the fallback path in callback-handler can use it
    if (!session.fhirUser) {
      session.fhirUser = fhirUser
    }

    return extractPatientFromFhirUser(fhirUser)
  } catch (err) {
    logger.auth.debug('Auto-resolve patient from session failed (non-fatal)', { error: err })
    return null
  }
}
