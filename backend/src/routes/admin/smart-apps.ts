import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { 
  SuccessResponse,
  CommonErrorResponses,
  SmartApp, 
  CreateSmartAppRequest,
  UpdateSmartAppRequest,
  ClientIdParam,
  SmartAppType,
  SuccessResponseType,
  ErrorResponseType
} from '@/schemas'
import { logger } from '@/lib/logger'
import { handleAdminError } from '@/lib/admin-error-handler'
import { extractBearerToken } from '@/lib/admin-utils'
import { ensureScopeMappers, SMART_SCOPE_MAPPERS } from '@/lib/smart-scope-mappers'
import * as crypto from 'crypto'
import type KcAdminClient from '@keycloak/keycloak-admin-client'

/** Safely read a Keycloak client attribute (handles both string and string[] formats) */
function getAttr(attrs: Record<string, any> | undefined, key: string): string | undefined {
  const val = attrs?.[key]
  if (Array.isArray(val)) return val[0]
  return typeof val === 'string' ? val : undefined
}

/** Valid literal values for schema-validated enums */
const VALID_APP_TYPES = new Set(['standalone-app', 'ehr-launch', 'backend-service', 'agent'])
const VALID_SERVER_ACCESS_TYPES = new Set(['all-servers', 'selected-servers', 'user-person-servers'])
const VALID_MCP_ACCESS_TYPES = new Set(['none', 'all-mcp-servers', 'selected-mcp-servers'])

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
    clientAuthenticatorType: 'client-jwt',
    attributes: {
      'use.jwks.string': 'true',
      'jwks.string': jwksJson,
      'token.endpoint.auth.signing.alg': alg
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
            // Fetch the full client details to ensure we have scope IDs
            const fullClient = await admin.clients.findOne({ id: client.id! })
            if (!fullClient) return client

            // Fetch default client scopes details
            let defaultScopeNames: string[] = []
            if (fullClient.defaultClientScopes && fullClient.defaultClientScopes.length > 0) {
              try {
                const defaultScopeDetails = await Promise.all(
                  fullClient.defaultClientScopes.map(async (scopeId) => {
                    try {
                      const scope = await admin.clientScopes.findOne({ id: scopeId })
                      return scope?.name || scopeId
                    } catch (error) {
                      logger.admin.warn('Failed to fetch default client scope', { scopeId, error })
                      return scopeId // fallback to ID if name fetch fails
                    }
                  })
                )
                defaultScopeNames = defaultScopeDetails.filter(Boolean)
              } catch (error) {
                logger.admin.warn('Failed to fetch default client scopes', { clientId: client.clientId, error })
              }
            }

            // Fetch optional client scopes details
            let optionalScopeNames: string[] = []
            if (fullClient.optionalClientScopes && fullClient.optionalClientScopes.length > 0) {
              try {
                const optionalScopeDetails = await Promise.all(
                  fullClient.optionalClientScopes.map(async (scopeId) => {
                    try {
                      const scope = await admin.clientScopes.findOne({ id: scopeId })
                      return scope?.name || scopeId
                    } catch (error) {
                      logger.admin.warn('Failed to fetch optional client scope', { scopeId, error })
                      return scopeId // fallback to ID if name fetch fails
                    }
                  })
                )
                optionalScopeNames = optionalScopeDetails.filter(Boolean)
              } catch (error) {
                logger.admin.warn('Failed to fetch optional client scopes', { clientId: client.clientId, error })
              }
            }

            // Extract appType from client_type attribute
            const clientType = fullClient.attributes?.['client_type']
            const appType = Array.isArray(clientType) ? clientType[0] : clientType

            // Check if offline_access is in optional scopes
            const hasOfflineAccess = optionalScopeNames.includes('offline_access')

            // Return enriched client with scope names instead of IDs and appType
            return {
              ...fullClient,
              defaultClientScopes: defaultScopeNames,
              optionalClientScopes: optionalScopeNames,
              appType: (VALID_APP_TYPES.has(appType!) ? appType : undefined) || (fullClient.serviceAccountsEnabled ? 'backend-service' : 'standalone-app'),
              clientType: (fullClient.serviceAccountsEnabled ? 'backend-service' : (fullClient.publicClient ? 'public' : 'confidential')) as 'backend-service' | 'public' | 'confidential',
              
              // Client secret (only included for confidential clients with client-secret auth)
              ...(fullClient.secret && { secret: fullClient.secret }),
              
              // Extract metadata fields from attributes
              launchUrl: getAttr(fullClient.attributes, 'launch_url'),
              logoUri: getAttr(fullClient.attributes, 'logo_uri'),
              tosUri: getAttr(fullClient.attributes, 'tos_uri'),
              policyUri: getAttr(fullClient.attributes, 'policy_uri'),
              contacts: getAttr(fullClient.attributes, 'contacts')?.split(',').filter(Boolean),
              
              // Server access control
              serverAccessType: (VALID_SERVER_ACCESS_TYPES.has(getAttr(fullClient.attributes, 'server_access_type')!) ? getAttr(fullClient.attributes, 'server_access_type') : undefined) as 'all-servers' | 'selected-servers' | 'user-person-servers' | undefined,
              allowedServerIds: getAttr(fullClient.attributes, 'allowed_server_ids')?.split(',').filter(Boolean),
              
              // MCP server access control
              mcpAccessType: (VALID_MCP_ACCESS_TYPES.has(getAttr(fullClient.attributes, 'mcp_access_type')!) ? getAttr(fullClient.attributes, 'mcp_access_type') : 'none') as 'none' | 'all-mcp-servers' | 'selected-mcp-servers',
              allowedMcpServerNames: getAttr(fullClient.attributes, 'allowed_mcp_server_names')?.split(',').filter(Boolean) || [],
              
              // Skills access control
              allowedSkillNames: getAttr(fullClient.attributes, 'allowed_skill_names')?.split(',').filter(Boolean) || [],
              
              // Organization assignment
              organizationIds: getAttr(fullClient.attributes, 'organization_ids')?.split(',').filter(Boolean) || [],
              
              // Scope set reference
              scopeSetId: getAttr(fullClient.attributes, 'scope_set_id'),
              
              // PKCE and offline access
              requirePkce: getAttr(fullClient.attributes, 'pkce.code.challenge.method')?.includes('S256'),
              allowOfflineAccess: hasOfflineAccess
            } as SmartAppType
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

      // Determine authentication method
      let clientAuthenticatorType = 'none'
      
      if (isBackendService) {
        // Backend services always use JWT authentication
        clientAuthenticatorType = 'client-jwt'
      } else if (!isPublicClient) {
        // Confidential client - determine based on whether JWKS/publicKey is provided
        if (body.jwksUri || body.publicKey) {
          clientAuthenticatorType = 'client-jwt'
        } else {
          // Default to client-secret for confidential clients without JWT config
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
          
          // Store JWKS info for JWT authentication (backend services or confidential JWT clients)
          ...(body.jwksUri && clientAuthenticatorType === 'client-jwt' && {
            'use.jwks.url': 'true',
            'jwks.url': body.jwksUri
          }),
          // Inline JWKS string (alternative to jwksUri)
          ...(body.jwksString && !body.jwksUri && clientAuthenticatorType === 'client-jwt' && {
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
          
          // MCP server access control
          ...(body.mcpAccessType && { 'mcp_access_type': body.mcpAccessType }),
          ...(body.allowedMcpServerNames && body.allowedMcpServerNames.length > 0 && {
            'allowed_mcp_server_names': body.allowedMcpServerNames.join(',')
          }),
          
          // Skills access control
          ...(body.allowedSkillNames && body.allowedSkillNames.length > 0 && {
            'allowed_skill_names': body.allowedSkillNames.join(',')
          }),
          
          // Organization assignment
          ...(body.organizationIds && body.organizationIds.length > 0 && {
            'organization_ids': body.organizationIds.join(',')
          }),
          
          // Scope set reference
          ...(body.scopeSetId && { 'scope_set_id': body.scopeSetId }),
          
          // PKCE configuration
          ...(body.requirePkce && { 'pkce.code.challenge.method': 'S256' }),

          // Keycloak 25+ requires explicit post-logout redirect URI config
          'post.logout.redirect.uris': '+',
        },
        // Configure client authentication method
        clientAuthenticatorType,

        // Configure OAuth2 settings for Backend Services
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
        const allClientScopes = await admin.clientScopes.find()

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

      // Re-fetch client details to get updated scope assignments
      const clientAfterScopeAssignment = await admin.clients.findOne({ id: createdClient.id })
      const finalClientForResponse = clientAfterScopeAssignment || fullClient

      // If Backend Services with public key (PEM), convert and register JWKS
      if (isBackendService && body.publicKey && !body.jwksString && !body.jwksUri && createdClient.id) {
        try {
          await registerJwksForClient(admin, createdClient.id, { publicKeyPem: body.publicKey })

          // Re-fetch client details after key registration
          const updatedClient = await admin.clients.findOne({ id: createdClient.id })
          const finalResponse = updatedClient || finalClientForResponse

          return finalResponse
        } catch (keyError) {
          // Clean up created client if key registration fails
          await admin.clients.del({ id: createdClient.id })
          set.status = 400
          return { error: 'Failed to register public key for Backend Services client', details: keyError }
        }
      }

      return finalClientForResponse
    } catch (error) {
      set.status = 400
      return { error: 'Failed to create SMART application', details: error }
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
      let enrichedClient = clients[0]
      try {
        // Fetch the full client details to ensure we have scope IDs
        const fullClient = await admin.clients.findOne({ id: clients[0].id! })
        if (fullClient) {
          // Fetch default client scopes details
          let defaultScopeNames: string[] = []
          if (fullClient.defaultClientScopes && fullClient.defaultClientScopes.length > 0) {
            try {
              const defaultScopeDetails = await Promise.all(
                fullClient.defaultClientScopes.map(async (scopeId) => {
                  try {
                    const scope = await admin.clientScopes.findOne({ id: scopeId })
                    return scope?.name || scopeId
                  } catch (error) {
                    logger.admin.warn('Failed to fetch default client scope', { scopeId, error })
                    return scopeId // fallback to ID if name fetch fails
                  }
                })
              )
              defaultScopeNames = defaultScopeDetails.filter(Boolean)
            } catch (error) {
              logger.admin.warn('Failed to fetch default client scopes', { clientId: clients[0].clientId, error })
            }
          }

          // Fetch optional client scopes details
          let optionalScopeNames: string[] = []
          if (fullClient.optionalClientScopes && fullClient.optionalClientScopes.length > 0) {
            try {
              const optionalScopeDetails = await Promise.all(
                fullClient.optionalClientScopes.map(async (scopeId) => {
                  try {
                    const scope = await admin.clientScopes.findOne({ id: scopeId })
                    return scope?.name || scopeId
                  } catch (error) {
                    logger.admin.warn('Failed to fetch optional client scope', { scopeId, error })
                    return scopeId // fallback to ID if name fetch fails
                  }
                })
              )
              optionalScopeNames = optionalScopeDetails.filter(Boolean)
            } catch (error) {
              logger.admin.warn('Failed to fetch optional client scopes', { clientId: clients[0].clientId, error })
            }
          }

          // Extract appType from client_type attribute
          const clientType = fullClient.attributes?.['client_type']
          const appType = Array.isArray(clientType) ? clientType[0] : clientType

          // Check if offline_access is in optional scopes
          const hasOfflineAccess = optionalScopeNames.includes('offline_access')

          // Use enriched client with scope names instead of IDs
          enrichedClient = {
            ...fullClient,
            defaultClientScopes: defaultScopeNames,
            optionalClientScopes: optionalScopeNames,
            appType: appType || (fullClient.serviceAccountsEnabled ? 'backend-service' : 'standalone-app'),
            clientType: (fullClient.serviceAccountsEnabled ? 'backend-service' : (fullClient.publicClient ? 'public' : 'confidential')) as 'backend-service' | 'public' | 'confidential',
            
            // Client secret (only included for confidential clients with client-secret auth)
            ...(fullClient.secret && { secret: fullClient.secret }),
            
            // Extract metadata fields from attributes
            launchUrl: getAttr(fullClient.attributes, 'launch_url'),
            logoUri: getAttr(fullClient.attributes, 'logo_uri'),
            tosUri: getAttr(fullClient.attributes, 'tos_uri'),
            policyUri: getAttr(fullClient.attributes, 'policy_uri'),
            contacts: getAttr(fullClient.attributes, 'contacts')?.split(',').filter(Boolean),
            
            // Server access control
            serverAccessType: getAttr(fullClient.attributes, 'server_access_type') as 'all-servers' | 'selected-servers' | 'user-person-servers' | undefined,
            allowedServerIds: getAttr(fullClient.attributes, 'allowed_server_ids')?.split(',').filter(Boolean),
            
            // MCP server access control
            mcpAccessType: (getAttr(fullClient.attributes, 'mcp_access_type') || 'none') as 'none' | 'all-mcp-servers' | 'selected-mcp-servers',
            allowedMcpServerNames: getAttr(fullClient.attributes, 'allowed_mcp_server_names')?.split(',').filter(Boolean) || [],
            
            // Skills access control
            allowedSkillNames: getAttr(fullClient.attributes, 'allowed_skill_names')?.split(',').filter(Boolean) || [],
            
            // Organization assignment
            organizationIds: getAttr(fullClient.attributes, 'organization_ids')?.split(',').filter(Boolean) || [],
            
            // Scope set reference
            scopeSetId: getAttr(fullClient.attributes, 'scope_set_id'),
            
            // PKCE and offline access
            requirePkce: getAttr(fullClient.attributes, 'pkce.code.challenge.method')?.includes('S256'),
            allowOfflineAccess: hasOfflineAccess
          } as SmartAppType
        }
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

      const updateData = {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        redirectUris: body.redirectUris,
        webOrigins: body.webOrigins,
        attributes: {
          ...clients[0].attributes,
          // Keycloak 25+ requires explicit post-logout redirect URI config
          'post.logout.redirect.uris': clients[0].attributes?.['post.logout.redirect.uris'] || '+',
          smart_version: body.smartVersion ? [body.smartVersion] : clients[0].attributes?.smart_version,
          fhir_version: body.fhirVersion ? [body.fhirVersion] : clients[0].attributes?.fhir_version,
          // MCP server access control
          ...(body.mcpAccessType !== undefined && { 'mcp_access_type': body.mcpAccessType }),
          ...(body.allowedMcpServerNames !== undefined && {
            'allowed_mcp_server_names': body.allowedMcpServerNames.length > 0 ? body.allowedMcpServerNames.join(',') : ''
          }),
          // Skills access control
          ...(body.allowedSkillNames !== undefined && {
            'allowed_skill_names': body.allowedSkillNames.length > 0 ? body.allowedSkillNames.join(',') : ''
          }),
          // Server access control
          ...(body.serverAccessType !== undefined && { 'server_access_type': body.serverAccessType }),
          ...(body.allowedServerIds !== undefined && {
            'allowed_server_ids': body.allowedServerIds.length > 0 ? body.allowedServerIds.join(',') : ''
          }),
          // Organization assignment
          ...(body.organizationIds !== undefined && {
            'organization_ids': body.organizationIds.length > 0 ? body.organizationIds.join(',') : ''
          }),
        }
      }
      await admin.clients.update({ id: clients[0].id! }, updateData)

      // Handle scope updates if provided
      if (body.defaultClientScopes || body.optionalClientScopes) {
        try {
          // Get all available client scopes to find matching ones by name
          const allClientScopes = await admin.clientScopes.find()

          if (body.defaultClientScopes) {
            // Remove all existing default client scopes
            const existingClient = await admin.clients.findOne({ id: clients[0].id! })
            if (existingClient?.defaultClientScopes) {
              for (const scopeId of existingClient.defaultClientScopes) {
                try {
                  await admin.clients.delDefaultClientScope({ id: clients[0].id!, clientScopeId: scopeId })
                } catch (error) {
                  logger.admin.warn('Failed to remove existing default scope', { clientId: clients[0].clientId, scopeId, error })
                }
              }
            }

            // Add new default scopes
            const defaultScopeIds = body.defaultClientScopes
              .map((scopeName: string) => allClientScopes.find(scope => scope.name === scopeName)?.id)
              .filter(Boolean) as string[]

            for (const scopeId of defaultScopeIds) {
              try {
                await admin.clients.addDefaultClientScope({ id: clients[0].id!, clientScopeId: scopeId })
              } catch (error) {
                logger.admin.warn('Failed to add new default scope', { clientId: clients[0].clientId, scopeId, error })
              }
            }
          }

          if (body.optionalClientScopes) {
            // Remove all existing optional client scopes
            const existingClient = await admin.clients.findOne({ id: clients[0].id! })
            if (existingClient?.optionalClientScopes) {
              for (const scopeId of existingClient.optionalClientScopes) {
                try {
                  await admin.clients.delOptionalClientScope({ id: clients[0].id!, clientScopeId: scopeId })
                } catch (error) {
                  logger.admin.warn('Failed to remove existing optional scope', { clientId: clients[0].clientId, scopeId, error })
                }
              }
            }

            // Add new optional scopes
            const optionalScopeIds = body.optionalClientScopes
              .map((scopeName: string) => allClientScopes.find(scope => scope.name === scopeName)?.id)
              .filter(Boolean) as string[]

            for (const scopeId of optionalScopeIds) {
              try {
                await admin.clients.addOptionalClientScope({ id: clients[0].id!, clientScopeId: scopeId })
              } catch (error) {
                logger.admin.warn('Failed to add new optional scope', { clientId: clients[0].clientId, scopeId, error })
              }
            }
          }

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
            clientId: clients[0].clientId,
            defaultScopes: body.defaultClientScopes,
            optionalScopes: body.optionalClientScopes
          })
        } catch (error) {
          logger.admin.warn('Failed to update scopes for client', { clientId: clients[0].clientId, error })
        }
      }

      return { success: true, message: 'SMART application updated successfully' }
    } catch (error) {
      set.status = 400
      return { error: 'Failed to update SMART application', details: error }
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
