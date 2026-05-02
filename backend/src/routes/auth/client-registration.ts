import { Elysia } from 'elysia'
import { logger } from '@/lib/logger'
import { ensureScopeMappers, SMART_SCOPE_MAPPERS } from '@/lib/smart-scope-mappers'
import { refreshCorsOrigins } from '@/lib/cors-origins'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import * as crypto from 'crypto'
import { getClientRegistrationSettings } from '../admin/client-registration-settings'
import { ClientRegistrationRequest, ClientRegistrationResponse, CommonErrorResponses } from '@/schemas'

/**
 * OAuth 2.0 Dynamic Client Registration Protocol (RFC 7591)
 * https://tools.ietf.org/html/rfc7591
 * 
 * SMART App Launch Framework requires support for dynamic client registration
 * to enable automated app onboarding.
 * 
 * This is a public endpoint that uses service account credentials to register clients,
 * since RFC 7591 requires unauthenticated registration.
 * 
 * Note: This provides the same functionality as smart-apps.ts but via a public endpoint
 * that conforms to RFC 7591 Dynamic Client Registration standard.
 */

export interface ClientRegistrationResponse {
  client_id: string
  client_secret?: string
  client_id_issued_at: number
  client_secret_expires_at?: number
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  client_name?: string
  client_uri?: string
  logo_uri?: string
  scope?: string
  contacts?: string[]
  tos_uri?: string
  policy_uri?: string
  jwks_uri?: string
  jwks?: object
  token_endpoint_auth_method: string
  // SMART-specific
  fhir_versions?: string[]
  launch_uris?: string[]
}

/**
 * Get admin client using service account credentials for public registration
 */
async function getServiceAccountAdmin(): Promise<KcAdminClient> {
  const admin = new KcAdminClient({
    baseUrl: process.env.KEYCLOAK_BASE_URL!,
    realmName: process.env.KEYCLOAK_REALM!,
  })

  // For public registration, we need to authenticate with service account
  // This should use a dedicated service account for client registration
  await admin.auth({
    grantType: 'client_credentials',
    clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-service',
    clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  })

  return admin
}

