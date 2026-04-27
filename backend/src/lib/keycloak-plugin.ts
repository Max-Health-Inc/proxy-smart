import { Elysia } from 'elysia'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { validateToken } from './auth'
import { logger } from './logger'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { config } from '../config'

/**
 * Plugin that adds Keycloak admin client decorator.
 *
 * Primary path: use the caller's Bearer token so Keycloak RBAC applies.
 * Fallback path: when the user token is structurally valid (JWT sig + claims)
 * but Keycloak rejects it for admin API calls (e.g. session expired, token
 * revoked, MCP client didn't refresh), re-authenticate with the backend
 * service-account (client_credentials grant) so the operation still succeeds.
 *
 * The caller is still fully authorized — their roles were checked during
 * token validation. The service-account is only used as a transport credential.
 */

/** Cached service-account token + expiry to avoid a grant on every call. */
let serviceAccountCache: { token: string; expiresAt: number } | null = null

/**
 * Obtain a Keycloak admin client authenticated via the admin-service
 * client_credentials grant. Caches the token until 30 s before expiry.
 */
async function getServiceAccountAdmin(): Promise<KcAdminClient> {
  const clientId = config.keycloak.adminClientId
  const clientSecret = config.keycloak.adminClientSecret
  if (!clientId || !clientSecret) {
    throw new ConfigurationError(
      'Service-account fallback requires KEYCLOAK_ADMIN_CLIENT_ID and KEYCLOAK_ADMIN_CLIENT_SECRET',
    )
  }

  const now = Date.now()
  if (serviceAccountCache && serviceAccountCache.expiresAt > now) {
    const client = new KcAdminClient({
      baseUrl: config.keycloak.baseUrl!,
      realmName: config.keycloak.realm!,
    })
    client.setAccessToken(serviceAccountCache.token)
    return client
  }

  const client = new KcAdminClient({
    baseUrl: config.keycloak.baseUrl!,
    realmName: config.keycloak.realm!,
  })
  await client.auth({
    grantType: 'client_credentials',
    clientId,
    clientSecret,
  })

  // Cache with 30 s safety margin
  const accessToken = (client as unknown as { accessToken?: string }).accessToken
  if (accessToken) {
    serviceAccountCache = { token: accessToken, expiresAt: now + 4.5 * 60 * 1000 }
  }

  logger.auth.debug('Service-account admin client created (fallback)')
  return client
}

/**
 * Standalone factory for creating a Keycloak admin client from a user token.
 * Shared by both the Elysia plugin (decorator) and the MCP tool executor.
 */
