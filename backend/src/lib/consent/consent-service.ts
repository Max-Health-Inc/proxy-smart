/**
 * Consent Service
 * 
 * Core consent enforcement logic:
 * - Query FHIR Consent resources from upstream server
 * - Evaluate consent provisions against request context
 * - Make allow/deny decisions
 * - Audit logging
 * - Integrates with IAL (Identity Assurance Level) for Person→Patient verification
 */

import type { JwtPayload } from 'jsonwebtoken'
import type { 
  FhirConsent, 
  FhirBundle, 
  ConsentCheckContext, 
  ConsentCheckResult,
  ConsentAuditEntry,
  ConsentConfig,
  ConsentDecision,
  SmartTokenPayload,
  ConsentProvision,
  FhirPeriod,
  ConsentCheckContextWithIal,
  ConsentCheckResultWithIal
} from './types'
import { getConsentProvision, getProvisionClasses, getProvisionType } from './types'
import { consentCache } from './consent-cache'
import { checkIal, getIalConfig } from './person-resolver'
import { logger } from '../logger'
import { getRuntimeConsentConfig } from '../runtime-config'
import { consentMetricsLogger } from '../consent-metrics-logger'

/**
 * Extract patient ID from various sources
 */
function extractPatientId(
  tokenPayload: SmartTokenPayload,
  resourcePath: string
): string | null {
  // 1. From token's SMART launch context
  if (tokenPayload.smart_patient) {
    return tokenPayload.smart_patient
  }

  // 2. From resource path if accessing Patient resource directly
  const patientMatch = resourcePath.match(/^Patient\/([^/]+)/)
  if (patientMatch) {
    return patientMatch[1]
  }

  // 3. Could potentially extract from query params for searches
  // e.g., Observation?patient=Patient/123
  // For now, return null if not determinable

  return null
}

/**
 * Extract resource type from path
 */
function extractResourceType(resourcePath: string): string | null {
  if (!resourcePath || resourcePath === '/') {
    return null
  }
  
  // Handle paths like "Patient/123" or "Observation?patient=..."
  const parts = resourcePath.split(/[/?]/)
  const resourceType = parts[0]
  
  // Validate it looks like a FHIR resource type (PascalCase)
  if (resourceType && /^[A-Z][a-zA-Z]+$/.test(resourceType)) {
    return resourceType
  }
  
  return null
}

/**
 * Extract resource ID from path
 */
function extractResourceId(resourcePath: string): string | null {
  // Match patterns like "Patient/123" or "Patient/123/_history/1"
  const match = resourcePath.match(/^[A-Z][a-zA-Z]+\/([^/?]+)/)
  return match ? match[1] : null
}

/**
 * Parse scopes from token
 */
function parseScopes(tokenPayload: SmartTokenPayload): string[] {
  if (!tokenPayload.scope) {
    return []
  }
  return tokenPayload.scope.split(' ').filter(Boolean)
}

/**
 * Build consent check context from request and token
 */
export function buildConsentContext(
  tokenPayload: SmartTokenPayload,
  serverName: string,
  resourcePath: string,
  method: string
): ConsentCheckContext {
  return {
    patientId: extractPatientId(tokenPayload, resourcePath),
    clientId: tokenPayload.azp || tokenPayload.sub || 'unknown',
    resourceType: extractResourceType(resourcePath),
    resourceId: extractResourceId(resourcePath),
    method: method.toUpperCase(),
    resourcePath,
    serverName,
    scopes: parseScopes(tokenPayload),
    fhirUser: tokenPayload.fhirUser || null
  }
}

/**
 * Check if a period is currently active
 */
function isPeriodActive(period: FhirPeriod | undefined): boolean {
  if (!period) {
    return true // No period specified = always active
  }

  const now = new Date()
  
  if (period.start) {
    const start = new Date(period.start)
    if (now < start) {
      return false // Not yet started
    }
  }
  
  if (period.end) {
    const end = new Date(period.end)
    if (now > end) {
      return false // Already ended
    }
  }
  
  return true
}

