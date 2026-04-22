import { Elysia } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { CommonErrorResponses, SmartAccessControlConfig, SmartAccessControlConfigUpdateResponse } from '@/schemas'
import { logger } from '@/lib/logger'
import { getRuntimeAccessControlConfig, saveAccessControlConfig, loadRuntimeConfig, isRuntimeConfigLoaded } from '@/lib/runtime-config'

/**
 * SMART Access Control Admin Routes
 *
 * GET/PUT endpoints for scope enforcement, role-based filtering,
 * and patient-scoped resource configuration.
 */
export const smartAccessControlAdminRoutes = new Elysia({ prefix: '/smart-access-control', tags: ['admin'] })
  .use(keycloakPlugin)

  /**
   * GET /admin/smart-access-control/config
   */
  .get('/config', async ({ set, headers, getAdmin }) => {
    const token = extractBearerToken(headers)
    if (!token) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    try {
      await validateToken(token)

      if (!isRuntimeConfigLoaded()) {
        try {
          const admin = await getAdmin(token)
          await loadRuntimeConfig(admin)
        } catch { /* fall back to env vars */ }
      }

      return {
        message: 'Access control configuration retrieved',
        config: getRuntimeAccessControlConfig(),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.admin.error('Failed to get access control config', { error })
      set.status = 500
      return { error: 'Failed to get access control configuration', details: error instanceof Error ? error.message : String(error) }
    }
  }, {
    response: {
      200: SmartAccessControlConfigUpdateResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get SMART Access Control Configuration',
      description: 'Retrieve scope enforcement, role-based filtering, and patient-scoped resource settings',
      tags: ['admin'],
      security: [{ BearerAuth: [] }]
    }
  })

  /**
   * PUT /admin/smart-access-control/config
   */
  .put('/config', async ({ set, headers, body, getAdmin }) => {
    const token = extractBearerToken(headers)
    if (!token) {
      set.status = 401
      return { error: 'Authorization header required' }
    }

    try {
      const admin = await getAdmin(token)
      await saveAccessControlConfig(admin, body)

      return {
        message: 'Access control configuration updated',
        config: getRuntimeAccessControlConfig(),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.admin.error('Failed to update access control config', { error })
      set.status = 500
      return { error: 'Failed to update access control configuration', details: error instanceof Error ? error.message : String(error) }
    }
  }, {
    body: SmartAccessControlConfig,
    response: {
      200: SmartAccessControlConfigUpdateResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update SMART Access Control Configuration',
      description: 'Update scope enforcement, role-based filtering, and patient-scoped resource settings (persisted in Keycloak realm attributes)',
      tags: ['admin'],
      security: [{ BearerAuth: [] }]
    }
  })
