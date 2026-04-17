/**
 * SMART on FHIR Access Control
 *
 * Three independent, opt-in access control features for the FHIR proxy:
 *
 * 1. **SMART Scope Enforcement** — validates token scopes against requested resources
 *    (supports SMART v1 `read`/`write` and v2 `cruds` character formats)
 *
 * 2. **Role-Based Data Isolation** — Practitioners see only their assigned patients;
 *    patients see only their own data (via `fhirUser` claim)
 *
 * All features default to `disabled` and don't affect existing consent-based access control.
 */

import { config } from '../config'
import { logger } from './logger'
import type { BundleTypeCode } from 'hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-BundleType'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AccessControlContext {
  /** Raw token payload from JWT validation */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenPayload: Record<string, any>
  /** The FHIR resource path (e.g. "Patient/123", "Observation") */
  resourcePath: string
  /** HTTP method */
  method: string
  /** Upstream FHIR server base URL */
  serverUrl: string
  /** Server identifier (for mTLS config lookup) */
  serverId: string
  /** Server name (for logging) */
  serverName: string
  /** Original Authorization header value */
  authHeader: string
  /** Function to perform upstream FHIR fetch (mTLS-aware) */
  upstreamFetch: (url: string, init?: RequestInit) => Promise<Response>
}

export interface AccessControlResult {
  /** Whether to allow the request to proceed */
  allowed: boolean
  /** HTTP status code if denied */
  status?: number
  /** Error response body if denied */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: Record<string, any>
  /** Modified query string (role-based filtering may inject search params) */
  modifiedQueryString?: string
}

// ── fhirUser normalization ───────────────────────────────────────────────────

/**
 * Normalize a fhirUser claim to a relative reference (e.g. "Patient/123").
 * Handles both relative references and full URLs per SMART spec.
 */
function normalizeFhirUser(fhirUser: string): string {
  // Already relative
  if (fhirUser.startsWith('Patient/') || fhirUser.startsWith('Practitioner/') || fhirUser.startsWith('Person/') || fhirUser.startsWith('RelatedPerson/') || fhirUser.startsWith('Device/')) {
    return fhirUser
  }
  // Full URL — extract the resource type and ID from the path
  const match = fhirUser.match(/(Patient|Practitioner|Person|RelatedPerson|Device)\/([a-zA-Z0-9\-.]+)/)
  if (match) {
    return `${match[1]}/${match[2]}`
  }
  return fhirUser
}

// ── SMART Scope Enforcement ──────────────────────────────────────────────────

/** Map HTTP methods to SMART v2 permission characters */
const METHOD_TO_V2_CHAR: Record<string, string> = {
  GET: 'r',
  POST: 'c',
  PUT: 'u',
  PATCH: 'u',
  DELETE: 'd',
}

/**
 * Determine the effective operation kind from HTTP method and resource path.
 * POST to `_search` is a search operation, not a create.
 */
function resolveOperation(method: string, resourcePath: string): { effectiveMethod: string; isSearch: boolean } {
  // POST _search (e.g. "Patient/_search") is a search, not a create
  if (method === 'POST' && /_search(\?|$)/.test(resourcePath)) {
    return { effectiveMethod: 'GET', isSearch: true }
  }
  // GET with query params or bare resource type (no id) is a search
  const pathParts = resourcePath.split(/[?]/)[0].split('/')
  if (method === 'GET' && (resourcePath.includes('?') || pathParts.length === 1)) {
    return { effectiveMethod: 'GET', isSearch: true }
  }
  // GET with a resource id is a read
  return { effectiveMethod: method, isSearch: false }
}

/**
 * Check whether token scopes grant the requested access.
 * Supports SMART v1 (`read`/`write`/`*`) and v2 (`cruds` character) formats.
 */
