import { Elysia, t } from 'elysia'
import fetch, { Headers } from 'cross-fetch'
import { validateToken } from '../lib/auth'
import { AuthenticationError, ConfigurationError, extractBearerToken } from '../lib/admin-utils'
import { config } from '../config'
import { fhirServerStore, getServerByName, getServerInfoByName } from '../lib/fhir-server-store'
import { CommonErrorResponses, ErrorResponse, CacheRefreshResponse, SmartConfigurationResponse, FhirProxyResponse, type SmartConfigurationResponseType } from '../schemas'
import { smartConfigService } from '../lib/smart-config'
import { logger } from '../lib/logger'
import { fetchWithMtls, getMtlsConfig } from './fhir-servers'
import { checkConsentWithIal, getConsentConfig, getIalConfig } from '../lib/consent'
import { enforceScopeAccess, enforceWriteBlocking, enforceRoleBasedFiltering, type AccessControlContext } from '../lib/smart-access-control'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function proxyFHIR({ params, request, set }: any) {
  // 1) early version sanity check
  if (!config.fhir.supportedVersions.includes(params.fhir_version)) {
    set.status = 400
    return { error: `Unsupported FHIR version: ${params.fhir_version}` }
  }

  try {
    const serverInfo = await getServerInfoByName(params.server_name)
    if (!serverInfo) {
      set.status = 404
      return { error: `FHIR server '${params.server_name}' not found` }
    }

    const serverUrl = serverInfo.url
    const authHeader = request.headers.get('authorization') || ''
    const auth = authHeader.replace(/^Bearer\s+/, '')
    let tokenPayload = null

    // skip auth on metadata
    if (request.method !== 'GET' || !request.url.endsWith('/metadata')) {
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }
      tokenPayload = await validateToken(auth)
    }

    // 2) Consent + IAL enforcement check
    if (tokenPayload) {
      const parts = new URL(request.url).pathname.split('/').filter(Boolean)
      const resourcePath = parts.slice(3).join('/')
      
      const consentResult = await checkConsentWithIal(
        tokenPayload,
        params.server_name,
        serverUrl,
        resourcePath,
        request.method,
        authHeader
      )

      // If consent or IAL denied and mode is 'enforce', block the request
      if (consentResult.decision === 'deny' && getConsentConfig().mode === 'enforce') {
        set.status = 403
        return {
          error: consentResult.ialCheck && !consentResult.ialCheck.allowed ? 'ial_verification_failed' : 'consent_denied',
          message: consentResult.reason,
          consentId: consentResult.consentId,
          patientId: consentResult.context.patientId,
          clientId: consentResult.context.clientId,
          resourceType: consentResult.context.resourceType
        }
      }
    }

    // build target path (preserve query string for FHIR searches)
    const requestUrl = new URL(request.url)
    const parts = requestUrl.pathname.split('/').filter(Boolean)
    const resourcePath = parts.slice(3).join('/')
    let queryString = requestUrl.search

    // 3–5) SMART access control (scope enforcement, write blocking, role-based filtering)
    if (tokenPayload) {
      // Build mTLS-aware upstream fetch for access control queries
      const mtlsCfg = await getMtlsConfig(serverInfo.identifier)
      const acUpstreamFetch = async (url: string, init?: RequestInit) => {
        const useUpstreamMtls = mtlsCfg?.enabled === true && url.startsWith('https://')
        return useUpstreamMtls
          ? fetchWithMtls(url, { ...init, serverId: serverInfo.identifier })
          : fetch(url, init)
      }

      const acCtx: AccessControlContext = {
        tokenPayload,
        resourcePath,
        method: request.method,
        serverUrl,
        serverId: serverInfo.identifier,
        serverName: params.server_name,
        authHeader,
        upstreamFetch: acUpstreamFetch,
      }

      // 3) SMART scope enforcement
      const scopeResult = enforceScopeAccess(acCtx)
      if (!scopeResult.allowed) {
        set.status = scopeResult.status
        return scopeResult.body
      }

      // 4) Write blocking
      const writeResult = enforceWriteBlocking(acCtx)
      if (!writeResult.allowed) {
        set.status = writeResult.status
        return writeResult.body
      }

      // 5) Role-based filtering
      const roleResult = await enforceRoleBasedFiltering(acCtx, queryString)
      if (!roleResult.allowed) {
        set.status = roleResult.status
        // Check for early return (e.g. empty bundle for practitioner with no patients)
        return roleResult.body
      }
      queryString = roleResult.modifiedQueryString ?? queryString
    }

    const target = `${serverUrl}${resourcePath ? `/${resourcePath}` : ''}${queryString}`

    const headers = new Headers()
    request.headers.forEach((v: string, k: string) => k !== 'host' && k !== 'connection' && headers.set(k, v!))
    headers.set('accept', 'application/fhir+json')

    const fetchOptions = {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method)
        ? await request.text()
        : undefined
    }

    // Check if mTLS is configured for this server
    const mtlsConfig = await getMtlsConfig(serverInfo.identifier)
    const useMtls = mtlsConfig?.enabled === true && target.startsWith('https://')

    // Use appropriate fetch method based on mTLS configuration
    const resp = useMtls
      ? await fetchWithMtls(target, { ...fetchOptions, serverId: serverInfo.identifier })
      : await fetch(target, fetchOptions)

    // copy status & CORS headers
    set.status = resp.status
    resp.headers.forEach((v: string, k: string) => {
      if (k.match(/content-type|etag|location/)) {
        set.headers = { ...set.headers, [k]: v }
      }
    })
    const text = await resp.text()
    const replaced = text.replaceAll(
      serverUrl,
      `${config.baseUrl}/${config.name}/${params.server_name}/${params.fhir_version}`
    )
    // Parse JSON so Elysia's response schema validation preserves all properties.
    // Returning a raw string with a t.Object() response schema causes Elysia to
    // encode/strip the response, breaking FHIR resource fields like resourceType.
    const contentType = resp.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      try { return JSON.parse(replaced) } catch { /* fall through to string */ }
    }
    return replaced
  } catch (error) {
    if (error instanceof AuthenticationError) {
      set.status = 401
      return { error: 'Authentication failed', details: { message: error.message } }
    }
    if (error instanceof ConfigurationError) {
      set.status = 503
      return { error: 'Service configuration error', details: { message: error.message } }
    }
    logger.fhir.error('FHIR proxy error', { server: params.server_name, error })
    set.status = 500
    return { error: 'Failed to proxy FHIR request', details: error instanceof Error ? { message: error.message } : error }
  }
}

