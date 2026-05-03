import { Elysia } from 'elysia'
import fetch from 'cross-fetch'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { getAllServers, ensureServersInitialized } from '@/lib/fhir-server-store'
import { logger } from '@/lib/logger'
import { oauthMetricsLogger } from '@/lib/oauth-metrics-logger'
import { signLaunchCode, verifyLaunchCode } from '@/lib/launch-code'
import { launchContextStore, type LaunchSession } from '@/lib/launch-context-store'
import { getSmartClientConfig } from '@/lib/smart-client-config-cache'
import { resolveFhirUserForClient } from '@/lib/consent/person-resolver'
import { isBackendServicesRequest, handleBackendServicesToken } from './backend-services'
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

interface TokenPayload {
  sub?: string
  fhirUser?: string
  smart_scope?: string
  [key: string]: unknown
}

interface AuthorizationDetail {
  type: string
  locations: string[]
  fhirVersions: string[]
  scope?: string
  patient?: string
  encounter?: string
  fhirContext?: Array<{
    reference?: string
    canonical?: string
    identifier?: object
    type?: string
    role?: string
  }>
}

/**
 * Generate authorization details from token claims (pure proxy approach)
 */
async function generateAuthorizationDetailsFromToken(
  tokenPayload: TokenPayload
): Promise<AuthorizationDetail[] | undefined> {
  try {
    // Ensure servers are initialized
    await ensureServersInitialized()

    // Get all servers from the store
    const serverInfos = await getAllServers()

    // Generate authorization details based on available FHIR servers
    const authDetails: AuthorizationDetail[] = []

    // Create authorization details for each configured FHIR server
    for (const serverInfo of serverInfos) {
      const serverDetail: AuthorizationDetail = {
        type: 'smart_on_fhir',
        locations: [`${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`],
        fhirVersions: [serverInfo.metadata.fhirVersion]
      }

      // Add scope from token claims (if present)
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

/**
 * Quick KC reachability check (3s timeout). Returns true if KC responds.
 * Uses the lightweight realm endpoint, not the full OIDC discovery.
 */
async function isKeycloakReachable(): Promise<boolean> {
  try {
    const url = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) })
    return resp.ok
  } catch {
    return false
  }
}

