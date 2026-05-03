/**
 * @proxy-smart/auth — Callback Handler
 *
 * Handles the IdP callback after authentication. Validates the session,
 * gates on patient picker if needed, and forwards the auth code to the client.
 */

import type { LaunchSession, SmartProxyConfig, SmartProxyLogger, SmartProxyResult } from './types'
import type { ILaunchContextStore } from './stores/interface'

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
  /** Path for the patient picker page (default: "/apps/patient-picker/") */
  patientPickerPath?: string
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
 */
export function handleCallback(
  params: CallbackParams,
  deps: CallbackHandlerDeps,
): CallbackResult {
  const { config, store, logger } = deps
  const patientPickerPath = deps.patientPickerPath ?? '/apps/patient-picker/'

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
  if (session.needsPatientPicker && !session.patient) {
    store.update(sessionKey, { needsPatientPicker: true })
    const pickerUrl = new URL(`${config.baseUrl}${patientPickerPath}`)
    pickerUrl.searchParams.set('session', sessionKey)
    pickerUrl.searchParams.set('code', code)
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
