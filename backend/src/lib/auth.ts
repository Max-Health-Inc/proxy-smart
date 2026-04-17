import jwt, { JwtPayload } from 'jsonwebtoken'
import jwksClient, { JwksClient } from 'jwks-rsa'
import { config } from '../config'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { logger } from './logger'

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
    const verifyOptions: jwt.VerifyOptions = {}
    const expectedIssuer = config.keycloak.expectedIssuer
    if (expectedIssuer) {
      verifyOptions.issuer = expectedIssuer
    }

    // Verify the token (signature + expiry + issuer)
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

  const realmRoles: string[] = (payload as any).realm_access?.roles || []
  const clientRoles: string[] = (payload as any).resource_access?.['admin-ui']?.roles || []
  const realmManagementRoles: string[] = (payload as any).resource_access?.['realm-management']?.roles || []

  const hasAdminRole =
    realmRoles.some((role: string) =>
      role.includes('admin') || role.includes('manage') || role.includes('realm-management')
    ) ||
    clientRoles.some((role: string) =>
      role.includes('admin') || role.includes('manage')
    ) ||
    realmManagementRoles.some((role: string) =>
      role.includes('admin') || role.includes('manage')
    )

  if (!hasAdminRole) {
    throw new AuthenticationError('User does not have admin permissions')
  }

  return payload
}
