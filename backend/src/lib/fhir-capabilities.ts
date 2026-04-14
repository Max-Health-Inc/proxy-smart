import fetch from 'cross-fetch'
import { logger } from './logger'
import { fetchWithMtls, getMtlsConfig } from '../routes/fhir-servers'

// ── CapabilityStatement types (FHIR R4/R5) ─────────────────────────────────

interface CapSearchParam {
  name: string
  type: string
  definition?: string
  documentation?: string
}

interface CapInteraction {
  code: string // read | vread | update | patch | delete | create | search-type | history-instance | history-type
}

interface CapOperation {
  name: string
  definition: string
}

interface CapResource {
  type: string
  profile?: string
  interaction?: CapInteraction[]
  searchParam?: CapSearchParam[]
  searchInclude?: string[]
  searchRevInclude?: string[]
  operation?: CapOperation[]
  versioning?: string
  conditionalCreate?: boolean
  conditionalUpdate?: boolean
  conditionalDelete?: string
}

interface CapRest {
  mode: string // 'server' | 'client'
  resource?: CapResource[]
  interaction?: CapInteraction[] // system-level interactions
  searchParam?: CapSearchParam[] // system-level search params
  operation?: CapOperation[]
}

interface CapabilityStatementRaw {
  resourceType: 'CapabilityStatement'
  fhirVersion?: string
  rest?: CapRest[]
}

// ── Parsed capability model ─────────────────────────────────────────────────

export interface ResourceCapability {
  type: string
  interactions: Set<string>
  searchParams: Map<string, string> // name → type (e.g., "patient" → "reference")
  searchInclude: Set<string>
  searchRevInclude: Set<string>
  operations: Set<string>
}

export interface ServerCapabilities {
  serverUrl: string
  serverIdentifier: string
  fhirVersion: string
  resources: Map<string, ResourceCapability>
  systemSearchParams: Map<string, string> // global params like _id, _lastUpdated
  systemInteractions: Set<string>
  fetchedAt: number
}

export interface NormalizationResult {
  originalParams: URLSearchParams
  normalizedParams: URLSearchParams
  strippedParams: string[] // param names that were removed
  resourceType: string
  supported: boolean // whether the resource type itself is supported
}

/**
 * Parsed context from a FHIR resource path.
 * Handles all FHIR URL patterns:
 *   - Type-level:        Patient, Observation
 *   - Instance:          Patient/123
 *   - Compartment:       Patient/123/Observation
 *   - Operation:         Patient/$everything, Patient/123/$everything
 *   - History:           Patient/123/_history, Patient/123/_history/2
 *   - Search (POST):     Patient/_search
 *   - System-level:      (empty path)
 */
export interface FhirRequestContext {
  /** The primary resource type being targeted (e.g., "Observation" in Patient/123/Observation) */
  resourceType: string | null
  /** The compartment owner resource type, if this is a compartment search */
  compartmentType: string | null
  /** Whether the request targets a specific instance (has an ID) */
  isInstance: boolean
  /** Whether this is a _search POST endpoint */
  isSearchEndpoint: boolean
  /** Whether this is a $operation */
  isOperation: boolean
  /** The operation name (without $) if isOperation */
  operationName: string | null
  /** Whether this is a _history request */
  isHistory: boolean
  /** Whether the request likely involves search params (type-level GET, compartment GET, _search POST) */
  hasSearchSemantics: boolean
}

// ── Cache ───────────────────────────────────────────────────────────────────

const capabilitiesCache = new Map<string, ServerCapabilities>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes (longer than metadata — capabilities change rarely)

// FHIR spec universal params — always allowed even if not in CapabilityStatement
const FHIR_UNIVERSAL_PARAMS = new Set([
  '_format', '_pretty', '_summary', '_elements', '_count', '_total',
  '_sort', '_include', '_revinclude', '_contained', '_containedType',
  '_id', '_lastUpdated', '_tag', '_profile', '_security', '_text',
  '_content', '_list', '_has', '_type', '_source',
  // Pagination
  '_offset', '_page', '_getpages', '_getpagesoffset',
  // Bundle
  '_bundletype',
])