function checkSmartScopes(
  tokenScopes: string[],
  resourceType: string,
  method: string,
  resourcePath: string,
): boolean {
  const { effectiveMethod, isSearch } = resolveOperation(method, resourcePath)
  const requiredChar = isSearch ? 's' : METHOD_TO_V2_CHAR[effectiveMethod]
  const isRead = effectiveMethod === 'GET'
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(effectiveMethod)

  return tokenScopes.some((scope) => {
    // Match SMART scope pattern: context/resource.permissions
    const match = scope.match(/^(patient|user|system|agent)\/([\w*]+)\.([\w*]+)$/)
    if (!match) return false
    const [, , scopeResource, scopePermission] = match

    // Check resource type match
    if (scopeResource !== '*' && scopeResource !== resourceType) return false

    // Check permission match
    if (scopePermission === '*') return true

    // SMART v1 format
    if (isRead && scopePermission === 'read') return true
    if (isWrite && scopePermission === 'write') return true

    // SMART v2 format — exact character matching (not .includes())
    // v2 permissions are a subset of "cruds" characters
    if (scopePermission.length <= 5 && /^[cruds]+$/.test(scopePermission)) {
      if (requiredChar && scopePermission.includes(requiredChar)) return true
      // For GET requests: 'r' grants read-by-id, 's' grants search — either suffices
      if (isRead && (scopePermission.includes('r') || scopePermission.includes('s'))) return true
    }

    return false
  })
}

export function enforceScopeAccess(ctx: AccessControlContext): AccessControlResult {
  if (config.accessControl.scopeEnforcement === 'disabled') {
    return { allowed: true }
  }

  const tokenScopes = ((ctx.tokenPayload.scope as string) || '').split(' ').filter(Boolean)
  const resourceType = ctx.resourcePath.split(/[/?]/)[0]

  // Skip scope checks for metadata endpoint and empty resource types
  if (!resourceType || resourceType === 'metadata') {
    return { allowed: true }
  }

  const hasAccess = checkSmartScopes(tokenScopes, resourceType, ctx.method, ctx.resourcePath)

  if (!hasAccess) {
    logger.fhir.warn('SMART scope check failed', {
      resourceType,
      method: ctx.method,
      scopes: tokenScopes.join(' '),
      fhirUser: ctx.tokenPayload.fhirUser,
      server: ctx.serverName,
      mode: config.accessControl.scopeEnforcement,
    })

    if (config.accessControl.scopeEnforcement === 'enforce') {
      return {
        allowed: false,
        status: 403,
        body: {
          error: 'insufficient_scope',
          message: `Token does not grant ${ctx.method} access to ${resourceType}. Required scope: patient/${resourceType}.rs, user/${resourceType}.rs, system/${resourceType}.rs, or agent/${resourceType}.rs (or equivalent).`,
        },
      }
    }
    // audit-only: log but allow
  }

  return { allowed: true }
}

// ── Role-Based Filtering ─────────────────────────────────────────────────────

/**
 * Perform an upstream FHIR fetch with proper auth/mTLS, checking response status.
 * Returns the parsed JSON bundle or null on failure.
 */
