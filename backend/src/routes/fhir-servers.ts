import { Elysia, t } from 'elysia'
import { config } from '../config'
import { getAllServers, getServerInfoByName, ensureServersInitialized, addServer, updateServer, deleteServer, refreshServer, retryUnknownServers, setStrictCapabilities } from '../lib/fhir-server-store'
import { logger } from '../lib/logger'
import { validateToken } from '../lib/auth'
import { extractBearerToken } from '../lib/admin-utils'
import { handleAdminError } from '../lib/admin-error-handler'
import { validateExternalUrl } from '../lib/url-validation'
import { mtlsStore } from '../lib/mtls-store'
import * as forge from 'node-forge'
import * as crypto from 'crypto'
import * as https from 'https'
import nodeFetch from 'node-fetch'
import {
  ErrorResponse,
  FhirServerResponse,
  FhirServerInfoResponse,
  AddFhirServerRequest,
  UpdateFhirServerRequest,
  ServerIdParam,
  MtlsConfigResponse,
  CertificateUploadResponse,
  UpdateMtlsConfigRequest,
  UploadCertificateRequest,
  CommonErrorResponses,
  type FhirServerInfoResponseType,
  type FhirServerListResponseType,
  type ErrorResponseType,
  type MtlsConfig,
  FhirServerListResponse
} from '@/schemas'

/**
 * Parse certificate details from PEM content using node-forge
 * Extracts real certificate information for validation and display
 */
