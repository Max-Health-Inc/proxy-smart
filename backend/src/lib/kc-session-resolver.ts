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
    logger.auth.warn('autoResolvePatient: OIDC client not found in Keycloak', { clientId })
    return null
  }

  logger.auth.info('autoResolvePatient: searching sessions on client', {
    clientId,
    kcClientUUID: kcClient.id,
    sessionState: sessionState.slice(0, 8) + '...',
  })

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
    if (!sessions || sessions.length === 0) {
      logger.auth.info('autoResolvePatient: no sessions found on page', { page, offset })
      break
    }

    logger.auth.info('autoResolvePatient: scanning page', {
      page,
      sessionCount: sessions.length,
      sessionIds: sessions.map(s => s.id?.slice(0, 8)).join(','),
    })

    const match = sessions.find(s => s.id === sessionState)
    if (match?.userId) {
      logger.auth.info('autoResolvePatient: session matched', {
        userId: match.userId,
        username: match.username,
      })
      return match.userId
    }

    if (sessions.length < pageSize) break // last page
    offset += pageSize
  }

  logger.auth.warn('autoResolvePatient: session_state not found in client sessions', {
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
  if (!sessionState) {
    logger.auth.info('autoResolvePatient: no session_state in callback params — skipping')
    return null
  }

  logger.auth.info('autoResolvePatient: attempting resolution', {
    clientId: session.clientId,
    sessionState: sessionState.slice(0, 8) + '...',
  })

  try {
    const admin = await getAdminClient()
    if (!admin) {
      logger.auth.warn('autoResolvePatient: admin client not available (credentials missing?)')
      return null
    }

    // Find the userId that owns this session
    const userId = await findUserIdBySession(admin, session.clientId, sessionState)
    if (!userId) return null

    // Look up the user's fhirUser attribute
    const user = await admin.users.findOne({ id: userId })
    const fhirUser = user?.attributes?.fhirUser?.[0]
    if (!fhirUser) {
      logger.auth.info('autoResolvePatient: user has no fhirUser attribute', { userId })
      return null
    }

    // Store fhirUser on the session so the fallback path in callback-handler can use it
    if (!session.fhirUser) {
      session.fhirUser = fhirUser
    }

    const patient = extractPatientFromFhirUser(fhirUser)
    logger.auth.info('autoResolvePatient: resolved', { fhirUser, patient })
    return patient
  } catch (err) {
    logger.auth.warn('Auto-resolve patient from session failed (non-fatal)', { error: err })
    return null
  }
}