/**
 * Check if consent applies to the requesting client
 */
function consentAppliesToClient(consent: FhirConsent, clientId: string): boolean {
  const provision = getConsentProvision(consent)
  if (!provision?.actor?.length) {
    // No actor restrictions = applies to all
    return true
  }

  // Check if any actor matches the client
  for (const actor of provision.actor) {
    const ref = actor.reference?.reference || ''
    const identifier = actor.reference?.identifier?.value || ''
    
    // Match by reference or identifier
    if (ref.includes(clientId) || identifier === clientId) {
      return true
    }
  }

  return false
}

/**
 * Check if consent provision covers the requested resource type
 */
function provisionCoversResourceType(provision: ConsentProvision, resourceType: string | null): boolean {
  if (!resourceType) {
    return true // Can't determine resource type, be permissive
  }

  // If no class restrictions, covers all resources
  const classes = getProvisionClasses(provision)
  if (!classes.length) {
    return true
  }

  // Check if resource type is in the class list
  // FHIR uses system "http://hl7.org/fhir/resource-types"
  for (const cls of classes) {
    if (cls.code === resourceType) {
      return true
    }
  }

  return false
}

/**
 * Evaluate a single consent against the request context
 */
function evaluateConsent(consent: FhirConsent, context: ConsentCheckContext): ConsentDecision | null {
  // Must be active status
  if (consent.status !== 'active') {
    return null
  }

  // Must apply to this client
  if (!consentAppliesToClient(consent, context.clientId)) {
    return null
  }

  const provision = getConsentProvision(consent)
  if (!provision) {
    // No provision = default permit (consent exists but no restrictions)
    return 'permit'
  }

  // Check provision period
  if (!isPeriodActive(provision.period)) {
    return null // Provision not active
  }

  // Check if provision covers the resource type
  if (!provisionCoversResourceType(provision, context.resourceType)) {
    return null // Provision doesn't apply to this resource
  }

  // Return the provision type (permit/deny)
  // Default to permit if no type specified (consent exists = permission)
  return getProvisionType(provision)
}

/**
 * Query FHIR server for Consent resources
 */
async function fetchConsents(
  serverUrl: string,
  patientId: string,
  clientId: string,
  authHeader: string
): Promise<FhirConsent[]> {
  // Build search query for active consents for this patient
  // Note: Filtering by actor (client) is done in-memory as FHIR Consent search
  // doesn't always support complex actor queries
  const searchUrl = `${serverUrl}/Consent?patient=Patient/${patientId}&status=active&_count=100`

  logger.consent.debug('Fetching consents from FHIR server', { 
    searchUrl: searchUrl.replace(serverUrl, '[server]'),
    patientId,
    clientId
  })

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/fhir+json',
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      // Log but don't throw - treat as no consents found
      logger.consent.warn('Failed to fetch consents', { 
        status: response.status,
        statusText: response.statusText
      })
      return []
    }

    const bundle = await response.json() as FhirBundle<FhirConsent>
    
    const consents = (bundle.entry || [])
      .map(entry => entry.resource)
      .filter((resource): resource is FhirConsent => 
        resource?.resourceType === 'Consent'
      )

    logger.consent.debug('Fetched consents', { 
      total: bundle.total,
      returned: consents.length 
    })

    return consents
  } catch (error) {
    logger.consent.error('Error fetching consents', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return []
  }
}

/**
 * Log consent decision for audit trail
 */