/** Minimal patient picker HTML page served during standalone SMART launch */
function patientPickerPage(sessionKey: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Select Patient — Proxy Smart</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem;display:flex;align-items:flex-start;justify-content:center}
.container{background:#1e293b;border-radius:1rem;padding:2rem;max-width:640px;width:100%;border:1px solid #334155}
h1{font-size:1.25rem;margin-bottom:.5rem;color:#f8fafc}
.subtitle{color:#94a3b8;margin-bottom:1.5rem;font-size:.875rem}
.search-box{display:flex;gap:.5rem;margin-bottom:1rem}
input[type="text"]{flex:1;padding:.625rem 1rem;border-radius:.5rem;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:.875rem;outline:none}
input[type="text"]:focus{border-color:#3b82f6}
button{padding:.625rem 1rem;border-radius:.5rem;border:none;font-size:.875rem;font-weight:500;cursor:pointer;transition:background .15s}
.btn-search{background:#3b82f6;color:#fff}.btn-search:hover{background:#2563eb}
.btn-select{background:#10b981;color:#fff;width:100%;margin-top:.5rem}.btn-select:hover{background:#059669}
.btn-select:disabled{background:#475569;cursor:not-allowed}
.results{max-height:400px;overflow-y:auto;margin-top:.5rem}
.patient-row{padding:.75rem 1rem;border:1px solid #334155;border-radius:.5rem;margin-bottom:.5rem;cursor:pointer;transition:background .15s}
.patient-row:hover,.patient-row.selected{background:#334155;border-color:#3b82f6}
.patient-row .name{font-weight:500;color:#f8fafc}
.patient-row .meta{font-size:.8rem;color:#94a3b8;margin-top:.25rem}
.loading,.error,.empty{text-align:center;padding:2rem;color:#94a3b8;font-size:.875rem}
.error{color:#f87171}
</style></head><body>
<div class="container">
<h1>Select Patient</h1>
<p class="subtitle">This application is requesting patient context. Search and select the patient whose data you want to access.</p>
<div class="search-box">
  <input type="text" id="search" placeholder="Search by name or MRN..." autocomplete="off">
  <button class="btn-search" onclick="searchPatients()">Search</button>
</div>
<div id="results" class="results"><div class="empty">Enter a search term to find patients</div></div>
<form id="selectForm" method="POST" action="/auth/patient-select">
  <input type="hidden" name="session" value="${sessionKey}">
  <input type="hidden" name="code" value="${code}">
  <input type="hidden" name="patient" id="selectedPatient" value="">
  <button type="submit" class="btn-select" id="submitBtn" disabled>Select Patient</button>
</form>
</div>
<script>
let selected = null;
const baseUrl = location.origin;

async function searchPatients() {
  const q = document.getElementById('search').value.trim();
  if (!q) return;
  const results = document.getElementById('results');
  results.innerHTML = '<div class="loading">Searching...</div>';
  try {
    const resp = await fetch(baseUrl + '/fhir/proxy-smart-backend/default/R4/Patient?name=' + encodeURIComponent(q) + '&_count=20', {
      headers: { 'Accept': 'application/fhir+json' }
    });
    if (!resp.ok) throw new Error('Search failed: ' + resp.status);
    const bundle = await resp.json();
    const entries = bundle.entry || [];
    if (entries.length === 0) {
      results.innerHTML = '<div class="empty">No patients found</div>';
      return;
    }
    results.innerHTML = entries.map(e => {
      const p = e.resource;
      const name = (p.name && p.name[0]) ? [p.name[0].given?.join(' '), p.name[0].family].filter(Boolean).join(' ') : 'Unknown';
      const dob = p.birthDate || '';
      const gender = p.gender || '';
      const mrn = p.identifier?.find(i => i.type?.coding?.[0]?.code === 'MR')?.value || p.id;
      return '<div class="patient-row" data-id="'+p.id+'" onclick="selectPatient(this, \\''+p.id+'\\')">' +
        '<div class="name">'+name+'</div>' +
        '<div class="meta">ID: '+p.id+(dob ? ' • DOB: '+dob : '')+(gender ? ' • '+gender : '')+'</div></div>';
    }).join('');
  } catch(err) {
    results.innerHTML = '<div class="error">'+err.message+'</div>';
  }
}

function selectPatient(el, id) {
  document.querySelectorAll('.patient-row').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('selectedPatient').value = id;
  document.getElementById('submitBtn').disabled = false;
  selected = id;
}

document.getElementById('search').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchPatients(); } });
</script>
</body></html>`
}

/** Friendly HTML page shown when Keycloak is unreachable */
function kcUnavailablePage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authentication Unavailable — Proxy Smart</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
.card{background:#1e293b;border-radius:1rem;padding:2.5rem;max-width:480px;width:100%;text-align:center;border:1px solid #334155}
.icon{font-size:3rem;margin-bottom:1rem}
h1{font-size:1.5rem;margin-bottom:.75rem;color:#f8fafc}
p{color:#94a3b8;line-height:1.6;margin-bottom:1.5rem}
.actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
a,button{display:inline-flex;align-items:center;gap:.5rem;padding:.625rem 1.25rem;border-radius:.5rem;font-size:.875rem;font-weight:500;text-decoration:none;cursor:pointer;border:none;transition:background .15s}
.retry{background:#3b82f6;color:#fff}.retry:hover{background:#2563eb}
.home{background:#334155;color:#e2e8f0}.home:hover{background:#475569}
.hint{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;font-size:.8rem;color:#64748b}
</style></head><body>
<div class="card">
<div class="icon">🔒</div>
<h1>Authentication Temporarily Unavailable</h1>
<p>The authentication service is not responding. This is usually temporary — the service may be restarting or undergoing maintenance.</p>
<div class="actions">
<a class="retry" href="javascript:location.reload()">↻ Try Again</a>
<a class="home" href="/">← Back to Home</a>
</div>
<div class="hint">If the problem persists, administrators can check the Keycloak configuration in the <a href="/webapp" style="color:#60a5fa">Admin UI</a>.</div>
</div></body></html>`
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30' } })
}

/**
 * Get a Keycloak admin client authenticated with the service account (client_credentials).
 * Used for server-to-server operations where no user token is available (e.g., EHR Launch pre-set).
 * Returns null if admin credentials are not configured.
 */
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

/**
 * OAuth2/OIDC proxy routes - handles token exchange and introspection
 */
export const oauthRoutes = new Elysia({ tags: ['authentication'] })
  // EHR Launch: issue a signed launch code (SMART App Launch 2.2.0 EHR Launch)
  .post('/launch', async ({ body, set, headers }) => {
    // Require authentication — caller must be an EHR admin or authorized system
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

    // At least one context parameter must be provided
    if (!body.patient && !body.encounter && !body.fhirUser && !body.intent && !body.fhirContext) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'At least one launch context parameter is required (patient, encounter, fhirUser, intent, or fhirContext)' }
    }

    // Pre-set user attributes in Keycloak so existing protocol mappers
    // will include the launch context in the token claims.
    // This requires the admin service account to be configured.
    if (config.keycloak.isConfigured && config.keycloak.adminClientId && config.keycloak.adminClientSecret) {
      try {
        const admin = await getServiceAccountAdmin()
        if (admin) {
          const userId = body.userId
          const user = await admin.users.findOne({ id: userId })
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

            await admin.users.update({ id: userId }, {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              enabled: user.enabled,
              emailVerified: user.emailVerified,
              attributes,
            })
            logger.auth.info('EHR Launch: pre-set user attributes', { userId, patient: body.patient, encounter: body.encounter })
          } else {
            logger.auth.warn('EHR Launch: user not found for attribute pre-set', { userId })
          }
        }
      } catch (err) {
        // Non-fatal: launch code still works, but token enrichment may fall back to proxy-side resolution
        logger.auth.warn('EHR Launch: failed to pre-set user attributes (non-fatal)', { error: err })
      }
    }

    const launch = signLaunchCode({
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
    })

    return {
      launch,
      expires_in: config.smart.launchCodeTtlSeconds,
    }
  }, {
    body: EhrLaunchRequest,
    detail: {
      summary: 'EHR Launch: Issue Launch Code',
      description: 'Issues a signed, time-limited launch code that encodes EHR session context (patient, encounter, intent, etc.). Also pre-sets user attributes in Keycloak so protocol mappers include context in token claims. The code is passed as the `launch` parameter on /authorize per SMART App Launch 2.2.0.',
      tags: ['authentication']
    }
  })

  // redirect into Keycloak's /auth endpoint
  .get('/authorize', async ({ query, redirect, set }) => {
    // Determine if this is a SMART launch that needs context interception.
    // If so, we replace the app's redirect_uri with our own callback endpoint
    // and store the original in a session for later retrieval.
    const requestedScopes = new Set((query.scope || '').split(' ').filter(Boolean))
    const isSmartLaunch = requestedScopes.has('launch') || requestedScopes.has('launch/patient') || requestedScopes.has('launch/encounter')
    const isStandaloneLaunch = requestedScopes.has('launch/patient') && !query.launch

    // SMART App Launch 2.2.0 / MCP (RFC 8707): validate aud/resource parameter FIRST.
    // This is a cheap input validation — fail fast before making network calls.
    // "aud" is the FHIR server URL the app wants to access — prevents token
    // leakage to counterfeit resource servers.  RFC 8707 "resource" is a synonym.
    // MCP clients send resource=<MCP server URL> per MCP spec Section 2.5.1.
    const aud = query.aud || query.resource
    if (aud) {
      const fhirBasePrefix = `${config.baseUrl}/${config.name}/`
      const mcpEndpoint = `${config.baseUrl}${config.mcp.path}`

      // Fast O(1) checks first — no network calls needed
      const matchesPrefix = aud.startsWith(fhirBasePrefix)
      const matchesMcp = aud === mcpEndpoint || aud.startsWith(mcpEndpoint + '/')

      if (!matchesPrefix && !matchesMcp) {
        // Expensive check: compare against dynamically discovered FHIR servers
        await ensureServersInitialized()
        const servers = await getAllServers()
        const matchesServer = servers.some(s =>
          config.fhir.supportedVersions.some(v => {
            const endpoint = `${fhirBasePrefix}${s.identifier}/${v}`
            return aud === endpoint || aud.startsWith(endpoint + '/')
          })
        )
        if (!matchesServer) {
          logger.auth.warn('Authorize rejected — aud/resource does not match any known endpoint', {
            aud,
            expectedPrefix: fhirBasePrefix,
            mcpEndpoint,
          })
          set.status = 400
          return { error: 'invalid_request', error_description: `aud parameter does not match a known endpoint on this server` }
        }
      }
    }

    // Check KC is reachable before redirecting — avoids raw browser ERR_CONNECTION_REFUSED
    if (!await isKeycloakReachable()) {
      logger.auth.warn('Keycloak unreachable — returning friendly error page instead of redirect')
      return kcUnavailablePage()
    }

    // EHR Launch: resolve the launch code (signed JWT) to context.
    // If `launch` is present and valid, we verify it and pass the embedded context
    // as login_hint metadata. The launch param itself is still forwarded to Keycloak
    // (stored as client_request_param_launch) for protocol mapper access.
    let resolvedLaunchContext: import('@/lib/launch-code').LaunchCodePayload | null = null
    if (query.launch) {
      const result = verifyLaunchCode(query.launch)
      if (result) {
        resolvedLaunchContext = result.payload
        // Optionally validate client_id audience restriction
        if (resolvedLaunchContext.clientId && query.client_id && resolvedLaunchContext.clientId !== query.client_id) {
          logger.auth.warn('Launch code client_id mismatch', {
            expected: resolvedLaunchContext.clientId,
            actual: query.client_id,
          })
          set.status = 400
          return { error: 'invalid_request', error_description: 'Launch code was issued for a different client' }
        }
        logger.auth.info('EHR Launch code resolved', {
          patient: resolvedLaunchContext.patient,
          encounter: resolvedLaunchContext.encounter,
          intent: resolvedLaunchContext.intent,
        })
      } else {
        // Invalid/expired launch code — per spec, EHR can reject or proceed without context
        logger.auth.warn('EHR Launch code invalid or expired, proceeding without launch context')
      }
    }

    const url = new URL(
      `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`
    )

    // For SMART launches, intercept the callback to resolve launch context.
    // We replace the client's redirect_uri with our smart-callback endpoint and store
    // the original so we can forward back to the app after context resolution.
    const sessionKey = crypto.randomUUID()
    const shouldIntercept = isSmartLaunch && query.redirect_uri

    if (shouldIntercept) {
      const session: LaunchSession = {
        clientRedirectUri: query.redirect_uri!,
        clientState: query.state || '',
        clientId: query.client_id || '',
        scope: query.scope || '',
        codeChallenge: query.code_challenge,
        codeChallengeMethod: query.code_challenge_method,
        needsPatientPicker: isStandaloneLaunch && !resolvedLaunchContext?.patient,
        createdAt: Date.now(),
      }

      // Pre-populate context from EHR launch code if available
      if (resolvedLaunchContext) {
        if (resolvedLaunchContext.patient) session.patient = resolvedLaunchContext.patient
        if (resolvedLaunchContext.encounter) session.encounter = resolvedLaunchContext.encounter
        if (resolvedLaunchContext.fhirUser) session.fhirUser = resolvedLaunchContext.fhirUser
        if (resolvedLaunchContext.intent) session.intent = resolvedLaunchContext.intent
        if (resolvedLaunchContext.smartStyleUrl) session.smartStyleUrl = resolvedLaunchContext.smartStyleUrl
        if (resolvedLaunchContext.tenant) session.tenant = resolvedLaunchContext.tenant
        if (resolvedLaunchContext.needPatientBanner !== undefined) session.needPatientBanner = resolvedLaunchContext.needPatientBanner
        if (resolvedLaunchContext.fhirContext) session.fhirContext = resolvedLaunchContext.fhirContext
        // EHR launch with patient already set — no picker needed
        if (resolvedLaunchContext.patient) session.needsPatientPicker = false
      }

      launchContextStore.set(sessionKey, session)

      logger.auth.info('SMART launch session created — intercepting callback', {
        sessionKey: sessionKey.slice(0, 8) + '...',
        clientId: session.clientId,
        needsPatientPicker: session.needsPatientPicker,
        hasLaunchCode: !!resolvedLaunchContext,
      })
    }

    // Add all query parameters to the Keycloak URL
    // SMART scopes (launch/patient, patient/*.read, etc.) are now configured in Keycloak
    // as client scopes, so we can pass them through directly
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v as string)
      }
    })

    if (shouldIntercept) {
      // Replace redirect_uri and state with proxy's callback
      const callbackUrl = `${config.baseUrl}/auth/smart-callback`
      url.searchParams.set('redirect_uri', callbackUrl)
      url.searchParams.set('state', sessionKey)
    }

    // If we resolved a launch code, pass context as additional params for Keycloak.
    // These become client_request_param_* notes on the auth session, accessible by
    // protocol mappers (Script Mapper or custom SPI).
    if (resolvedLaunchContext) {
      if (resolvedLaunchContext.patient) {
        url.searchParams.set('smart_launch_patient', resolvedLaunchContext.patient)
      }
      if (resolvedLaunchContext.encounter) {
        url.searchParams.set('smart_launch_encounter', resolvedLaunchContext.encounter)
      }
      if (resolvedLaunchContext.fhirUser) {
        url.searchParams.set('smart_launch_fhir_user', resolvedLaunchContext.fhirUser)
      }
      if (resolvedLaunchContext.intent) {
        url.searchParams.set('smart_launch_intent', resolvedLaunchContext.intent)
      }
      if (resolvedLaunchContext.tenant) {
        url.searchParams.set('smart_launch_tenant', resolvedLaunchContext.tenant)
      }
      if (resolvedLaunchContext.smartStyleUrl) {
        url.searchParams.set('smart_launch_style_url', resolvedLaunchContext.smartStyleUrl)
      }
      if (resolvedLaunchContext.needPatientBanner !== undefined) {
        url.searchParams.set('smart_launch_need_patient_banner', String(resolvedLaunchContext.needPatientBanner))
      }
      if (resolvedLaunchContext.fhirContext) {
        url.searchParams.set('smart_launch_fhir_context', resolvedLaunchContext.fhirContext)
      }
    }

    return redirect(url.href)
  }, {
    query: AuthorizationQuery,
    detail: {
      summary: 'OAuth Authorization Endpoint',
      description: 'Redirects to Keycloak authorization endpoint for OAuth flow with support for authorization details',
      tags: ['authentication']
    }
  })

  // SMART Launch Callback — proxy intercepts KC's redirect to resolve launch context
  // before forwarding to the client app. This enables:
  //   1. Per-session launch context (no more static user attributes)
  //   2. Patient picker for standalone launches (launch/patient without EHR code)
  //   3. Race-condition-free concurrent EHR launches for the same user
  .get('/smart-callback', async ({ query, redirect, set }) => {
    const sessionKey = query.state
    const code = query.code
    const error = query.error

    // Validate session exists
    if (!sessionKey) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing state parameter in callback' }
    }

    const session = launchContextStore.get(sessionKey)
    if (!session) {
      logger.auth.warn('SMART callback: session not found or expired', { state: sessionKey?.slice(0, 8) + '...' })
      set.status = 400
      return { error: 'invalid_request', error_description: 'Session expired or invalid. Please restart the authorization flow.' }
    }

    // Handle authorization errors from Keycloak — forward to client as-is
    if (error) {
      const clientUrl = new URL(session.clientRedirectUri)
      clientUrl.searchParams.set('error', error)
      if (query.error_description) clientUrl.searchParams.set('error_description', query.error_description)
      if (session.clientState) clientUrl.searchParams.set('state', session.clientState)
      launchContextStore.delete(sessionKey)
      return redirect(clientUrl.href)
    }

    if (!code) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing authorization code in callback' }
    }

    // If patient picker is needed and no patient is set yet, redirect to picker UI
    if (session.needsPatientPicker && !session.patient) {
      // Store the auth code in the session — we'll forward it after picker selection
      launchContextStore.update(sessionKey, { needsPatientPicker: true })

      // Redirect to patient picker UI with session reference
      const pickerUrl = new URL(`${config.baseUrl}/auth/patient-select`)
      pickerUrl.searchParams.set('session', sessionKey)
      pickerUrl.searchParams.set('code', code)
      return redirect(pickerUrl.href)
    }

    // Context is fully resolved — exchange the code by forwarding to the client.
    // The session stays alive until /token is called, where we inject the context.
    // Store the KC auth code in the session so /token can correlate.
    launchContextStore.update(sessionKey, { userSub: undefined })

    // Build the redirect back to the client with the original state
    const clientUrl = new URL(session.clientRedirectUri)
    clientUrl.searchParams.set('code', code)
    if (session.clientState) clientUrl.searchParams.set('state', session.clientState)

    logger.auth.info('SMART callback: forwarding to client', {
      sessionKey: sessionKey.slice(0, 8) + '...',
      clientId: session.clientId,
      hasPatient: !!session.patient,
      hasEncounter: !!session.encounter,
    })

    return redirect(clientUrl.href)
  }, {
    query: SmartCallbackQuery,
    detail: {
      summary: 'SMART Launch Callback',
      description: 'Receives Keycloak callback during SMART launch flows. Resolves launch context (patient picker if needed) before redirecting to the client application.',
      tags: ['authentication']
    }
  })

  // Patient selection endpoint — serves a minimal patient picker for standalone launches
  .get('/patient-select', async ({ query, set }) => {
    const sessionKey = query.session as string | undefined
    const code = query.code as string | undefined

    if (!sessionKey || !code) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing session or code parameter' }
    }

    const session = launchContextStore.get(sessionKey)
    if (!session) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Session expired. Please restart the authorization flow.' }
    }

    // Serve a minimal patient picker HTML page
    // This will call POST /auth/patient-select to submit the selection
    const html = patientPickerPage(sessionKey, code)
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }, {
    detail: {
      summary: 'Patient Picker Page',
      description: 'Serves the patient picker UI for standalone SMART launches that require patient context selection.',
      tags: ['authentication']
    }
  })

  // Patient selection submission — receives the selected patient and redirects to client
  .post('/patient-select', async ({ body, redirect, set }) => {
    const { session: sessionKey, code, patient } = body as { session?: string; code?: string; patient?: string }

    if (!sessionKey || !code || !patient) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Missing required parameters (session, code, patient)' }
    }

    const session = launchContextStore.get(sessionKey)
    if (!session) {
      set.status = 400
      return { error: 'invalid_request', error_description: 'Session expired. Please restart the authorization flow.' }
    }

    // Update session with selected patient
    launchContextStore.update(sessionKey, {
      patient,
      needsPatientPicker: false,
    })

    logger.auth.info('Patient selected in picker', {
      sessionKey: sessionKey.slice(0, 8) + '...',
      patient,
      clientId: session.clientId,
    })

    // Redirect back to client with the auth code
    const clientUrl = new URL(session.clientRedirectUri)
    clientUrl.searchParams.set('code', code)
    if (session.clientState) clientUrl.searchParams.set('state', session.clientState)

    return redirect(clientUrl.href)
  }, {
    detail: {
      summary: 'Patient Picker Submission',
      description: 'Receives patient selection from the picker UI and redirects to the client application with the authorization code.',
      tags: ['authentication']
    }
  })

  // Login page redirect - provides a simple login endpoint for UIs
  .get('/login', async ({ query, redirect }) => {
    // Check KC is reachable before redirecting
    if (!await isKeycloakReachable()) {
      logger.auth.warn('Keycloak unreachable — returning friendly error page for /login')
      return kcUnavailablePage()
    }

    const state = query.state || crypto.randomUUID()
    const clientId = query.client_id || 'admin-ui'
    const redirectUri = query.redirect_uri || `${config.baseUrl}/`
    const scope = query.scope || 'openid profile email'

    const url = new URL(
      `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`
    )

    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', scope)
    url.searchParams.set('state', state)

    // Add any additional parameters passed through
    Object.entries(query).forEach(([k, v]) => {
      if (!['state', 'client_id', 'redirect_uri', 'scope'].includes(k)) {
        url.searchParams.set(k, v as string)
      }
    })

    return redirect(url.href)
  }, {
    query: LoginQuery,
    detail: {
      summary: 'Login Page Redirect',
      description: 'Simplified login endpoint that redirects to Keycloak with sensible defaults for UI applications',
      tags: ['authentication']
    }
  })

  // Logout endpoint - proxy to Keycloak logout
  .get('/logout', ({ query, redirect }) => {
    logger.auth.debug('Logout endpoint called', { post_logout_redirect_uri: query.post_logout_redirect_uri })

    const postLogoutRedirectUri = query.post_logout_redirect_uri || `${config.baseUrl}/`

    const url = new URL(
      `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/logout`
    )

    if (postLogoutRedirectUri) {
      url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
    }

    // Only pass valid id_token_hint if present and looks like a JWT
    if (query.id_token_hint) {
      // Basic validation: JWTs have 3 parts separated by dots
      const isValidJwtFormat = typeof query.id_token_hint === 'string' &&
        query.id_token_hint.split('.').length === 3 &&
        query.id_token_hint.length > 50 // Reasonable minimum length

      if (isValidJwtFormat) {
        url.searchParams.set('id_token_hint', query.id_token_hint)
        logger.auth.debug('Added valid id_token_hint to logout URL')
      } else {
        logger.auth.warn('Invalid id_token_hint format, skipping', {
          hintLength: query.id_token_hint?.length,
          hintParts: query.id_token_hint?.split?.('.')?.length
        })
      }
    }

    // Add other safe parameters (excluding id_token_hint which we handled above)
    Object.entries(query).forEach(([k, v]) => {
      if (k !== 'post_logout_redirect_uri' && k !== 'id_token_hint' && k === 'client_id') {
        url.searchParams.set(k, v as string)
      }
    })

    logger.auth.debug('Redirecting to Keycloak logout URL', { url: url.href })
    return redirect(url.href)
  }, {
    query: LogoutQuery,
    detail: {
      summary: 'Logout Endpoint',
      description: 'Proxies logout requests to Keycloak with sensible defaults',
      tags: ['authentication']
    }
  })

  // Public identity providers endpoint - doesn't require authentication
  .get('/identity-providers', async () => {
    try {
      // Use Keycloak's public endpoint to get realm info which includes identity providers
      // This doesn't require admin authentication
      const realmUrl = `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}`

      logger.auth.debug('Fetching realm info from public endpoint', { realmUrl })

      const response = await fetch(realmUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch realm info: ${response.status} ${response.statusText}`)
      }

      const realmInfo = await response.json()

      // Extract identity providers from realm info
      const identityProviders = realmInfo.identityProviders || []

      // Return only enabled providers with minimal information for public consumption
      const enabledProviders = identityProviders
        .filter((provider: { enabled?: boolean }) => provider.enabled !== false)
        .map((provider: { alias?: string; providerId?: string; displayName?: string; enabled?: boolean }) => ({
          alias: provider.alias ?? '',
          providerId: provider.providerId ?? '',
          displayName: provider.displayName ?? provider.alias ?? '',
          enabled: provider.enabled ?? false
        }))

      logger.auth.debug(`Returning ${enabledProviders.length} public identity providers`)
      return enabledProviders
    } catch (error) {
      logger.auth.error('Failed to fetch public identity providers', { error })
      // Return empty array on error - this is a public endpoint so we don't want to expose errors
      return []
    }
  }, {
    response: {
      200: PublicIdentityProvidersResponse
    },
    detail: {
      summary: 'Get Public Identity Providers',
      description: 'Get list of enabled identity providers for login page (public endpoint)',
      tags: ['authentication']
    }
  })

  // proxy token request
  .post('/token', async ({ body, set, headers }) => {
    const startTime = Date.now();
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
    const bodyObj = body as Record<string, string | undefined>
    const incomingContentType = headers['content-type'] || 'unknown'

    logger.auth.debug('Token endpoint request', {
      keycloakUrl: kcUrl,
      contentType: incomingContentType,
      bodyKeys: Object.keys(body as Record<string, unknown>),
      grant_type: bodyObj.grant_type || bodyObj.grantType || 'MISSING',
      client_id: bodyObj.client_id || bodyObj.clientId || 'MISSING',
      redirect_uri: bodyObj.redirect_uri || bodyObj.redirectUri || undefined,
      has_code: !!bodyObj.code,
      has_code_verifier: !!(bodyObj.code_verifier || bodyObj.codeVerifier),
      has_refresh_token: !!(bodyObj.refresh_token || bodyObj.refreshToken),
      has_client_assertion: !!bodyObj.client_assertion,
    })

    try {
      // ── Backend Services (private_key_jwt) ────────────────────────────
      // Our proxy is the advertised token endpoint. We validate the JWT
      // assertion ourselves, then use Keycloak client_secret for token issuance.
      if (bodyObj.client_assertion && !isBackendServicesRequest(bodyObj)) {
        logger.auth.warn('Backend Services detection failed — client_assertion present but check returned false', {
          has_client_assertion_type: !!bodyObj.client_assertion_type,
          client_assertion_type_value: bodyObj.client_assertion_type,
          client_assertion_length: bodyObj.client_assertion?.length,
          bodyKeys: Object.keys(bodyObj),
        })
      }
      if (isBackendServicesRequest(bodyObj)) {
        logger.auth.debug('Backend Services request detected — handling JWT assertion at proxy layer')
        const result = await handleBackendServicesToken(bodyObj)
        set.status = result.status

        // Standard cache headers for token responses
        set.headers['Cache-Control'] = 'no-store'
        set.headers['Pragma'] = 'no-cache'

        // Log the OAuth event
        const bsClientId = bodyObj.client_id || bodyObj.clientId || 'unknown'
        const responseTime = Date.now() - startTime
        const resultBody = result.body as Record<string, string | number | undefined>
        try {
          await oauthMetricsLogger.logEvent({
            type: 'token',
            status: result.status === 200 ? 'success' : 'error',
            clientId: bsClientId,
            clientName: bsClientId,
            scopes: bodyObj.scope ? bodyObj.scope.split(' ') : [],
            grantType: 'client_credentials',
            responseTime,
            ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
            userAgent: headers['user-agent'] || 'unknown',
            errorMessage: resultBody.error_description as string | undefined,
            errorCode: resultBody.error as string | undefined,
            tokenType: resultBody.token_type as string | undefined,
            expiresIn: resultBody.expires_in as number | undefined,
            refreshToken: false,
            requestDetails: { path: '/auth/token', method: 'POST', headers: { 'content-type': headers['content-type'] || '', 'user-agent': headers['user-agent'] || '' } }
          })
        } catch (logErr) { logger.auth.error('Failed to log Backend Services OAuth event', { logErr }) }

        return result.body
      }

      // ── Standard OAuth flows (forwarded to Keycloak) ──────────────────
      // Convert the parsed body back to form data with proper OAuth2 field names
      const formData = new URLSearchParams()

      // Handle both camelCase and snake_case field names for OAuth2 standard field names
      if (bodyObj.grant_type || bodyObj.grantType) formData.append('grant_type', bodyObj.grant_type || bodyObj.grantType!)
      if (bodyObj.code) formData.append('code', bodyObj.code)

      // SMART launch redirect_uri rewrite: if a session exists for this client+redirect_uri,
      // we intercepted the callback so KC expects OUR callback URI, not the client's.
      const clientRedirectUri = bodyObj.redirect_uri || bodyObj.redirectUri
      const clientIdForSession = bodyObj.client_id || bodyObj.clientId
      let rewrittenRedirectUri = false
      if (clientRedirectUri && clientIdForSession) {
        const matchingSession = launchContextStore.find(
          s => s.clientId === clientIdForSession && s.clientRedirectUri === clientRedirectUri
        )
        if (matchingSession) {
          // KC expects our callback URI — rewrite for the KC token exchange
          const proxyCallbackUri = `${config.baseUrl}/auth/smart-callback`
          formData.append('redirect_uri', proxyCallbackUri)
          rewrittenRedirectUri = true
          logger.auth.debug('Token: rewrote redirect_uri for SMART session', {
            original: clientRedirectUri,
            rewritten: proxyCallbackUri,
          })
        }
      }
      if (!rewrittenRedirectUri && clientRedirectUri) {
        formData.append('redirect_uri', clientRedirectUri)
      }

      if (bodyObj.client_id || bodyObj.clientId) formData.append('client_id', bodyObj.client_id || bodyObj.clientId!)
      if (bodyObj.client_secret || bodyObj.clientSecret) formData.append('client_secret', bodyObj.client_secret || bodyObj.clientSecret!)
      if (bodyObj.code_verifier || bodyObj.codeVerifier) formData.append('code_verifier', bodyObj.code_verifier || bodyObj.codeVerifier!)
      if (bodyObj.refresh_token || bodyObj.refreshToken) formData.append('refresh_token', bodyObj.refresh_token || bodyObj.refreshToken!)
      
      // Pass scope through directly - SMART scopes are now configured in Keycloak
      if (bodyObj.scope) formData.append('scope', bodyObj.scope)
      
  if (bodyObj.audience) formData.append('audience', bodyObj.audience)
  // RFC 8707 Resource Indicators support
  if (bodyObj.resource) formData.append('resource', bodyObj.resource)

      // Handle password grant fields
      if (bodyObj.username) formData.append('username', bodyObj.username)
      if (bodyObj.password) formData.append('password', bodyObj.password)

      // Handle Backend Services (client_credentials with JWT authentication)
      if (bodyObj.client_assertion_type) formData.append('client_assertion_type', bodyObj.client_assertion_type)
      if (bodyObj.client_assertion) formData.append('client_assertion', bodyObj.client_assertion)

      // Handle Token Exchange (RFC 8693)
      if (bodyObj.subject_token) formData.append('subject_token', bodyObj.subject_token)
      if (bodyObj.subject_token_type) formData.append('subject_token_type', bodyObj.subject_token_type)
      if (bodyObj.requested_token_type) formData.append('requested_token_type', bodyObj.requested_token_type)

      const rawBody = formData.toString()
      logger.auth.debug('Forwarding to Keycloak', {
        formFields: Array.from(formData.keys()),
        redirect_uri: formData.get('redirect_uri') || undefined,
      })

      const resp = await fetch(kcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: rawBody
      })

      const responseTime = Date.now() - startTime;
      const data = await resp.json()

      if (resp.status !== 200) {
        logger.auth.debug('Keycloak token error response', {
          status: resp.status,
          error: data.error,
          error_description: data.error_description,
          grant_type: formData.get('grant_type'),
          client_id: formData.get('client_id'),
          redirect_uri: formData.get('redirect_uri'),
          responseTime,
          // Include full response for debugging (excluding tokens)
          responseKeys: Object.keys(data),
        })
      } else {
        logger.auth.debug('Keycloak token success', {
          status: resp.status,
          hasAccessToken: !!data.access_token,
          hasIdToken: !!data.id_token,
          hasRefreshToken: !!data.refresh_token,
          scope: data.scope,
          responseTime,
        })
      }

      // Log OAuth event
      const clientId = bodyObj.client_id || bodyObj.clientId || 'unknown';
      const grantType = bodyObj.grant_type || bodyObj.grantType || 'unknown';
      const requestedScope = bodyObj.scope;
      const scopes = requestedScope ? requestedScope.split(' ') : [];

      try {
        await oauthMetricsLogger.logEvent({
          type: 'token',
          status: resp.status === 200 ? 'success' : 'error',
          clientId,
          clientName: clientId,
          scopes,
          grantType,
          responseTime,
          ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
          userAgent: headers['user-agent'] || 'unknown',
          errorMessage: data.error_description,
          errorCode: data.error,
          tokenType: data.token_type,
          expiresIn: data.expires_in,
          refreshToken: !!data.refresh_token,
          requestDetails: {
            path: '/auth/token',
            method: 'POST',
            headers: {
              'content-type': headers['content-type'] || '',
              'user-agent': headers['user-agent'] || ''
            }
          }
        });
      } catch (logError) {
        logger.auth.error('Failed to log OAuth event', { logError });
      }

      // Set the proper HTTP status code from Keycloak response
      set.status = resp.status

      // RFC 6749 Section 5.1: Token response MUST include cache headers
      // SMART 2.2.0 compliance: These headers are required for token responses
      set.headers['Cache-Control'] = 'no-store'
      set.headers['Pragma'] = 'no-cache'

      // CORS is handled by the global @elysiajs/cors plugin

      // If there's an error, return it with the proper status code
      if (data.error) {
        logger.auth.warn('OAuth2 error from Keycloak', {
          error: data.error,
          description: data.error_description,
          status: resp.status
        })
        return data
      }

      // If token request was successful, add SMART launch context from token claims
      if (data.access_token && resp.status === 200) {
        try {
          const tokenPayload = await validateToken(data.access_token)

          // Determine granted scopes for gating launch context (SMART 2.2.0 Section 2.0.7)
          const grantedScopes = new Set(
            (data.scope || requestedScope || '').split(' ').filter(Boolean)
          )

          // ── Session-based context (priority source) ──────────────────────
          // Look up launch context from the session store. This handles:
          //   - EHR Launch (context from JWT launch code, stored in session)
          //   - Standalone Launch with patient picker (patient selected in picker)
          // The session is keyed by the proxy-generated state param. We can
          // correlate via the user sub (from the token) to find the session.
          let sessionContext: import('@/lib/launch-context-store').LaunchSession | null = null

          // Try to find session by redirect_uri correlation:
          // When we intercepted, we used our callback URI. The client sent its
          // original redirect_uri to us, and we forwarded our own to KC.
          // At /token time, the client sends redirect_uri = its original one.
          // We need to match by client_id + redirect_uri.
          const tokenClientId = bodyObj.client_id || bodyObj.clientId
          const tokenRedirectUri = bodyObj.redirect_uri || bodyObj.redirectUri

          if (tokenClientId && tokenRedirectUri) {
            const found = launchContextStore.find(
              s => s.clientId === tokenClientId && s.clientRedirectUri === tokenRedirectUri
            )
            if (found) {
              const [key, session] = found
              sessionContext = session
              // Consume the session — single use
              launchContextStore.delete(key)
              logger.auth.info('Token enrichment: resolved session context', {
                key: key.slice(0, 8) + '...',
                patient: session.patient,
                encounter: session.encounter,
                clientId: session.clientId,
              })
            }
          }

          // Apply session context (takes priority over token claims)
          if (sessionContext) {
            if (sessionContext.patient && (grantedScopes.has('launch/patient') || grantedScopes.has('launch'))) {
              data.patient = sessionContext.patient
            }
            if (sessionContext.encounter && (grantedScopes.has('launch/encounter') || grantedScopes.has('launch'))) {
              data.encounter = sessionContext.encounter
            }
            if (sessionContext.intent) {
              data.intent = sessionContext.intent
            }
            if (sessionContext.smartStyleUrl) {
              data.smart_style_url = sessionContext.smartStyleUrl
            }
            if (sessionContext.tenant) {
              data.tenant = sessionContext.tenant
            }
            if (sessionContext.needPatientBanner !== undefined) {
              data.need_patient_banner = sessionContext.needPatientBanner
            }
            if (sessionContext.fhirContext) {
              try {
                data.fhirContext = JSON.parse(sessionContext.fhirContext)
              } catch { /* ignore parse errors */ }
            }
          }

          // ── Derive patient ID from fhirUser (spec-compliant) ────────────────
          // When launch/patient was requested but session doesn't have explicit patient,
          // derive it from fhirUser (e.g. patient portal where user IS the patient)
          if (!data.patient && (grantedScopes.has('launch/patient') || grantedScopes.has('launch'))) {
            const fhirUser = tokenPayload.fhirUser as string | undefined
            if (fhirUser) {
              const match = fhirUser.match(/Patient\/([^/]+)$/)
              if (match) {
                data.patient = match[1]
              }
            }
          }

          if (!data.fhirUser && tokenPayload.fhirUser && (grantedScopes.has('fhirUser') || grantedScopes.has('openid'))) {
            // Per-client fhirUser resolution: resolve Person → Patient/Practitioner based on patientFacing flag
            const clientConfig = await getSmartClientConfig(tokenClientId || '')
            const serverInfos = await getAllServers()
            const firstServer = serverInfos.length > 0 ? serverInfos[0] : null
            const fhirBaseUrl = firstServer
              ? `${config.baseUrl}/${config.name}/${firstServer.identifier}/${firstServer.metadata.fhirVersion}`
              : ''

            const resolvedFhirUser = await resolveFhirUserForClient(
              tokenPayload.fhirUser,
              clientConfig.patientFacing,
              fhirBaseUrl,
              firstServer?.identifier || '',
              `Bearer ${data.access_token}`
            )

            if (resolvedFhirUser) {
              // Convert relative fhirUser reference to absolute URL per SMART spec
              if (resolvedFhirUser.startsWith('http://') || resolvedFhirUser.startsWith('https://')) {
                data.fhirUser = resolvedFhirUser
              } else if (fhirBaseUrl) {
                data.fhirUser = `${fhirBaseUrl}/${resolvedFhirUser}`
              } else {
                data.fhirUser = resolvedFhirUser
              }
            }
            // If resolvedFhirUser is undefined → omit claim (no matching identity for this client type)
          }

          // ── Derive patient from resolved fhirUser (Person→Patient resolution) ──
          // If patient was not derived earlier (raw fhirUser was Person/*), try again from resolved value
          if (!data.patient && data.fhirUser && (grantedScopes.has('launch/patient') || grantedScopes.has('launch'))) {
            const patientMatch = data.fhirUser.match(/Patient\/([^/]+)$/)
            if (patientMatch) {
              data.patient = patientMatch[1]
            }
          }

          // Restore SMART scopes in the token response
          // With SMART scopes configured in Keycloak, Keycloak should return them
          // But we also support smart_scope claim from protocol mapper
          if (tokenPayload.smart_scope) {
            // If the token has smart_scope claim, use that (set via protocol mapper)
            data.scope = tokenPayload.smart_scope
          } else if (requestedScope && !data.scope) {
            // If scope was passed in token request and Keycloak didn't return scope, use requested
            data.scope = requestedScope
            logger.auth.debug('Using requested scope for token response', {
              requestedScope
            })
          }
          // Otherwise, use Keycloak's returned scope (which now includes SMART scopes)

          // Add authorization_details for multiple FHIR servers support (RFC 9396)
          // Generate based on configured FHIR servers and token claims
          const generatedDetails = await generateAuthorizationDetailsFromToken(tokenPayload)
          if (generatedDetails) {
            data.authorization_details = generatedDetails
          }
        } catch (contextError) {
          logger.auth.warn('Failed to add launch context to token response', { contextError })
          // Continue without launch context rather than failing the entire request
        }
      }

      return data
    } catch (error) {
      logger.auth.error('Token endpoint error', { error })
      set.status = 500
      return { error: 'internal_server_error', error_description: 'Failed to process token request' }
    }
  },
    {
      // Defense-in-depth: manually parse form bodies using URLSearchParams.
      // Elysia/Bun's internal form parser previously dropped fields after
      // long JWT client_assertion values (observed 2026-04-30, not reliably
      // reproducible across Bun reinstalls). URLSearchParams is spec-compliant
      // and immune to any native parser edge cases.
      async parse({ request, contentType }) {
        const mediaType = contentType?.split(';')[0]?.trim()
        if (mediaType === 'application/x-www-form-urlencoded') {
          const text = await request.text()
          return Object.fromEntries(new URLSearchParams(text).entries())
        }
      },
      body: TokenRequest,
      response: {
        200: TokenResponse
      },
      detail: {
        summary: 'OAuth Token Exchange',
        description: 'Exchange authorization code for access token with SMART launch context and authorization details for multiple FHIR servers',
        tags: ['authentication']
      }
    })

  // proxy introspection
  .post('/introspect', async ({ body, set }) => {
    const kcUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token/introspect`
    const bodyObj = body as Record<string, string>
    logger.auth.debug('Introspect request received', { bodyKeys: Object.keys(bodyObj) })

    // RFC 7662: The introspection endpoint requires client authentication.
    // If the caller didn't provide client credentials, authenticate as the
    // proxy's admin-service client so Keycloak accepts the request.
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const hasClientAuth = bodyObj.client_id || bodyObj.client_secret
    if (!hasClientAuth && config.keycloak.adminClientId && config.keycloak.adminClientSecret) {
      const credentials = Buffer.from(
        `${config.keycloak.adminClientId}:${config.keycloak.adminClientSecret}`
      ).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
      logger.auth.debug('Using admin-service credentials for introspection')
    }

    const resp = await fetch(kcUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(bodyObj).toString()
    })

    const data = await resp.json()
    set.status = resp.status
    set.headers['Cache-Control'] = 'no-store'
    set.headers['Pragma'] = 'no-cache'
    // CORS is handled by the global @elysiajs/cors plugin

    if (data.error) {
      logger.auth.warn('Introspection error from Keycloak', {
        error: data.error,
        description: data.error_description,
        status: resp.status
      })
    }

    // Enrich active introspection response with SMART launch context claims.
    // Keycloak stores them as smart_patient, smart_encounter, fhirUser etc.
    // but SMART STU 2.2 Token Introspection expects top-level patient, encounter, fhirUser.
    if (data.active) {
      if (data.smart_patient && !data.patient) {
        data.patient = data.smart_patient
      }
      if (data.smart_encounter && !data.encounter) {
        data.encounter = data.smart_encounter
      }
      if (data.fhirUser === undefined && data.fhir_user) {
        data.fhirUser = data.fhir_user
      }
    }

    return data
  }, {
    body: IntrospectRequest,
    response: {
      200: IntrospectResponse
    },
    detail: {
      summary: 'Token Introspection',
      description: 'Validate and get information about an access token',
      tags: ['authentication']
    }
  })

  // Get current user info from token
  .get('/userinfo', async ({ headers, set }) => {
    if (!headers.authorization) {
      set.status = 401
      // Advertise Protected Resource Metadata per RFC 9728 via WWW-Authenticate
      const baseUrl = config.baseUrl || 'http://localhost:3001'
      // Set RFC 9728 discovery hint
      ;(set.headers as Record<string, string>)['WWW-Authenticate'] = `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      return { error: 'Unauthorized' }
    }

    const token = headers.authorization.replace('Bearer ', '')

    try {
      // Validate the token and extract user info
      const payload = await validateToken(token)

      // Create a user profile from token claims
      const displayName = payload.name ||
        (payload.given_name && payload.family_name ? `${payload.given_name} ${payload.family_name}` : '') ||
        payload.given_name ||
        payload.preferred_username ||
        payload.email ||
        'User'

      const profile = {
        id: payload.sub || '',
        fhirUser: payload.fhirUser || '',
        name: [{
          text: displayName
        }],
        username: payload.preferred_username || '',
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        roles: payload.realm_access?.roles || []
      }

      return profile
    } catch {
      set.status = 401
      return { error: 'Invalid token' }
    }
  }, {
    headers: UserInfoHeader,
    response: {
      200: UserInfoResponse,
      401: UserInfoErrorResponse
    },
    detail: {
      summary: 'Get Current User Profile',
      description: 'Get authenticated user profile information from JWT token',
      tags: ['authentication'],
      security: [{ BearerAuth: [] }]
    }
  })
  
