import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { logger } from './logger'

/**
 * SMART EHR Launch Code Service
 * 
 * Issues and verifies stateless signed JWT launch codes per SMART App Launch 2.2.0.
 * The launch code encodes the EHR context (patient, encounter, intent, etc.) as a
 * self-contained, tamper-proof, time-limited token.
 * 
 * Flow:
 *   1. EHR/MCP agent → POST /auth/launch → receives {launch: "<JWT>"}
 *   2. App → GET /auth/authorize?launch=<JWT>&scope=launch...
 *   3. Proxy verifies JWT → resolves context → sets user attributes → redirects to Keycloak
 */

/** Payload embedded in the launch code JWT */
export interface LaunchCodePayload {
  /** Keycloak user ID this launch context was prepared for */
  userId?: string
  /** Patient ID in context (FHIR resource ID, e.g., "Patient/123" or just "123") */
  patient?: string
  /** Encounter ID in context */
  encounter?: string
  /** FHIR user reference (e.g., "Practitioner/456") */
  fhirUser?: string
  /** Intent string (e.g., "order-review", "reconcile-medications") */
  intent?: string
  /** SMART style URL */
  smartStyleUrl?: string
  /** Tenant identifier */
  tenant?: string
  /** Whether patient banner is needed */
  needPatientBanner?: boolean
  /** fhirContext array (serialized as JSON string) */
  fhirContext?: string
  /** Target client_id this launch code is intended for (optional validation) */
  clientId?: string
}

/** Result of verifying a launch code */
export interface LaunchCodeContext {
  payload: LaunchCodePayload
  /** Seconds until expiry */
  remainingTtl: number
}

/**
 * Signs a new launch code JWT with the configured HMAC secret.
 * 
 * @param payload - The SMART launch context to embed
 * @returns Signed JWT string (the launch code)
 */
export function signLaunchCode(payload: LaunchCodePayload): string {
  const ttl = config.smart.launchCodeTtlSeconds

  const token = jwt.sign(
    { ...payload, type: 'smart_launch' },
    config.smart.launchSecret,
    {
      algorithm: 'HS256',
      expiresIn: ttl,
      issuer: config.baseUrl,
    }
  )

  logger.auth.debug('Launch code issued', {
    patient: payload.patient,
    encounter: payload.encounter,
    intent: payload.intent,
    clientId: payload.clientId,
    ttl,
  })

  return token
}

/**
 * Verifies a launch code JWT and returns the embedded context.
 * 
 * @param code - The launch code to verify
 * @returns Decoded launch context or null if invalid/expired
 */
export function verifyLaunchCode(code: string): LaunchCodeContext | null {
  try {
    const decoded = jwt.verify(code, config.smart.launchSecret, {
      algorithms: ['HS256'],
      issuer: config.baseUrl,
    }) as jwt.JwtPayload & LaunchCodePayload & { type?: string }

    // Validate it's actually a launch code (not some other JWT)
    if (decoded.type !== 'smart_launch') {
      logger.auth.warn('Launch code verification failed: invalid type claim', { type: decoded.type })
      return null
    }

    const remainingTtl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0

    const payload: LaunchCodePayload = {
      ...(decoded.userId && { userId: decoded.userId }),
      ...(decoded.patient && { patient: decoded.patient }),
      ...(decoded.encounter && { encounter: decoded.encounter }),
      ...(decoded.fhirUser && { fhirUser: decoded.fhirUser }),
      ...(decoded.intent && { intent: decoded.intent }),
      ...(decoded.smartStyleUrl && { smartStyleUrl: decoded.smartStyleUrl }),
      ...(decoded.tenant && { tenant: decoded.tenant }),
      ...(decoded.needPatientBanner !== undefined && { needPatientBanner: decoded.needPatientBanner }),
      ...(decoded.fhirContext && { fhirContext: decoded.fhirContext }),
      ...(decoded.clientId && { clientId: decoded.clientId }),
    }

    logger.auth.debug('Launch code verified', {
      patient: payload.patient,
      encounter: payload.encounter,
      remainingTtl,
    })

    return { payload, remainingTtl }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.auth.warn('Launch code expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.auth.warn('Launch code verification failed', {
        message: error.message,
      })
    } else {
      logger.auth.error('Launch code verification unexpected error', { error })
    }
    return null
  }
}
