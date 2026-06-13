import jwt, { type JwtPayload } from 'jsonwebtoken'
import jwksClient, { type JwksClient } from 'jwks-rsa'
import { config } from '../config'
import { AuthenticationError, ConfigurationError } from './admin-utils'
import { logger } from './logger'
import { isAudienceAccepted } from './token-audience'

/** Options for {@link validateToken}. */
export interface ValidateTokenOptions {
  /**
   * Expected audience(s) for this call site. SMART on FHIR endpoints accept
   * different audiences (proxy client id for admin/MCP; FHIR resource base URL
   * for the FHIR/DICOM proxy). When omitted, a config-derived default set of
   * acceptable audiences applies. Audience is ALWAYS enforced (fail-closed)
   * unless the `JWT_AUDIENCE_ENFORCEMENT=disabled` escape hatch is set.
   */
  audience?: string | string[]
}

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
 * Audience binding: in addition to signature/expiry/issuer, the token's
 * `aud`/`azp` is bound to an acceptable audience (fail-closed). Call sites pass
 * their expected audience via {@link ValidateTokenOptions}; when omitted, a
 * config-derived default set applies. This prevents cross-audience token replay
 * (e.g. a patient-facing SMART app token being accepted at /mcp or admin routes).
 *
 * @param token JWT token to validate
 * @param options Optional audience expectations (see {@link ValidateTokenOptions})
 * @returns Decoded token payload
 * @throws AuthenticationError for invalid/expired tokens or audience mismatch
 */
export async function validateToken(token: string, options?: ValidateTokenOptions): Promise<JwtPayload> {
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

    // NOTE: audience is enforced manually below (after verify) rather than via
    // jwt.verify's `audience` option, because we must also honour `azp` and
    // prefix-match resource-server base URLs — neither of which jwt.verify does.

    // Verify the token (signature + expiry + issuer)
    const verified = jwt.verify(token, key, verifyOptions) as JwtPayload
    logger.auth.debug('Token verified successfully')

    // Audience binding (fail-closed). Determine the expected audience(s):
    //  - explicit per-call-site audience (options.audience), else
    //  - the legacy JWT_EXPECTED_AUDIENCE env var (back-compat), else
    //  - the config-derived default acceptable-audience set.
    const expectedAudience = options?.audience ?? process.env.JWT_EXPECTED_AUDIENCE ?? undefined
    if (!isAudienceAccepted(verified.aud, (verified as Record<string, unknown>).azp, expectedAudience)) {
      logger.auth.warn('Token rejected — audience not accepted', {
        aud: verified.aud,
        azp: (verified as Record<string, unknown>).azp,
        expectedAudience,
      })
      throw new AuthenticationError('Token audience is not accepted by this resource')
    }

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
  // Admin tokens are bound to the proxy's own client audience (admin-ui / MCP
  // client), NOT a FHIR resource base. Pass that expectation explicitly so an
  // FHIR-base-audienced (patient-app) token can never reach admin operations.
  // When no admin client id is configured, fall back to the default audience
  // set (still fail-closed) so admin validation does not silently break.
  const adminAudience = config.keycloak.adminClientId
  const payload = adminAudience
    ? await validateToken(token, { audience: adminAudience })
    : await validateToken(token)
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
