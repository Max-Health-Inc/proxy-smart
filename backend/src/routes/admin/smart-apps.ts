import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { 
  SuccessResponse,
  CommonErrorResponses,
  SmartApp, 
  CreateSmartAppRequest,
  UpdateSmartAppRequest,
  ClientIdParam,
  type SmartAppType,
  type SuccessResponseType,
  type ErrorResponseType
} from '@/schemas'
import { logger } from '@/lib/logger'
import { handleAdminError } from '@/lib/admin-error-handler'
import { extractBearerToken } from '@/lib/admin-utils'
import { ensureScopeMappers, SMART_SCOPE_MAPPERS } from '@/lib/smart-scope-mappers'
import { refreshCorsOrigins } from '@/lib/cors-origins'
import { toKeycloakAuthType } from '@/lib/auth-method-mapping'
import { enrichClient, ensureScopesExist, replaceClientScopes } from '@/lib/smart-client-enrichment'
import * as crypto from 'crypto'
import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation'

/**
 * Register JWKS for a Backend Services client in Keycloak.
 * Accepts either an inline JWKS JSON string or a PEM public key (which gets converted to JWK).
 */
async function registerJwksForClient(
  admin: KcAdminClient,
  clientInternalId: string,
  options: { jwksString?: string; publicKeyPem?: string; signingAlg?: string }
): Promise<void> {
  const alg = options.signingAlg || 'RS384'
  let jwksJson: string

  if (options.jwksString) {
    // Use inline JWKS directly
    jwksJson = options.jwksString
  } else if (options.publicKeyPem) {
    // Convert PEM → JWK using Node crypto
    const keyObject = crypto.createPublicKey(options.publicKeyPem)
    const jwk = keyObject.export({ format: 'jwk' }) as Record<string, unknown>
    jwksJson = JSON.stringify({
      keys: [{ ...jwk, use: 'sig', alg, kid: crypto.randomUUID() }]
    })
  } else {
    throw new Error('Either jwksString or publicKeyPem must be provided')
  }

  logger.admin.debug('Registering JWKS for client', { clientInternalId, alg })

  await admin.clients.update({ id: clientInternalId }, {
    clientAuthenticatorType: 'client-secret',
    attributes: {
      'use.jwks.string': 'true',
      'jwks.string': jwksJson,
      'token.endpoint.auth.signing.alg': alg,
    }
  })

  logger.admin.debug('JWKS registered for client', { clientInternalId })
}

/**
 * SMART App (Client) Management - specialized for healthcare applications
 * 
 * All routes now use the user's access token to perform operations,
 * acting as a secure proxy for Keycloak admin operations.
 */