export const clientRegistrationRoutes = new Elysia({ tags: ['authentication'] })
  
  // Dynamic Client Registration - Public endpoint as required by RFC 7591
  .post('/register', async ({ body, set }) => {
    try {
      // Use service account for public registration
      const admin = await getServiceAccountAdmin()
      
      // Load admin settings for validation
      const settings = await getClientRegistrationSettings(admin)
      
      // Check if dynamic client registration is enabled
      if (!settings.enabled) {
        set.status = 403
        return {
          error: 'access_denied',
          error_description: 'Dynamic client registration is currently disabled'
        }
      }
      
      // Validate redirect URIs
      if (!body.redirect_uris || body.redirect_uris.length === 0) {
        set.status = 400
        return {
          error: 'invalid_redirect_uri',
          error_description: 'At least one redirect_uri is required'
        }
      }

      // Check redirect URI limit
      if (body.redirect_uris.length > settings.maxRedirectUris) {
        set.status = 400
        return {
          error: 'invalid_redirect_uri',
          error_description: `Maximum ${settings.maxRedirectUris} redirect URIs allowed`
        }
      }

      // Validate HTTPS requirement
      if (settings.requireHttps) {
        const invalidUris = body.redirect_uris.filter(uri => 
          !uri.startsWith('https://') && 
          !uri.startsWith('http://localhost') && 
          !uri.startsWith('http://127.0.0.1')
        )
        if (invalidUris.length > 0) {
          set.status = 400
          return {
            error: 'invalid_redirect_uri',
            error_description: 'redirect_uris must use HTTPS (localhost exempted for development)'
          }
        }
      }

      // Validate redirect URIs against allowed patterns
      const invalidPatterns = body.redirect_uris.filter(uri => {
        return !settings.allowedRedirectUriPatterns.some(pattern => {
          try {
            // Use linear-time matching via string comparison for simple patterns,
            // or bounded regex for complex ones. Limit input length to prevent ReDoS.
            if (uri.length > 2048) return false
            const regex = new RegExp(pattern)
            return regex.test(uri)
          } catch {
            return false // Invalid regex patterns are ignored
          }
        })
      })
      
      if (invalidPatterns.length > 0) {
        set.status = 400
        return {
          error: 'invalid_redirect_uri',
          error_description: 'One or more redirect URIs do not match allowed patterns'
        }
      }

      // Validate required fields based on settings
      if (settings.requireTermsOfService && !body.tos_uri) {
        set.status = 400
        return {
          error: 'invalid_client_metadata',
          error_description: 'Terms of service URI is required'
        }
      }

      if (settings.requirePrivacyPolicy && !body.policy_uri) {
        set.status = 400
        return {
          error: 'invalid_client_metadata',
          error_description: 'Privacy policy URI is required'
        }
      }

      // Determine client type based on authentication method
      const isConfidential = !!(body.jwks_uri || body.jwks)
      const isBackendService = isConfidential && !body.redirect_uris.some(uri => 
        uri.includes('localhost') || uri.includes('127.0.0.1')
      )
      
      // Check if client type is allowed
      if (!isConfidential && !settings.allowPublicClients) {
        set.status = 400
        return {
          error: 'invalid_client_metadata',
          error_description: 'Public clients are not allowed'
        }
      }
      
      if (isConfidential && !isBackendService && !settings.allowConfidentialClients) {
        set.status = 400
        return {
          error: 'invalid_client_metadata',
          error_description: 'Confidential clients are not allowed'
        }
      }
      
      if (isBackendService && !settings.allowBackendServices) {
        set.status = 400
        return {
          error: 'invalid_client_metadata',
          error_description: 'Backend service clients are not allowed'
        }
      }

      // Validate requested scopes against allowed scopes
      if (body.scope) {
        const requestedScopes = body.scope.split(' ')
        const disallowedScopes = requestedScopes.filter(scope => 
          !settings.allowedScopes.includes(scope)
        )
        if (disallowedScopes.length > 0) {
          set.status = 400
          return {
            error: 'invalid_scope',
            error_description: `The following scopes are not allowed: ${disallowedScopes.join(', ')}`
          }
        }
      }

      const clientId = `smart_app_${crypto.randomUUID()}`
      
      // Build Keycloak client configuration (reusing logic from smart-apps.ts)
      const keycloakClient = {
        clientId,
        name: body.client_name || clientId,
        description: `SMART App: ${body.client_name || 'Dynamic Client'}`,
        enabled: !settings.adminApprovalRequired, // Disable if approval required
        protocol: 'openid-connect',
        publicClient: !isConfidential,
        standardFlowEnabled: true, // Authorization code flow
        serviceAccountsEnabled: isBackendService, // Backend services
        redirectUris: body.redirect_uris,
        webOrigins: body.redirect_uris.map(uri => {
          try {
            return new URL(uri).origin
          } catch {
            return uri // fallback for invalid URIs
          }
        }),
        // Proxy validates JWT assertions itself, then authenticates to Keycloak
        // using client_secret. Must be 'client-secret' so Keycloak accepts the
        // proxy's internal token request for backend services.
        clientAuthenticatorType: isConfidential ? 'client-secret' : 'none',
        attributes: {
          'pkce.code.challenge.method': 'S256',
          'client.secret.creation.time': Date.now().toString(),
          'smart_app': 'true', // Mark as SMART app to work with existing filtering
          'smart.fhir_versions': body.fhir_versions?.join(',') || 'R4',
          'smart.launch_uris': body.launch_uris?.join(',') || '',
          'smart.client_uri': body.client_uri || '',
          'smart.logo_uri': body.logo_uri || '',
          // Keycloak 25+ requires explicit post-logout redirect URI config
          'post.logout.redirect.uris': '+',
          // Dynamic registration metadata
          'dynamic_registration': 'true',
          'registration_date': Date.now().toString(),
          'approval_required': settings.adminApprovalRequired.toString(),
          'approved': (!settings.adminApprovalRequired).toString(),
          // Client lifetime
          ...(settings.maxClientLifetime > 0 && {
            'expires_at': (Date.now() + (settings.maxClientLifetime * 24 * 60 * 60 * 1000)).toString()
          }),
          ...(body.jwks_uri && {
            'use.jwks.url': 'true',
            'jwks.url': body.jwks_uri
          }),
          ...(body.jwks && {
            'use.jwks.string': 'true',
            'jwks.string': JSON.stringify(body.jwks)
          })
        }
      }

      // Create the client
      const createdClient = await admin.clients.create(keycloakClient)

      // Get client secret for confidential clients that use client-secret auth
      let clientSecret: string | undefined
      if (isConfidential && !body.jwks_uri && !body.jwks && createdClient.id) {
        try {
          const secret = await admin.clients.getClientSecret({ id: createdClient.id })
          clientSecret = secret.value
        } catch (error) {
          logger.admin.warn('Could not retrieve client secret', { error })
        }
      }

      // Assign Keycloak built-in default scopes that every client needs for proper
      // token enrichment. These are "silent" scopes (include.in.token.scope=false)
      // that add essential claims (roles, CORS origins, auth context) without
      // appearing in the OAuth scope parameter. Without these, access tokens lack
      // realm_access/resource_access claims and the backend cannot enforce RBAC.
      // This matches the defaultClientScopes on all pre-configured clients in
      // realm-export.json and Keycloak's own realm-default behavior.
      if (createdClient.id) {
        const keycloakBuiltinDefaultScopes = ['roles', 'web-origins', 'acr']
        try {
          const allClientScopes = await admin.clientScopes.find()

          for (const scopeName of keycloakBuiltinDefaultScopes) {
            const matchingScope = allClientScopes.find(s => s.name === scopeName)
            if (matchingScope?.id) {
              try {
                await admin.clients.addDefaultClientScope({
                  id: createdClient.id,
                  clientScopeId: matchingScope.id,
                })
                logger.admin.debug('Assigned built-in default scope to client', { clientId, scopeName })
              } catch (scopeError) {
                logger.admin.warn('Failed to assign built-in default scope', { clientId, scopeName, error: scopeError })
              }
            }
          }

          // Configure requested scopes - map SMART/OIDC scopes to Keycloak client scopes
          if (body.scope) {
            logger.admin.debug('Configuring client scopes', { clientId, scope: body.scope })
            const requestedScopes = body.scope.split(' ')
            
            // Standard OIDC scopes that should be default
            const defaultOidcScopes = ['openid', 'profile', 'email']
            
            for (const scopeName of requestedScopes) {
              const matchingScope = allClientScopes.find(s => s.name === scopeName)
              if (matchingScope?.id) {
                try {
                  if (defaultOidcScopes.includes(scopeName)) {
                    await admin.clients.addDefaultClientScope({ 
                      id: createdClient.id, 
                      clientScopeId: matchingScope.id 
                    })
                  } else {
                    // All SMART/FHIR scopes go to optional so user must explicitly request them
                    await admin.clients.addOptionalClientScope({ 
                      id: createdClient.id, 
                      clientScopeId: matchingScope.id 
                    })
                  }
                  // Auto-provision SMART protocol mappers if needed
                  if (SMART_SCOPE_MAPPERS[scopeName]) {
                    await ensureScopeMappers(admin, matchingScope.id, scopeName)
                  }
                  logger.admin.debug('Assigned scope to client', { clientId, scopeName })
                } catch (scopeError) {
                  logger.admin.warn('Failed to assign scope to client', { clientId, scopeName, error: scopeError })
                }
              } else {
                // Scope doesn't exist in Keycloak - log but continue
                // SMART FHIR scopes like patient/*.read may need custom scope creation
                logger.admin.debug('Scope not found in Keycloak, skipping', { clientId, scopeName })
              }
            }
          }
        } catch (scopeError) {
          logger.admin.warn('Failed to configure client scopes', { clientId, error: scopeError })
        }
      }

      // Send notification if configured
      if (settings.notificationEmail) {
        logger.admin.info('New client registration requires notification', {
          clientId,
          clientName: body.client_name,
          notificationEmail: settings.notificationEmail,
          requiresApproval: settings.adminApprovalRequired
        })
        // TODO: Implement email notification
      }

      // Build RFC 7591 compliant response
      const response: ClientRegistrationResponse = {
        client_id: clientId,
        client_secret: clientSecret,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: clientSecret ? 0 : undefined, // 0 means never expires
        redirect_uris: body.redirect_uris,
        grant_types: isBackendService 
          ? ['authorization_code', 'client_credentials', 'refresh_token']
          : ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_name: body.client_name,
        client_uri: body.client_uri,
        logo_uri: body.logo_uri,
        scope: body.scope || settings.allowedScopes.filter(scope => 
          ['openid', 'profile', 'fhirUser', 'launch', 'patient/*.read', 'user/*.read'].includes(scope)
        ).join(' '), // Default to safe scopes
        contacts: body.contacts,
        tos_uri: body.tos_uri,
        policy_uri: body.policy_uri,
        jwks_uri: body.jwks_uri,
        jwks: body.jwks,
        token_endpoint_auth_method: isConfidential
          ? (body.jwks_uri || body.jwks ? 'private_key_jwt' : 'client_secret_basic')
          : 'none',
        fhir_versions: body.fhir_versions,
        launch_uris: body.launch_uris
      }

      const logMessage = settings.adminApprovalRequired 
        ? 'Client registered but requires admin approval' 
        : 'Client registered and activated'
        
      logger.admin.info(logMessage, { 
        clientId, 
        isConfidential: isConfidential,
        isBackendService,
        requiresApproval: settings.adminApprovalRequired 
      })

      // Refresh CORS origins cache (new client has webOrigins)
      refreshCorsOrigins().catch(() => {})
      
      return response

    } catch (error) {
      logger.admin.error('Client registration failed', { error })
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Failed to register client'
      }
    }
  }, {
    body: ClientRegistrationRequest,
    response: {
      200: ClientRegistrationResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Dynamic Client Registration',
      description: 'Register a new OAuth2 client dynamically according to RFC 7591. This is a public endpoint that does not require authentication.',
      tags: ['authentication']
    }
  })
