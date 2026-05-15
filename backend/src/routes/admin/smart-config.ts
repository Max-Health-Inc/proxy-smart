import { Elysia } from 'elysia'
import { smartConfigService } from '@/lib/smart-config'
import { brandBundleService } from '@/lib/brand-bundle'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { handleAdminError } from '@/lib/admin-error-handler'
import { CommonErrorResponses, SmartConfigRefreshResponse, type SmartConfigurationResponseType } from '@/schemas'

/**
 * SMART Configuration Admin endpoints
 */
export const smartConfigAdminRoutes = new Elysia({ prefix: '/smart-config', tags: ['admin'] })
  .post('/refresh', async ({ set, headers }) => {
    // Require authentication for cache management
    const auth = extractBearerToken(headers)
    if (!auth) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    try {
      await validateToken(auth)

      // Clear both SMART config and brand bundle caches
      smartConfigService.clearCache()
      brandBundleService.clearCache()
      const freshConfig = await smartConfigService.getSmartConfiguration()

      return {
        message: 'SMART configuration and brand bundle caches refreshed successfully',
        timestamp: new Date().toISOString(),
        config: freshConfig as SmartConfigurationResponseType
      }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    response: {
      200: SmartConfigRefreshResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Refresh SMART Configuration Cache',
      description: 'Manually refresh the cached SMART configuration and User-Access Brand Bundle from Keycloak',
      tags: ['admin', 'smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })
