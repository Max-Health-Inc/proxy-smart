import { Elysia } from 'elysia'
import fetch from 'cross-fetch'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { getAllServers, ensureServersInitialized } from '@/lib/fhir-server-store'
import { logger } from '@/lib/logger'
import { getRuntimeAccessControlConfig } from '@/lib/runtime-config'
import { oauthMetricsLogger } from '@/lib/oauth-metrics-logger'
import { getSmartClientConfig } from '@/lib/smart-client-config-cache'
import { resolveFhirUserForClient } from '@/lib/consent/person-resolver'
import { isBackendServicesRequest, handleBackendServicesToken } from './backend-services'
import { kcUnavailablePage } from './smart-templates'
import { autoResolvePatient } from '@/lib/kc-session-resolver'
import { smartProxyConfig, smartStore, keycloakAdapter, smartLogger } from './smart-proxy-setup'
import {
  handleAuthorize,
  handleCallback,
  handlePatientSelect,
  enrichTokenResponse,
  enrichIntrospection,
  getRewrittenRedirectUri,
  signLaunchCode,
  toAbsoluteFhirUser,
  type LaunchCodePayload,
  type AuthorizeParams,
  type TokenPayload,
} from '@proxy-smart/auth'
import {
  TokenRequest,
  IntrospectRequest,
  IntrospectResponse,
  AuthorizationQuery,
  SmartCallbackQuery,
  LoginQuery,
  LogoutQuery,
  PublicIdentityProvidersResponse,
  TokenResponse,
  UserInfoHeader,
  UserInfoResponse,
  UserInfoErrorResponse,
  EhrLaunchRequest,
} from '@/schemas'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface AuthorizationDetail {
  type: string
  locations: string[]
  fhirVersions: string[]
  scope?: string
}

async function generateAuthorizationDetailsFromToken(
  tokenPayload: TokenPayload
): Promise<AuthorizationDetail[] | undefined> {
  try {
    await ensureServersInitialized()
    const serverInfos = await getAllServers()
    const authDetails: AuthorizationDetail[] = []

    for (const serverInfo of serverInfos) {
      const serverDetail: AuthorizationDetail = {
        type: 'smart_on_fhir',
        locations: [`${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`],
        fhirVersions: [serverInfo.metadata.fhirVersion]
      }
      if (tokenPayload.smart_scope) {
        serverDetail.scope = tokenPayload.smart_scope
      }
      authDetails.push(serverDetail)
    }

    return authDetails.length > 0 ? authDetails : undefined
  } catch (error) {
    logger.auth.warn('Failed to generate authorization details from token', { error })
    return undefined
  }
}

async function isKeycloakReachable(): Promise<boolean> {
  if (!config.keycloak.baseUrl || !config.keycloak.realm) return true
  try {
    const url = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) })
    return resp.ok
  } catch {
    return false
  }
}

