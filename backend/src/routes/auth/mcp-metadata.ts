import { Elysia } from 'elysia'
import { config } from '@/config'
import { logger } from '@/lib/logger'
import { ProtectedResourceMetadata, JWKSResponse } from '@/schemas'

/**
 * OAuth 2.0 Protected Resource Metadata for MCP Authorization
 * 
 * Implements RFC 9728 - OAuth 2.0 Protected Resource Metadata
 * https://datatracker.ietf.org/doc/html/rfc9728
 * 
 * This tells MCP clients (like Claude Desktop) where to find the
 * authorization server and what scopes are supported.
 */


/**
 * MCP OAuth metadata routes
 */
export const mcpMetadataRoutes = new Elysia({ prefix: '/.well-known', tags: ['mcp-authorization'] })
  
  /**
   * Protected Resource Metadata (RFC 9728)
   * 
   * This is the entry point for MCP authorization discovery.
   * MCP clients will:
   * 1. Receive 401 from protected endpoints
   * 2. Fetch this metadata
   * 3. Discover authorization_servers
   * 4. Fetch authorization server metadata
   * 5. Initiate OAuth flow
   */
  .get('/oauth-protected-resource', () => {
    const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')
    const mcpPath = config.mcp?.path || '/mcp'

    return {
      // RFC 9728: resource MUST match the protected resource URL
      resource: `${baseUrl}${mcpPath}`,
      // Point to our own proxy so clients fetch our /.well-known/oauth-authorization-server
      // which has the correct registration_endpoint (Keycloak's native DCR is blocked)
      authorization_servers: [
        baseUrl
      ],
      bearer_methods_supported: ['header'],
      resource_documentation: `${baseUrl}/docs`,
      scopes_supported: [
        'openid',
        'profile',
        'email'
      ]
    }
  }, {
    detail: {
      summary: 'Get Protected Resource Metadata',
      description: 'Returns OAuth 2.0 Protected Resource Metadata (RFC 9728) for MCP authorization discovery',
      tags: ['mcp-authorization']
    },
    response: {
      200: ProtectedResourceMetadata
    }
  })

  // Path-based resource metadata discovery (RFC 9728 §5.1)
  // Clients may request /.well-known/oauth-protected-resource{path} for path-scoped resources
  .get('/oauth-protected-resource/*', () => {
    const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')
    const mcpPath = config.mcp?.path || '/mcp'

    return {
      resource: `${baseUrl}${mcpPath}`,
      authorization_servers: [
        baseUrl
      ],
      bearer_methods_supported: ['header'],
      resource_documentation: `${baseUrl}/docs`,
      scopes_supported: [
        'openid',
        'profile',
        'email'
      ]
    }
  }, {
    detail: {
      summary: 'Get Protected Resource Metadata (path-scoped)',
      description: 'Path-scoped OAuth 2.0 Protected Resource Metadata (RFC 9728 §5.1)',
      tags: ['mcp-authorization']
    },
    response: {
      200: ProtectedResourceMetadata
    }
  })
  
  /**
   * Authorization Server Metadata (RFC 8414)
   * 
   * This provides MCP clients with the OAuth endpoints they need.
   * Points to our proxy's OAuth routes, which forward to Keycloak.
   */
  .get('/oauth-authorization-server', async ({ set }) => {
    try {
      const keycloakBase = config.keycloak.publicUrl || config.keycloak.baseUrl
      const realm = config.keycloak.realm

      // Fetch Keycloak's OIDC config to derive OAuth AS metadata (RFC 8414)
      const oidcUrl = `${keycloakBase}/realms/${realm}/.well-known/openid-configuration`
      const response = await fetch(oidcUrl)

      if (!response.ok) {
        set.status = 502
        return {
          error: 'bad_gateway',
          error_description: 'Failed to fetch authorization server metadata'
        }
      }

      const oidcConfig = await response.json()
      const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')

      // Ensure token_endpoint_auth_methods_supported includes "none" for public
      // MCP clients (DCR creates public clients with token_endpoint_auth_method=none).
      // Keycloak's OIDC config omits "none" even though it supports public clients.
      const authMethods: string[] = Array.isArray(oidcConfig.token_endpoint_auth_methods_supported)
        ? oidcConfig.token_endpoint_auth_methods_supported
        : []
      if (!authMethods.includes('none')) {
        authMethods.push('none')
      }

      return {
        // RFC 8414 §3: issuer MUST be the authorization server's URL — the proxy
        // acts as AS from MCP clients' perspective (it owns the registration_endpoint
        // and proxies authorization/token endpoints), so use baseUrl, not Keycloak's issuer.
        issuer: baseUrl,
        // Point to proxy endpoints so MCP clients go through our auth layer
        // (SMART launch context enrichment, Backend Services JWT validation, aud enforcement)
        authorization_endpoint: `${baseUrl}/auth/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        // Point to our own DCR endpoint instead of Keycloak's native one
        // (Keycloak's requires initial access tokens / trusted host policy)
        registration_endpoint: `${baseUrl}/auth/register`,
        // MCP 2025-11-25: advertise both CIMD and DCR client registration approaches
        // CIMD (OAuth Client ID Metadata Document) is handled by Keycloak via --features=cimd
        // DCR (Dynamic Client Registration) is handled by our /auth/register proxy endpoint
        client_registration_types_supported: ['client_id_metadata_document', 'dynamic_client_registration'],
        scopes_supported: oidcConfig.scopes_supported,
        response_types_supported: oidcConfig.response_types_supported,
        grant_types_supported: oidcConfig.grant_types_supported,
        token_endpoint_auth_methods_supported: authMethods,
        code_challenge_methods_supported: oidcConfig.code_challenge_methods_supported
      }
    } catch {
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Internal server error while fetching authorization server metadata'
      }
    }
  }, {
    detail: {
      summary: 'Get OAuth 2.0 Authorization Server Metadata',
      description: 'Returns OAuth 2.0 Authorization Server Metadata (RFC 8414) for MCP authorization discovery',
      tags: ['mcp-authorization']
    }
  })
  
  /**
   * OpenID Connect Discovery (Alternative for compatibility)
   * 
   * Proxies directly to Keycloak's OpenID Connect Discovery endpoint.
   * This ensures we always have up-to-date metadata from Keycloak.
   */
  .get('/openid-configuration', async ({ set }) => {
    try {
      const keycloakBase = config.keycloak.publicUrl || config.keycloak.baseUrl
      const realm = config.keycloak.realm
      const oidcUrl = `${keycloakBase}/realms/${realm}/.well-known/openid-configuration`
      
      const response = await fetch(oidcUrl)
      
      if (!response.ok) {
        set.status = 502
        return {
          error: 'bad_gateway',
          error_description: 'Failed to fetch OpenID Connect configuration from authorization server'
        }
      }
      
      const oidcConfig = await response.json()
      const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')

      // Rewrite endpoints to proxy URLs so MCP clients go through our auth layer
      return {
        ...oidcConfig,
        authorization_endpoint: `${baseUrl}/auth/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        registration_endpoint: `${baseUrl}/auth/register`,
        introspection_endpoint: `${baseUrl}/auth/introspect`,
        userinfo_endpoint: `${baseUrl}/auth/userinfo`,
      }
    } catch {
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Internal server error while fetching OpenID Connect configuration'
      }
    }
  }, {
    detail: {
      summary: 'Get OpenID Connect Discovery',
      description: 'Returns OpenID Connect Discovery metadata (proxied from Keycloak)',
      tags: ['mcp-authorization']
    }
  })

  /**
   * OpenID Connect Discovery with Path Insertion (MCP Priority #2)
   * 
   * Per MCP spec, for authorization server URLs with path components like
   * "http://localhost:8445/auth", clients try path insertion:
   * http://localhost:8445/.well-known/openid-configuration/auth
   * 
   * This is the second-priority discovery method after oauth-authorization-server.
   */
  .get('/openid-configuration/auth', async ({ set }) => {
    try {
      const keycloakBase = config.keycloak.publicUrl || config.keycloak.baseUrl
      const realm = config.keycloak.realm
      const oidcUrl = `${keycloakBase}/realms/${realm}/.well-known/openid-configuration`
      
      const response = await fetch(oidcUrl)
      
      if (!response.ok) {
        set.status = 502
        return {
          error: 'bad_gateway',
          error_description: 'Failed to fetch OpenID Connect configuration from authorization server'
        }
      }
      
      const oidcConfig = await response.json()
      const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')

      return {
        ...oidcConfig,
        authorization_endpoint: `${baseUrl}/auth/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        registration_endpoint: `${baseUrl}/auth/register`,
        introspection_endpoint: `${baseUrl}/auth/introspect`,
        userinfo_endpoint: `${baseUrl}/auth/userinfo`,
      }
    } catch {
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Internal server error while fetching OpenID Connect configuration'
      }
    }
  }, {
    detail: {
      summary: 'Get OpenID Connect Discovery (MCP path insertion)',
      description: 'Returns OpenID Connect Discovery metadata with path insertion for /auth',
      tags: ['mcp-authorization']
    }
  })

  /**
   * OAuth 2.0 Authorization Server Metadata with Path Insertion (MCP Priority #1)
   * 
   * Per MCP spec, for authorization server URLs with path components like
   * "http://localhost:8445/auth", clients FIRST try path insertion:
   * http://localhost:8445/.well-known/oauth-authorization-server/auth
   * 
   * This is the highest-priority discovery method per RFC 8414.
   */
  .get('/oauth-authorization-server/auth', async ({ set }) => {
    try {
      const keycloakBase = config.keycloak.publicUrl || config.keycloak.baseUrl
      const realm = config.keycloak.realm
      
      // Fetch Keycloak's OIDC config to get accurate metadata
      const oidcUrl = `${keycloakBase}/realms/${realm}/.well-known/openid-configuration`
      const response = await fetch(oidcUrl)
      
      if (!response.ok) {
        set.status = 502
        return {
          error: 'bad_gateway',
          error_description: 'Failed to fetch authorization server metadata'
        }
      }
      
      const oidcConfig = await response.json()
      const baseUrl = (config.baseUrl || 'http://localhost:3001').replace(/\/+$/, '')

      const authMethods: string[] = Array.isArray(oidcConfig.token_endpoint_auth_methods_supported)
        ? oidcConfig.token_endpoint_auth_methods_supported
        : []
      if (!authMethods.includes('none')) {
        authMethods.push('none')
      }
      
      // Return OAuth 2.0 AS Metadata format — point to proxy endpoints
      return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/auth/authorize`,
        token_endpoint: `${baseUrl}/auth/token`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        registration_endpoint: `${baseUrl}/auth/register`,
        client_registration_types_supported: ['client_id_metadata_document', 'dynamic_client_registration'],
        scopes_supported: oidcConfig.scopes_supported,
        response_types_supported: oidcConfig.response_types_supported,
        grant_types_supported: oidcConfig.grant_types_supported,
        token_endpoint_auth_methods_supported: authMethods,
        code_challenge_methods_supported: oidcConfig.code_challenge_methods_supported
      }
    } catch {
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Internal server error while fetching authorization server metadata'
      }
    }
  }, {
    detail: {
      summary: 'Get OAuth 2.0 Authorization Server Metadata (MCP path insertion)',
      description: 'Returns OAuth 2.0 AS Metadata with path insertion for /auth (highest priority per MCP spec)',
      tags: ['mcp-authorization']
    }
  })

  /**
   * JWKS Endpoint (JSON Web Key Set) - RFC 8414 Standard Location
   * 
   * Provides the JSON Web Key Set for token signature validation.
   * This is the standard location per RFC 8414 section 3.
   * 
   * Proxies to Keycloak's JWKS endpoint so clients (including MCP servers)
   * can validate tokens without knowing about Keycloak directly.
   */
  .get('/jwks.json', async ({ set }) => {
    try {
      const keycloakBase = config.keycloak.publicUrl || config.keycloak.baseUrl
      const realm = config.keycloak.realm
      const jwksUrl = `${keycloakBase}/realms/${realm}/protocol/openid-connect/certs`
      
      const response = await fetch(jwksUrl)
      
      if (!response.ok) {
        logger.auth.error('Failed to fetch JWKS from Keycloak', {
          status: response.status,
          statusText: response.statusText,
          jwksUrl
        })
        set.status = 502
        return {
          error: 'bad_gateway',
          error_description: 'Failed to fetch JWKS from authorization server'
        }
      }
      
      const jwks = await response.json()
      
      logger.auth.debug('Successfully proxied JWKS from well-known endpoint', {
        keyCount: jwks.keys?.length || 0
      })
      
      return jwks
    } catch (error) {
      logger.auth.error('Error proxying JWKS from well-known endpoint', { error })
      set.status = 500
      return {
        error: 'server_error',
        error_description: 'Internal server error while fetching JWKS'
      }
    }
  }, {
    detail: {
      summary: 'Get JSON Web Key Set',
      description: 'Returns JWKS for token signature validation (RFC 8414 standard location, proxied from Keycloak)',
      tags: ['mcp-authorization']
    },
    response: {
      200: JWKSResponse
    }
  })