function logAuditEntry(entry: ConsentAuditEntry, extra?: { cached?: boolean; checkDurationMs?: number }): void {
  const level = entry.decision === 'deny' && entry.enforced ? 'warn' : 'info'
  
  logger.consent[level]('Consent decision', {
    decision: entry.decision,
    enforced: entry.enforced,
    mode: entry.mode,
    consentId: entry.consentId,
    patientId: entry.patientId,
    clientId: entry.clientId,
    resourceType: entry.resourceType,
    method: entry.method,
    serverName: entry.serverName,
    reason: entry.reason
  })

  // Persist to metrics logger for the monitoring dashboard
  consentMetricsLogger.logDecision({
    decision: entry.decision,
    enforced: entry.enforced,
    mode: entry.mode,
    consentId: entry.consentId,
    patientId: entry.patientId,
    clientId: entry.clientId,
    resourceType: entry.resourceType,
    resourcePath: entry.resourcePath,
    serverName: entry.serverName,
    method: entry.method,
    reason: entry.reason,
    cached: extra?.cached ?? false,
    checkDurationMs: extra?.checkDurationMs ?? 0,
  })
}

/**
 * Get consent configuration (runtime: realm attributes merged over env vars)
 */
export function getConsentConfig(): ConsentConfig {
  return getRuntimeConsentConfig()
}

/**
 * Check if consent check should be skipped for this context
 */
function shouldSkipConsentCheck(context: ConsentCheckContext, consentConfig: ConsentConfig): string | null {
  // Check if consent enforcement is disabled
  if (!consentConfig.enabled || consentConfig.mode === 'disabled') {
    return 'Consent enforcement disabled'
  }

  // Check if client is exempt
  if (consentConfig.exemptClients.includes(context.clientId)) {
    return `Client ${context.clientId} is exempt from consent checks`
  }

  // Check if resource type is exempt
  if (context.resourceType && consentConfig.exemptResourceTypes.includes(context.resourceType)) {
    return `Resource type ${context.resourceType} is exempt from consent checks`
  }

  // Check if we need consent for this resource type (if list is specified)
  if (consentConfig.requiredForResourceTypes.length > 0) {
    if (!context.resourceType || !consentConfig.requiredForResourceTypes.includes(context.resourceType)) {
      return `Resource type ${context.resourceType || 'unknown'} not in required list`
    }
  }

  // Check if we have a patient context
  if (!context.patientId) {
    return 'No patient context - cannot check consent'
  }

  return null // Don't skip
}

/**
 * Main consent check function
 */
export async function checkConsent(
  tokenPayload: JwtPayload,
  serverName: string,
  serverUrl: string,
  resourcePath: string,
  method: string,
  authHeader: string
): Promise<ConsentCheckResult> {
  const startTime = performance.now()
  const consentConfig = getConsentConfig()
  
  // Build context
  const context = buildConsentContext(
    tokenPayload as SmartTokenPayload,
    serverName,
    resourcePath,
    method
  )

  // Check if we should skip consent checking
  const skipReason = shouldSkipConsentCheck(context, consentConfig)
  if (skipReason) {
    const result: ConsentCheckResult = {
      decision: 'permit',
      consentId: null,
      reason: skipReason,
      cached: false,
      checkDurationMs: performance.now() - startTime,
      context
    }

    // Still log in audit-only mode
    if (consentConfig.mode === 'audit-only') {
      logAuditEntry({
        timestamp: new Date().toISOString(),
        decision: result.decision,
        consentId: result.consentId,
        patientId: context.patientId,
        clientId: context.clientId,
        resourceType: context.resourceType,
        resourcePath: context.resourcePath,
        serverName: context.serverName,
        method: context.method,
        scopes: context.scopes,
        reason: result.reason,
        mode: consentConfig.mode,
        enforced: false
      }, { cached: false, checkDurationMs: result.checkDurationMs })
    }

    return result
  }

  // Try cache first
  const cacheKey = {
    patientId: context.patientId!,
    clientId: context.clientId,
    serverName: context.serverName
  }
  
  let consents = consentCache.get(cacheKey)
  const cached = consents !== null

  // Fetch from FHIR server if not cached
  if (!consents) {
    consents = await fetchConsents(
      serverUrl,
      context.patientId!,
      context.clientId,
      authHeader
    )
    
    // Cache the results
    consentCache.set(cacheKey, consents, consentConfig.cacheTtl)
  }

  // Evaluate consents
  let decision: ConsentDecision = 'deny'
  let matchingConsentId: string | null = null
  let reason = 'No valid consent found for this client and resource'

  for (const consent of consents) {
    const consentDecision = evaluateConsent(consent, context)
    
    if (consentDecision === 'permit') {
      decision = 'permit'
      matchingConsentId = consent.id ? `Consent/${consent.id}` : null
      reason = `Access permitted by consent ${matchingConsentId || '(anonymous)'}`
      break // First permit wins
    } else if (consentDecision === 'deny') {
      // Explicit deny
      decision = 'deny'
      matchingConsentId = consent.id ? `Consent/${consent.id}` : null
      reason = `Access denied by consent ${matchingConsentId || '(anonymous)'}`
      // Continue checking - a later permit might override
    }
  }

  const checkDurationMs = performance.now() - startTime

  const result: ConsentCheckResult = {
    decision,
    consentId: matchingConsentId,
    reason,
    cached,
    checkDurationMs,
    context
  }

  // Log audit entry
  logAuditEntry({
    timestamp: new Date().toISOString(),
    decision: result.decision,
    consentId: result.consentId,
    patientId: context.patientId,
    clientId: context.clientId,
    resourceType: context.resourceType,
    resourcePath: context.resourcePath,
    serverName: context.serverName,
    method: context.method,
    scopes: context.scopes,
    reason: result.reason,
    mode: consentConfig.mode,
    enforced: consentConfig.mode === 'enforce'
  }, { cached, checkDurationMs })

  return result
}