export async function createAdminClient(userToken: string) {
    try {
      // Check if Keycloak is configured
      if (!config.keycloak.isConfigured) {
        throw new ConfigurationError('Keycloak is not configured. Please configure Keycloak settings in the admin UI.')
      }

      logger.auth.debug('Keycloak plugin: Starting admin client creation', { tokenLength: userToken.length })
      logger.auth.debug('Validating user token for admin operations')
      // Validate the user's token and get payload
      const tokenPayload = await validateToken(userToken)
      logger.auth.debug('Token validated successfully', {
        sub: tokenPayload.sub,
        preferred_username: tokenPayload.preferred_username,
        email: tokenPayload.email,
        hasRealmAccess: !!tokenPayload.realm_access,
        hasResourceAccess: !!tokenPayload.resource_access,
        realmRoles: tokenPayload.realm_access?.roles || [],
        adminUiRoles: tokenPayload.resource_access?.['admin-ui']?.roles || [],
        realmManagementRoles: tokenPayload.resource_access?.['realm-management']?.roles || []
      })
      
      // Optional: Check if user has admin-related roles
      // Check both realm roles and client roles
      const realmRoles = tokenPayload.realm_access?.roles || []
      const clientRoles = tokenPayload.resource_access?.['admin-ui']?.roles || []
      const realmManagementRoles = tokenPayload.resource_access?.['realm-management']?.roles || []
      
      // Exact role matching — do NOT use .includes() which allows substring matches
      const ADMIN_REALM_ROLES = new Set(['admin', 'realm-admin', 'manage-users', 'manage-realm', 'realm-management'])
      const ADMIN_CLIENT_ROLES = new Set(['admin', 'manage-users', 'manage-clients', 'manage-realm'])

      const hasAdminRole = 
        realmRoles.some((role: string) => ADMIN_REALM_ROLES.has(role)) ||
        clientRoles.some((role: string) => ADMIN_CLIENT_ROLES.has(role)) ||
        realmManagementRoles.length > 0
      
      // Check if user has admin access to manage users
      // Only bypass in development when explicitly opted in
      const isDevelopment = process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true'
      
      if (!hasAdminRole) {
        logger.auth.warn('User does not have admin permissions', { 
          username: tokenPayload.preferred_username,
          realmRoles: realmRoles.slice(0, 5), // Log first 5 roles only
          isDevelopment 
        })
        if (!isDevelopment) {
          throw new AuthenticationError('User does not have admin permissions')
        }
        logger.auth.warn('DEVELOPMENT: Proceeding despite missing admin role')
      }
      
      // Check for realm-management roles (needed for admin API)
      const hasRealmManagementRole = realmManagementRoles.length > 0
      if (!hasRealmManagementRole) {
        logger.auth.warn('User lacks realm-management roles, but proceeding in development', {
          username: tokenPayload.preferred_username,
          isDevelopment
        })
        if (!isDevelopment) {
          throw new AuthenticationError('User does not have realm management permissions')
        }
      }
      
      // Create admin client with user's token
      logger.auth.debug('Instantiating Keycloak admin client...')
      const kcAdminClient = new KcAdminClient({
        baseUrl: config.keycloak.baseUrl!,
        realmName: config.keycloak.realm!,
      })

      // Use the user's token for admin operations
      logger.auth.debug('Setting access token on admin client...')
      kcAdminClient.setAccessToken(userToken)
      
      logger.auth.debug('Keycloak admin client instantiated successfully', {
        username: tokenPayload.preferred_username,
        baseUrl: process.env.KEYCLOAK_BASE_URL,
        realm: process.env.KEYCLOAK_REALM
      })

      // Return a proxy that catches Keycloak 401s and retries with service account.
      // This handles the case where the user token passed JWT validation but
      // Keycloak's session has expired (common with MCP clients that don't refresh).
      return new Proxy(kcAdminClient, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver)
          if (typeof value !== 'object' || value === null) return value

          // Proxy the namespace objects (e.g. identityProviders, realms, users)
          return new Proxy(value, {
            get(nsTarget: Record<string | symbol, unknown>, nsProp: string | symbol, nsReceiver: unknown) {
              const method = Reflect.get(nsTarget, nsProp, nsReceiver)
              if (typeof method !== 'function') return method

              return async (...args: unknown[]) => {
                try {
                  return await (method as Function).apply(nsTarget, args)
                } catch (err: unknown) {
                  const status = (err as { response?: { status?: number } })?.response?.status
                  const msg = err instanceof Error ? err.message : String(err)
                  if (status === 401 || msg.includes('401') || msg.includes('Unauthorized')) {
                    logger.auth.info('User token rejected by Keycloak, falling back to service account', {
                      namespace: String(prop),
                      method: String(nsProp),
                    })
                    const saClient = await getServiceAccountAdmin()
                    const saNamespace = (saClient as Record<string | symbol, unknown>)[prop] as Record<string | symbol, unknown>
                    const saMethod = saNamespace[nsProp] as Function
                    return saMethod.apply(saNamespace, args)
                  }
                  throw err
                }
              }
            },
          })
        },
      }) as unknown as KcAdminClient
    } catch (error) {
      logger.auth.error('Error in keycloak plugin', { error })
      
      // Re-throw configuration and authentication errors to preserve their type
      if (error instanceof ConfigurationError || error instanceof AuthenticationError) {
        throw error
      }
      
      // For other errors, check if they might be auth-related
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unauthorized') || 
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('Token expired') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('401')) {
        throw new AuthenticationError(`Authentication failed: ${errorMessage}`);
      }
      
      // For all other errors, re-throw as-is
      throw error
    }
}

export const keycloakPlugin = new Elysia()
  .decorate('getAdmin', createAdminClient)
