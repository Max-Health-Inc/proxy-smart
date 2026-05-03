/**
 * Keycloak Session Resolver
 *
 * Resolves user identity from a Keycloak session_state parameter.
 * Used during SMART callback to determine if the logged-in user is a Patient
 * (and thus doesn't need the patient picker).
 */

import KcAdminClient from '@keycloak/keycloak-admin-client'
import fetch from 'cross-fetch'
import { config } from '@/config'
import { extractPatientFromFhirUser, type CallbackParams, type LaunchSession } from '@proxy-smart/auth'
import { logger } from '@/lib/logger'

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
  if (!sessionState || !config.keycloak.isConfigured) return null
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) return null

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

    // Look up the Keycloak user session to get the userId
    const token = await admin.getAccessToken()
    const sessionResp = await fetch(
      `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/sessions/${sessionState}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!sessionResp.ok) return null

    const sessionData = await sessionResp.json() as { userId?: string }
    if (!sessionData.userId) return null

    // Look up the user's fhirUser attribute
    const user = await admin.users.findOne({ id: sessionData.userId })
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
