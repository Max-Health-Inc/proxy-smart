import { config } from './config'
import { logger } from './lib/logger'
import { ensureServersInitialized, getAllServers } from './lib/fhir-server-store'
import { refreshCorsOrigins } from './lib/cors-origins'
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
  { name: 'smart_patient', displayName: 'SMART Patient Context', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
  { name: 'smart_encounter', displayName: 'SMART Encounter Context', permissions: { view: ['admin', 'user'], edit: ['admin'] }, multivalued: false },
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
      
      // Ensure Keycloak event logging is enabled (idempotent, non-fatal)
      await ensureKeycloakEventLogging()

      // Ensure Keycloak SMTP/password-reset is configured if RESEND_API_KEY is set
      await ensureKeycloakSmtp()

      // Ensure all clients have post.logout.redirect.uris (Keycloak 25+ requirement)
      await ensurePostLogoutRedirectUris()

      // Populate CORS origins cache from Keycloak client webOrigins
      await refreshCorsOrigins()

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