async function upstreamFhirQuery(
  ctx: AccessControlContext,
  url: string,
  description: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any> | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/fhir+json' }
    if (ctx.authHeader) {
      headers.Authorization = ctx.authHeader
    }

    const resp = await ctx.upstreamFetch(url, { method: 'GET', headers })

    if (!resp.ok) {
      logger.fhir.warn(`Upstream ${description} failed`, {
        server: ctx.serverName,
        status: resp.status,
        statusText: resp.statusText,
      })
      return null
    }

    return await resp.json()
  } catch (err) {
    logger.fhir.error(`Upstream ${description} error`, {
      server: ctx.serverName,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function enforceRoleBasedFiltering(
  ctx: AccessControlContext,
  queryString: string,
): Promise<AccessControlResult> {
  if (config.accessControl.roleBasedFiltering === 'disabled') {
    return { allowed: true, modifiedQueryString: queryString }
  }

  const rawFhirUser = ctx.tokenPayload.fhirUser as string | undefined
  if (!rawFhirUser) {
    return { allowed: true, modifiedQueryString: queryString }
  }

  const fhirUser = normalizeFhirUser(rawFhirUser)
  const resourceType = ctx.resourcePath.split(/[/?]/)[0]
  const patientScopedResources = config.accessControl.patientScopedResources
  const isEnforce = config.accessControl.roleBasedFiltering === 'enforce'

  if (fhirUser.startsWith('Practitioner/')) {
    return enforcePractitionerFiltering(ctx, queryString, fhirUser, resourceType, patientScopedResources, isEnforce)
  }

  if (fhirUser.startsWith('Patient/')) {
    return enforcePatientFiltering(ctx, queryString, fhirUser, resourceType, patientScopedResources, isEnforce)
  }

  return { allowed: true, modifiedQueryString: queryString }
}

async function enforcePractitionerFiltering(
  ctx: AccessControlContext,
  queryString: string,
  fhirUser: string,
  resourceType: string,
  patientScopedResources: string[],
  isEnforce: boolean,
): Promise<AccessControlResult> {
  // Patient search: inject general-practitioner filter
  if (ctx.method === 'GET' && /^Patient(\?|$)/.test(ctx.resourcePath)) {
    const sep = queryString ? '&' : '?'
    queryString += `${sep}general-practitioner=${encodeURIComponent(fhirUser)}`
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Direct Patient read by ID: verify assignment
  const patientDirectMatch = ctx.resourcePath.match(/^Patient\/([^/]+)/)
  if (ctx.method === 'GET' && patientDirectMatch) {
    const patientId = patientDirectMatch[1]
    if (patientId !== '$' && !patientId.startsWith('$')) {
      const checkUrl = `${ctx.serverUrl}/Patient?_id=${encodeURIComponent(patientId)}&general-practitioner=${encodeURIComponent(fhirUser)}&_format=json`
      const bundle = await upstreamFhirQuery(ctx, checkUrl, 'patient assignment check')

      if (bundle === null) {
        // Upstream failed — fail open in audit-only, fail closed in enforce
        if (isEnforce) {
          return {
            allowed: false,
            status: 502,
            body: { error: 'upstream_error', message: 'Failed to validate patient assignment on upstream FHIR server' },
          }
        }
      } else if (!bundle.entry?.length) {
        const msg = `Patient ${patientId} is not assigned to ${fhirUser}`
        logger.fhir.warn('Practitioner access denied to patient', { fhirUser, patientId, server: ctx.serverName })
        if (isEnforce) {
          return { allowed: false, status: 403, body: { error: 'access_denied', message: msg } }
        }
      }
    }
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Patient-scoped resource search: inject patient filter
  if (ctx.method === 'GET' && patientScopedResources.includes(resourceType) && !ctx.resourcePath.includes('/')) {
    const patientsUrl = `${ctx.serverUrl}/Patient?general-practitioner=${encodeURIComponent(fhirUser)}&_elements=id&_format=json`
    const bundle = await upstreamFhirQuery(ctx, patientsUrl, 'practitioner patient list lookup')

    if (bundle === null) {
      if (isEnforce) {
        return {
          allowed: false,
          status: 502,
          body: { error: 'upstream_error', message: 'Failed to resolve practitioner patient assignments on upstream FHIR server' },
        }
      }
      // audit-only: proceed without filtering
      return { allowed: true, modifiedQueryString: queryString }
    }

    const patientIds = (bundle.entry || []).map((e: { resource: { id: string } }) => e.resource.id)

    if (patientIds.length === 0) {
      return {
        allowed: true,
        modifiedQueryString: queryString,
        status: 200,
        body: { resourceType: 'Bundle', type: 'searchset' satisfies BundleTypeCode, total: 0, entry: [] },
      }
    }

    const sep = queryString ? '&' : '?'
    queryString += `${sep}patient=${patientIds.map((id: string) => `Patient/${id}`).join(',')}`
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Patient-scoped resource direct read by ID: verify patient assignment
  if (ctx.method === 'GET' && patientScopedResources.includes(resourceType) && ctx.resourcePath.includes('/')) {
    const idMatch = ctx.resourcePath.match(/^[^/]+\/([^/?]+)/)
    const resourceId = idMatch?.[1]
    if (resourceId && resourceId !== '$' && !resourceId.startsWith('$')) {
      // First get assigned patients
      const patientsUrl = `${ctx.serverUrl}/Patient?general-practitioner=${encodeURIComponent(fhirUser)}&_elements=id&_format=json`
      const patientsBundle = await upstreamFhirQuery(ctx, patientsUrl, 'practitioner patient list for direct read')

      if (patientsBundle === null) {
        if (isEnforce) {
          return {
            allowed: false,
            status: 502,
            body: { error: 'upstream_error', message: 'Failed to validate practitioner assignment on upstream FHIR server' },
          }
        }
      } else {
        const patientIds = (patientsBundle.entry || []).map((e: { resource: { id: string } }) => e.resource.id)
        if (patientIds.length === 0) {
          logger.fhir.warn('Practitioner has no assigned patients, denying direct read', {
            fhirUser, resourceType, resourceId, server: ctx.serverName,
          })
          if (isEnforce) {
            return { allowed: false, status: 403, body: { error: 'access_denied', message: `Practitioner ${fhirUser} has no assigned patients` } }
          }
        } else {
          // Verify the resource belongs to an assigned patient
          const patientParam = patientIds.map((id: string) => `Patient/${id}`).join(',')
          const checkUrl = `${ctx.serverUrl}/${resourceType}?_id=${encodeURIComponent(resourceId)}&patient=${encodeURIComponent(patientParam)}&_format=json`
          const checkBundle = await upstreamFhirQuery(ctx, checkUrl, 'resource patient assignment check')

          if (checkBundle === null) {
            if (isEnforce) {
              return {
                allowed: false,
                status: 502,
                body: { error: 'upstream_error', message: 'Failed to validate resource patient assignment on upstream FHIR server' },
              }
            }
          } else if (!checkBundle.entry?.length) {
            logger.fhir.warn('Practitioner access denied to patient-scoped resource', {
              fhirUser, resourceType, resourceId, server: ctx.serverName,
            })
            if (isEnforce) {
              return {
                allowed: false,
                status: 403,
                body: { error: 'access_denied', message: `${resourceType}/${resourceId} is not associated with a patient assigned to ${fhirUser}` },
              }
            }
          }
        }
      }
    }
  }

  return { allowed: true, modifiedQueryString: queryString }
}

async function enforcePatientFiltering(
  ctx: AccessControlContext,
  queryString: string,
  fhirUser: string,
  resourceType: string,
  patientScopedResources: string[],
  isEnforce: boolean,
): Promise<AccessControlResult> {
  const ownPatientId = fhirUser.split('/')[1]

  // Patient search: restrict to own record
  if (ctx.method === 'GET' && /^Patient(\?|$)/.test(ctx.resourcePath)) {
    const sep = queryString ? '&' : '?'
    queryString += `${sep}_id=${encodeURIComponent(ownPatientId)}`
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Direct Patient read by ID: deny if different patient
  const patientDirectMatch = ctx.resourcePath.match(/^Patient\/([^/]+)/)
  if (ctx.method === 'GET' && patientDirectMatch) {
    const patientId = patientDirectMatch[1]
    if (patientId !== '$' && !patientId.startsWith('$') && patientId !== ownPatientId) {
      logger.fhir.warn('Patient access denied to other patient', { fhirUser, requestedPatient: patientId, server: ctx.serverName })
      if (isEnforce) {
        return { allowed: false, status: 403, body: { error: 'access_denied', message: 'You can only access your own patient record' } }
      }
    }
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Patient-scoped resource search: filter to own data
  if (ctx.method === 'GET' && patientScopedResources.includes(resourceType) && !ctx.resourcePath.includes('/')) {
    const sep = queryString ? '&' : '?'
    queryString += `${sep}patient=Patient/${encodeURIComponent(ownPatientId)}`
    return { allowed: true, modifiedQueryString: queryString }
  }

  // Patient-scoped resource direct read by ID: verify ownership
  if (ctx.method === 'GET' && patientScopedResources.includes(resourceType) && ctx.resourcePath.includes('/')) {
    const idMatch = ctx.resourcePath.match(/^[^/]+\/([^/?]+)/)
    const resourceId = idMatch?.[1]
    if (resourceId && resourceId !== '$' && !resourceId.startsWith('$')) {
      const checkUrl = `${ctx.serverUrl}/${resourceType}?_id=${encodeURIComponent(resourceId)}&patient=Patient/${encodeURIComponent(ownPatientId)}&_format=json`
      const checkBundle = await upstreamFhirQuery(ctx, checkUrl, 'patient resource ownership check')

      if (checkBundle === null) {
        if (isEnforce) {
          return {
            allowed: false,
            status: 502,
            body: { error: 'upstream_error', message: 'Failed to validate resource ownership on upstream FHIR server' },
          }
        }
      } else if (!checkBundle.entry?.length) {
        logger.fhir.warn('Patient access denied to unowned resource', {
          fhirUser, resourceType, resourceId, server: ctx.serverName,
        })
        if (isEnforce) {
          return {
            allowed: false,
            status: 403,
            body: { error: 'access_denied', message: `${resourceType}/${resourceId} does not belong to your patient record` },
          }
        }
      }
    }
  }

  return { allowed: true, modifiedQueryString: queryString }
}
