import type { Context } from 'elysia'
import { AuthenticationError, UNAUTHORIZED_RESPONSE } from './admin-utils'
import { logger } from './logger'

/**
 * Centralized error handler for admin routes that use Keycloak
 * Handles authentication errors and Keycloak status code propagation
 */
export function handleAdminError(error: unknown, set: Context['set']) {
  logger.admin.info('HTTP Error in admin endpoint', { error })
  
  // Check if it's an authentication error
  if (error instanceof AuthenticationError) {
    logger.admin.warn('AuthenticationError detected, returning 401')
    set.status = 401
    return UNAUTHORIZED_RESPONSE
  }
  
  // Extract actual HTTP status from Keycloak response if available
  const errorObj = error as Record<string, unknown>;
  const response = errorObj?.response as Record<string, unknown> | undefined;
  const keycloakStatus = response?.status as number | undefined;
  
  if (keycloakStatus && typeof keycloakStatus === 'number') {
    logger.admin.warn(`Returning Keycloak status: ${keycloakStatus}`)
    set.status = keycloakStatus
    
    // Return appropriate response based on status
    if (keycloakStatus === 401) {
      return UNAUTHORIZED_RESPONSE
    } else if (keycloakStatus === 403) {
      return { error: 'Forbidden - Insufficient permissions' }
    } else {
      return { error: 'Keycloak error', details: sanitizeErrorForResponse(error) }
    }
  }
  
  // Fallback to 500 for unknown errors
  logger.admin.error('Unknown error, returning 500')
  set.status = 500
  return { error: 'Internal server error', details: sanitizeErrorForResponse(error) }
}

/**
 * Sanitize error details before sending in HTTP response.
 * Removes stack traces and internal file paths to prevent information disclosure.
 */
function sanitizeErrorForResponse(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}