export const smartAppsRoutes = new Elysia({ prefix: '/smart-apps', tags: ['smart-apps'] })
  .use(keycloakPlugin)

  .get('/', async ({ getAdmin, headers, set }): Promise<SmartAppType[] | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      let clients = await admin.clients.find()

      // Keycloak built-in / internal clients that should never appear in the SMART app list
      const INTERNAL_CLIENTS = new Set([
        'account',
        'account-console',
        'admin-cli',
        'broker',
        'realm-management',
        'security-admin-console',
        'admin-ui',
      ])

      // Include any openid-connect client that isn't a Keycloak internal client
      // and isn't bearer-only (which are service-level tokens, not SMART apps)
      clients = clients.filter(client =>
        client.protocol === 'openid-connect' &&
        !client.bearerOnly &&
        !INTERNAL_CLIENTS.has(client.clientId ?? '')
      )

      // Enrich clients with actual scope information
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          try {
            return await enrichClient(admin, client)
          } catch (error) {
            logger.admin.warn('Failed to enrich client with scope details', { clientId: client.clientId, error })
            return client
          }
        })
      )
      return enrichedClients;
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    response: {
      200: t.Array(SmartApp),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List SMART on FHIR Applications',
      description: 'Get all registered SMART on FHIR applications',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .post('/', async ({ getAdmin, body, headers, set }): Promise<SmartAppType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)

      // Map UI appType to backend clientType if appType is provided
      let effectiveClientType = body.clientType
      if (body.appType) {
        if (body.appType === 'agent' || body.appType === 'backend-service') {
          effectiveClientType = 'backend-service'
        } else if (body.appType === 'standalone-app' || body.appType === 'ehr-launch') {
          effectiveClientType = body.publicClient ? 'public' : 'confidential'
        }
      }

      // Determine client configuration based on type
      const isBackendService = effectiveClientType === 'backend-service'
      const isPublicClient = body.publicClient || effectiveClientType === 'public'

      // Determine Keycloak clientAuthenticatorType from standard OAuth method or heuristics
      let clientAuthenticatorType: string
      
      if (body.tokenEndpointAuthMethod) {
        // Explicit OAuth method provided — map to Keycloak internal type
        clientAuthenticatorType = toKeycloakAuthType(body.tokenEndpointAuthMethod, isBackendService)
      } else if (isBackendService) {
        // Backend services: proxy validates JWT assertions itself, then authenticates
        // to Keycloak using client_secret internally.
        clientAuthenticatorType = 'client-secret'
      } else if (isPublicClient) {
        clientAuthenticatorType = 'none'
      } else {
        // Confidential client - determine based on whether JWKS/publicKey is provided
        if (body.jwksUri || body.publicKey) {
          clientAuthenticatorType = 'client-jwt'
        } else {
          clientAuthenticatorType = 'client-secret'
        }
      }

      // Validate Backend Services requirements
      if (isBackendService) {
        if (!body.publicKey && !body.jwksUri && !body.jwksString) {
          set.status = 400
          return { error: 'Backend Services clients require publicKey, jwksUri, or jwksString for JWT authentication' }
        }
      }

      const smartAppConfig = {
        clientId: body.clientId,
        name: body.name,
        ...(body.description && { description: body.description }),
        enabled: true,
        protocol: 'openid-connect',
        publicClient: isPublicClient,
        redirectUris: body.redirectUris || [],
        webOrigins: body.webOrigins || [],
        attributes: {
          'smart_app': 'true',
          ...(body.smartVersion && { 'smart_version': body.smartVersion }),
          ...(body.fhirVersion && { 'fhir_version': body.fhirVersion }),
          // Store the original UI appType as client_type attribute
          ...(body.appType && { 'client_type': body.appType }),
          // If no appType, fallback to clientType
          ...(!body.appType && isBackendService && { 'client_type': 'backend-service' }),
          
          // Store JWKS info for JWT authentication (proxy-side validation for backend
          // services, or Keycloak-side validation for confidential JWT clients)
          ...(body.jwksUri && (isBackendService || clientAuthenticatorType === 'client-jwt') && {
            'use.jwks.url': 'true',
            'jwks.url': body.jwksUri
          }),
          // Inline JWKS string (alternative to jwksUri)
          ...(body.jwksString && !body.jwksUri && (isBackendService || clientAuthenticatorType === 'client-jwt') && {
            'use.jwks.string': 'true',
            'jwks.string': body.jwksString
          }),
          
          // Metadata fields
          ...(body.launchUrl && { 'launch_url': body.launchUrl }),
          ...(body.logoUri && { 'logo_uri': body.logoUri }),
          ...(body.tosUri && { 'tos_uri': body.tosUri }),
          ...(body.policyUri && { 'policy_uri': body.policyUri }),
          ...(body.contacts && body.contacts.length > 0 && { 'contacts': body.contacts.join(',') }),
          
          // Server access control
          ...(body.serverAccessType && { 'server_access_type': body.serverAccessType }),
          ...(body.allowedServerIds && body.allowedServerIds.length > 0 && { 
            'allowed_server_ids': body.allowedServerIds.join(',') 
          }),
          
          // Organization assignment
          ...(body.organizationIds && body.organizationIds.length > 0 && {
            'organization_ids': body.organizationIds.join(',')
          }),
          
          // Scope set reference
          ...(body.scopeSetId && { 'scope_set_id': body.scopeSetId }),
          
          // PKCE configuration
          ...(body.requirePkce && { 'pkce.code.challenge.method': 'S256' }),
          
          // Token exchange (RFC 8693) — Keycloak 26+ standard token exchange V2
          ...(body.tokenExchangeEnabled !== undefined && { 'standard.token.exchange.enabled': String(body.tokenExchangeEnabled) }),
          
          // Custom access token lifespan (overrides realm default)
          ...(body.accessTokenLifespan && { 'access.token.lifespan': String(body.accessTokenLifespan) }),

          // User type & role restrictions
          ...(body.allowedFhirUserTypes && body.allowedFhirUserTypes.length > 0 && {
            'allowed_fhir_user_types': body.allowedFhirUserTypes.join(',')
          }),
          ...(body.requiredRoles && body.requiredRoles.length > 0 && {
            'required_roles': body.requiredRoles.join(',')
          }),

          // Session timeout overrides
          ...(body.clientSessionIdleTimeout !== undefined && { 'client.session.idle.timeout': String(body.clientSessionIdleTimeout) }),
          ...(body.clientSessionMaxLifespan !== undefined && { 'client.session.max.lifespan': String(body.clientSessionMaxLifespan) }),
          
          // Logout settings
          ...(body.backchannelLogoutUrl && { 'backchannel.logout.url': body.backchannelLogoutUrl }),
          ...(body.frontChannelLogoutUrl && { 'frontchannel.logout.url': body.frontChannelLogoutUrl }),

          // Keycloak 25+ requires explicit post-logout redirect URI config
          'post.logout.redirect.uris': '+',
        },
        // Configure client authentication method
        clientAuthenticatorType,

        // Consent & scope settings
        ...(body.consentRequired !== undefined && { consentRequired: body.consentRequired }),
        ...(body.fullScopeAllowed !== undefined && { fullScopeAllowed: body.fullScopeAllowed }),
        
        // Front-channel logout top-level flag
        ...(body.frontChannelLogoutUrl && { frontchannelLogout: true }),

        // Configure OAuth2 settings for Backend Services
        // Pass explicit client secret when provided (confidential clients only)
        ...(body.secret && clientAuthenticatorType === 'client-secret' && { secret: body.secret }),

        standardFlowEnabled: !isBackendService, // Authorization code flow
        implicitFlowEnabled: false, // Not recommended for SMART
        directAccessGrantsEnabled: false, // Not used in SMART
        serviceAccountsEnabled: isBackendService, // Enable for client_credentials

        // Configure scopes - handle both built-in and custom scopes
        defaultClientScopes: [],  // We'll populate this after creation
        optionalClientScopes: []  // We'll populate this after creation
      }

      // Create the client
      logger.admin.debug('Creating client with config', { clientId: smartAppConfig.clientId })
      const createdClient = await admin.clients.create(smartAppConfig)

      // Keycloak returns just the ID, so we need to fetch the full client details
      const fullClient = await admin.clients.findOne({ id: createdClient.id })
      if (!fullClient) {
        throw new Error('Client created but could not retrieve details')
      }

      logger.admin.debug('Client created, details:', {
        clientId: fullClient.clientId,
        clientAuthenticatorType: fullClient.clientAuthenticatorType,
        serviceAccountsEnabled: fullClient.serviceAccountsEnabled,
        standardFlowEnabled: fullClient.standardFlowEnabled
      })

      // Assign scopes to the client
      try {
        const defaultScopesToAssign = body.defaultClientScopes || (isBackendService
          ? ['openid', 'profile'] // Keep it simple for Backend Services
          : ['openid', 'profile', 'email'])

        const optionalScopesToAssign = body.optionalClientScopes || []

        // Get all available client scopes to find matching ones by name
        let allClientScopes = await admin.clientScopes.find()

        // Auto-create any missing SMART scopes (e.g. user/Claim.cud)
        const allRequestedScopes = [...defaultScopesToAssign, ...optionalScopesToAssign]
        allClientScopes = await ensureScopesExist(admin, allRequestedScopes, allClientScopes)

        // Find scope IDs for default scopes
        const defaultScopeIds = defaultScopesToAssign
          .map((scopeName: string) => allClientScopes.find(scope => scope.name === scopeName)?.id)
          .filter(Boolean) as string[]

        // Find scope IDs for optional scopes  
        const optionalScopeIds = optionalScopesToAssign
          .map((scopeName: string) => allClientScopes.find(scope => scope.name === scopeName)?.id)
          .filter(Boolean) as string[]

        // Assign default scopes to client
        for (const scopeId of defaultScopeIds) {
          try {
            await admin.clients.addDefaultClientScope({ id: fullClient.id!, clientScopeId: scopeId })
          } catch (error) {
            logger.admin.warn('Failed to assign default scope to client', { clientId: fullClient.clientId, scopeId, error })
          }
        }

        // Assign optional scopes to client
        for (const scopeId of optionalScopeIds) {
          try {
            await admin.clients.addOptionalClientScope({ id: fullClient.id!, clientScopeId: scopeId })
          } catch (error) {
            logger.admin.warn('Failed to assign optional scope to client', { clientId: fullClient.clientId, scopeId, error })
          }
        }

        // Auto-provision SMART protocol mappers on scopes that need them
        const allScopeNames = [...defaultScopesToAssign, ...optionalScopesToAssign]
        for (const scopeName of allScopeNames) {
          if (SMART_SCOPE_MAPPERS[scopeName]) {
            const scope = allClientScopes.find(s => s.name === scopeName)
            if (scope?.id) {
              await ensureScopeMappers(admin, scope.id, scopeName)
            }
          }
        }

        logger.admin.debug('Scopes assigned to client', {
          clientId: fullClient.clientId,
          defaultScopes: defaultScopesToAssign,
          optionalScopes: optionalScopesToAssign,
          assignedDefaultScopeIds: defaultScopeIds,
          assignedOptionalScopeIds: optionalScopeIds
        })
      } catch (error) {
        logger.admin.warn('Failed to assign scopes to client', { clientId: fullClient.clientId, error })
      }

      // Handle offline access (refresh tokens)
      if (body.allowOfflineAccess) {
        try {
          const allClientScopes = await admin.clientScopes.find()
          const offlineScope = allClientScopes.find(s => s.name === 'offline_access')
          if (offlineScope && fullClient.id) {
            await admin.clients.addOptionalClientScope({
              id: fullClient.id,
              clientScopeId: offlineScope.id!
            })
            logger.admin.debug('Offline access enabled for client', { clientId: fullClient.clientId })
          }
        } catch (error) {
          logger.admin.warn('Failed to enable offline access', { clientId: fullClient.clientId, error })
        }
      }

      // Add audience mappers (oidc-audience-mapper) to the client
      if (body.audienceClients && body.audienceClients.length > 0 && fullClient.id) {
        for (const targetClientId of body.audienceClients) {
          try {
            await admin.clients.addProtocolMapper({ id: fullClient.id }, {
              name: `audience-${targetClientId}`,
              protocol: 'openid-connect',
              protocolMapper: 'oidc-audience-mapper',
              config: {
                'included.client.audience': targetClientId,
                'id.token.claim': 'false',
                'access.token.claim': 'true',
                'userinfo.token.claim': 'false'
              }
            })
            logger.admin.debug('Audience mapper added', { clientId: fullClient.clientId, targetClientId })
          } catch (error) {
            logger.admin.warn('Failed to add audience mapper', { clientId: fullClient.clientId, targetClientId, error })
          }
        }
      }

      // Re-fetch client details to get updated scope assignments
      const clientAfterScopeAssignment = await admin.clients.findOne({ id: createdClient.id })
      const finalClientForResponse = clientAfterScopeAssignment || fullClient

      // Sync required roles as Keycloak client roles
      if (body.requiredRoles && body.requiredRoles.length > 0 && createdClient.id) {
        for (const roleName of body.requiredRoles) {
          try {
            await admin.clients.createRole({ id: createdClient.id, name: roleName, description: `Required role for ${body.clientId}` })
            logger.admin.debug('Created client role on new app', { clientId: body.clientId, role: roleName })
          } catch (error) {
            logger.admin.warn('Failed to create client role', { clientId: body.clientId, role: roleName, error })
          }
        }
      }

      // Register JWKS for Backend Services clients (sets signing alg attribute
      // and ensures clientAuthenticatorType stays 'client-secret')
      if (isBackendService && (body.publicKey || body.jwksString || body.jwksUri) && createdClient.id) {
        try {
          if (body.publicKey || body.jwksString) {
            await registerJwksForClient(admin, createdClient.id, {
              publicKeyPem: body.publicKey,
              jwksString: body.jwksString,
            })
          }
          // jwksUri is already stored in attributes during creation — just ensure
          // the signing alg attribute is set for consistency
          if (body.jwksUri && !body.publicKey && !body.jwksString) {
            await admin.clients.update({ id: createdClient.id }, {
              clientAuthenticatorType: 'client-secret',
              attributes: {
                'token.endpoint.auth.signing.alg': 'RS384',
              }
            })
          }

          // Re-fetch client details after key registration
          const updatedClient = await admin.clients.findOne({ id: createdClient.id })
          const finalResponse = updatedClient || finalClientForResponse

          // Refresh CORS origins cache (new app may have webOrigins)
          refreshCorsOrigins().catch(() => {})

          return finalResponse
        } catch (keyError) {
          // Clean up created client if key registration fails
          await admin.clients.del({ id: createdClient.id })
          return handleAdminError(keyError, set)
        }
      }

      // Refresh CORS origins cache (new app may have webOrigins)
      refreshCorsOrigins().catch(() => {})

      return finalClientForResponse
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: CreateSmartAppRequest,
    response: {
      200: SmartApp,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Create SMART on FHIR Application',
      description: 'Create a new SMART on FHIR application',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .get('/:clientId', async ({ getAdmin, params, headers, set }): Promise<SmartAppType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }

      // Enrich the client with actual scope information
      let enrichedClient: SmartAppType | ClientRepresentation = clients[0]
      try {
        enrichedClient = await enrichClient(admin, clients[0])
      } catch (error) {
        logger.admin.warn('Failed to enrich individual client with scope details', { clientId: clients[0].clientId, error })
      }

      return enrichedClient
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    response: {
      200: SmartApp,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get SMART on FHIR Application',
      description: 'Get a single SMART on FHIR application by clientId',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .put('/:clientId', async ({ getAdmin, params, body, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }

      // Build update data with existing values as fallbacks — Keycloak PUT expects
      // a complete representation; sending undefined fields can cause silent failures
      const existing = clients[0]

      // Map UI appType → effectiveClientType (same logic as create handler)
      let effectiveClientType = body.clientType
      if (body.appType && !effectiveClientType) {
        if (body.appType === 'agent' || body.appType === 'backend-service') {
          effectiveClientType = 'backend-service'
        } else if (body.appType === 'standalone-app' || body.appType === 'ehr-launch') {
          effectiveClientType = existing.publicClient ? 'public' : 'confidential'
        }
      }

      const updateData = {
        clientId: existing.clientId,
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        enabled: body.enabled ?? existing.enabled,
        publicClient: existing.publicClient,
        standardFlowEnabled: existing.standardFlowEnabled,
        serviceAccountsEnabled: existing.serviceAccountsEnabled,
        directAccessGrantsEnabled: existing.directAccessGrantsEnabled,
        implicitFlowEnabled: existing.implicitFlowEnabled,
        // Update client secret when provided (confidential clients only)
        ...(body.secret && !existing.publicClient && { secret: body.secret }),
        redirectUris: body.redirectUris ?? existing.redirectUris,
        webOrigins: body.webOrigins ?? existing.webOrigins,
        attributes: {
          ...existing.attributes,
          // Store appType as client_type attribute
          ...(body.appType && { 'client_type': body.appType }),
          // Keycloak 25+ requires explicit post-logout redirect URI config
          'post.logout.redirect.uris': existing.attributes?.['post.logout.redirect.uris'] || '+',
          smart_version: body.smartVersion ? [body.smartVersion] : existing.attributes?.smart_version,
          fhir_version: body.fhirVersion ? [body.fhirVersion] : existing.attributes?.fhir_version,
          // Server access control
          ...(body.serverAccessType !== undefined && { 'server_access_type': body.serverAccessType }),
          ...(body.allowedServerIds !== undefined && {
            'allowed_server_ids': body.allowedServerIds.length > 0 ? body.allowedServerIds.join(',') : ''
          }),
          // Organization assignment
          ...(body.organizationIds !== undefined && {
            'organization_ids': body.organizationIds.length > 0 ? body.organizationIds.join(',') : ''
          }),
          // Token exchange (RFC 8693) — Keycloak 26+ standard token exchange V2
          ...(body.tokenExchangeEnabled !== undefined && { 'standard.token.exchange.enabled': String(body.tokenExchangeEnabled) }),
          // Custom access token lifespan (overrides realm default)
          ...(body.accessTokenLifespan !== undefined && { 'access.token.lifespan': String(body.accessTokenLifespan) }),
          // User type & role restrictions
          ...(body.allowedFhirUserTypes !== undefined && {
            'allowed_fhir_user_types': body.allowedFhirUserTypes.length > 0 ? body.allowedFhirUserTypes.join(',') : ''
          }),
          ...(body.requiredRoles !== undefined && {
            'required_roles': body.requiredRoles.length > 0 ? body.requiredRoles.join(',') : ''
          }),
          // Session timeout overrides
          ...(body.clientSessionIdleTimeout !== undefined && { 'client.session.idle.timeout': String(body.clientSessionIdleTimeout) }),
          ...(body.clientSessionMaxLifespan !== undefined && { 'client.session.max.lifespan': String(body.clientSessionMaxLifespan) }),
          // Logout settings
          ...(body.backchannelLogoutUrl !== undefined && { 'backchannel.logout.url': body.backchannelLogoutUrl || '' }),
          ...(body.frontChannelLogoutUrl !== undefined && { 'frontchannel.logout.url': body.frontChannelLogoutUrl || '' }),
        },
        // Consent & scope settings (top-level Keycloak properties)
        ...(body.consentRequired !== undefined && { consentRequired: body.consentRequired }),
        ...(body.fullScopeAllowed !== undefined && { fullScopeAllowed: body.fullScopeAllowed }),
        // Front-channel logout top-level flag
        ...(body.frontChannelLogoutUrl !== undefined && { frontchannelLogout: !!body.frontChannelLogoutUrl }),
        // Client type changes affect serviceAccountsEnabled + standardFlowEnabled + publicClient
        ...(effectiveClientType !== undefined && {
          publicClient: effectiveClientType === 'public',
          serviceAccountsEnabled: effectiveClientType === 'backend-service',
          standardFlowEnabled: effectiveClientType !== 'backend-service',
        }),
        // Token endpoint auth method → Keycloak clientAuthenticatorType
        ...(body.tokenEndpointAuthMethod !== undefined && {
          clientAuthenticatorType: toKeycloakAuthType(
            body.tokenEndpointAuthMethod,
            effectiveClientType === 'backend-service' || !!existing.serviceAccountsEnabled
          ),
        }),
      }
      await admin.clients.update({ id: existing.id! }, updateData)

      // Sync required roles as Keycloak client roles
      if (body.requiredRoles !== undefined) {
        try {
          const existingRoles = await admin.clients.listRoles({ id: existing.id! })
          const existingNames = new Set(existingRoles.map((r) => r.name))
          const desiredNames = new Set(body.requiredRoles)

          // Create missing roles
          for (const roleName of desiredNames) {
            if (!existingNames.has(roleName)) {
              await admin.clients.createRole({ id: existing.id!, name: roleName, description: `Required role for ${params.clientId}` })
              logger.admin.debug('Created client role', { clientId: params.clientId, role: roleName })
            }
          }
          // Delete roles no longer required
          for (const role of existingRoles) {
            if (role.name && !desiredNames.has(role.name)) {
              await admin.clients.delRole({ id: existing.id!, roleName: role.name })
              logger.admin.debug('Deleted client role', { clientId: params.clientId, role: role.name })
            }
          }
        } catch (error) {
          logger.admin.warn('Failed to sync client roles', { clientId: params.clientId, error })
        }
      }

      // Handle audience mapper updates if provided
      if (body.audienceClients !== undefined) {
        try {
          // Remove existing audience mappers
          const existingMappers = await admin.clients.listProtocolMappers({ id: existing.id! })
          const audienceMappers = existingMappers.filter((m) => m.protocolMapper === 'oidc-audience-mapper')
          for (const mapper of audienceMappers) {
            if (mapper.id) {
              await admin.clients.delProtocolMapper({ id: existing.id!, mapperId: mapper.id })
            }
          }
          // Add new audience mappers
          for (const targetClientId of body.audienceClients) {
            await admin.clients.addProtocolMapper({ id: existing.id! }, {
              name: `audience-${targetClientId}`,
              protocol: 'openid-connect',
              protocolMapper: 'oidc-audience-mapper',
              config: {
                'included.client.audience': targetClientId,
                'id.token.claim': 'false',
                'access.token.claim': 'true',
                'userinfo.token.claim': 'false'
              }
            })
          }
          logger.admin.debug('Audience mappers updated', { clientId: params.clientId, audienceClients: body.audienceClients })
        } catch (error) {
          logger.admin.warn('Failed to update audience mappers', { clientId: params.clientId, error })
        }
      }

      // Handle scope updates if provided
      if (body.defaultClientScopes || body.optionalClientScopes) {
        try {
          // Get all available client scopes to find matching ones by name
          let allClientScopes = await admin.clientScopes.find()

          // Auto-create any missing SMART scopes (resource-level AND launch-level)
          const allRequestedScopes = [...(body.defaultClientScopes || []), ...(body.optionalClientScopes || [])]
          allClientScopes = await ensureScopesExist(admin, allRequestedScopes, allClientScopes)

          // Replace scopes using proper scope IDs from the list sub-resources
          await replaceClientScopes(
            admin,
            existing.id!,
            existing.clientId!,
            allClientScopes,
            body.defaultClientScopes,
            body.optionalClientScopes,
          )

          // Auto-provision SMART protocol mappers on updated scopes
          const updatedScopeNames = [...(body.defaultClientScopes || []), ...(body.optionalClientScopes || [])]
          for (const scopeName of updatedScopeNames) {
            if (SMART_SCOPE_MAPPERS[scopeName]) {
              const scope = allClientScopes.find(s => s.name === scopeName)
              if (scope?.id) {
                await ensureScopeMappers(admin, scope.id, scopeName)
              }
            }
          }

          logger.admin.debug('Scopes updated for client', {
            clientId: existing.clientId,
            defaultScopes: body.defaultClientScopes,
            optionalScopes: body.optionalClientScopes
          })
        } catch (error) {
          logger.admin.warn('Failed to update scopes for client', { clientId: existing.clientId, error })
        }
      }

      // Handle JWKS update (stores JWKS for proxy-side JWT validation)
      if (body.jwksString || body.publicKey || body.jwksUri) {
        try {
          await registerJwksForClient(admin, existing.id!, {
            jwksString: body.jwksString,
            publicKeyPem: body.publicKey,
          })
          logger.admin.debug('JWKS updated for client', { clientId: params.clientId })
        } catch (error) {
          logger.admin.warn('Failed to update JWKS for client', { clientId: params.clientId, error })
        }
      }

      // Refresh CORS origins cache (webOrigins may have changed)
      refreshCorsOrigins().catch(() => {})

      return { success: true, message: 'SMART application updated successfully' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    body: UpdateSmartAppRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update SMART on FHIR Application',
      description: 'Update an existing SMART on FHIR application',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .delete('/:clientId', async ({ getAdmin, params, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      // Prevent deleting the AI Assistant Agent - it's a system application
      if (params.clientId === 'ai-assistant-agent') {
        set.status = 403
        return { error: 'Cannot delete AI Assistant Agent - it is a protected system application' }
      }

      const admin = await getAdmin(token)
      const clients = await admin.clients.find({ clientId: params.clientId })
      if (!clients[0]) {
        set.status = 404
        return { error: 'SMART application not found' }
      }
      await admin.clients.del({ id: clients[0].id! })

      // Refresh CORS origins cache (removed app's webOrigins should be cleared)
      refreshCorsOrigins().catch(() => {})

      return { success: true, message: 'SMART application deleted successfully' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete SMART on FHIR Application',
      description: 'Delete a SMART on FHIR application by clientId',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })
