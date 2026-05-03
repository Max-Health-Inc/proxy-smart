/**
 * @proxy-smart/auth — Token Enricher
 *
 * After the IdP returns a token response, enriches it with SMART launch context:
 *   - Session-based context (EHR launch / patient picker)
 *   - fhirUser derivation from token claims
 *   - Scope-gated output per SMART 2.2.0 Section 2.0.7
 */

import type {
  LaunchSession,
  SmartProxyConfig,
  SmartProxyLogger,
  TokenEnrichment,
  TokenPayload,
} from './types'
import type { ILaunchContextStore } from './stores/interface'
import { canReturnPatient, canReturnEncounter, canReturnFhirUser, parseScopes } from './smart-scopes'
import { extractPatientFromFhirUser } from './fhir-user'

export interface TokenEnricherDeps {
  config: SmartProxyConfig
  store: ILaunchContextStore
  logger?: SmartProxyLogger
}

export interface TokenEnrichInput {
  /** Decoded access token payload */
  tokenPayload: TokenPayload
  /** The client_id from the token request */
  clientId?: string
  /** The redirect_uri from the token request */
  redirectUri?: string
  /** Granted scope string (from IdP response or request) */
  grantedScope?: string
  /** Requested scope string (from the original token request) */
  requestedScope?: string
}

/**
 * Enrich a token response with SMART launch context.
 *
 * Looks up the session store, applies scope-gated enrichment, and consumes the session.
 * Returns only the enrichment fields to add to the token response — the caller merges them.
 */
export function enrichTokenResponse(
  input: TokenEnrichInput,
  deps: TokenEnricherDeps,
): TokenEnrichment {
  const { store, logger, config } = deps
  const enrichment: TokenEnrichment = {}

  const grantedScopes = parseScopes(input.grantedScope || input.requestedScope)

  // ── Session lookup by client_id + redirect_uri ────────────────────────
  let sessionContext: LaunchSession | null = null
  if (input.clientId && input.redirectUri) {
    const found = store.find(
      s => s.clientId === input.clientId && s.clientRedirectUri === input.redirectUri
    )
    if (found) {
      const [key, session] = found
      sessionContext = session
      store.delete(key) // Consume — single use
      logger?.info('Token enrichment: resolved session context', {
        key: key.slice(0, 8) + '...',
        patient: session.patient,
        encounter: session.encounter,
        clientId: session.clientId,
      })
    }
  }

  // ── Apply session context (priority source) ───────────────────────────
  if (sessionContext) {
    if (sessionContext.patient && canReturnPatient(grantedScopes)) {
      enrichment.patient = sessionContext.patient
    }
    if (sessionContext.encounter && canReturnEncounter(grantedScopes)) {
      enrichment.encounter = sessionContext.encounter
    }
    if (sessionContext.intent) {
      enrichment.intent = sessionContext.intent
    }
    if (sessionContext.smartStyleUrl) {
      enrichment.smart_style_url = sessionContext.smartStyleUrl
    }
    if (sessionContext.tenant) {
      enrichment.tenant = sessionContext.tenant
    }
    if (sessionContext.needPatientBanner !== undefined) {
      enrichment.need_patient_banner = sessionContext.needPatientBanner
    }
    if (sessionContext.fhirContext) {
      try {
        enrichment.fhirContext = JSON.parse(sessionContext.fhirContext)
      } catch { /* ignore parse errors */ }
    }
  }

  // ── Derive patient from fhirUser (spec-compliant fallback) ────────────
  if (!enrichment.patient && canReturnPatient(grantedScopes)) {
    const fhirUser = input.tokenPayload.fhirUser
    if (fhirUser) {
      const patientId = extractPatientFromFhirUser(fhirUser)
      if (patientId) enrichment.patient = patientId
    }
  }

  // ── Scope restoration ─────────────────────────────────────────────────
  if (input.tokenPayload.smart_scope) {
    enrichment.scope = input.tokenPayload.smart_scope
  } else if (input.requestedScope && !input.grantedScope) {
    enrichment.scope = input.requestedScope
  }

  return enrichment
}

/**
 * Rewrite the redirect_uri for the IdP token exchange.
 *
 * When the proxy intercepted the callback, the IdP expects OUR callback URI,
 * not the client's. This function checks if a session exists and returns
 * the rewritten URI, or null if no rewrite is needed.
 */
export function getRewrittenRedirectUri(
  clientId: string | undefined,
  clientRedirectUri: string | undefined,
  deps: TokenEnricherDeps,
): string | null {
  if (!clientId || !clientRedirectUri) return null

  const { store, config, logger } = deps
  const callbackPath = config.callbackPath ?? '/auth/smart-callback'

  const matchingSession = store.find(
    s => s.clientId === clientId && s.clientRedirectUri === clientRedirectUri
  )

  if (matchingSession) {
    const proxyCallbackUri = `${config.baseUrl}${callbackPath}`
    logger?.debug('Token: rewrote redirect_uri for SMART session', {
      original: clientRedirectUri,
      rewritten: proxyCallbackUri,
    })
    return proxyCallbackUri
  }

  return null
}