// ── Core functions ──────────────────────────────────────────────────────────

/**
 * Fetch and parse the full CapabilityStatement for a FHIR server.
 * Caches results for CACHE_TTL ms per server identifier.
 */
export async function getServerCapabilities(
  serverUrl: string,
  serverIdentifier: string,
  options?: { force?: boolean }
): Promise<ServerCapabilities | null> {
  const cacheKey = serverIdentifier

  // Check cache unless force-refresh
  if (!options?.force) {
    const cached = capabilitiesCache.get(cacheKey)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached
    }
  }

  try {
    const metadataUrl = `${serverUrl}/metadata`

    // Resolve mTLS config for this server
    const mtlsConfig = await getMtlsConfig(serverIdentifier)
    const useMtls = mtlsConfig?.enabled === true && metadataUrl.startsWith('https://')

    const response = useMtls
      ? await fetchWithMtls(metadataUrl, {
          headers: { 'Accept': 'application/fhir+json' },
          signal: AbortSignal.timeout(15000),
          serverId: serverIdentifier,
        })
      : await fetch(metadataUrl, {
          headers: { 'Accept': 'application/fhir+json' },
          signal: AbortSignal.timeout(15000),
        })

    if (!response.ok) {
      logger.fhir.warn('Failed to fetch CapabilityStatement', {
        serverIdentifier,
        status: response.status,
      })
      return null
    }

    const raw: CapabilityStatementRaw = await response.json()
    const capabilities = parseCapabilityStatement(raw, serverUrl, serverIdentifier)

    capabilitiesCache.set(cacheKey, capabilities)

    logger.fhir.info('Parsed CapabilityStatement', {
      serverIdentifier,
      resourceCount: capabilities.resources.size,
      fhirVersion: capabilities.fhirVersion,
    })

    return capabilities
  } catch (error) {
    logger.fhir.warn('Error fetching CapabilityStatement', {
      serverIdentifier,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Parse a raw CapabilityStatement into our structured model.
 */
function parseCapabilityStatement(
  raw: CapabilityStatementRaw,
  serverUrl: string,
  serverIdentifier: string
): ServerCapabilities {
  const serverRest = raw.rest?.find(r => r.mode === 'server') || raw.rest?.[0]

  const resources = new Map<string, ResourceCapability>()
  const systemSearchParams = new Map<string, string>()
  const systemInteractions = new Set<string>()

  // Parse system-level search params
  if (serverRest?.searchParam) {
    for (const sp of serverRest.searchParam) {
      systemSearchParams.set(sp.name, sp.type)
    }
  }

  // Parse system-level interactions
  if (serverRest?.interaction) {
    for (const i of serverRest.interaction) {
      systemInteractions.add(i.code)
    }
  }

  // Parse resource-level capabilities
  if (serverRest?.resource) {
    for (const res of serverRest.resource) {
      const rc: ResourceCapability = {
        type: res.type,
        interactions: new Set(res.interaction?.map(i => i.code) || []),
        searchParams: new Map(res.searchParam?.map(sp => [sp.name, sp.type]) || []),
        searchInclude: new Set(res.searchInclude || []),
        searchRevInclude: new Set(res.searchRevInclude || []),
        operations: new Set(res.operation?.map(o => o.name) || []),
      }
      resources.set(res.type, rc)
    }
  }

  return {
    serverUrl,
    serverIdentifier,
    fhirVersion: raw.fhirVersion || 'unknown',
    resources,
    systemSearchParams,
    systemInteractions,
    fetchedAt: Date.now(),
  }
}

/**
 * Parse a FHIR resource path into a structured context.
 * This is the single source of truth for understanding what kind of FHIR
 * request we're dealing with, used by both the proxy and admin APIs.
 *
 * @param resourcePath - The path after /{proxy}/{server}/{version}/ e.g., "Patient/123/Observation"
 * @param httpMethod - The HTTP method (GET, POST, PUT, etc.)
 */
export function parseFhirPath(resourcePath: string, httpMethod: string): FhirRequestContext {
  const segments = resourcePath.split('/').filter(Boolean)

  const result: FhirRequestContext = {
    resourceType: null,
    compartmentType: null,
    isInstance: false,
    isSearchEndpoint: false,
    isOperation: false,
    operationName: null,
    isHistory: false,
    hasSearchSemantics: false,
  }

  if (segments.length === 0) {
    // System-level request (e.g., GET / or POST /)
    result.hasSearchSemantics = httpMethod === 'GET'
    return result
  }

  const first = segments[0]

  // Check if first segment is a resource type (starts with uppercase)
  if (!first.match(/^[A-Z]/)) return result

  // Detect patterns — walk the segments
  // Possible shapes:
  //   [Type]                           → type-level
  //   [Type, id]                       → instance
  //   [Type, id, _history]             → history (type)
  //   [Type, id, _history, vid]        → history (version)
  //   [Type, _search]                  → search POST
  //   [Type, $op]                      → type-level operation
  //   [Type, id, $op]                  → instance-level operation
  //   [Type, id, SubType]              → compartment search
  //   [Type, id, SubType, subId]       → compartment instance? (rare but valid)

  result.resourceType = first

  if (segments.length === 1) {
    // Type-level (GET = search, POST = create)
    result.hasSearchSemantics = httpMethod === 'GET'
    return result
  }

  const second = segments[1]

  // _search endpoint
  if (second === '_search') {
    result.isSearchEndpoint = true
    result.hasSearchSemantics = true
    return result
  }

  // $operation at type level
  if (second.startsWith('$')) {
    result.isOperation = true
    result.operationName = second.slice(1)
    return result
  }

  // segments[1] is an ID
  result.isInstance = true

  if (segments.length === 2) {
    // Instance read/update/delete
    return result
  }

  const third = segments[2]

  // _history
  if (third === '_history') {
    result.isHistory = true
    return result
  }

  // $operation at instance level
  if (third.startsWith('$')) {
    result.isOperation = true
    result.operationName = third.slice(1)
    return result
  }

  // Compartment search: Type/id/SubType
  if (third.match(/^[A-Z]/)) {
    result.compartmentType = first
    result.resourceType = third // The actual target resource
    result.isInstance = false
    result.hasSearchSemantics = httpMethod === 'GET' || (segments.length > 3 && segments[3] === '_search')

    if (segments.length > 3 && segments[3] === '_search') {
      result.isSearchEndpoint = true
    }
    return result
  }

  return result
}

/**
 * Normalize search parameters for a request by stripping unsupported params.
 * Returns the normalization result with details of what was changed.
 *
 * Rules:
 * 1. If capabilities haven't been fetched yet, pass everything through (fail-open)
 * 2. FHIR universal params (_format, _count, etc.) are always allowed
 * 3. System-level search params from CapabilityStatement are always allowed
 * 4. Resource-level search params are checked against the resource's declared params
 * 5. Chained params (e.g., "patient.name") are checked by their root param name
 * 6. Modifier params (e.g., "status:not") are checked by their base param name
 */
export function normalizeSearchParams(
  capabilities: ServerCapabilities | null,
  resourceType: string,
  queryString: string
): NormalizationResult {
  const originalParams = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString)
  const normalizedParams = new URLSearchParams()
  const strippedParams: string[] = []

  // Fail-open: if no capabilities available, pass everything through
  if (!capabilities) {
    return {
      originalParams,
      normalizedParams: new URLSearchParams(originalParams),
      strippedParams: [],
      resourceType,
      supported: true,
    }
  }

  const resourceCap = capabilities.resources.get(resourceType)

  // If the resource type isn't in CapabilityStatement at all, pass through
  // (some servers don't declare all resources but still support them)
  if (!resourceCap) {
    return {
      originalParams,
      normalizedParams: new URLSearchParams(originalParams),
      strippedParams: [],
      resourceType,
      supported: false,
    }
  }

  for (const [key, value] of originalParams.entries()) {
    // Extract base param name (strip modifiers like :exact, :contains, :not, :missing)
    const baseParam = key.split(':')[0]

    // Extract root param for chained searches (e.g., "patient.name" → "patient")
    const rootParam = baseParam.split('.')[0]

    if (
      FHIR_UNIVERSAL_PARAMS.has(rootParam) ||                       // universal FHIR params
      capabilities.systemSearchParams.has(rootParam) ||             // system-level params
      resourceCap.searchParams.has(rootParam)                       // resource-level params
    ) {
      normalizedParams.append(key, value)
    } else {
      strippedParams.push(key)
    }
  }

  return {
    originalParams,
    normalizedParams,
    strippedParams,
    resourceType,
    supported: true,
  }
}

/**
 * Check if a specific interaction is supported for a resource type.
 * Maps HTTP methods to FHIR interaction codes.
 */
export function isInteractionSupported(
  capabilities: ServerCapabilities | null,
  resourceType: string,
  httpMethod: string,
  isSearch: boolean
): boolean {
  // Fail-open
  if (!capabilities) return true

  const resourceCap = capabilities.resources.get(resourceType)
  if (!resourceCap) return true // unknown resources pass through

  const interactionCode = mapHttpToInteraction(httpMethod, isSearch)
  if (!interactionCode) return true // unknown methods pass through

  return resourceCap.interactions.has(interactionCode)
}

function mapHttpToInteraction(method: string, isSearch: boolean): string | null {
  switch (method.toUpperCase()) {
    case 'GET': return isSearch ? 'search-type' : 'read'
    case 'POST': return isSearch ? 'search-type' : 'create'
    case 'PUT': return 'update'
    case 'PATCH': return 'patch'
    case 'DELETE': return 'delete'
    default: return null
  }
}

// ── Admin / introspection ───────────────────────────────────────────────────

/** Get capabilities for a specific server (from cache or fresh) */
export async function getCapabilitiesForServer(
  serverUrl: string,
  serverIdentifier: string
): Promise<ServerCapabilities | null> {
  return getServerCapabilities(serverUrl, serverIdentifier)
}

/** Serialize capabilities to a JSON-friendly format for the admin API */
export function serializeCapabilities(caps: ServerCapabilities) {
  const resources: Record<string, {
    interactions: string[]
    searchParams: Record<string, string>
    searchInclude: string[]
    searchRevInclude: string[]
    operations: string[]
  }> = {}

  for (const [type, rc] of caps.resources) {
    resources[type] = {
      interactions: [...rc.interactions],
      searchParams: Object.fromEntries(rc.searchParams),
      searchInclude: [...rc.searchInclude],
      searchRevInclude: [...rc.searchRevInclude],
      operations: [...rc.operations],
    }
  }

  return {
    serverUrl: caps.serverUrl,
    serverIdentifier: caps.serverIdentifier,
    fhirVersion: caps.fhirVersion,
    resourceCount: caps.resources.size,
    systemSearchParams: Object.fromEntries(caps.systemSearchParams),
    systemInteractions: [...caps.systemInteractions],
    resources,
    fetchedAt: new Date(caps.fetchedAt).toISOString(),
    cacheAgeMs: Date.now() - caps.fetchedAt,
  }
}

/** Clear capabilities cache for a specific server or all servers */
export function clearCapabilitiesCache(serverIdentifier?: string): void {
  if (serverIdentifier) {
    capabilitiesCache.delete(serverIdentifier)
  } else {
    capabilitiesCache.clear()
  }
}

/** Get cache stats for monitoring */
export function getCapabilitiesCacheStats() {
  const entries: { serverIdentifier: string; resourceCount: number; ageMs: number }[] = []
  for (const [id, caps] of capabilitiesCache) {
    entries.push({
      serverIdentifier: id,
      resourceCount: caps.resources.size,
      ageMs: Date.now() - caps.fetchedAt,
    })
  }
  return { size: capabilitiesCache.size, entries }
}
