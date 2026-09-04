// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The pickers: choosing which identity a launch is for, and which patient.
 *
 * Every endpoint here is reached with a launch-session key rather than a token,
 * because none exists yet. A session key is therefore not authorization on its
 * own: the patient endpoints additionally require `pickerAllowed`, which only
 * the callback gate sets, and only for an established practitioner.
 */

import { Elysia } from 'elysia'
import fetch from 'cross-fetch'
import { config } from '@/config'
import { logger } from '@/lib/logger'
import { getServerInfoByName } from '@/lib/fhir-server-store'
import { resolveClientBrandColors } from '@/lib/org-branding'
import { smartProxyConfig, smartStore, smartLogger } from '../smart-proxy-setup'
import {
  handleIdentitySelect,
  handlePatientSelect,
  PRACTITIONER_REQUIRED_MESSAGE,
} from '@proxy-smart/auth'

/** Upstream Patient search params the picker may pass through. */
const ALLOWED_SEARCH_PARAMS = ['name', '_count', '_offset', '_sort', '_id', 'family', 'given', 'identifier']

const pickerUrl = (params: Record<string, string>): string => {
  const url = new URL(`${config.baseUrl}/patient-picker/`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.href
}

export const contextSelectionRoutes = new Elysia({ tags: ['authentication'] })

  // ── Identity picker (→ the same React app, in its identity mode) ──
  .get('/identity-options', async ({ query, set }) => {
    const sessionKey = query.session as string | undefined
    const session = sessionKey ? smartStore.get(sessionKey) : undefined
    if (!session) {
      set.status = 401
      return { error: 'session_expired', error_description: 'Session expired. Please restart the authorization flow.' }
    }

    // Only what the callback already offered: nothing is enumerable here.
    return {
      identities: (session.identityOffered ?? []).map((reference) => ({
        reference,
        resourceType: reference.split('/')[0] ?? '',
      })),
    }
  }, {
    detail: { summary: 'Identity Options (Picker)', description: 'The identities this launch session offered, for the identity picker SPA.', tags: ['authentication'] }
  })

  .post('/identity-select', async ({ body, redirect, set, headers }) => {
    const { session, code, identity } = body as { session?: string; code?: string; identity?: string }
    const result = handleIdentitySelect(
      { session, code, identity },
      { config: smartProxyConfig, store: smartStore, logger: smartLogger },
    )

    const isJsonRequest = headers['content-type']?.includes('application/json')

    switch (result.type) {
      case 'redirect':
        if (isJsonRequest) {
          set.status = 200
          return { redirect_url: result.url }
        }
        return redirect(result.url)
      case 'error':
        set.status = result.status
        return { error: result.error, error_description: result.error_description }
      default:
        return result.body
    }
  }, {
    detail: { summary: 'Identity Selection', description: 'Records which of the signed-in person’s identities this launch is for.', tags: ['authentication'] }
  })

  // ── Patient picker redirect (→ React app at /patient-picker/) ──
  .get('/patient-select', async ({ query, redirect }) => {
    const sessionKey = query.session as string | undefined
    const code = query.code as string | undefined

    if (!sessionKey || !code) {
      return redirect(pickerUrl({
        error: 'invalid_request',
        error_description: 'Missing session or code parameter',
      }))
    }

    const session = smartStore.get(sessionKey)
    if (!session) {
      return redirect(pickerUrl({
        error: 'session_expired',
        error_description: 'Session expired. Please restart the authorization flow.',
      }))
    }

    // Same gate as the search endpoint: the picker UI is only for users cleared to use it.
    if (!session.pickerAllowed && session.needsPatientPicker) {
      return redirect(pickerUrl({
        error: 'access_denied',
        error_description: PRACTITIONER_REQUIRED_MESSAGE,
      }))
    }

    // Guard: if a patient was already selected (e.g. user hit browser back), skip the picker
    if (!session.needsPatientPicker && session.patient) {
      const clientUrl = new URL(session.clientRedirectUri)
      clientUrl.searchParams.set('code', code)
      if (session.clientState) clientUrl.searchParams.set('state', session.clientState)
      return redirect(clientUrl.href)
    }

    return redirect(pickerUrl({
      session: sessionKey,
      code,
      ...(session.aud ? { aud: session.aud } : {}),
    }))
  }, {
    detail: { summary: 'Patient Picker Redirect', description: 'Redirects to the patient picker React app for standalone SMART launches.', tags: ['authentication'] }
  })

  // ── Patient picker submission (delegates to @proxy-smart/auth) ────────
  .post('/patient-select', async ({ body, redirect, set, headers }) => {
    const { session, code, patient } = body as { session?: string; code?: string; patient?: string }
    const result = handlePatientSelect(
      { session, code, patient },
      { config: smartProxyConfig, store: smartStore, logger: smartLogger },
    )

    const isJsonRequest = headers['content-type']?.includes('application/json')

    switch (result.type) {
      case 'redirect':
        // JSON clients get the URL in the body; form submissions get a 302
        if (isJsonRequest) {
          set.status = 200
          return { redirect_url: result.url }
        }
        return redirect(result.url)
      case 'error':
        set.status = result.status
        return { error: result.error, error_description: result.error_description }
      case 'response':
        set.status = result.status
        return result.body
    }
  }, {
    detail: { summary: 'Patient Picker Submission', description: 'Receives patient selection from the picker UI.', tags: ['authentication'] }
  })

  // ── Patient search (session-validated, for patient picker SPA) ────────
  .get('/patient-search', async ({ query, set }) => {
    const sessionKey = query.session as string | undefined
    if (!sessionKey) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing session parameter' }
    }

    const session = smartStore.get(sessionKey)
    if (!session) {
      set.status = 401
      return { error: 'session_expired', error_description: 'Session expired. Please restart the authorization flow.' }
    }

    /*
     * A session key alone is not permission to read the patient directory. `pickerAllowed` is set
     * only by the callback gate, and only once the user was established as a practitioner — so this
     * endpoint cannot be reached by a patient who happens to hold a launch session.
     */
    if (!session.pickerAllowed) {
      logger.auth.warn('Patient search refused: session was never cleared for the picker', {
        clientId: session.clientId,
      })
      set.status = 403
      return { error: 'access_denied', error_description: PRACTITIONER_REQUIRED_MESSAGE }
    }

    // aud format: {baseUrl}/{appName}/{server_name}/{fhir_version}
    const aud = session.aud
    if (!aud) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'No FHIR server audience in session' }
    }

    const segments = new URL(aud).pathname.split('/').filter(Boolean)
    if (segments.length < 3) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Cannot parse FHIR server from aud URL' }
    }

    const serverName = segments[segments.length - 2]
    const serverInfo = await getServerInfoByName(serverName)
    if (!serverInfo) {
      set.status = 404
      return { error: 'server_not_found', error_description: `FHIR server '${serverName}' not found` }
    }

    const upstreamUrl = new URL(`${serverInfo.url}/Patient`)
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'session' && ALLOWED_SEARCH_PARAMS.includes(key) && typeof value === 'string') {
        upstreamUrl.searchParams.set(key, value)
      }
    }

    try {
      const res = await fetch(upstreamUrl.href, { headers: { Accept: 'application/fhir+json' } })
      const body = await res.text()
      set.status = res.status
      set.headers['content-type'] = 'application/fhir+json'
      return body
    } catch (err) {
      logger.auth.error('Patient search proxy failed', { error: err instanceof Error ? err.message : String(err) })
      set.status = 502
      return { error: 'upstream_error', error_description: 'Failed to reach FHIR server' }
    }
  }, {
    detail: { summary: 'Patient Search (Picker)', description: 'Session-validated Patient search for the patient picker SPA. Proxies to upstream FHIR server without requiring a Bearer token.', tags: ['authentication'] }
  })

  // ── Brand context (session-validated, for patient picker theming) ─────
  // Resolves the brand COLOUR for the launch so the picker can theme itself to
  // the launching organization. Starts from the global brand, then applies the
  // launching client's org override when resolvable. UI-theming only — this is
  // NOT the SMART User-access Brand (no logo/portal/endpoints here).
  .get('/brand-context', async ({ query, set }) => {
    const sessionKey = query.session as string | undefined
    if (!sessionKey) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing session parameter' }
    }

    const session = smartStore.get(sessionKey)
    if (!session) {
      set.status = 401
      return { error: 'session_expired', error_description: 'Session expired. Please restart the authorization flow.' }
    }

    const brand = await resolveClientBrandColors((session as { clientId?: string }).clientId)

    set.headers['Cache-Control'] = 'no-store'
    return brand
  }, {
    detail: { summary: 'Brand Context (Picker)', description: 'Session-validated brand colour for theming the patient picker to the launching organization.', tags: ['authentication'] }
  })