/**
 * Invalidate consent cache for a patient (call when consent is updated)
 */
export function invalidateConsentCache(patientId: string, serverName?: string): void {
  consentCache.invalidatePatient(patientId, serverName)
}

/**
 * Get consent cache statistics
 */
export function getConsentCacheStats() {
  return consentCache.getStats()
}

// =============================================================================
// COMBINED CONSENT + IAL CHECK
// =============================================================================

/**
 * Build enhanced consent context with IAL info
 */
export function buildConsentContextWithIal(
  tokenPayload: SmartTokenPayload,
  serverName: string,
  resourcePath: string,
  method: string
): ConsentCheckContextWithIal {
  const baseContext = buildConsentContext(tokenPayload, serverName, resourcePath, method)
  const ialConfig = getIalConfig()
  
  return {
    ...baseContext,
    ialEnabled: ialConfig.enabled,
    ialMinimumLevel: ialConfig.minimumLevel,
    isSensitiveResource: ialConfig.enabled && 
      baseContext.resourceType !== null && 
      ialConfig.sensitiveResourceTypes.includes(baseContext.resourceType),
    // These are initially null/false, will be populated after IAL check
    assuranceLevel: null,
    assuranceLevelNumeric: null,
    patientLinkVerified: false,
    personId: null
  }
}

/**
 * Comprehensive consent and IAL check
 * 
 * This function performs both consent enforcement and IAL verification in sequence:
 * 1. First checks IAL (if enabled) to verify Person→Patient linking and assurance level
 * 2. Then performs consent checking (if enabled)
 * 3. Returns combined result with both IAL and consent decisions
 * 
 * @param tokenPayload - The decoded JWT token payload
 * @param serverName - Name of the FHIR server being accessed
 * @param serverUrl - URL of the FHIR server
 * @param resourcePath - The FHIR resource path being accessed
 * @param method - HTTP method (GET, POST, etc.)
 * @param authHeader - Authorization header for upstream FHIR calls
 */
