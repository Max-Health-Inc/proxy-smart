import { Elysia } from 'elysia'
import { logger } from '@/lib/logger'
import { config } from '@/config'
import { extractBearerToken } from '@/lib/admin-utils'
import { validateAdminToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import {
  TestKeycloakConnectionRequest,
  TestKeycloakConnectionResponse,
  SaveKeycloakConfigRequest,
  SaveKeycloakConfigResponse,
  KeycloakConfigResponse,
  KeycloakFrontendUrlResponse,
  SetKeycloakFrontendUrlRequest,
  SetKeycloakFrontendUrlResponse,
  type SaveKeycloakConfigRequestType
} from '@/schemas/admin/keycloak'
import { ErrorResponse } from '@/schemas'
import { createAdminClient } from '@/lib/keycloak-plugin'

/**
 * Keycloak Configuration Management
 * Allows manual configuration of Keycloak connection when startup fails
 */

const ENV_FILE_PATH = path.join(process.cwd(), '.env')

/**
 * Update environment variables in .env file and process.env
 */
function updateConfiguration(keycloakConfig: SaveKeycloakConfigRequestType): void {
  let envContent = ''
  
  // Read existing .env file if it exists
  if (fs.existsSync(ENV_FILE_PATH)) {
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8')
  }
  
  // Parse existing env vars
  const envVars = new Map<string, string>()
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        envVars.set(key.trim(), valueParts.join('=').trim())
      }
    }
  })
  
  // Update Keycloak configuration in both .env file and process.env
  envVars.set('KEYCLOAK_BASE_URL', keycloakConfig.baseUrl)
  envVars.set('KEYCLOAK_REALM', keycloakConfig.realm)
  process.env.KEYCLOAK_BASE_URL = keycloakConfig.baseUrl
  process.env.KEYCLOAK_REALM = keycloakConfig.realm
  
  // Set admin client credentials if provided
  if (keycloakConfig.adminClientId) {
    envVars.set('KEYCLOAK_ADMIN_CLIENT_ID', keycloakConfig.adminClientId)
    process.env.KEYCLOAK_ADMIN_CLIENT_ID = keycloakConfig.adminClientId
  }
  if (keycloakConfig.adminClientSecret) {
    envVars.set('KEYCLOAK_ADMIN_CLIENT_SECRET', keycloakConfig.adminClientSecret)
    process.env.KEYCLOAK_ADMIN_CLIENT_SECRET = keycloakConfig.adminClientSecret
  }
  
  // Rebuild .env file content
  const lines: string[] = []
  
  // Add header comment
  lines.push('# Base URL for the proxy')
  if (envVars.has('BASE_URL')) {
    lines.push(`BASE_URL=${envVars.get('BASE_URL')}`)
  }
  lines.push('')
  
  // Keycloak section
  lines.push('# Keycloak configuration')
  lines.push(`KEYCLOAK_BASE_URL=${keycloakConfig.baseUrl}`)
  if (envVars.has('KEYCLOAK_DOMAIN')) {
    lines.push(`KEYCLOAK_DOMAIN=${envVars.get('KEYCLOAK_DOMAIN')}`)
  }
  lines.push(`KEYCLOAK_REALM=${keycloakConfig.realm}`)
  
  // Admin client credentials for dynamic registration
  if (keycloakConfig.adminClientId || keycloakConfig.adminClientSecret) {
    lines.push('')
    lines.push('# Admin client for dynamic client registration')
    if (keycloakConfig.adminClientId) {
      lines.push(`KEYCLOAK_ADMIN_CLIENT_ID=${keycloakConfig.adminClientId}`)
    }
    if (keycloakConfig.adminClientSecret) {
      lines.push(`KEYCLOAK_ADMIN_CLIENT_SECRET=${keycloakConfig.adminClientSecret}`)
    }
  }
  
  lines.push('')
  
  // FHIR section
  lines.push('# FHIR server configuration')
  if (envVars.has('FHIR_SERVER_BASE')) {
    lines.push(`FHIR_SERVER_BASE=${envVars.get('FHIR_SERVER_BASE')}`)
  }
  if (envVars.has('FHIR_SUPPORTED_VERSIONS')) {
    lines.push(`FHIR_SUPPORTED_VERSIONS=${envVars.get('FHIR_SUPPORTED_VERSIONS')}`)
  }
  lines.push('')
  
  // Port section
  lines.push('# Optional: Custom port (defaults to 8445)')
  if (envVars.has('PORT')) {
    lines.push(`PORT=${envVars.get('PORT')}`)
  }
  
  // Write back to file
  fs.writeFileSync(ENV_FILE_PATH, lines.join('\n'))
}