function parseCertificate(certContent: string): MtlsConfig['certDetails'] {
  try {
    // Clean up the certificate content - ensure proper PEM format
    let cleanCert = certContent.trim()

    // Add headers if missing
    if (!cleanCert.includes('-----BEGIN CERTIFICATE-----')) {
      cleanCert = `-----BEGIN CERTIFICATE-----\n${cleanCert}\n-----END CERTIFICATE-----`
    }

    // Parse the certificate using node-forge
    const cert = forge.pki.certificateFromPem(cleanCert)

    // Extract subject information
    const subjectAttrs = cert.subject.attributes.map(attr =>
      `${attr.shortName || attr.name}=${attr.value}`
    ).join(', ')

    // Extract issuer information  
    const issuerAttrs = cert.issuer.attributes.map(attr =>
      `${attr.shortName || attr.name}=${attr.value}`
    ).join(', ')

    // Calculate fingerprint (SHA-256)
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
    const hash = crypto.createHash('sha256')
    hash.update(der, 'binary')
    const fingerprint = 'SHA256:' + hash.digest('hex').toUpperCase().match(/.{2}/g)?.join(':')

    return {
      subject: subjectAttrs,
      issuer: issuerAttrs,
      validFrom: cert.validity.notBefore.toISOString(),
      validTo: cert.validity.notAfter.toISOString(),
      fingerprint: fingerprint || 'Unknown'
    }
  } catch (error) {
    logger.error('Failed to parse certificate', error instanceof Error ? error.message : 'Unknown error')
    throw new Error(`Invalid certificate format: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error })
  }
}

/**
 * Validate certificate chain and check for expiration
 */
function validateCertificate(certPem: string, caCertPem?: string): { isValid: boolean, errors: string[] } {
  const errors: string[] = []

  try {
    const cert = forge.pki.certificateFromPem(certPem)
    const now = new Date()

    // Check expiration
    if (cert.validity.notBefore > now) {
      errors.push('Certificate is not yet valid')
    }
    if (cert.validity.notAfter < now) {
      errors.push('Certificate has expired')
    }

    // Validate against CA if provided
    if (caCertPem) {
      try {
        const caCert = forge.pki.certificateFromPem(caCertPem)
        if (!caCert.verify(cert)) {
          errors.push('Certificate is not signed by the provided CA')
        }
      } catch {
        errors.push('Invalid CA certificate format')
      }
    }

    return { isValid: errors.length === 0, errors }
  } catch (error) {
    errors.push(`Invalid certificate format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { isValid: false, errors }
  }
}

/**
 * Create HTTPS agent with mTLS configuration
 * Note: This is now async due to database storage
 */
export async function createMtlsAgent(serverId: string): Promise<https.Agent | undefined> {
  const mtlsConfig = await mtlsStore.getConfig(serverId)

  if (!mtlsConfig?.enabled || !mtlsConfig.clientCert || !mtlsConfig.clientKey) {
    return undefined
  }

  try {
    // Decode base64 encoded certificates
    const cert = Buffer.from(mtlsConfig.clientCert, 'base64').toString('utf8')
    const key = Buffer.from(mtlsConfig.clientKey, 'base64').toString('utf8')
    const ca = mtlsConfig.caCert ? Buffer.from(mtlsConfig.caCert, 'base64').toString('utf8') : undefined

    // Validate certificate before using
    const validation = validateCertificate(cert, ca)
    if (!validation.isValid) {
      logger.error('mTLS certificate validation failed', validation.errors.join(', '))
      return undefined
    }

    return new https.Agent({
      cert,
      key,
      ca: ca ? [ca] : undefined,
      rejectUnauthorized: true // Always validate server certificates
    })
  } catch (error) {
    logger.error('Failed to create mTLS agent', error instanceof Error ? error.message : 'Unknown error')
    return undefined
  }
}

/**
 * Get mTLS configuration for a server (exported for use in FHIR proxy)
 */
export async function getMtlsConfig(serverId: string): Promise<MtlsConfig | undefined> {
  const config = await mtlsStore.getConfig(serverId)
  if (!config) return undefined
  
  // Convert to schema type
  return {
    enabled: config.enabled,
    clientCert: config.clientCert,
    clientKey: config.clientKey,
    caCert: config.caCert,
    certDetails: config.certDetails
  }
}

/**
 * Create a fetch function with mTLS support using node-fetch
 */
export async function fetchWithMtls(
  url: string,
  options: RequestInit & { serverId?: string } = {}
): Promise<Response> {
  const { serverId, ...fetchOptions } = options

  // Use mTLS agent if server ID provided and HTTPS URL
  if (serverId && url.startsWith('https://')) {
    const agent = await createMtlsAgent(serverId)
    if (agent) {
      logger.fhir.info('Using mTLS for FHIR request', { serverId, url: url.split('?')[0] })

      // Convert body to node-fetch compatible format
      let body: string | Buffer | undefined = undefined
      if (fetchOptions.body) {
        if (typeof fetchOptions.body === 'string') {
          body = fetchOptions.body
        } else if (fetchOptions.body instanceof Buffer) {
          body = fetchOptions.body
        } else if (typeof fetchOptions.body === 'object' && 'getReader' in fetchOptions.body) {
          // Convert ReadableStream to string for node-fetch compatibility
          const reader = (fetchOptions.body as ReadableStream).getReader()
          const chunks: Uint8Array[] = []
          let done = false

          while (!done) {
            const { value, done: readerDone } = await reader.read()
            done = readerDone
            if (value) chunks.push(value)
          }

          body = Buffer.concat(chunks).toString()
        } else {
          // For other types, convert to string
          body = String(fetchOptions.body)
        }
      }

      // Use node-fetch with custom agent for mTLS
      // Convert Headers to plain object for node-fetch compatibility
      let headers: Record<string, string> | undefined
      if (fetchOptions.headers) {
        headers = {}
        const headersObj = fetchOptions.headers as Record<string, string>
        for (const key in headersObj) {
          if (Object.prototype.hasOwnProperty.call(headersObj, key)) {
            headers[key] = headersObj[key]
          }
        }
      }

      const response = await nodeFetch(url, {
        method: fetchOptions.method || 'GET',
        headers,
        body,
        agent: agent as unknown as import('http').Agent
      })

      // Convert node-fetch Response to standard Response for compatibility
      const responseBody = await response.buffer()
      return new Response(responseBody.toString(), {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
  }

  // Fallback to standard fetch for non-HTTPS or when mTLS not configured
  return fetch(url, fetchOptions)
}

/**
 * Server discovery routes
 */
export const serverDiscoveryRoutes = new Elysia({ prefix: '/fhir-servers', tags: ['fhir-servers'] })
  // Create a new FHIR server
  .post('/', async ({ body, set, headers }) => {
    try {
      // Require authentication for server management
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      // Validate URL format
      try {
        new URL(body.url)
      } catch {
        set.status = 400
        return { error: 'Invalid URL format' }
      }

      // SSRF protection: block private/internal network URLs in production
      const isInternalNetworking = process.env.NODE_ENV === 'development'
      const urlCheck = validateExternalUrl(body.url, isInternalNetworking)
      if (!urlCheck.valid) {
        set.status = 400
        return { error: `URL rejected: ${urlCheck.reason}` }
      }

      // Add the server to the store (this will test connectivity)
      const serverInfo = await addServer(body.url, body.name, body.organizationIds)

      return {
        success: true,
        message: 'FHIR server added successfully',
        server: {
          id: serverInfo.identifier,
          name: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          smartCapabilities: serverInfo.metadata.smartCapabilities,
          strictCapabilities: serverInfo.strictCapabilities ?? false,
          organizationIds: serverInfo.organizationIds,
          endpoints: {
            base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to add FHIR server', { error, body })

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch FHIR metadata')) {
          set.status = 400
          return { error: 'Unable to connect to FHIR server or server is not responding', details: error.message }
        }
        if (error.message.includes('Invalid FHIR server')) {
          set.status = 400
          return { error: 'Server is not a valid FHIR server', details: error.message }
        }
      }

      return handleAdminError(error, set)
    }
  }, {
    body: AddFhirServerRequest,
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was added successfully' }),
        message: t.String({ description: 'Success message' }),
        server: FhirServerResponse
      }, { title: 'AddFhirServerResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Add New FHIR Server',
      description: 'Add a new FHIR server to the system by providing its base URL',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Update an existing FHIR server
  .put('/:server_id', async ({ params, body, set, headers }) => {
    try {
      // Require authentication for server management
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      // Validate URL format
      try {
        new URL(body.url)
      } catch {
        set.status = 400
        return { error: 'Invalid URL format' }
      }

      // Update the server in the store
      const serverInfo = await updateServer(params.server_id, body.url, body.name, body.organizationIds)

      return {
        success: true,
        message: 'FHIR server updated successfully',
        server: {
          id: serverInfo.identifier,
          name: serverInfo.name,
          url: serverInfo.url,
          fhirVersion: serverInfo.metadata.fhirVersion,
          serverVersion: serverInfo.metadata.serverVersion,
          serverName: serverInfo.metadata.serverName,
          supported: serverInfo.metadata.supported,
          smartCapabilities: serverInfo.metadata.smartCapabilities,
          strictCapabilities: serverInfo.strictCapabilities ?? false,
          organizationIds: serverInfo.organizationIds,
          endpoints: {
            base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
            smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
            metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to update FHIR server', { error, params, body })

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch FHIR metadata')) {
          set.status = 400
          return { error: 'Unable to connect to FHIR server or server is not responding', details: error.message }
        }
        if (error.message.includes('Invalid FHIR server')) {
          set.status = 400
          return { error: 'Server is not a valid FHIR server', details: error.message }
        }
      }

      return handleAdminError(error, set)
    }
  }, {
    params: ServerIdParam,
    body: UpdateFhirServerRequest,
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was updated successfully' }),
        message: t.String({ description: 'Success message' }),
        server: FhirServerResponse
      }, { title: 'UpdateFhirServerResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update FHIR Server',
      description: 'Update an existing FHIR server by providing its new base URL',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // List all available FHIR servers
  .get('/', async ({ set }): Promise<FhirServerListResponseType | ErrorResponseType> => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()

      // Auto-retry metadata for servers that previously failed (non-blocking)
      await retryUnknownServers()

      // Get all servers from the store
      const serverInfos = await getAllServers()

      const servers = serverInfos.map(serverInfo => ({
        id: serverInfo.identifier,
        name: serverInfo.name, // Use the actual name, not identifier
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        smartCapabilities: serverInfo.metadata.smartCapabilities,
        strictCapabilities: serverInfo.strictCapabilities ?? false,
        organizationIds: serverInfo.organizationIds,
        endpoints: {
          base: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`,
          smartConfig: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/.well-known/smart-configuration`,
          metadata: `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}/metadata`
        }
      }))

      return {
        totalServers: servers.length,
        servers
      }
    } catch (error) {
      logger.fhir.error('Failed to list FHIR servers', { error })
      return handleAdminError(error, set)
    }
  }, {
    response: {
      200: FhirServerListResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'List Available FHIR Servers',
      description: 'Get a list of all configured FHIR servers with their connection information and endpoints',
      tags: ['servers']
    }
  })

  // Get specific server information
  .get('/:server_id', async ({ params, set }): Promise<FhirServerInfoResponseType | ErrorResponseType> => {
    try {
      // Ensure servers are initialized
      await ensureServersInitialized()

      // Get server info from store
      const serverInfo = await getServerInfoByName(params.server_id)

      if (!serverInfo) {
        set.status = 404
        return { error: `FHIR server '${params.server_id}' not found` }
      }

      // Build proxy endpoints for this FHIR server
      // These are the SMART on FHIR endpoints that the PROXY provides
      const proxyBase = `${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`

      return {
        name: serverInfo.name,
        url: serverInfo.url,
        fhirVersion: serverInfo.metadata.fhirVersion,
        serverVersion: serverInfo.metadata.serverVersion,
        serverName: serverInfo.metadata.serverName,
        supported: serverInfo.metadata.supported,
        smartCapabilities: serverInfo.metadata.smartCapabilities,
        strictCapabilities: serverInfo.strictCapabilities ?? false,
        endpoints: {
          // Proxy's FHIR endpoints
          base: proxyBase,
          smartConfig: `${proxyBase}/.well-known/smart-configuration`,
          metadata: `${proxyBase}/metadata`,

          // Proxy's OAuth endpoints (provided by Keycloak via the proxy)
          authorize: `${config.baseUrl}/auth/authorize`,
          token: `${config.baseUrl}/auth/token`,
          registration: `${config.baseUrl}/auth/register`,
          manage: `${config.baseUrl}/auth/manage`,
          introspection: `${config.baseUrl}/auth/introspect`,
          revocation: `${config.baseUrl}/auth/revoke`
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to get server information', { serverId: params.server_id, error })
      return handleAdminError(error, set)
    }
  }, {
    params: ServerIdParam,
    response: {
      200: FhirServerInfoResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get Server Information',
      description: 'Get detailed information about a specific FHIR server',
      tags: ['servers']
    }
  })

  // Get mTLS configuration for a server
  .get('/:server_id/mtls', async ({ params, set, headers }) => {
    try {
      // Require authentication
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const mtlsConfig = await mtlsStore.getConfig(params.server_id)
      
      if (!mtlsConfig || !mtlsConfig.enabled) {
        return {
          enabled: false,
          hasCertificates: {
            clientCert: false,
            clientKey: false,
            caCert: false
          },
          certDetails: undefined
        }
      }

      return {
        enabled: mtlsConfig.enabled,
        hasCertificates: {
          clientCert: !!mtlsConfig.clientCert,
          clientKey: !!mtlsConfig.clientKey,
          caCert: !!mtlsConfig.caCert
        },
        certDetails: mtlsConfig.certDetails
      }
    } catch (error) {
      logger.fhir.error('Failed to get mTLS configuration', { error, serverId: params.server_id })
      set.status = 500
      return { error: 'Failed to get mTLS configuration' }
    }
  }, {
    params: ServerIdParam,
    response: {
      200: MtlsConfigResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get mTLS Configuration',
      description: 'Get the mutual TLS configuration for a specific FHIR server',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Update mTLS configuration for a server
  .put('/:server_id/mtls', async ({ params, body, set, headers }) => {
    try {
      // Require authentication
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const updatedConfig = await mtlsStore.setEnabled(params.server_id, body.enabled)

      return {
        success: true,
        message: 'mTLS configuration updated successfully',
        config: {
          enabled: updatedConfig.enabled,
          hasCertificates: {
            clientCert: !!updatedConfig.clientCert,
            clientKey: !!updatedConfig.clientKey,
            caCert: !!updatedConfig.caCert
          }
        }
      }
    } catch (error) {
      logger.fhir.error('Failed to update mTLS configuration', { error, serverId: params.server_id, body })
      set.status = 500
      return { error: 'Failed to update mTLS configuration' }
    }
  }, {
    params: ServerIdParam,
    body: UpdateMtlsConfigRequest,
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' }),
        message: t.String({ description: 'Success message' }),
        config: t.Object({
          enabled: t.Boolean({ description: 'Whether mTLS is enabled' }),
          hasCertificates: t.Object({
            clientCert: t.Boolean({ description: 'Whether client certificate is uploaded' }),
            clientKey: t.Boolean({ description: 'Whether client private key is uploaded' }),
            caCert: t.Boolean({ description: 'Whether CA certificate is uploaded' })
          })
        })
      }, { title: 'UpdateMtlsConfigResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update mTLS Configuration',
      description: 'Enable or disable mutual TLS for a specific FHIR server',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Upload certificate for mTLS
  .post('/:server_id/mtls/certificates', async ({ params, body, set, headers }) => {
    try {
      // Require authentication
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      // Validate certificate type
      if (!['client', 'key', 'ca'].includes(body.type)) {
        set.status = 400
        return { error: 'Invalid certificate type. Must be "client", "key", or "ca"' }
      }

      // Validate base64 content
      try {
        Buffer.from(body.content, 'base64')
      } catch {
        set.status = 400
        return { error: 'Invalid base64 content' }
      }

      // Parse certificate details for client certificates
      let certDetails: MtlsConfig['certDetails'] | undefined
      if (body.type === 'client') {
        // Decode base64 to get PEM for parsing
        const pemContent = Buffer.from(body.content, 'base64').toString('utf8')
        certDetails = parseCertificate(pemContent)
      }

      // Upload certificate using mtlsStore
      const updatedConfig = await mtlsStore.uploadCertificate(
        params.server_id,
        body.type as 'client' | 'key' | 'ca',
        body.content,
        certDetails
      )

      return {
        success: true,
        message: `${body.type === 'client' ? 'Client certificate' : body.type === 'key' ? 'Private key' : 'CA certificate'} uploaded successfully`,
        certDetails: body.type === 'client' ? updatedConfig.certDetails : undefined
      }
    } catch (error) {
      logger.fhir.error('Failed to upload certificate', { error, serverId: params.server_id })
      set.status = 500
      return { error: 'Failed to upload certificate' }
    }
  }, {
    params: ServerIdParam,
    body: UploadCertificateRequest,
    response: {
      200: CertificateUploadResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Upload Certificate',
      description: 'Upload a certificate or private key for mTLS authentication',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Toggle strict capability enforcement for a server
  .patch('/:server_id/strict-capabilities', async ({ params, body, set, headers }) => {
    try {
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const updated = await setStrictCapabilities(params.server_id, body.strict)

      return {
        success: true,
        message: `Strict capability enforcement ${body.strict ? 'enabled' : 'disabled'} for server '${params.server_id}'`,
        strictCapabilities: updated.strictCapabilities ?? false
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404
        return { error: error.message }
      }
      logger.fhir.error('Failed to update strict capabilities', { error, serverId: params.server_id })
      return handleAdminError(error, set)
    }
  }, {
    params: ServerIdParam,
    body: t.Object({
      strict: t.Boolean({ description: 'Whether to enforce the FHIR CapabilityStatement strictly' })
    }, { title: 'SetStrictCapabilitiesRequest' }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
        strictCapabilities: t.Boolean()
      }, { title: 'SetStrictCapabilitiesResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Toggle Strict Capability Enforcement',
      description: 'Enable or disable strict CapabilityStatement enforcement on the FHIR proxy for this server. When strict, the proxy rejects requests for interactions/operations not declared in the server\'s CapabilityStatement.',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Delete a FHIR server
  .delete('/:server_id', async ({ params, set, headers }) => {
    try {
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      await deleteServer(params.server_id)

      return {
        success: true,
        message: `FHIR server '${params.server_id}' deleted successfully`,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404
        return { error: error.message }
      }
      logger.fhir.error('Failed to delete FHIR server', { error, serverId: params.server_id })
      return handleAdminError(error, set)
    }
  }, {
    params: ServerIdParam,
    response: {
      200: t.Object({
        success: t.Boolean({ description: 'Whether the server was deleted successfully' }),
        message: t.String({ description: 'Success message' }),
      }, { title: 'DeleteFhirServerResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete FHIR Server',
      description: 'Remove a FHIR server from the system. This does not delete any patient data on the FHIR server itself.',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Refresh metadata for a FHIR server (re-fetch from origin)
  .post('/:server_id/refresh', async ({ params, set, headers }) => {
    try {
      const auth = extractBearerToken(headers)
      if (!auth) {
        set.status = 401
        return { error: 'Authentication required' }
      }

      await validateToken(auth)

      const updated = await refreshServer(params.server_id)

      return {
        success: true,
        message: `Server metadata refreshed successfully`,
        server: {
          id: updated.identifier,
          name: updated.name,
          url: updated.url,
          fhirVersion: updated.metadata.fhirVersion,
          serverName: updated.metadata.serverName || 'Unknown FHIR Server',
          supported: updated.metadata.supported,
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404
        return { error: error.message }
      }
      logger.fhir.error('Failed to refresh FHIR server metadata', { error, serverId: params.server_id })
      return handleAdminError(error, set)
    }
  }, {
    params: ServerIdParam,
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
        server: t.Object({
          id: t.String(),
          name: t.String(),
          url: t.String(),
          fhirVersion: t.String(),
          serverName: t.String(),
          supported: t.Boolean(),
        }),
      }, { title: 'RefreshFhirServerResponse' }),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Refresh FHIR Server Metadata',
      description: 'Re-fetch the CapabilityStatement from the FHIR server to update metadata like server name, version, and connection status.',
      tags: ['servers'],
      security: [{ BearerAuth: [] }]
    }
  })