// Reusable schema for proxy endpoint
const proxySchema = {
  response: {
    200: FhirProxyResponse
  },
  detail: {
    summary: 'FHIR Resource Proxy',
    description: 'Proxy authenticated FHIR requests to the upstream FHIR server',
    tags: ['fhir'],
    security: [{ BearerAuth: [] }]
  }
}
/**
 * FHIR proxy routes with authentication and CORS support
 * 
 * Route Structure: /:server_name/:fhir_version/*
 * - Client specifies server name and version (e.g., /hapi-fhir-server/R4/Patient/123)
 * - We map server names to configured FHIR server URLs
 * - Proxy requests to the appropriate FHIR server
 * - Response URLs maintain client's requested server name and version for consistency
 * 
 * SMART on FHIR Configuration:
 * - Each FHIR server has its own SMART configuration endpoint
 * - /:server_name/:fhir_version/.well-known/smart-configuration
 * - Configuration is dynamically generated from Keycloak and cached for performance
 * - This follows SMART on FHIR specification where configuration is server-specific
 * 
 * Performance Features:
 * - FHIR server info is cached for 5 minutes to avoid repeated metadata calls
 * - Cache is pre-warmed on server startup for faster first requests
 * - Version normalization: "4.0.1" → "R4", "5.0.0" → "R5"
 * - Fallback handling: continues working even if FHIR server is temporarily unavailable
 * - Admin cache refresh endpoint available at /admin/smart-config/refresh
 */

