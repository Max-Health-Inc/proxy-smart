import { Elysia } from 'elysia'
import { logger } from '@/lib/logger'
import { extractBearerToken } from '@/lib/admin-utils'
import { validateAdminToken } from '@/lib/auth'
import { ErrorResponse, ServerOperationResponse } from '@/schemas'
import { smartAppsRoutes } from './smart-apps'
import { healthcareUsersRoutes } from './healthcare-users'
import { rolesRoutes } from './roles'
import { launchContextRoutes } from './launch-contexts'
import { identityProvidersRoutes } from './identity-providers'
import { smartConfigAdminRoutes } from './smart-config'
import { clientRegistrationSettingsRoutes } from './client-registration-settings'
import { keycloakConfigRoutes } from './keycloak-config'
import { aiRoutes, aiPublicRoutes } from './ai'
import { mcpEndpointAdminRoutes } from './mcp-endpoint'
import { consentAdminRoutes } from './consent'
import { smartAccessControlAdminRoutes } from './smart-access-control'
import { accessControlRoutes } from './access-control'
import { userFederationRoutes } from './user-federation'
import { brandingAdminRoutes } from './branding'
import { scopeMappersRoutes } from './scope-mappers'
import { smartScopesRoutes } from './smart-scopes'
import { documentImportRoutes } from './document-import'
import { organizationsRoutes } from './organizations'
import { appStoreAdminRoutes } from './app-store'
import { clientPoliciesRoutes } from './client-policies'
import { dicomServersAdminRoutes } from './dicom-servers'
import { initializeToolRegistry } from '@/lib/ai/tool-registry'
import { adminAuditPlugin } from '@/lib/admin-audit-middleware'

/**
 * Admin routes aggregator - combines all admin functionality
 */
export const adminRoutes = new Elysia({ prefix: '/admin' })
  // Audit middleware — logs every admin mutation with actor identity
  .use(adminAuditPlugin)
  // Add public AI health check routes first (no auth required)
  .use(aiPublicRoutes)
  // Then add authentication guard for protected routes
  .guard({
    detail: {
      security: [{ BearerAuth: [] }]
    }
  })
  // Operational: Shutdown server
  .post('/shutdown', async ({ set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Unauthorized', details: 'Bearer token required' } }
      await validateAdminToken(token)
      logger.server.info('🛑 Shutdown requested via admin API')
      setTimeout(() => {
        logger.server.info('🛑 Shutting down server...')
        process.exit(0)
      }, 100)
      return { success: true, message: 'Server shutdown initiated', timestamp: new Date().toISOString() }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to shutdown server', details: error instanceof Error ? error.message : 'An unexpected error occurred' }
    }
  }, {
    response: {
      200: ServerOperationResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Shutdown Server',
      description: 'Gracefully shutdown the SMART on FHIR server (admin only)',
      tags: ['admin']
    }
  })
  // Operational: Restart server
  .post('/restart', async ({ set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Unauthorized', details: 'Bearer token required' } }
      await validateAdminToken(token)
      logger.server.info('🔄 Restart requested via admin API')
      setTimeout(() => {
        logger.server.info('🔄 Restarting server...')
        process.exit(1)
      }, 100)
      return { success: true, message: 'Server restart initiated', timestamp: new Date().toISOString() }
    } catch (error) {
      set.status = 500
      return { error: 'Failed to restart server', details: error instanceof Error ? error.message : 'An unexpected error occurred' }
    }
  }, {
    response: {
      200: ServerOperationResponse,
      500: ErrorResponse
    },
    detail: {
      summary: 'Restart Server',
      description: 'Restart the SMART on FHIR server (admin only)',
      tags: ['admin']
    }
  })
  .use(smartAppsRoutes)
  .use(healthcareUsersRoutes)
  .use(rolesRoutes)
  .use(launchContextRoutes)
  .use(identityProvidersRoutes)
  .use(smartConfigAdminRoutes)
  .use(brandingAdminRoutes)
  .use(clientRegistrationSettingsRoutes)
  .use(keycloakConfigRoutes)
  // MCP endpoint (built-in Streamable HTTP MCP server) management
  .use(mcpEndpointAdminRoutes)
  // Consent enforcement management
  .use(consentAdminRoutes)
  // SMART access control (scope enforcement, role-based filtering)
  .use(smartAccessControlAdminRoutes)
  // Physical access control (Kisi / UniFi Access)
  .use(accessControlRoutes)
  // LDAP User Federation management
  .use(userFederationRoutes)
  // SMART scope protocol mapper management
  .use(scopeMappersRoutes)
  // SMART client scope CRUD management
  .use(smartScopesRoutes)
  // Document import (PDF → AI → FHIR)
  .use(documentImportRoutes)
  // Keycloak Organizations management
  .use(organizationsRoutes)
  // App Store visibility management
  .use(appStoreAdminRoutes)
  // Keycloak Client Policies & CIMD management
  .use(clientPoliciesRoutes)
  // DICOM/PACS server management
  .use(dicomServersAdminRoutes)
  // AI assistant routes with internal tool execution
  .use(aiRoutes)

// Initialize the tool registry once at startup
initializeToolRegistry(adminRoutes, {
  prefixes: [
    '/admin/',        // Admin routes (healthcare users, SMART apps, etc.)
    '/fhir-servers/', // FHIR server management
  ]
})