/**
 * Test Keycloak connection
 */
async function testKeycloakConnection(baseUrl: string, realm: string): Promise<boolean> {
  try {
    const realmUrl = `${baseUrl}/realms/${realm}`
    const response = await fetch(realmUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Realm endpoint returned ${response.status}: ${response.statusText}`)
    }
    
    const realmInfo = await response.json()
    return !!(realmInfo.realm === realm)
  } catch (error) {
    logger.admin.error('Keycloak connection test failed', { error, baseUrl, realm })
    return false
  }
}

export const keycloakConfigRoutes = new Elysia({ prefix: '/keycloak-config', tags: ['admin'] })
  
  // Get current Keycloak configuration status
  .get('/status', async ({ headers, set }) => {
    const token = extractBearerToken(headers)
    if (!token) { set.status = 401; return { error: 'Unauthorized', details: 'Bearer token required' } }
    await validateAdminToken(token)
    return {
      baseUrl: config.keycloak.baseUrl,
      realm: config.keycloak.realm,
      hasAdminClient: !!(config.keycloak.adminClientId && config.keycloak.adminClientSecret),
      adminClientId: config.keycloak.adminClientId || null
    }
  }, {
    detail: {
      summary: 'Get Keycloak Admin Configuration',
      description: 'Get current Keycloak settings for administrative purposes. Use /auth/config for public availability check.',
      tags: ['admin']
    },
    response: {
      200: KeycloakConfigResponse,
      401: ErrorResponse
    }
  })
  
  // Test Keycloak connection without saving
  .post('/test', async ({ body, set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { success: false, error: 'Bearer token required' } }
      await validateAdminToken(token)
      const isConnected = await testKeycloakConnection(body.baseUrl, body.realm)
      
      if (!isConnected) {
        set.status = 400
        return {
          success: false,
          error: 'Unable to connect to Keycloak or realm not found'
        }
      }
      
      return {
        success: true,
        message: 'Successfully connected to Keycloak realm'
      }
    } catch (error) {
      logger.admin.error('Keycloak connection test failed', { error })
      set.status = 500
      return {
        success: false,
        error: 'Connection test failed'
      }
    }
  }, {
    body: TestKeycloakConnectionRequest,
    detail: {
      summary: 'Test Keycloak Connection',
      description: 'Test connection to Keycloak without saving configuration',
      tags: ['admin']
    },
    response: {
      200: TestKeycloakConnectionResponse
    }
  })
  
  // Configure Keycloak connection
  .post('/configure', async ({ body, set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { success: false, error: 'Bearer token required' } }
      await validateAdminToken(token)
      // First test the connection
      const isConnected = await testKeycloakConnection(body.baseUrl, body.realm)
      
      if (!isConnected) {
        set.status = 400
        return {
          success: false,
          error: 'Unable to connect to Keycloak or realm not found. Please verify the URL and realm name.'
        }
      }
      
      // Update .env file
      updateConfiguration({
        baseUrl: body.baseUrl,
        realm: body.realm,
        adminClientId: body.adminClientId,
        adminClientSecret: body.adminClientSecret
      })
      
      logger.admin.info('Keycloak configuration updated', {
        baseUrl: body.baseUrl,
        realm: body.realm,
        hasAdminClient: !!(body.adminClientId && body.adminClientSecret)
      })
      
      return {
        success: true,
        message: 'Keycloak configuration updated successfully. Please restart the server for full effect.',
        restartRequired: true
      }
    } catch (error) {
      logger.admin.error('Failed to configure Keycloak', { error })
      set.status = 500
      return {
        success: false,
        error: 'Failed to save Keycloak configuration'
      }
    }
  }, {
    body: SaveKeycloakConfigRequest,
    detail: {
      summary: 'Configure Keycloak Connection',
      description: 'Save Keycloak configuration to environment and restart connection',
      tags: ['admin']
    },
    response: {
      200: SaveKeycloakConfigResponse
    }
  })

  // Get current Keycloak realm frontend URL
  .get('/frontend-url', async ({ headers, set }) => {
    const token = extractBearerToken(headers)
    if (!token) { set.status = 401; return { error: 'Unauthorized', details: 'Bearer token required' } }

    try {
      const kcAdmin = await createAdminClient(token)
      const realm = await kcAdmin.realms.findOne({ realm: config.keycloak.realm! })

      if (!realm) {
        set.status = 404
        return { frontendUrl: null, effectiveTokenEndpoint: null, realm: config.keycloak.realm }
      }

      const frontendUrl = (realm.attributes as Record<string, string>)?.frontendUrl || null
      const effectiveBase = frontendUrl || config.keycloak.publicUrl || config.keycloak.baseUrl
      const effectiveTokenEndpoint = effectiveBase
        ? `${effectiveBase}/realms/${config.keycloak.realm}/protocol/openid-connect/token`
        : null

      return { frontendUrl, effectiveTokenEndpoint, realm: config.keycloak.realm }
    } catch (error) {
      logger.admin.error('Failed to fetch Keycloak frontend URL', { error })
      set.status = 500
      return { frontendUrl: null, effectiveTokenEndpoint: null, realm: config.keycloak.realm }
    }
  }, {
    detail: {
      summary: 'Get Keycloak Frontend URL',
      description: 'Get the realm frontend URL that Keycloak uses as its canonical base for token endpoint audience validation. Backend Services clients must set JWT aud to match this.',
      tags: ['admin']
    },
    response: {
      200: KeycloakFrontendUrlResponse,
      401: ErrorResponse
    }
  })

  // Set Keycloak realm frontend URL
  .post('/frontend-url', async ({ body, headers, set }) => {
    const token = extractBearerToken(headers)
    if (!token) { set.status = 401; return { success: false, error: 'Bearer token required' } }

    try {
      const kcAdmin = await createAdminClient(token)
      const realmName = config.keycloak.realm!
      const realm = await kcAdmin.realms.findOne({ realm: realmName })

      if (!realm) {
        set.status = 404
        return { success: false, error: `Realm '${realmName}' not found` }
      }

      // Update the realm's attributes.frontendUrl
      const attributes = (realm.attributes || {}) as Record<string, string>
      if (body.frontendUrl) {
        attributes.frontendUrl = body.frontendUrl
      } else {
        delete attributes.frontendUrl
      }

      await kcAdmin.realms.update({ realm: realmName }, {
        ...realm,
        attributes
      })

      const effectiveBase = body.frontendUrl || config.keycloak.publicUrl || config.keycloak.baseUrl
      logger.admin.info('Keycloak frontend URL updated', {
        realm: realmName,
        frontendUrl: body.frontendUrl || '(cleared)',
        effectiveTokenEndpoint: `${effectiveBase}/realms/${realmName}/protocol/openid-connect/token`
      })

      return {
        success: true,
        message: body.frontendUrl
          ? `Frontend URL set to ${body.frontendUrl}. Keycloak will now accept JWTs with aud matching this base URL.`
          : 'Frontend URL cleared. Keycloak will use its internal URL for audience validation.',
        frontendUrl: body.frontendUrl || null
      }
    } catch (error) {
      logger.admin.error('Failed to set Keycloak frontend URL', { error })
      set.status = 500
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update frontend URL' }
    }
  }, {
    body: SetKeycloakFrontendUrlRequest,
    detail: {
      summary: 'Set Keycloak Frontend URL',
      description: 'Configure the realm frontend URL so Keycloak accepts Backend Services JWT assertions with aud matching the proxy token endpoint. This enables transparent pass-through of client_credentials + private_key_jwt requests.',
      tags: ['admin']
    },
    response: {
      200: SetKeycloakFrontendUrlResponse,
      401: ErrorResponse
    }
  })