export async function checkConsentWithIal(
  tokenPayload: JwtPayload,
  serverName: string,
  serverUrl: string,
  resourcePath: string,
  method: string,
  authHeader: string
): Promise<ConsentCheckResultWithIal> {
  const startTime = performance.now()
  const consentConfig = getConsentConfig()
  const ialConfig = getIalConfig()
  const smartToken = tokenPayload as SmartTokenPayload
  
  // Build enhanced context
  const context = buildConsentContextWithIal(
    smartToken,
    serverName,
    resourcePath,
    method
  )

  // Step 1: IAL check (if enabled)
  let ialCheckResult = null
  if (ialConfig.enabled) {
    ialCheckResult = await checkIal(
      smartToken,
      serverName,
      serverUrl,
      context.resourceType,
      authHeader
    )
    
    // If IAL check fails, deny immediately
    if (!ialCheckResult.allowed) {
      const result: ConsentCheckResultWithIal = {
        decision: 'deny',
        consentId: null,
        reason: `IAL verification failed: ${ialCheckResult.reason}`,
        cached: false,
        checkDurationMs: performance.now() - startTime,
        context,
        ialCheck: ialCheckResult
      }

      // Log audit
      logAuditEntryWithIal({
        timestamp: new Date().toISOString(),
        decision: result.decision,
        consentId: null,
        patientId: context.patientId,
        clientId: context.clientId,
        resourceType: context.resourceType,
        resourcePath: context.resourcePath,
        serverName: context.serverName,
        method: context.method,
        scopes: context.scopes,
        reason: result.reason,
        mode: consentConfig.mode,
        enforced: consentConfig.mode === 'enforce',
        ialCheck: ialCheckResult
      }, { cached: false, checkDurationMs: result.checkDurationMs })

      return result
    }
  }

  // Step 2: Consent check
  const consentResult = await checkConsent(
    tokenPayload,
    serverName,
    serverUrl,
    resourcePath,
    method,
    authHeader
  )

  // Combine results
  const combinedResult: ConsentCheckResultWithIal = {
    ...consentResult,
    context,
    ialCheck: ialCheckResult
  }

  // Add IAL info to reason if both checks passed
  if (ialCheckResult && consentResult.decision === 'permit') {
    combinedResult.reason = `${consentResult.reason} (IAL: ${ialCheckResult.actualLevel ?? 'n/a'})`
  }

  combinedResult.checkDurationMs = performance.now() - startTime

  return combinedResult
}

/**
 * Log consent + IAL audit entry
 */
function logAuditEntryWithIal(entry: ConsentAuditEntry & { ialCheck?: { allowed: boolean; actualLevel: string | null; requiredLevel: string; isSensitiveResource: boolean } | null }, extra?: { cached?: boolean; checkDurationMs?: number }): void {
  const level = entry.decision === 'deny' && entry.enforced ? 'warn' : 'info'
  
  logger.consent[level]('Consent+IAL decision', {
    decision: entry.decision,
    enforced: entry.enforced,
    mode: entry.mode,
    consentId: entry.consentId,
    patientId: entry.patientId,
    clientId: entry.clientId,
    resourceType: entry.resourceType,
    method: entry.method,
    serverName: entry.serverName,
    reason: entry.reason,
    ial: entry.ialCheck ? {
      allowed: entry.ialCheck.allowed,
      level: entry.ialCheck.actualLevel,
      required: entry.ialCheck.requiredLevel,
      sensitive: entry.ialCheck.isSensitiveResource
    } : null
  })

  // Persist to metrics logger for the monitoring dashboard
  consentMetricsLogger.logDecision({
    decision: entry.decision,
    enforced: entry.enforced,
    mode: entry.mode,
    consentId: entry.consentId,
    patientId: entry.patientId,
    clientId: entry.clientId,
    resourceType: entry.resourceType,
    resourcePath: entry.resourcePath,
    serverName: entry.serverName,
    method: entry.method,
    reason: entry.reason,
    cached: extra?.cached ?? false,
    checkDurationMs: extra?.checkDurationMs ?? 0,
    ial: entry.ialCheck ?? null,
  })
}
