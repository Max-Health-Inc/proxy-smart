import { config } from './config'
import { logger } from './lib/logger'
import { ensureServersInitialized, getAllServers } from './lib/fhir-server-store'
import { refreshCorsOrigins } from './lib/cors-origins'
import { loadRuntimeConfig } from './lib/runtime-config'
import { resolveKcRealmIssuer, getProxyJwks, PROXY_SIGNING_ALG } from './lib/proxy-signing'
import KcAdminClient from '@keycloak/keycloak-admin-client'

// Global state to track Keycloak connectivity
let keycloakAccessible = false

/**
 * Get the current Keycloak accessibility status
 */
export function isKeycloakAccessible(): boolean {
  return config.keycloak.isConfigured || keycloakAccessible
}

/**
 * Check Keycloak connection health with retry logic
 */
export async function checkKeycloakConnection(retries?: number, interval?: number): Promise<void> {
  // Check if Keycloak is configured
  if (!config.keycloak.isConfigured || !config.keycloak.jwksUri) {
    logger.keycloak.warn('Keycloak connection verification skipped: Not configured')
    return
  }

  const maxRetries = retries ?? 3; // Default to 3 retries if not specified
  const retryInterval = interval ?? 5000; // Default to 5 seconds if not specified
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.keycloak.info(`Checking Keycloak connection (attempt ${attempt}/${maxRetries})...`);
      
      const fetchWithTimeout = async (url: string, timeout: number = 5000) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          return response
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      }
      
      // Test JWKS endpoint connectivity
      const response = await fetchWithTimeout(config.keycloak.jwksUri)
      
      if (!response.ok) {
        throw new Error(`JWKS endpoint returned ${response.status}: ${response.statusText}`)
      }
      
      const jwksData = await response.json()
      
      if (!jwksData.keys || !Array.isArray(jwksData.keys) || jwksData.keys.length === 0) {
        throw new Error('JWKS endpoint returned invalid or empty key set')
      }
      
      logger.keycloak.info(`Keycloak JWKS endpoint accessible with ${jwksData.keys.length} key(s)`)
      
      // Test realm info endpoint
      const realmInfoUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
      const realmResponse = await fetchWithTimeout(realmInfoUrl)
      
      if (!realmResponse.ok) {
        throw new Error(`Realm info endpoint returned ${realmResponse.status}: ${realmResponse.statusText}`)
      }
      
      const realmInfo = await realmResponse.json()
      logger.keycloak.info(`Keycloak realm "${realmInfo.realm}" accessible`)
      
      // Test OpenID Connect configuration endpoint (non-critical)
      const openidConfigUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/.well-known/openid-configuration`
      try {
        const openidResponse = await fetchWithTimeout(openidConfigUrl)
        
        if (!openidResponse.ok) {
          logger.keycloak.warn(`OpenID Connect configuration endpoint returned ${openidResponse.status}: ${openidResponse.statusText}`)
          logger.keycloak.warn('This is non-critical - authentication will still work')
        } else {
          const openidConfig = await openidResponse.json()
          logger.keycloak.info(`OpenID Connect configuration accessible`)
          logger.keycloak.info(`Authorization endpoint: ${openidConfig.authorization_endpoint}`)
          logger.keycloak.info(`Token endpoint: ${openidConfig.token_endpoint}`)
          logger.keycloak.info(`Userinfo endpoint: ${openidConfig.userinfo_endpoint}`)
        }
      } catch (openidError) {
        logger.keycloak.warn(`Could not access OpenID Connect configuration: ${openidError instanceof Error ? openidError.message : String(openidError)}`)
        logger.keycloak.warn('This is non-critical - authentication will still work')
      }
      
      // If we reach here, the connection was successful
      keycloakAccessible = true
      return;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (attempt === maxRetries) {
        // This is the final attempt, log detailed error information
        logger.keycloak.error('Keycloak connection check failed after all retry attempts', { error: errorMessage })
        
        // Provide helpful error messages based on common issues
        if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak server is not running',
              'Keycloak URL is incorrect',
              'Network connectivity issues',
              `Check if Keycloak is accessible at: ${config.keycloak.baseUrl}`
            ]
          })
        } else if (errorMessage.includes('404')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak realm name is incorrect',
              `Verify realm "${config.keycloak.realm}" exists in Keycloak`,
              'Realm might not be properly configured'
            ]
          })
        } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
          logger.keycloak.error('Possible causes:', {
            causes: [
              'Keycloak server is slow to respond',
              'Network latency issues'
            ]
          })
        }
        
        // Only fail if critical endpoints are not working
        if (errorMessage.includes('JWKS') || errorMessage.includes('Realm info')) {
          throw new Error('Keycloak connection verification failed after all retry attempts', { cause: error })
        }
        
        logger.keycloak.warn('Some Keycloak endpoints are not accessible, but critical authentication components are working')
        return;
      } else {
        // Not the final attempt, log retry message
        logger.keycloak.warn(`Keycloak connection attempt ${attempt} failed`, { error: errorMessage })
        logger.keycloak.info(`Retrying in ${retryInterval / 1000} seconds...`)
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryInterval))
      }
    }
  }
}

/**
 * Initialize FHIR server connections
 */
export async function initializeFhirServers(): Promise<void> {
  logger.fhir.info('Initializing FHIR server connections...')
  
  try {
    // Initialize the FHIR server store
    await ensureServersInitialized()
    
    // Get all servers from the store
    const serverInfos = await getAllServers()
    
    if (serverInfos.length === 0) {
      logger.fhir.info('No FHIR servers available, but proxy server will continue with fallback configuration')
    } else {
      serverInfos.forEach((serverInfo, index) => {
        logger.fhir.info(`FHIR server ${index + 1} detected: ${serverInfo.metadata.serverName} (${serverInfo.metadata.fhirVersion}) at ${serverInfo.url}`)
      })
    }
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : String(error)
    
    logger.fhir.warn('❌ Failed to initialize FHIR server connections', {
      error: errorDetails,
      configuredServers: config.fhir.serverBases,
      timestamp: new Date().toISOString()
    })
    
    logger.fhir.info('🔍 FHIR server troubleshooting:')
    config.fhir.serverBases.forEach((serverBase, index) => {
      logger.fhir.info(`   ${index + 1}. Check if FHIR server is accessible: ${serverBase}`)
      logger.fhir.info(`      Test metadata endpoint: ${serverBase}/metadata`)
    })
    
    logger.fhir.info('📋 Proxy Server will continue with fallback configuration')
    // Don't throw here - FHIR server initialization failures should not prevent server startup
  }
}

/**
 * Ensure all Keycloak clients have the post.logout.redirect.uris attribute.
 * Keycloak 25+ requires this attribute for post-logout redirects to work;
 * "+" means "use the same URIs as Valid Redirect URIs".
 * Idempotent — safe to call on every startup.
 */
export async function ensurePostLogoutRedirectUris(): Promise<void> {
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping post-logout redirect URI check — no admin credentials configured')
    return
  }

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

    const clients = await admin.clients.find()
    const INTERNAL_CLIENTS = new Set([
      'account', 'account-console', 'admin-cli', 'broker',
      'realm-management', 'security-admin-console',
    ])

    let repaired = 0
    for (const client of clients) {
      if (!client.id || !client.clientId || INTERNAL_CLIENTS.has(client.clientId)) continue
      if (client.attributes?.['post.logout.redirect.uris']) continue

      try {
        await admin.clients.update({ id: client.id }, {
          attributes: {
            ...client.attributes,
            'post.logout.redirect.uris': '+',
          }
        })
        repaired++
        logger.keycloak.debug(`Set post.logout.redirect.uris for client "${client.clientId}"`)
      } catch (error) {
        logger.keycloak.warn(`Could not update post.logout.redirect.uris for "${client.clientId}"`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (repaired > 0) {
      logger.keycloak.info(`✅ Set post.logout.redirect.uris on ${repaired} client(s)`)
    } else {
      logger.keycloak.info('✅ All clients already have post.logout.redirect.uris configured')
    }
  } catch (error) {
    logger.keycloak.warn('Could not auto-repair post-logout redirect URIs', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Ensure Keycloak realm has SMTP configured and password reset enabled.
 * Uses RESEND_API_KEY env var. Idempotent — safe to call on every startup.
 */
async function ensureKeycloakSmtp(): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey || !config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping SMTP setup — RESEND_API_KEY or admin credentials not configured')
    return
  }

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

    const realm = await admin.realms.findOne({ realm: config.keycloak.realm! })
    if (!realm) {
      logger.keycloak.warn('Could not read realm — skipping SMTP setup')
      return
    }

    const needsUpdate = !realm.resetPasswordAllowed || !realm.smtpServer?.host

    if (!needsUpdate) {
      logger.keycloak.info('✅ Keycloak SMTP and password reset already configured')
      return
    }

    await admin.realms.update(
      { realm: config.keycloak.realm! },
      {
        resetPasswordAllowed: true,
        smtpServer: {
          host: 'smtp.resend.dev',
          port: '465',
          from: 'noreply@maxhealth.tech',
          fromDisplayName: 'Proxy Smart',
          replyTo: 'noreply@maxhealth.tech',
          ssl: 'true',
          auth: 'true',
          user: 'resend',
          password: resendApiKey,
        },
      },
    )

    logger.keycloak.info('✅ Keycloak SMTP configured (Resend) and password reset enabled')
  } catch (error) {
    logger.keycloak.warn('Could not auto-configure SMTP', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Ensure Keycloak realm has event logging enabled.
 * Uses the service-account admin credentials (KEYCLOAK_ADMIN_CLIENT_ID/SECRET)
 * to update the realm configuration via the Admin REST API.
 * This is idempotent — safe to call on every startup.
 */
async function ensureKeycloakEventLogging(): Promise<void> {
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping Keycloak event-logging setup — no admin credentials configured')
    return
  }

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

    const realm = await admin.realms.findOne({ realm: config.keycloak.realm! })
    if (!realm) {
      logger.keycloak.warn('Could not read realm — skipping event-logging setup')
      return
    }

    const needsUpdate =
      !realm.eventsEnabled ||
      !realm.adminEventsEnabled ||
      !realm.adminEventsDetailsEnabled

    if (!needsUpdate) {
      logger.keycloak.info('✅ Keycloak event logging already enabled')
      return
    }

    await admin.realms.update(
      { realm: config.keycloak.realm! },
      {
        eventsEnabled: true,
        adminEventsEnabled: true,
        adminEventsDetailsEnabled: true,
        eventsExpiration: 604800, // 7 days
        eventsListeners: realm.eventsListeners?.length
          ? realm.eventsListeners
          : ['jboss-logging'],
        enabledEventTypes: [
          'LOGIN', 'LOGIN_ERROR', 'LOGOUT', 'LOGOUT_ERROR',
          'REGISTER', 'REGISTER_ERROR',
          'CODE_TO_TOKEN', 'CODE_TO_TOKEN_ERROR',
          'CLIENT_LOGIN', 'CLIENT_LOGIN_ERROR',
          'REFRESH_TOKEN', 'REFRESH_TOKEN_ERROR',
          'TOKEN_EXCHANGE', 'TOKEN_EXCHANGE_ERROR',
          'INTROSPECT_TOKEN', 'INTROSPECT_TOKEN_ERROR',
          'UPDATE_PROFILE', 'UPDATE_PASSWORD',
          'GRANT_CONSENT', 'REVOKE_GRANT',
          'PERMISSION_TOKEN',
          // Email events
          'SEND_RESET_PASSWORD', 'SEND_RESET_PASSWORD_ERROR',
          'SEND_VERIFY_EMAIL', 'SEND_VERIFY_EMAIL_ERROR',
          'SEND_IDENTITY_PROVIDER_LINK', 'SEND_IDENTITY_PROVIDER_LINK_ERROR',
          'EXECUTE_ACTIONS', 'EXECUTE_ACTIONS_ERROR',
          'EXECUTE_ACTION_TOKEN', 'EXECUTE_ACTION_TOKEN_ERROR',
          'CUSTOM_REQUIRED_ACTION', 'CUSTOM_REQUIRED_ACTION_ERROR',
        ],
      },
    )

    logger.keycloak.info('✅ Keycloak event logging enabled via Admin API')
  } catch (error) {
    // Non-fatal — realm-export.json already has the config for fresh provisioning
    logger.keycloak.warn('Could not auto-enable Keycloak event logging', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Ensure Keycloak realm has the Organizations feature enabled.
 * KC 26+ ships Organizations as a supported feature, but it must be
 * explicitly enabled on the realm before the Organizations Admin API
 * returns anything other than 404.
 * Idempotent — safe to call on every startup.
 */
async function ensureOrganizationsEnabled(): Promise<void> {
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping organizations check — no admin credentials configured')
    return
  }

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

    const realm = await admin.realms.findOne({ realm: config.keycloak.realm! })
    if (!realm) {
      logger.keycloak.warn('Could not read realm — skipping organizations check')
      return
    }

    if (realm.organizationsEnabled) {
      logger.keycloak.info('✅ Keycloak Organizations already enabled')
      return
    }

    await admin.realms.update(
      { realm: config.keycloak.realm! },
      { organizationsEnabled: true },
    )

    logger.keycloak.info('✅ Keycloak Organizations enabled on realm')
  } catch (error) {
    logger.keycloak.warn('Could not auto-enable Organizations on realm', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Required custom user-profile attributes for SMART on FHIR.
 * Keycloak 26+ Declarative User Profile silently drops undeclared attributes,
 * so every custom attribute we store must be listed here.
 */
const REQUIRED_USER_ATTRIBUTES = [
  { name: 'fhirUser', displayName: 'FHIR User Reference', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
  { name: 'patient_context', displayName: 'Patient Context (Admin)', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
  { name: 'encounter_context', displayName: 'Encounter Context (Admin)', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
  { name: 'fhir_persons', displayName: 'FHIR Person Associations', permissions: { view: ['admin'], edit: ['admin'] }, multivalued: false },
  { name: 'organization', displayName: 'Organization', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
  { name: 'lastLogin', displayName: 'Last Login', permissions: { view: ['admin'], edit: ['admin'] }, multivalued: false },
]

/**
 * Ensure Keycloak User Profile has all required custom attributes declared.
 * Keycloak 26+ with Declarative User Profile silently drops undeclared
 * attributes on user updates, so every custom attribute must be registered.
 * This is idempotent — safe to call on every startup.
 */
async function ensureUserProfileAttributes(): Promise<void> {
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping user-profile check — no admin credentials configured')
    return
  }

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

    // GET /admin/realms/{realm}/users/profile
    const profileUrl = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/users/profile`
    const token = await admin.getAccessToken()
    const res = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      logger.keycloak.warn(`Could not read user profile (${res.status}) — skipping`)
      return
    }

    const profile = await res.json() as { attributes: Array<{ name: string; [k: string]: unknown }>; groups?: unknown[] }
    const existingNames = new Set(profile.attributes.map((a: { name: string }) => a.name))

    const missing = REQUIRED_USER_ATTRIBUTES.filter(a => !existingNames.has(a.name))
    if (missing.length === 0) {
      logger.keycloak.info('✅ User Profile already has all required attributes')
      return
    }

    // Append missing attributes
    profile.attributes.push(...missing)

    const putRes = await fetch(profileUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    })

    if (!putRes.ok) {
      const body = await putRes.text()
      logger.keycloak.warn(`Failed to update user profile (${putRes.status}): ${body}`)
      return
    }

    logger.keycloak.info(`✅ User Profile updated — added ${missing.map(a => a.name).join(', ')}`)
  } catch (error) {
    logger.keycloak.warn('Could not auto-update User Profile attributes', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Ensure the 'proxy-smart-signing' Identity Provider exists in Keycloak.
 *
 * KC's --import-realm is a no-op when the realm already exists (persistent DB).
 * New IdPs/clients added to realm-export.json after initial deployment won't
 * appear until manually created.  This function reconciles the IdP state at
 * startup so federated-jwt client authentication works regardless of when
 * the proxy-smart-signing IdP was introduced.
 *
 * The IdP's JWKS URL points to the backend's /.well-known/jwks.json so
 * Keycloak can verify proxy-signed assertions for the federated-jwt flow.
 */
async function ensureProxySigningIdp(): Promise<void> {
  if (!config.keycloak.adminClientId || !config.keycloak.adminClientSecret) {
    logger.keycloak.debug('Skipping proxy-signing IdP check — no admin credentials configured')
    return
  }

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

    // ── Ensure admin-service has manage-identity-providers role ──
    // Existing deployments may lack this role (added after initial import).
    // The admin-service already has manage-users which allows role assignment.
    try {
      const adminClients = await admin.clients.find({ clientId: 'realm-management' })
      const realmMgmt = adminClients?.[0]
      if (realmMgmt?.id) {
        // Find the admin-service's service account user
        const svcClients = await admin.clients.find({ clientId: config.keycloak.adminClientId })
        const svcClient = svcClients?.[0]
        if (svcClient?.id) {
          const svcUser = await admin.clients.getServiceAccountUser({ id: svcClient.id })
          if (svcUser?.id) {
            // Check current role assignments
            const currentRoles = await admin.users.listClientRoleMappings({
              id: svcUser.id,
              clientUniqueId: realmMgmt.id,
            })
            const hasIdpRole = currentRoles.some(r => r.name === 'manage-identity-providers')
            if (!hasIdpRole) {
              // Find and assign the role
              const availableRoles = await admin.clients.listRoles({ id: realmMgmt.id })
              const idpRole = availableRoles.find(r => r.name === 'manage-identity-providers')
              if (idpRole?.id) {
                await admin.users.addClientRoleMappings({
                  id: svcUser.id,
                  clientUniqueId: realmMgmt.id,
                  roles: [{ id: idpRole.id, name: 'manage-identity-providers' }],
                })
                logger.keycloak.info('Assigned manage-identity-providers role to admin-service')
                // Re-authenticate to get a token with the new role
                await admin.auth({
                  grantType: 'client_credentials',
                  clientId: config.keycloak.adminClientId,
                  clientSecret: config.keycloak.adminClientSecret,
                })
              }
            }
          }
        }
      }
    } catch (roleErr) {
      logger.keycloak.debug('Could not self-assign IdP role (may already have it)', {
        error: roleErr instanceof Error ? roleErr.message : String(roleErr),
      })
    }

    const IDP_ALIAS = 'proxy-smart-signing'
    const token = await admin.getAccessToken()
    const idpUrl = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/identity-provider/instances/${IDP_ALIAS}`

    // Compute the internal JWKS URL (how KC reaches the backend within Docker)
    // If KEYCLOAK_BASE_URL has an internal hostname (e.g., http://keycloak:8080/auth),
    // we know we're in Docker and the backend is at http://backend:PORT.
    // Otherwise (localhost), the backend is also on localhost.
    const kcHost = new URL(config.keycloak.baseUrl!).hostname
    const internalBackendHost = (kcHost !== 'localhost' && kcHost !== '127.0.0.1')
      ? 'backend'
      : 'localhost'
    const jwksUrl = `http://${internalBackendHost}:${config.port}/.well-known/jwks.json`

    // Check if the IdP already exists
    const getRes = await fetch(idpUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const expectedConfig = {
      issuer: config.baseUrl,
      tokenUrl: `${config.baseUrl}/auth/token`,
      authorizationUrl: `${config.baseUrl}/auth/authorize`,
      clientId: 'keycloak',
      clientSecret: 'unused',
      useJwksUrl: 'true',
      jwksUrl,
      validateSignature: 'true',
      clientAuthMethod: 'client_secret_post',
      supportsClientAssertions: 'true',
    }

    if (getRes.ok) {
      // IdP exists — check if jwksUrl needs updating
      const existing = await getRes.json() as { config?: Record<string, string> }
      if (existing.config?.jwksUrl === jwksUrl
        && existing.config?.issuer === config.baseUrl
        && existing.config?.supportsClientAssertions === 'true') {
        logger.keycloak.info('✅ proxy-smart-signing IdP already configured correctly')
      } else {

      // Update IdP config
      const putRes = await fetch(idpUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alias: IDP_ALIAS,
          displayName: 'Proxy Smart Signing',
          providerId: 'oidc',
          enabled: true,
          trustEmail: false,
          storeToken: false,
          linkOnly: false,
          config: expectedConfig,
        }),
      })

      if (putRes.ok) {
        logger.keycloak.info('✅ proxy-smart-signing IdP updated (jwksUrl/issuer synced)')
      } else {
        const body = await putRes.text()
        logger.keycloak.warn(`Failed to update proxy-smart-signing IdP (${putRes.status}): ${body}`)
      }
      }
    } else if (getRes.status === 404 || getRes.status === 403) {
      // IdP doesn't exist (404) or we lacked permission on first check (403).
      // After self-assigning manage-identity-providers, try to create it.
      if (getRes.status === 403) {
        logger.keycloak.info('Got 403 checking IdP — retrying after role self-assignment')
      }
      const createUrl = `${config.keycloak.baseUrl}/admin/realms/${config.keycloak.realm}/identity-provider/instances`
      const postRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alias: IDP_ALIAS,
          displayName: 'Proxy Smart Signing',
          providerId: 'oidc',
          enabled: true,
          trustEmail: false,
          storeToken: false,
          linkOnly: false,
          hideOnLogin: true,
          config: expectedConfig,
        }),
      })

      if (postRes.ok || postRes.status === 201) {
        logger.keycloak.info('✅ proxy-smart-signing IdP created')
      } else {
        const body = await postRes.text()
        logger.keycloak.warn(`Failed to create proxy-smart-signing IdP (${postRes.status}): ${body}`)
      }
    } else {
      logger.keycloak.warn(`Unexpected response checking proxy-smart-signing IdP: ${getRes.status}`)
    }

    // ── Ensure the client auth flow includes federated-jwt execution ──
    // When the realm was created before --features=client-auth-federated was enabled,
    // the built-in "clients" flow won't have the "Signed JWT - Federated" execution.
    // KC needs this execution to authenticate clients with clientAuthenticatorType=federated-jwt.
    // Built-in flows can't be modified, so we copy and bind a new flow if needed.
    try {
      const CUSTOM_FLOW_ALIAS = 'clients with federated-jwt'
      const flows = await admin.authenticationManagement.getFlows()
      const realmInfo = await admin.realms.findOne({ realm: config.keycloak.realm! })
      const currentFlowAlias = realmInfo?.clientAuthenticationFlow || 'clients'

      // Check if the current flow already has federated-jwt
      let needsFlowSetup = true
      try {
        const execs = await admin.authenticationManagement.getExecutions({ flow: currentFlowAlias })
        if (execs.some((e: { providerId?: string }) => e.providerId === 'federated-jwt')) {
          needsFlowSetup = false
          logger.keycloak.debug('Client auth flow already has federated-jwt execution')
        }
      } catch { /* flow not found — will create */ }

      if (needsFlowSetup) {
        // Check if the custom flow already exists (from a previous run that failed to bind)
        let customFlow = flows.find(f => f.alias === CUSTOM_FLOW_ALIAS)

        if (!customFlow) {
          // Copy the built-in "clients" flow
          await admin.authenticationManagement.copyFlow({
            flow: 'clients',
            newName: CUSTOM_FLOW_ALIAS,
          })
          logger.keycloak.info('Copied built-in "clients" flow')
        }

        // Add federated-jwt execution to the custom flow (idempotent check)
        const customExecs = await admin.authenticationManagement.getExecutions({ flow: CUSTOM_FLOW_ALIAS })
        const hasFederated = customExecs.some((e: { providerId?: string }) => e.providerId === 'federated-jwt')

        if (!hasFederated) {
          await admin.authenticationManagement.addExecutionToFlow({
            flow: CUSTOM_FLOW_ALIAS,
            provider: 'federated-jwt',
          })
          logger.keycloak.info('Added federated-jwt execution to client auth flow')

          // Enable the execution (it's added as DISABLED by default)
          const updatedExecs = await admin.authenticationManagement.getExecutions({ flow: CUSTOM_FLOW_ALIAS })
          const fedExec = updatedExecs.find((e: { providerId?: string }) => e.providerId === 'federated-jwt')
          if (fedExec?.id) {
            await admin.authenticationManagement.updateExecution(
              { flow: CUSTOM_FLOW_ALIAS },
              { ...fedExec, requirement: 'ALTERNATIVE' },
            )
            logger.keycloak.info('Set federated-jwt execution to ALTERNATIVE')
          }
        }

        // Bind the custom flow as the realm's client authentication flow
        if (currentFlowAlias !== CUSTOM_FLOW_ALIAS) {
          await admin.realms.update({ realm: config.keycloak.realm! }, {
            ...realmInfo,
            clientAuthenticationFlow: CUSTOM_FLOW_ALIAS,
          })
          logger.keycloak.info('✅ Bound "clients with federated-jwt" as client authentication flow')
        }
      }
    } catch (flowErr) {
      logger.keycloak.warn('Could not ensure federated-jwt client auth flow', {
        error: flowErr instanceof Error ? flowErr.message : String(flowErr),
      })
    }

    // ── Ensure private_key_jwt clients use federated-jwt authenticator ──
    // KC's --import-realm doesn't update existing clients. If a client was
    // originally imported with clientAuthenticatorType "client-jwt" and later
    // changed to "federated-jwt" in realm-export.json, the old value persists.
    // Also, the jwt.credential.* attributes needed for federated auth may be
    // missing entirely.  Detect affected clients by their JWKS registration
    // (use.jwks.string=true) and migrate them.
    // IMPORTANT: use the full client representation in the PUT to avoid
    // resetting other fields (serviceAccountsEnabled, scopes, etc.).
    const allClients = await admin.clients.find()
    let migratedCount = 0
    for (const client of allClients) {
      if (!client.id || !client.clientId) continue

      const attrs = (client.attributes ?? {}) as Record<string, string>
      // Only touch clients with registered JWKS (private_key_jwt pattern)
      if (attrs['use.jwks.string'] !== 'true') continue

      // Check if anything needs fixing
      const needsAuthType = client.clientAuthenticatorType !== 'federated-jwt'
      const needsCredAttrs = attrs['jwt.credential.issuer'] !== IDP_ALIAS
          || attrs['jwt.credential.sub'] !== client.clientId
      const needsServiceAccount = !client.serviceAccountsEnabled

      if (!needsAuthType && !needsCredAttrs && !needsServiceAccount) continue

      try {
        await admin.clients.update({ id: client.id }, {
          ...client,
          clientAuthenticatorType: 'federated-jwt',
          serviceAccountsEnabled: true,
          attributes: {
            ...attrs,
            'jwt.credential.issuer': IDP_ALIAS,
            'jwt.credential.sub': client.clientId,
          },
        })
        migratedCount++
        logger.keycloak.info(`Migrated client "${client.clientId}" to federated-jwt auth`, {
          fixedAuthType: needsAuthType,
          fixedCredAttrs: needsCredAttrs,
          fixedServiceAccount: needsServiceAccount,
        })
      } catch (err) {
        logger.keycloak.warn(`Failed to migrate client "${client.clientId}" to federated-jwt`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (migratedCount > 0) {
      logger.keycloak.info(`✅ Migrated ${migratedCount} client(s) to federated-jwt`)
    }
  } catch (error) {
    logger.keycloak.warn('Could not ensure proxy-smart-signing IdP exists', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Initialize all server components (Keycloak + FHIR servers)
 */
export async function initializeServer(): Promise<void> {
  logger.server.info('Starting Proxy Smart...')

  try {
    // Check if Keycloak is configured
    if (config.keycloak.isConfigured) {
      logger.keycloak.info('Initializing Keycloak connection...')
      logger.keycloak.info(`Keycloak Server: ${config.keycloak.baseUrl}`)
      logger.keycloak.info(`Realm: ${config.keycloak.realm}`)
      logger.keycloak.info(`JWKS URI: ${config.keycloak.jwksUri}`)
      
      // Check Keycloak connection before proceeding
      await checkKeycloakConnection()

      // Resolve the canonical KC realm issuer (respects KC_HOSTNAME if set)
      await resolveKcRealmIssuer()

      // Ensure the proxy-smart-signing IdP exists (required for federated-jwt client auth)
      await ensureProxySigningIdp()
      
      // Ensure Keycloak event logging is enabled (idempotent, non-fatal)
      await ensureKeycloakEventLogging()

      // Ensure Keycloak SMTP/password-reset is configured if RESEND_API_KEY is set
      await ensureKeycloakSmtp()

      // Ensure all clients have post.logout.redirect.uris (Keycloak 25+ requirement)
      await ensurePostLogoutRedirectUris()

      // Populate CORS origins cache from Keycloak client webOrigins
      await refreshCorsOrigins()

      // Eagerly load runtime config (consent, access-control, brand, etc.) from
      // Keycloak realm attributes so externalAudiences and other settings are
      // available immediately — without waiting for the first admin UI request.
      try {
        const runtimeAdmin = new KcAdminClient({
          baseUrl: config.keycloak.baseUrl!,
          realmName: config.keycloak.realm!,
        })
        await runtimeAdmin.auth({
          grantType: 'client_credentials',
          clientId: config.keycloak.adminClientId!,
          clientSecret: config.keycloak.adminClientSecret!,
        })
        await loadRuntimeConfig(runtimeAdmin)
        logger.keycloak.info('✅ Runtime config loaded from Keycloak realm attributes')
      } catch (err) {
        logger.keycloak.warn('Could not eagerly load runtime config — will load on first admin request', {
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Ensure Keycloak Organizations feature is enabled on the realm
      await ensureOrganizationsEnabled()

      // Ensure User Profile has all custom SMART attributes declared (KC 26+ requirement)
      await ensureUserProfileAttributes()

      // Brand display name is managed via the admin branding API (PUT /admin/branding).
      // No longer overwritten on startup — the API calls saveBrandConfig() which syncs
      // displayName + displayNameHtml to the Keycloak realm.
    } else {
      logger.keycloak.warn('Keycloak not configured - authentication features will be limited')
      logger.keycloak.warn('Configure Keycloak settings in the admin UI to enable full functionality')
    }
    
    // Log AI configuration status
    if (config.ai.enabled) {
      logger.server.info('✅ AI assistant enabled with internal tool execution')
    } else {
      logger.server.warn('⚠️  AI assistant disabled - OPENAI_API_KEY not configured')
    }
    
    // Initialize FHIR servers
    await initializeFhirServers()
    
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    } : String(error)
    
    // Check if it's a Keycloak-related error
    if (error instanceof Error && error.message.includes('Keycloak connection verification failed')) {
      logger.server.warn('🔐 Keycloak connection failed — server will start with limited authentication')
      logger.server.warn(`   Keycloak URL: ${config.keycloak.baseUrl}`)
      logger.server.warn(`   Realm: ${config.keycloak.realm}`)
      logger.server.warn(`   JWKS: ${config.keycloak.jwksUri}`)
      logger.server.warn('')
      logger.server.warn('🔍 Keycloak troubleshooting:')
      logger.server.warn(`   1. Check if Keycloak is running at: ${config.keycloak.baseUrl}`)
      logger.server.warn(`   2. Verify realm "${config.keycloak.realm}" exists`)
      logger.server.warn(`   3. Test JWKS endpoint: ${config.keycloak.jwksUri}`)
      logger.server.warn('   4. Check network connectivity and firewall settings')
      logger.server.warn('   5. Configure Keycloak in the admin UI once the server is running')
      logger.server.warn('')
      // Continue server startup — landing page, admin UI, docs all work without KC.
      // Auth-dependent routes will degrade gracefully (friendly error pages).
    } else {
      logger.server.error('❌ Server initialization failed', {
        error: errorDetails,
        initializationStep: 'Unknown',
        config: {
          keycloak: {
            isConfigured: config.keycloak.isConfigured,
            baseUrl: config.keycloak.baseUrl,
            realm: config.keycloak.realm,
            jwksUri: config.keycloak.jwksUri
          },
          fhir: {
            serverBases: config.fhir.serverBases
          }
        },
        timestamp: new Date().toISOString()
      })
      
      // For non-Keycloak errors, provide context but continue
      logger.server.warn('⚠️  Server initialization had issues but will attempt to continue')
      logger.server.warn('Some features may not work correctly until issues are resolved')
    }
  }
}

/**
 * Display server endpoints after successful startup
 */
export async function displayServerEndpoints(): Promise<void> {
  logger.server.info(`Proxy Smart available at ${config.baseUrl}`)
  logger.server.info(`Health check available at ${config.baseUrl}/health`)
  logger.server.info(`API Documentation available at ${config.baseUrl}/swagger`)
  logger.server.info(`Server Discovery available at ${config.baseUrl}/fhir-servers`)

  // Display AI endpoint
  if (config.ai.enabled) {
    logger.server.info(`AI Assistant available at ${config.baseUrl}/admin/ai/chat`)
  }

  // Display MCP endpoint status
  if (config.mcp.enabled) {
    logger.server.info(`MCP Streamable HTTP endpoint available at ${config.baseUrl}${config.mcp.path}`)
  }

  // Get server info from store for display
  try {
    const serverInfos = await getAllServers()
    if (serverInfos.length > 0) {
      logger.server.info(`SMART Protected FHIR Servers available:`)
      serverInfos.forEach((serverInfo) => {
        logger.server.info(`${serverInfo.identifier}: ${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`)
      })
    }
  } catch (error) {
    logger.server.warn('Could not display server endpoints', { error })
  }
}