export const fhirRoutes = new Elysia({ prefix: `/${config.name}/:server_name/:fhir_version`, tags: ['fhir'] })
  // SMART on FHIR Configuration endpoint - server-specific configuration
  .get('/.well-known/smart-configuration', async (): Promise<SmartConfigurationResponseType> => {
    // CORS is handled by the global @elysiajs/cors plugin
    return await smartConfigService.getSmartConfiguration()
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: {
      200: SmartConfigurationResponse
    },
    detail: {
      summary: 'SMART on FHIR Configuration for Specific Server',
      description: 'Get SMART on FHIR well-known configuration for this specific FHIR server and version',
      tags: ['smart-apps']
    }
  })
  // CORS preflight is handled by the global @elysiajs/cors plugin

  // Root FHIR path - serve the FHIR server base URL content
  .get('/', async ({ params, set }) => {
    // early version sanity check
    if (!config.fhir.supportedVersions.includes(params.fhir_version)) {
      set.status = 400
      return { error: `Unsupported FHIR version: ${params.fhir_version}` }
    }

    try {
      // Use the store to get server URL - this will initialize the store if needed
      const serverUrl = await getServerByName(params.server_name)
      if (!serverUrl) {
        set.status = 404
        return { error: `FHIR server '${params.server_name}' not found` }
      }

      const headers = new Headers()
      headers.set('accept', 'application/fhir+json')

      const resp = await fetch(serverUrl, {
        method: 'GET',
        headers
      })

      set.status = resp.status
      resp.headers.forEach((v: string, k: string) => {
        if (k.match(/content-type|etag/)) {
          set.headers = { ...set.headers, [k]: v }
        }
      })

      // CORS is handled by the global @elysiajs/cors plugin

      const text = await resp.text()
      // Rewrite URLs to use our proxy base URL
      const body = text.replaceAll(
        serverUrl,
        `${config.baseUrl}/${config.name}/${params.server_name}/${params.fhir_version}`
      )
      return body
    } catch (error) {
      set.status = 500
      return { error: 'Failed to serve FHIR server base URL', details: error }
    }
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: {
      200: t.Any({ description: 'FHIR server base response' }),
      500: ErrorResponse
    },
    detail: {
      summary: 'FHIR Server Base URL',
      description: 'Serve the content from the FHIR server base URL',
      tags: ['fhir']
    }
  })

  // Admin endpoint to refresh FHIR server cache
  .post('/cache/refresh', async ({ set, headers, params }) => {
    // Require authentication for cache management
    const auth = extractBearerToken(headers)
    if (!auth) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    try {
      await validateToken(auth)

      // Get server info by name (automatically initializes if needed)
      const serverInfo = await getServerInfoByName(params.server_name)
      if (!serverInfo) {
        set.status = 404
        return { error: `FHIR server '${params.server_name}' not found` }
      }

      // Refresh specific server in the store
      await fhirServerStore.refreshServer(params.server_name)

      // Get the updated server info
      const updatedServerInfo = fhirServerStore.getServerByName(params.server_name)

      if (!updatedServerInfo) {
        set.status = 500
        return { error: 'Failed to refresh server info' }
      }

      return {
        success: true,
        message: 'FHIR server cache refreshed successfully',
        serverInfo: updatedServerInfo.metadata
      }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to refresh FHIR server cache', details: error }
    }
  }, {
    params: t.Object({
      server_name: t.String({ description: 'FHIR server name or identifier' }),
      fhir_version: t.String({ description: 'FHIR version (e.g., R4, R5)' })
    }),
    response: {
      200: CacheRefreshResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Refresh FHIR Server Cache',
      description: 'Clear and refresh the cached FHIR server information',
      tags: ['fhir'],
      security: [{ BearerAuth: [] }]
    }
  })

  // all other FHIR requests - proxy to the FHIR server
  .get('/*', proxyFHIR, proxySchema)
  .post('/*', proxyFHIR, proxySchema)
  .put('/*', proxyFHIR, proxySchema)
  .patch('/*', proxyFHIR, proxySchema)
  .delete('/*', proxyFHIR, proxySchema)
