/**
 * @proxy-smart/auth — Callback Handler
 *
 * Handles the IdP callback after authentication. Validates the session,
 * gates on patient picker if needed, and forwards the auth code to the client.
 */

import type { LaunchSession, SmartProxyConfig, SmartProxyLogger, SmartProxyResult } from './types'
import type { ILaunchContextStore } from './stores/interface'
import { extractPatientFromFhirUser } from './fhir-user'
import { isRedirectUriRegistered, type GetRegisteredRedirectUris } from './redirect-uri'

export interface CallbackParams {
  state?: string
  code?: string
  error?: string
  error_description?: string
  session_state?: string
}

export interface CallbackHandlerDeps {
  config: SmartProxyConfig
  store: ILaunchContextStore
  logger?: SmartProxyLogger
  /** Path for the patient picker page (default: "/patient-picker/") */
  patientPickerPath?: string
  /**
   * Optional hook to auto-resolve the patient before showing the picker.
   * Called when the picker gate would fire. If it returns a patient ID
   * (e.g. because fhirUser is "Patient/123"), the picker is skipped.
   */
  autoResolvePatient?: (session: LaunchSession, params: CallbackParams) => Promise<string | null>
  /**
   * Look up the redirect URIs registered for a client (RFC 6749 §3.1.2.3).
   * Defense in depth: re-validate the session's stored `clientRedirectUri`
   * before redirecting the authorization code (or an IdP error) to it, so a
   * poisoned/unvalidated session can never leak the code to an attacker host.
   * When omitted, no re-validation happens (consumers opt in).
   */
  getRegisteredRedirectUris?: GetRegisteredRedirectUris
}

export interface CallbackResult {
  result: SmartProxyResult
  /** The session that was matched (for further processing) */
  session?: LaunchSession
}

/**
 * Process an IdP callback (smart-callback).
 *
 * Validates the session by state param, handles IdP errors by forwarding
 * them to the client, gates on patient picker if needed, then forwards
 * the auth code back to the client app.
 *
 * When `autoResolvePatient` is provided and the user's identity resolves
 * to a Patient resource (e.g. fhirUser = "Patient/123"), the picker is
 * skipped and the patient is set automatically.
 */
