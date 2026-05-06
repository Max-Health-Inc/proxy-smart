import jwt, { type JwtPayload } from 'jsonwebtoken'
import jwksClient, { type JwksClient } from 'jwks-rsa'
import { config } from '../config'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { logger } from './logger'

/** Keycloak-specific JWT payload with realm/resource access claims */
export interface KeycloakJwtPayload extends JwtPayload {
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  preferred_username?: string
  email?: string
  name?: string
}

/**
 * Lazy JWKS client that re-creates itself when the configured JWKS URI changes.
 * This is necessary because the Keycloak realm/URL can be changed at runtime
 * via the admin keycloak-config endpoint.
 */
let _jwks: JwksClient | null = null
let _jwksUri: string | null = null

function getJwksClient(): JwksClient {
  const currentUri = config.keycloak.jwksUri
  if (!currentUri) {
    throw new ConfigurationError('Keycloak is not configured - cannot validate tokens')
  }
  // Re-create the client if the URI changed (e.g. realm was reconfigured)
  if (!_jwks || _jwksUri !== currentUri) {
    _jwks = jwksClient({ jwksUri: currentUri, cache: true, rateLimit: true })
    _jwksUri = currentUri
    logger.auth.debug('JWKS client (re-)initialized', { jwksUri: currentUri })
  }
  return _jwks
}

async function getKey(header: jwt.JwtHeader) {
  try {
    const client = getJwksClient()
    
    logger.auth.debug('Fetching signing key', { kid: header.kid, alg: header.alg })
    const key = await client.getSigningKey(header.kid!)
    logger.auth.debug('Successfully fetched signing key')
    return key.getPublicKey()
  } catch (error) {
    logger.auth.error('Failed to fetch signing key', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      kid: header.kid,
      jwksUri: config.keycloak.jwksUri
    })
    throw error
  }
}

/**
 * Validates a JWT token using Keycloak's public keys.
 * Verifies signature, expiry, and issuer (iss).
 *
 * @param token JWT token to validate
 * @returns Decoded token payload
 * @throws AuthenticationError for invalid/expired tokens
 */
export async function validateToken(token: string): Promise<JwtPayload> {
  try {
    logger.auth.debug('Starting token validation')
    
    // First decode without verification to check structure
    const decoded = jwt.decode(token, { complete: true }) as { header: jwt.JwtHeader; payload: JwtPayload }
    
    if (!decoded || !decoded.header) {
      logger.auth.warn('Token has invalid format - missing header')
      throw new AuthenticationError('Invalid token format')
    }
    
    logger.auth.debug('Token decoded successfully', { 
      alg: decoded.header.alg,
      typ: decoded.header.typ,
      kid: decoded.header.kid,
      issuer: decoded.payload?.iss,
      subject: decoded.payload?.sub,
      audience: decoded.payload?.aud
    })
    
    // Get the signing key
    const key = await getKey(decoded.header)
    
    // Build verify options — enforce issuer when configured
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
    }
    const expectedIssuer = config.keycloak.expectedIssuer
    if (expectedIssuer) {
      verifyOptions.issuer = expectedIssuer
    }

    // Enforce audience only when explicitly configured via env var.
    // Do NOT default to adminClientId — that would reject all non-admin tokens
    // (patient-portal, SMART apps, etc. each have their own aud claim).
    const expectedAudience = process.env.JWT_EXPECTED_AUDIENCE
    if (expectedAudience) {
      verifyOptions.audience = expectedAudience
    }

    // Verify the token (signature + expiry + issuer + audience)
    const verified = jwt.verify(token, key, verifyOptions) as JwtPayload
    logger.auth.debug('Token verified successfully')
    
    return verified
  } catch (error) {
    logger.auth.error('Token validation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    })
    
    // Check for specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(`Invalid token: ${(error as Error).message}`)
    } else if (error instanceof jwt.NotBeforeError) {
      throw new AuthenticationError('Token not yet valid')
    } else if (error instanceof AuthenticationError) {
      // Re-throw authentication errors
      throw error
    } else {
      // For any other errors (e.g., JWKS fetch errors), throw as authentication error
      throw new AuthenticationError(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Validates a JWT token AND checks that the user has admin roles.
 * Use this for sensitive operations that require elevated privileges.
 *
 * @param token JWT token to validate
 * @returns Decoded token payload (guaranteed to have admin roles)
 * @throws AuthenticationError for invalid tokens or missing admin roles
 */
export async function validateAdminToken(token: string): Promise<JwtPayload> {
  const payload = await validateToken(token)
  const keycloakPayload = payload as KeycloakJwtPayload

  const realmRoles: string[] = keycloakPayload.realm_access?.roles || []
  const clientRoles: string[] = keycloakPayload.resource_access?.['admin-ui']?.roles || []
  const realmManagementRoles: string[] = keycloakPayload.resource_access?.['realm-management']?.roles || []

  // Exact role matching — do NOT use .includes() which allows substring matches
  const ADMIN_REALM_ROLES = new Set(['admin', 'realm-admin', 'manage-users', 'manage-realm', 'realm-management'])
  const ADMIN_CLIENT_ROLES = new Set(['admin', 'manage-users', 'manage-clients', 'manage-realm'])

  const hasAdminRole =
    realmRoles.some((role: string) => ADMIN_REALM_ROLES.has(role)) ||
    clientRoles.some((role: string) => ADMIN_CLIENT_ROLES.has(role)) ||
    realmManagementRoles.length > 0 // Any realm-management role implies admin access

  if (!hasAdminRole) {
    throw new AuthenticationError('User does not have admin permissions')
  }

  return payload
}
