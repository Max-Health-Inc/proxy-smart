/**
 * @proxy-smart/auth — Authorize Interceptor
 *
 * Inspects /authorize requests to detect SMART launches, creates sessions,
 * rewrites redirect_uri to the proxy callback, and resolves EHR launch codes.
 *
 * Returns a framework-agnostic SmartProxyResult — the consumer (Elysia, Express, etc.)
 * maps it to their framework's response mechanism.
 */

import type {
  AuthorizeParams,
  LaunchCodePayload,
  LaunchSession,
  SmartProxyConfig,
  SmartProxyLogger,
  SmartProxyResult,
} from './types'
import type { ILaunchContextStore } from './stores/interface'
import type { IdPAdapter } from './idp/interface'
import { isSmartLaunch, isStandaloneLaunch, parseScopes } from './smart-scopes'
import { verifyLaunchCode, type LaunchCodeServiceOptions } from './launch-code'

export interface AuthorizeInterceptorDeps {
  config: SmartProxyConfig
  store: ILaunchContextStore
  idp: IdPAdapter
  logger?: SmartProxyLogger
  /** Validate aud/resource parameter. Return null if valid, or an error message if invalid. */
  validateAudience?: (aud: string) => Promise<string | null>
  /** Check if IdP is reachable. Return false to serve a friendly error page. */
  isIdpReachable?: () => Promise<boolean>
}

export interface AuthorizeInterceptResult {
  result: SmartProxyResult
  /** The session key if a session was created (for testing/monitoring) */
  sessionKey?: string
  /** Resolved launch context if an EHR launch code was present and valid */
  resolvedLaunchContext?: LaunchCodePayload | null
}

/**
 * Process an /authorize request.
 *
 * Detects SMART scopes, resolves EHR launch codes, creates sessions for
 * callback interception, and produces a redirect URL to the IdP.
 */
export async function handleAuthorize(
  params: AuthorizeParams,
  deps: AuthorizeInterceptorDeps,
): Promise<AuthorizeInterceptResult> {
  const { config, store, idp, logger } = deps
  const callbackPath = config.callbackPath ?? '/auth/smart-callback'

  const requestedScopes = parseScopes(params.scope)
  const smartLaunch = isSmartLaunch(requestedScopes)
  const standaloneLaunch = isStandaloneLaunch(requestedScopes, !!params.launch)

  // ── Audience validation ───────────────────────────────────────────────
  const aud = params.aud || params.resource
  if (aud && deps.validateAudience) {
    const error = await deps.validateAudience(aud)
    if (error) {
      return {
        result: { type: 'error', status: 400, error: 'invalid_request', error_description: error },
      }
    }
  }

  // ── IdP reachability check ────────────────────────────────────────────
  if (deps.isIdpReachable) {
    const reachable = await deps.isIdpReachable()
    if (!reachable) {
      logger?.warn('IdP unreachable — returning error')
      return {
        result: { type: 'error', status: 503, error: 'temporarily_unavailable', error_description: 'Identity provider is not responding' },
      }
    }
  }

  // ── EHR Launch code resolution ────────────────────────────────────────
  let resolvedLaunchContext: LaunchCodePayload | null = null
  if (params.launch) {
    const launchCodeOpts: LaunchCodeServiceOptions = {
      secret: config.launchCodeSecret,
      ttlSeconds: config.launchCodeTtlSeconds,
      issuer: config.baseUrl,
      logger,
    }
    const result = verifyLaunchCode(params.launch, launchCodeOpts)
    if (result) {
      resolvedLaunchContext = result.payload
      // Validate client_id audience restriction
      if (resolvedLaunchContext.clientId && params.client_id && resolvedLaunchContext.clientId !== params.client_id) {
        logger?.warn('Launch code client_id mismatch', {
          expected: resolvedLaunchContext.clientId,
          actual: params.client_id,
        })
        return {
          result: { type: 'error', status: 400, error: 'invalid_request', error_description: 'Launch code was issued for a different client' },
          resolvedLaunchContext,
        }
      }
      logger?.info('EHR Launch code resolved', {
        patient: resolvedLaunchContext.patient,
        encounter: resolvedLaunchContext.encounter,
        intent: resolvedLaunchContext.intent,
      })
    } else {
      logger?.warn('EHR Launch code invalid or expired, proceeding without launch context')
    }
  }

  // ── Build IdP authorization URL ───────────────────────────────────────
  const idpAuthUrl = idp.getAuthorizationUrl()
  const url = new URL(idpAuthUrl)

  const sessionKey = crypto.randomUUID()
  const shouldIntercept = smartLaunch && !!params.redirect_uri

  // ── Create session for callback interception ──────────────────────────
  if (shouldIntercept) {
    const session: LaunchSession = {
      clientRedirectUri: params.redirect_uri!,
      clientState: params.state || '',
      clientId: params.client_id || '',
      scope: params.scope || '',
      codeChallenge: params.code_challenge,
      codeChallengeMethod: params.code_challenge_method,
      needsPatientPicker: standaloneLaunch && !resolvedLaunchContext?.patient,
      createdAt: Date.now(),
    }

    // Pre-populate context from EHR launch code
    if (resolvedLaunchContext) {
      if (resolvedLaunchContext.patient) session.patient = resolvedLaunchContext.patient
      if (resolvedLaunchContext.encounter) session.encounter = resolvedLaunchContext.encounter
      if (resolvedLaunchContext.fhirUser) session.fhirUser = resolvedLaunchContext.fhirUser
      if (resolvedLaunchContext.intent) session.intent = resolvedLaunchContext.intent
      if (resolvedLaunchContext.smartStyleUrl) session.smartStyleUrl = resolvedLaunchContext.smartStyleUrl
      if (resolvedLaunchContext.tenant) session.tenant = resolvedLaunchContext.tenant
      if (resolvedLaunchContext.needPatientBanner !== undefined) session.needPatientBanner = resolvedLaunchContext.needPatientBanner
      if (resolvedLaunchContext.fhirContext) session.fhirContext = resolvedLaunchContext.fhirContext
      if (resolvedLaunchContext.patient) session.needsPatientPicker = false
    }

    store.set(sessionKey, session)

    logger?.info('SMART launch session created — intercepting callback', {
      sessionKey: sessionKey.slice(0, 8) + '...',
      clientId: session.clientId,
      needsPatientPicker: session.needsPatientPicker,
      hasLaunchCode: !!resolvedLaunchContext,
    })
  }

  // ── Forward all query params to IdP ───────────────────────────────────
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v)
    }
  }

  // ── Rewrite redirect_uri and state for interception ───────────────────
  if (shouldIntercept) {
    const callbackUrl = `${config.baseUrl}${callbackPath}`
    url.searchParams.set('redirect_uri', callbackUrl)
    url.searchParams.set('state', sessionKey)
  }

  // ── Pass launch context as additional IdP params ──────────────────────
  if (resolvedLaunchContext) {
    const contextParams = idp.getLaunchContextParams?.(resolvedLaunchContext)
    if (contextParams) {
      for (const [k, v] of Object.entries(contextParams)) {
        if (v !== undefined) url.searchParams.set(k, v)
      }
    }
  }

  return {
    result: { type: 'redirect', url: url.href },
    sessionKey: shouldIntercept ? sessionKey : undefined,
    resolvedLaunchContext,
  }
}