export async function handleCallback(
  params: CallbackParams,
  deps: CallbackHandlerDeps,
): Promise<CallbackResult> {
  const { config, store, logger } = deps
  const patientPickerPath = deps.patientPickerPath ?? '/patient-picker/'

  const sessionKey = params.state
  const code = params.code
  const error = params.error

  // ── Validate session exists ───────────────────────────────────────────
  if (!sessionKey) {
    return {
      result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'Missing state parameter in callback' },
    }
  }

  const session = store.get(sessionKey)
  if (!session) {
    logger?.warn('SMART callback: session not found or expired', { state: sessionKey.slice(0, 8) + '...' })
    return {
      result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'Session expired or invalid. Please restart the authorization flow.' },
    }
  }

  // ── Re-validate the stored redirect_uri (defense in depth) ────────────
  // RFC 6749 §10.6: before forwarding the authorization code (or an IdP
  // error) to the client's redirect_uri, confirm it is STILL an exact match
  // for one registered to this client. Even though authorize already
  // validated it, a session could be poisoned or predate the fix — never
  // emit a code/error to an unvalidated host.
  if (deps.getRegisteredRedirectUris) {
    let registered: string[] = []
    try {
      registered = await deps.getRegisteredRedirectUris(session.clientId)
    } catch (err) {
      logger?.error('SMART callback: failed to load registered redirect URIs — refusing redirect', {
        clientId: session.clientId,
        err,
      })
      store.delete(sessionKey)
      return {
        result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'Unable to validate redirect_uri' },
      }
    }
    if (!isRedirectUriRegistered(session.clientRedirectUri, registered)) {
      logger?.warn('SMART callback: stored redirect_uri not registered for client — refusing redirect', {
        clientId: session.clientId,
        redirectUri: session.clientRedirectUri,
      })
      store.delete(sessionKey)
      return {
        result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'redirect_uri does not match a registered redirect URI for this client' },
      }
    }
  }

  // ── Handle IdP errors — forward to client as-is ───────────────────────
  if (error) {
    const clientUrl = new URL(session.clientRedirectUri)
    clientUrl.searchParams.set('error', error)
    if (params.error_description) clientUrl.searchParams.set('error_description', params.error_description)
    if (session.clientState) clientUrl.searchParams.set('state', session.clientState)
    store.delete(sessionKey)
    return {
      result: { type: 'redirect', url: clientUrl.href },
      session,
    }
  }

  // ── Validate auth code present ────────────────────────────────────────
  if (!code) {
    return {
      result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'Missing authorization code in callback' },
    }
  }

  // ── Patient picker gate ───────────────────────────────────────────────
  let patientAutoResolved = false
  if (session.needsPatientPicker && !session.patient) {
    // Try auto-resolving (e.g. fhirUser is Patient/* → skip the picker)
    if (deps.autoResolvePatient) {
      const autoPatient = await deps.autoResolvePatient(session, params)
      if (autoPatient) {
        store.update(sessionKey, { patient: autoPatient, needsPatientPicker: false })
        patientAutoResolved = true
        logger?.info('SMART callback: auto-resolved patient from fhirUser', {
          sessionKey: sessionKey.slice(0, 8) + '...',
          patient: autoPatient,
        })
        // Fall through to "forward code to client"
      }
    }

    // Fallback: if session already has fhirUser = "Patient/*", extract the patient directly.
    // This handles the case where autoResolvePatient fails (e.g. Keycloak admin API unreachable)
    // but the user is clearly a Patient — they must never see the picker.
    if (!patientAutoResolved && session.fhirUser) {
      const patientFromSession = extractPatientFromFhirUser(session.fhirUser)
      if (patientFromSession) {
        store.update(sessionKey, { patient: patientFromSession, needsPatientPicker: false })
        patientAutoResolved = true
        logger?.info('SMART callback: resolved patient from session fhirUser (fallback)', {
          sessionKey: sessionKey.slice(0, 8) + '...',
          patient: patientFromSession,
          fhirUser: session.fhirUser,
        })
      }
    }
  }

  // If still needs picker after auto-resolve attempt, redirect to picker UI
  if (session.needsPatientPicker && !session.patient && !patientAutoResolved) {
    store.update(sessionKey, { needsPatientPicker: true })
    const pickerUrl = new URL(`${config.baseUrl}${patientPickerPath}`)
    pickerUrl.searchParams.set('session', sessionKey)
    pickerUrl.searchParams.set('code', code)
    if (session.aud) pickerUrl.searchParams.set('aud', session.aud)
    return {
      result: { type: 'redirect', url: pickerUrl.href },
      session,
    }
  }

  // ── Forward code to client ────────────────────────────────────────────
  store.update(sessionKey, { userSub: undefined })

  const clientUrl = new URL(session.clientRedirectUri)
  clientUrl.searchParams.set('code', code)
  if (session.clientState) clientUrl.searchParams.set('state', session.clientState)

  logger?.info('SMART callback: forwarding to client', {
    sessionKey: sessionKey.slice(0, 8) + '...',
    clientId: session.clientId,
    hasPatient: !!session.patient,
    hasEncounter: !!session.encounter,
  })

  return {
    result: { type: 'redirect', url: clientUrl.href },
    session,
  }
}

/**
 * Handle patient picker form submission.
 *
 * Updates the session with the selected patient and redirects to the client.
 */
export function handlePatientSelect(
  params: { session?: string; code?: string; patient?: string },
  deps: CallbackHandlerDeps,
): SmartProxyResult {
  const { store, logger } = deps

  if (!params.session || !params.code || !params.patient) {
    return { type: 'error', status: 400, error: 'invalid_request', error_description: 'Missing required parameters (session, code, patient)' }
  }

  const session = store.get(params.session)
  if (!session) {
    return { type: 'error', status: 400, error: 'invalid_request', error_description: 'Session expired. Please restart the authorization flow.' }
  }

  // Guard: if a patient was already selected (e.g. user hit browser back), redirect idempotently
  if (!session.needsPatientPicker && session.patient) {
    logger?.info('Patient selection already completed (duplicate submission)', {
      sessionKey: params.session.slice(0, 8) + '...',
      patient: session.patient,
      clientId: session.clientId,
    })
    const clientUrl = new URL(session.clientRedirectUri)
    clientUrl.searchParams.set('code', params.code)
    if (session.clientState) clientUrl.searchParams.set('state', session.clientState)
    return { type: 'redirect', url: clientUrl.href }
  }

  store.update(params.session, { patient: params.patient, needsPatientPicker: false })

  logger?.info('Patient selected in picker', {
    sessionKey: params.session.slice(0, 8) + '...',
    patient: params.patient,
    clientId: session.clientId,
  })

  const clientUrl = new URL(session.clientRedirectUri)
  clientUrl.searchParams.set('code', params.code)
  if (session.clientState) clientUrl.searchParams.set('state', session.clientState)

  return { type: 'redirect', url: clientUrl.href }
}