async function getServiceAccountAdmin(): Promise<KcAdminClient | null> {
  if (!config.keycloak.isConfigured || !config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    return null
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
  return admin
}

/** Validate aud/resource against known FHIR servers, MCP endpoint, and external allowlist */
async function validateAudience(aud: string): Promise<string | null> {
  const baseUrl = config.baseUrl
  const fhirBasePrefix = `${baseUrl}/${config.name}/`
  const mcpEndpoint = `${baseUrl}${config.mcp.path}`

  if (aud.startsWith(fhirBasePrefix)) return null
  if (aud === mcpEndpoint || aud.startsWith(mcpEndpoint + '/')) return null

  await ensureServersInitialized()
  const servers = await getAllServers()
  const matchesServer = servers.some(s =>
    config.fhir.supportedVersions.some(v => {
      const endpoint = `${fhirBasePrefix}${s.identifier}/${v}`
      return aud === endpoint || aud.startsWith(endpoint + '/')
    })
  )
  if (matchesServer) return null

  // External resource servers that use this proxy as their authorization server
  // (e.g. third-party MCP servers). Configurable via admin UI or ALLOWED_EXTERNAL_AUDIENCES env var.
  // Entries starting with '.' match all subdomains (e.g. '.maxhealth.tech' matches
  // 'dicom.maxhealth.tech', 'api.maxhealth.tech', etc. as well as 'maxhealth.tech' itself).
  const { externalAudiences } = getRuntimeAccessControlConfig()
  const matchesExternal = externalAudiences.some(allowed => {
    if (allowed.startsWith('.')) {
      // Wildcard domain: match apex and all subdomains
      try {
        const audHost = new URL(aud).hostname
        const domain = allowed.slice(1) // remove leading dot
        return audHost === domain || audHost.endsWith('.' + domain)
      } catch {
        return false
      }
    }
    return aud === allowed || aud.startsWith(allowed + '/') || aud.startsWith(allowed + '?')
  })
  if (matchesExternal) return null

  logger.auth.warn('Authorize rejected — aud/resource does not match any known endpoint', {
    aud, expectedPrefix: fhirBasePrefix, mcpEndpoint, externalAudiences,
  })
  return 'aud parameter does not match a known endpoint on this server'
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export const oauthRoutes = new Elysia({ tags: ['authentication'] })

  // ── EHR Launch: issue a signed launch code ────────────────────────────
  .post('/launch', async ({ body, set, headers }) => {
    const authHeader = headers.authorization || headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'unauthorized', error_description: 'Bearer token required to issue launch codes' }
    }
    try {
      await validateToken(authHeader.slice(7))
    } catch {
      set.status = 401
      return { error: 'unauthorized', error_description: 'Invalid or expired Bearer token' }
    }

    if (!body.patient && !body.encounter && !body.fhirUser && !body.intent && !body.fhirContext) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'At least one launch context parameter is required (patient, encounter, fhirUser, intent, or fhirContext)' }
    }

    // Pre-set user attributes in Keycloak for protocol mappers
    if (config.keycloak.isConfigured && config.keycloak.adminClientId && config.keycloak.adminClientSecret) {
      try {
        const admin = await getServiceAccountAdmin()
        if (admin) {
          const user = await admin.users.findOne({ id: body.userId })
          if (user) {
            const attributes = user.attributes || {}
            if (body.patient) attributes.smart_patient = [body.patient]
            if (body.encounter) attributes.smart_encounter = [body.encounter]
            if (body.fhirUser) attributes.fhirUser = [body.fhirUser]
            if (body.intent) attributes.smart_intent = [body.intent]
            if (body.smartStyleUrl) attributes.smart_style_url = [body.smartStyleUrl]
            if (body.tenant) attributes.smart_tenant = [body.tenant]
            if (body.needPatientBanner !== undefined) attributes.smart_need_patient_banner = [String(body.needPatientBanner)]
            if (body.fhirContext) attributes.smart_fhir_context = [JSON.stringify(body.fhirContext)]

            await admin.users.update({ id: body.userId }, {
              firstName: user.firstName, lastName: user.lastName,
              email: user.email, enabled: user.enabled,
              emailVerified: user.emailVerified, attributes,
            })
            logger.auth.info('EHR Launch: pre-set user attributes', { userId: body.userId, patient: body.patient })
          }
        }
      } catch (err) {
        logger.auth.warn('EHR Launch: failed to pre-set user attributes (non-fatal)', { error: err })
      }
    }

    const launchPayload: LaunchCodePayload = {
      userId: body.userId,
      ...(body.patient && { patient: body.patient }),
      ...(body.encounter && { encounter: body.encounter }),
      ...(body.fhirUser && { fhirUser: body.fhirUser }),
      ...(body.intent && { intent: body.intent }),
      ...(body.smartStyleUrl && { smartStyleUrl: body.smartStyleUrl }),
      ...(body.tenant && { tenant: body.tenant }),
      ...(body.needPatientBanner !== undefined && { needPatientBanner: body.needPatientBanner }),
      ...(body.fhirContext && { fhirContext: JSON.stringify(body.fhirContext) }),
      ...(body.clientId && { clientId: body.clientId }),
    }

    const launch = signLaunchCode(launchPayload, {
      secret: smartProxyConfig.launchCodeSecret,
      ttlSeconds: smartProxyConfig.launchCodeTtlSeconds,
      issuer: smartProxyConfig.baseUrl,
      logger: smartLogger,
    })

    return { launch, expires_in: config.smart.launchCodeTtlSeconds }
  }, {
    body: EhrLaunchRequest,
    detail: { summary: 'EHR Launch: Issue Launch Code', description: 'Issues a signed, time-limited launch code that encodes EHR session context.', tags: ['authentication'] }
  })

  // ── Authorization endpoint (delegates to @proxy-smart/auth) ───────────
  .get('/authorize', async ({ query, redirect, set }) => {
    const { result } = await handleAuthorize(query as unknown as AuthorizeParams, {
      config: smartProxyConfig,
      store: smartStore,
      idp: keycloakAdapter,
      logger: smartLogger,
      validateAudience,
      isIdpReachable: isKeycloakReachable,
    })

    switch (result.type) {
      case 'redirect':
        return redirect(result.url)
      case 'error':
        if (result.status === 503) return kcUnavailablePage()
        set.status = result.status
        return { error: result.error, error_description: result.error_description }
      case 'response':
        set.status = result.status
        return result.body
    }
  }, {
    query: AuthorizationQuery,
    detail: { summary: 'OAuth Authorization Endpoint', description: 'Redirects to Keycloak authorization endpoint for OAuth flow with SMART launch support', tags: ['authentication'] }
  })

  // ── SMART callback (delegates to @proxy-smart/auth) ───────────────────
  .get('/smart-callback', async ({ query, redirect, set }) => {
    const { result } = await handleCallback(
      { state: query.state, code: query.code, error: query.error, error_description: query.error_description, session_state: query.session_state },
      { config: smartProxyConfig, store: smartStore, logger: smartLogger, autoResolvePatient },
    )

    switch (result.type) {
      case 'redirect':
        return redirect(result.url)
      case 'error':
        set.status = result.status
        return { error: result.error, error_description: result.error_description }
      case 'response':
        set.status = result.status
        return result.body
    }
  }, {
    query: SmartCallbackQuery,
    detail: { summary: 'SMART Launch Callback', description: 'Receives Keycloak callback during SMART launch flows.', tags: ['authentication'] }
  })

  // ── Patient picker redirect (→ React app at /apps/patient-picker/) ──
  .get('/patient-select', async ({ query, redirect, set }) => {
    const sessionKey = query.session as string | undefined
    const code = query.code as string | undefined

    if (!sessionKey || !code) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing session or code parameter' }
    }
    const session = smartStore.get(sessionKey)
    if (!session) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Session expired. Please restart the authorization flow.' }
    }
    const pickerUrl = new URL(`${config.baseUrl}/apps/patient-picker/`)
    pickerUrl.searchParams.set('session', sessionKey)
    pickerUrl.searchParams.set('code', code)
    if (session.aud) pickerUrl.searchParams.set('aud', session.aud)
    return redirect(pickerUrl.href)
  }, {
    detail: { summary: 'Patient Picker Redirect', description: 'Redirects to the patient picker React app for standalone SMART launches.', tags: ['authentication'] }
  })

  // ── Patient picker submission (delegates to @proxy-smart/auth) ────────
  .post('/patient-select', async ({ body, redirect, set }) => {
    const { session, code, patient } = body as { session?: string; code?: string; patient?: string }
    const result = handlePatientSelect(
      { session, code, patient },
      { config: smartProxyConfig, store: smartStore, logger: smartLogger },
    )

    switch (result.type) {
      case 'redirect':
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

  // ── Login redirect ────────────────────────────────────────────────────
  .get('/login', async ({ query, redirect }) => {
    if (!await isKeycloakReachable()) return kcUnavailablePage()

    const url = new URL(keycloakAdapter.getAuthorizationUrl())
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', query.client_id || 'admin-ui')
    url.searchParams.set('redirect_uri', query.redirect_uri || `${config.baseUrl}/`)
    url.searchParams.set('scope', query.scope || 'openid profile email')
    url.searchParams.set('state', query.state || crypto.randomUUID())

    Object.entries(query).forEach(([k, v]) => {
      if (!['state', 'client_id', 'redirect_uri', 'scope'].includes(k)) {
        url.searchParams.set(k, v as string)
      }
    })
    return redirect(url.href)
  }, {
    query: LoginQuery,
    detail: { summary: 'Login Page Redirect', description: 'Simplified login endpoint that redirects to Keycloak with sensible defaults', tags: ['authentication'] }
  })

  // ── Logout ────────────────────────────────────────────────────────────
  .get('/logout', ({ query, redirect }) => {
    const url = new URL(keycloakAdapter.getLogoutUrl())
    url.searchParams.set('post_logout_redirect_uri', query.post_logout_redirect_uri || `${config.baseUrl}/`)

    if (query.id_token_hint && typeof query.id_token_hint === 'string' &&
        query.id_token_hint.split('.').length === 3 && query.id_token_hint.length > 50) {
      url.searchParams.set('id_token_hint', query.id_token_hint)
    }
    if (query.client_id) url.searchParams.set('client_id', query.client_id)

    return redirect(url.href)
  }, {
    query: LogoutQuery,
    detail: { summary: 'Logout Endpoint', description: 'Proxies logout requests to Keycloak', tags: ['authentication'] }
  })

  // ── Public identity providers ─────────────────────────────────────────
  .get('/identity-providers', async () => {
    try {
      const realmUrl = `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}`
      const response = await fetch(realmUrl)
      if (!response.ok) throw new Error(`Failed: ${response.status}`)
      const realmInfo = await response.json()
      const identityProviders = realmInfo.identityProviders || []
      return identityProviders
        .filter((p: { enabled?: boolean }) => p.enabled !== false)
        .map((p: { alias?: string; providerId?: string; displayName?: string; enabled?: boolean }) => ({
          alias: p.alias ?? '', providerId: p.providerId ?? '',
          displayName: p.displayName ?? p.alias ?? '', enabled: p.enabled ?? false,
        }))
    } catch (error) {
      logger.auth.error('Failed to fetch public identity providers', { error })
      return []
    }
  }, {
    response: { 200: PublicIdentityProvidersResponse },
    detail: { summary: 'Get Public Identity Providers', description: 'Get list of enabled identity providers for login page', tags: ['authentication'] }
  })

  // ── Token endpoint ────────────────────────────────────────────────────
  .post('/token', async ({ body, set, headers }) => {
    const startTime = Date.now()
    const kcUrl = keycloakAdapter.getTokenUrl()
    const bodyObj = body as Record<string, string | undefined>

    logger.auth.debug('Token endpoint request', {
      grant_type: bodyObj.grant_type || bodyObj.grantType || 'MISSING',
      client_id: bodyObj.client_id || bodyObj.clientId || 'MISSING',
      has_code: !!bodyObj.code,
    })

    try {
      // ── Backend Services (private_key_jwt) ──────────────────────────
      if (isBackendServicesRequest(bodyObj)) {
        const result = await handleBackendServicesToken(bodyObj)
        set.status = result.status
        set.headers['Cache-Control'] = 'no-store'
        set.headers['Pragma'] = 'no-cache'
        return result.body
      }

      // ── Standard OAuth flows (forwarded to Keycloak) ────────────────
      const formData = new URLSearchParams()

      if (bodyObj.grant_type || bodyObj.grantType) formData.append('grant_type', bodyObj.grant_type || bodyObj.grantType!)
      if (bodyObj.code) formData.append('code', bodyObj.code)

      // Redirect URI rewrite for SMART sessions (delegates to lib)
      const clientRedirectUri = bodyObj.redirect_uri || bodyObj.redirectUri
      const clientIdForSession = bodyObj.client_id || bodyObj.clientId
      const rewrittenUri = getRewrittenRedirectUri(clientIdForSession, clientRedirectUri, {
        config: smartProxyConfig, store: smartStore, logger: smartLogger,
      })
      formData.append('redirect_uri', rewrittenUri || clientRedirectUri || '')

      if (bodyObj.client_id || bodyObj.clientId) formData.append('client_id', bodyObj.client_id || bodyObj.clientId!)
      if (bodyObj.client_secret || bodyObj.clientSecret) formData.append('client_secret', bodyObj.client_secret || bodyObj.clientSecret!)
      if (bodyObj.code_verifier || bodyObj.codeVerifier) formData.append('code_verifier', bodyObj.code_verifier || bodyObj.codeVerifier!)
      if (bodyObj.refresh_token || bodyObj.refreshToken) formData.append('refresh_token', bodyObj.refresh_token || bodyObj.refreshToken!)
      if (bodyObj.scope) formData.append('scope', bodyObj.scope)
      if (bodyObj.audience) formData.append('audience', bodyObj.audience)
      if (bodyObj.resource) formData.append('resource', bodyObj.resource)
      if (bodyObj.username) formData.append('username', bodyObj.username)
      if (bodyObj.password) formData.append('password', bodyObj.password)
      if (bodyObj.client_assertion_type) formData.append('client_assertion_type', bodyObj.client_assertion_type)
      if (bodyObj.client_assertion) formData.append('client_assertion', bodyObj.client_assertion)
      if (bodyObj.subject_token) formData.append('subject_token', bodyObj.subject_token)
      if (bodyObj.subject_token_type) formData.append('subject_token_type', bodyObj.subject_token_type)
      if (bodyObj.requested_token_type) formData.append('requested_token_type', bodyObj.requested_token_type)

      const resp = await fetch(kcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })

      const responseTime = Date.now() - startTime
      const data = await resp.json()

      // Log OAuth event
      const clientId = bodyObj.client_id || bodyObj.clientId || 'unknown'
      const grantType = bodyObj.grant_type || bodyObj.grantType || 'unknown'
      const requestedScope = bodyObj.scope
      try {
        await oauthMetricsLogger.logEvent({
          type: 'token', status: resp.status === 200 ? 'success' : 'error',
          clientId, clientName: clientId,
          scopes: requestedScope ? requestedScope.split(' ') : [],
          grantType, responseTime,
          ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
          userAgent: headers['user-agent'] || 'unknown',
          errorMessage: data.error_description, errorCode: data.error,
          tokenType: data.token_type, expiresIn: data.expires_in,
          refreshToken: !!data.refresh_token,
          requestDetails: { path: '/auth/token', method: 'POST', headers: { 'content-type': headers['content-type'] || '', 'user-agent': headers['user-agent'] || '' } }
        })
      } catch (logError) {
        logger.auth.error('Failed to log OAuth event', { logError })
      }

      set.status = resp.status
      set.headers['Cache-Control'] = 'no-store'
      set.headers['Pragma'] = 'no-cache'

      if (data.error) return data

      // ── SMART launch context enrichment (delegates to lib) ──────────
      if (data.access_token && resp.status === 200) {
        try {
          const tokenPayload = await validateToken(data.access_token)

          // Core enrichment via @proxy-smart/auth
          const enrichment = enrichTokenResponse(
            {
              tokenPayload: tokenPayload as TokenPayload,
              clientId: clientIdForSession,
              redirectUri: clientRedirectUri,
              grantedScope: data.scope,
              requestedScope,
            },
            { config: smartProxyConfig, store: smartStore, logger: smartLogger },
          )

          // Apply core enrichment
          if (enrichment.patient) data.patient = enrichment.patient
          if (enrichment.encounter) data.encounter = enrichment.encounter
          if (enrichment.intent) data.intent = enrichment.intent
          if (enrichment.smart_style_url) data.smart_style_url = enrichment.smart_style_url
          if (enrichment.tenant) data.tenant = enrichment.tenant
          if (enrichment.need_patient_banner !== undefined) data.need_patient_banner = enrichment.need_patient_banner
          if (enrichment.fhirContext) data.fhirContext = enrichment.fhirContext
          if (enrichment.scope) data.scope = enrichment.scope

          // ── Backend-specific: per-client fhirUser resolution ────────
          if (!data.fhirUser && tokenPayload.fhirUser && (data.scope || requestedScope || '').includes('openid')) {
            const clientConfig = await getSmartClientConfig(clientIdForSession || '')
            const serverInfos = await getAllServers()
            const firstServer = serverInfos.length > 0 ? serverInfos[0] : null
            const fhirBaseUrl = firstServer
              ? `${config.baseUrl}/${config.name}/${firstServer.identifier}/${firstServer.metadata.fhirVersion}`
              : ''

            const resolvedFhirUser = await resolveFhirUserForClient(
              tokenPayload.fhirUser, clientConfig.patientFacing, fhirBaseUrl,
              firstServer?.identifier || '', `Bearer ${data.access_token}`
            )
            if (resolvedFhirUser) {
              data.fhirUser = toAbsoluteFhirUser(resolvedFhirUser, fhirBaseUrl)
            }
          }

          // Derive patient from resolved fhirUser if not already set
          if (!data.patient && data.fhirUser) {
            const grantedScopes = (data.scope || requestedScope || '').split(' ')
            if (grantedScopes.includes('launch/patient') || grantedScopes.includes('launch')) {
              const patientMatch = data.fhirUser.match(/Patient\/([^/]+)$/)
              if (patientMatch) data.patient = patientMatch[1]
            }
          }

          // Authorization details (RFC 9396)
          const generatedDetails = await generateAuthorizationDetailsFromToken(tokenPayload as TokenPayload)
          if (generatedDetails) data.authorization_details = generatedDetails
        } catch (contextError) {
          logger.auth.warn('Failed to add launch context to token response', { contextError })
        }
      }

      return data
    } catch (error) {
      logger.auth.error('Token endpoint error', { error })
      set.status = 500
      return { error: 'internal_server_error', error_description: 'Failed to process token request' }
    }
  }, {
    async parse({ request, contentType }) {
      const mediaType = contentType?.split(';')[0]?.trim()
      if (mediaType === 'application/x-www-form-urlencoded') {
        const text = await request.text()
        return Object.fromEntries(new URLSearchParams(text).entries())
      }
    },
    body: TokenRequest,
    response: { 200: TokenResponse },
    detail: { summary: 'OAuth Token Exchange', description: 'Exchange authorization code for access token with SMART launch context', tags: ['authentication'] }
  })

  // ── Introspection (delegates enrichment to @proxy-smart/auth) ─────────
  .post('/introspect', async ({ body, set }) => {
    const kcUrl = keycloakAdapter.getIntrospectionUrl()
    const bodyObj = body as Record<string, string>

    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
    const hasClientAuth = bodyObj.client_id || bodyObj.client_secret
    if (!hasClientAuth) {
      const auth = keycloakAdapter.getIntrospectionAuth?.()
      if (auth) {
        headers['Authorization'] = `Basic ${Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64')}`
      }
    }

    const resp = await fetch(kcUrl, {
      method: 'POST', headers,
      body: new URLSearchParams(bodyObj).toString()
    })

    const data = await resp.json()
    set.status = resp.status
    set.headers['Cache-Control'] = 'no-store'
    set.headers['Pragma'] = 'no-cache'

    // Enrich with SMART-standard claim names
    enrichIntrospection(data)

    return data
  }, {
    body: IntrospectRequest,
    response: { 200: IntrospectResponse },
    detail: { summary: 'Token Introspection', description: 'Validate and get information about an access token', tags: ['authentication'] }
  })

  // ── User info ─────────────────────────────────────────────────────────
  .get('/userinfo', async ({ headers, set }) => {
    if (!headers.authorization) {
      set.status = 401
      const baseUrl = config.baseUrl || 'http://localhost:3001'
      ;(set.headers as Record<string, string>)['WWW-Authenticate'] = `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      return { error: 'Unauthorized' }
    }

    const token = headers.authorization.replace('Bearer ', '')
    try {
      const payload = await validateToken(token)
      const displayName = payload.name ||
        (payload.given_name && payload.family_name ? `${payload.given_name} ${payload.family_name}` : '') ||
        payload.given_name || payload.preferred_username || payload.email || 'User'

      return {
        id: payload.sub || '',
        fhirUser: payload.fhirUser || '',
        name: [{ text: displayName }],
        username: payload.preferred_username || '',
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        roles: payload.realm_access?.roles || []
      }
    } catch {
      set.status = 401
      return { error: 'Invalid token' }
    }
  }, {
    headers: UserInfoHeader,
    response: { 200: UserInfoResponse, 401: UserInfoErrorResponse },
    detail: { summary: 'Get Current User Profile', description: 'Get authenticated user profile from JWT token', tags: ['authentication'], security: [{ BearerAuth: [] }] }
  })
