import { describe, expect, it } from 'bun:test'
import {
  parseFhirPath,
  normalizeSearchParams,
  isInteractionSupported,
  isHistorySupported,
  isOperationSupported,
  isFormatSupported,
  isPatchFormatSupported,
  type ServerCapabilities,
  type ResourceCapability,
} from '../src/lib/fhir-capabilities'

// ── Test factory ───────────────────────────────────────────────────────────

function makeResourceCap(overrides?: Partial<ResourceCapability>): ResourceCapability {
  return {
    type: 'Patient',
    profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
    supportedProfiles: new Set(),
    interactions: new Set(['read', 'search-type', 'create', 'update', 'delete', 'history-instance']),
    searchParams: new Map([['name', 'string'], ['birthdate', 'date'], ['identifier', 'token'], ['gender', 'token']]),
    searchInclude: new Set(['Patient:organization', 'Patient:general-practitioner']),
    searchRevInclude: new Set(['Observation:patient', 'Condition:patient']),
    operations: new Set(['everything']),
    versioning: 'versioned',
    readHistory: true,
    updateCreate: false,
    conditionalCreate: false,
    conditionalRead: 'full-support',
    conditionalUpdate: true,
    conditionalDelete: 'multiple',
    referencePolicy: new Set(['literal', 'local']),
    ...overrides,
  }
}

function makeCaps(overrides?: Partial<ServerCapabilities>): ServerCapabilities {
  const patient = makeResourceCap()
  const flag: ResourceCapability = makeResourceCap({
    type: 'Flag',
    interactions: new Set(['read', 'search-type', 'create']),
    searchParams: new Map([['patient', 'reference'], ['date', 'date']]),
    searchInclude: new Set(),
    searchRevInclude: new Set(),
    operations: new Set(),
    readHistory: false,
    conditionalRead: 'not-supported',
    conditionalDelete: 'not-supported',
  })

  return {
    serverUrl: 'http://fhir.example.com',
    serverIdentifier: 'test-server',
    fhirVersion: '4.0.1',
    status: 'active',
    format: new Set(['json', 'xml', 'application/fhir+json', 'application/fhir+xml']),
    patchFormat: new Set(['application/json-patch+json', 'application/fhir+json']),
    security: { cors: true, services: ['SMART-on-FHIR'] },
    resources: new Map([['Patient', patient], ['Flag', flag]]),
    systemSearchParams: new Map([['_text', 'string']]),
    systemInteractions: new Set(['search-system', 'transaction']),
    systemOperations: new Set(['export']),
    compartments: new Set(['http://hl7.org/fhir/CompartmentDefinition/patient']),
    fetchedAt: Date.now(),
    ...overrides,
  }
}

// ── parseFhirPath ──────────────────────────────────────────────────────────

describe('parseFhirPath', () => {
  it('parses type-level GET as search', () => {
    const ctx = parseFhirPath('Patient', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.hasSearchSemantics).toBe(true)
    expect(ctx.isInstance).toBe(false)
    expect(ctx.compartmentType).toBeNull()
  })

  it('parses type-level POST as create', () => {
    const ctx = parseFhirPath('Patient', 'POST')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.hasSearchSemantics).toBe(false)
  })

  it('parses instance read', () => {
    const ctx = parseFhirPath('Patient/123', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isInstance).toBe(true)
    expect(ctx.hasSearchSemantics).toBe(false)
  })

  it('parses _search endpoint', () => {
    const ctx = parseFhirPath('Patient/_search', 'POST')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isSearchEndpoint).toBe(true)
    expect(ctx.hasSearchSemantics).toBe(true)
  })

  it('parses compartment search', () => {
    const ctx = parseFhirPath('Patient/123/Observation', 'GET')
    expect(ctx.resourceType).toBe('Observation')
    expect(ctx.compartmentType).toBe('Patient')
    expect(ctx.hasSearchSemantics).toBe(true)
    expect(ctx.isInstance).toBe(false)
  })

  it('parses compartment _search', () => {
    const ctx = parseFhirPath('Patient/123/Observation/_search', 'POST')
    expect(ctx.resourceType).toBe('Observation')
    expect(ctx.compartmentType).toBe('Patient')
    expect(ctx.hasSearchSemantics).toBe(true)
    expect(ctx.isSearchEndpoint).toBe(true)
  })

  it('parses type-level operation', () => {
    const ctx = parseFhirPath('Patient/$everything', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isOperation).toBe(true)
    expect(ctx.operationName).toBe('everything')
  })

  it('parses instance-level operation', () => {
    const ctx = parseFhirPath('Patient/123/$everything', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isOperation).toBe(true)
    expect(ctx.operationName).toBe('everything')
    expect(ctx.isInstance).toBe(true)
  })

  it('parses history', () => {
    const ctx = parseFhirPath('Patient/123/_history', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isHistory).toBe(true)
    expect(ctx.isInstance).toBe(true)
  })

  it('parses versioned history', () => {
    const ctx = parseFhirPath('Patient/123/_history/2', 'GET')
    expect(ctx.resourceType).toBe('Patient')
    expect(ctx.isHistory).toBe(true)
  })

  it('parses empty path as system-level', () => {
    const ctx = parseFhirPath('', 'GET')
    expect(ctx.resourceType).toBeNull()
    expect(ctx.hasSearchSemantics).toBe(true)
  })

  it('handles non-resource first segment gracefully', () => {
    const ctx = parseFhirPath('_search', 'POST')
    expect(ctx.resourceType).toBeNull()
  })
})

// ── normalizeSearchParams ──────────────────────────────────────────────────

describe('normalizeSearchParams', () => {
  it('passes everything through when capabilities are null (fail-open)', () => {
    const result = normalizeSearchParams(null, 'Patient', '?name=smith&status=active')
    expect(result.strippedParams).toEqual([])
    expect(result.strippedIncludes).toEqual([])
    expect(result.normalizedParams.get('name')).toBe('smith')
    expect(result.normalizedParams.get('status')).toBe('active')
  })

  it('strips unsupported params', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Flag', '?patient=Patient/123&status=active')
    expect(result.strippedParams).toEqual(['status'])
    expect(result.normalizedParams.get('patient')).toBe('Patient/123')
    expect(result.normalizedParams.has('status')).toBe(false)
  })

  it('preserves universal params always', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_count=10&_summary=true&name=smith')
    expect(result.strippedParams).toEqual([])
    expect(result.normalizedParams.get('_count')).toBe('10')
    expect(result.normalizedParams.get('_summary')).toBe('true')
  })

  it('handles modifiers (param:modifier)', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?name:exact=Smith&foo:not=bar')
    expect(result.normalizedParams.get('name:exact')).toBe('Smith')
    expect(result.strippedParams).toEqual(['foo:not'])
  })

  it('handles chained params (param.subparam)', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?name.given=John&unknown.field=x')
    expect(result.normalizedParams.get('name.given')).toBe('John')
    expect(result.strippedParams).toEqual(['unknown.field'])
  })

  it('passes through for unknown resource types', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'MedicationRequest', '?status=active&patient=Patient/1')
    expect(result.strippedParams).toEqual([])
    expect(result.supported).toBe(false)
  })

  it('preserves system-level search params', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_text=headache&name=smith')
    expect(result.strippedParams).toEqual([])
    expect(result.normalizedParams.get('_text')).toBe('headache')
  })

  // _include / _revinclude value validation
  it('allows supported _include values', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?name=smith&_include=Patient:organization')
    expect(result.strippedParams).toEqual([])
    expect(result.strippedIncludes).toEqual([])
    expect(result.normalizedParams.get('_include')).toBe('Patient:organization')
  })

  it('strips unsupported _include values', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?name=smith&_include=Patient:link')
    expect(result.strippedIncludes).toEqual(['_include=Patient:link'])
    expect(result.normalizedParams.has('_include')).toBe(false)
  })

  it('allows _include with target type suffix when base is declared', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_include=Patient:organization:Organization')
    expect(result.strippedIncludes).toEqual([])
    expect(result.normalizedParams.get('_include')).toBe('Patient:organization:Organization')
  })

  it('allows supported _revinclude values', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_revinclude=Observation:patient')
    expect(result.strippedIncludes).toEqual([])
    expect(result.normalizedParams.get('_revinclude')).toBe('Observation:patient')
  })

  it('strips unsupported _revinclude values', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_revinclude=AllergyIntolerance:patient')
    expect(result.strippedIncludes).toEqual(['_revinclude=AllergyIntolerance:patient'])
  })

  it('allows all _include when searchInclude is empty (not declared)', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Flag', '?_include=Flag:author')
    expect(result.strippedIncludes).toEqual([])
  })

  it('handles _include:iterate modifier', () => {
    const caps = makeCaps()
    const result = normalizeSearchParams(caps, 'Patient', '?_include:iterate=Patient:organization')
    expect(result.strippedIncludes).toEqual([])
  })
})

// ── isInteractionSupported ─────────────────────────────────────────────────

describe('isInteractionSupported', () => {
  it('returns true when capabilities are null (fail-open)', () => {
    expect(isInteractionSupported(null, 'Patient', 'GET', true)).toBe(true)
  })

  it('returns true for unknown resource types', () => {
    const caps = makeCaps()
    expect(isInteractionSupported(caps, 'Unknown', 'GET', false)).toBe(true)
  })

  it('allows supported interactions', () => {
    const caps = makeCaps()
    expect(isInteractionSupported(caps, 'Patient', 'GET', true)).toBe(true)   // search-type
    expect(isInteractionSupported(caps, 'Patient', 'GET', false)).toBe(true)  // read
    expect(isInteractionSupported(caps, 'Patient', 'POST', false)).toBe(true) // create
    expect(isInteractionSupported(caps, 'Patient', 'DELETE', false)).toBe(true)
  })

  it('blocks unsupported interactions', () => {
    const caps = makeCaps()
    expect(isInteractionSupported(caps, 'Flag', 'DELETE', false)).toBe(false)
    expect(isInteractionSupported(caps, 'Flag', 'PUT', false)).toBe(false)
  })
})

// ── isHistorySupported ─────────────────────────────────────────────────────

describe('isHistorySupported', () => {
  it('returns true when capabilities are null', () => {
    expect(isHistorySupported(null, 'Patient', true)).toBe(true)
  })

  it('allows history-instance when declared', () => {
    const caps = makeCaps()
    expect(isHistorySupported(caps, 'Patient', true)).toBe(true)
  })

  it('blocks history-type when not declared', () => {
    const caps = makeCaps()
    // Patient has history-instance but not history-type
    expect(isHistorySupported(caps, 'Patient', false)).toBe(false)
  })

  it('blocks history on Flag (no history interactions)', () => {
    const caps = makeCaps()
    expect(isHistorySupported(caps, 'Flag', true)).toBe(false)
    expect(isHistorySupported(caps, 'Flag', false)).toBe(false)
  })
})

// ── isOperationSupported ───────────────────────────────────────────────────

describe('isOperationSupported', () => {
  it('returns true when capabilities are null', () => {
    expect(isOperationSupported(null, 'Patient', 'everything')).toBe(true)
  })

  it('allows declared resource-level operations', () => {
    const caps = makeCaps()
    expect(isOperationSupported(caps, 'Patient', 'everything')).toBe(true)
  })

  it('blocks undeclared resource-level operations', () => {
    const caps = makeCaps()
    expect(isOperationSupported(caps, 'Patient', 'validate')).toBe(false)
  })

  it('allows declared system-level operations', () => {
    const caps = makeCaps()
    expect(isOperationSupported(caps, null, 'export')).toBe(true)
  })

  it('blocks undeclared system-level operations', () => {
    const caps = makeCaps()
    expect(isOperationSupported(caps, null, 'reindex')).toBe(false)
  })
})

// ── isFormatSupported ──────────────────────────────────────────────────────

describe('isFormatSupported', () => {
  it('returns true when capabilities are null', () => {
    expect(isFormatSupported(null, 'application/fhir+json')).toBe(true)
  })

  it('allows declared formats', () => {
    const caps = makeCaps()
    expect(isFormatSupported(caps, 'application/fhir+json')).toBe(true)
    expect(isFormatSupported(caps, 'application/fhir+xml')).toBe(true)
  })

  it('allows json/xml aliases', () => {
    const caps = makeCaps()
    expect(isFormatSupported(caps, 'application/json')).toBe(true)
  })

  it('returns true when format is empty (not declared)', () => {
    const caps = makeCaps({ format: new Set() })
    expect(isFormatSupported(caps, 'text/turtle')).toBe(true)
  })
})

// ── isPatchFormatSupported ─────────────────────────────────────────────────

describe('isPatchFormatSupported', () => {
  it('returns true when capabilities are null', () => {
    expect(isPatchFormatSupported(null, 'application/json-patch+json')).toBe(true)
  })

  it('allows declared patch formats', () => {
    const caps = makeCaps()
    expect(isPatchFormatSupported(caps, 'application/json-patch+json')).toBe(true)
    expect(isPatchFormatSupported(caps, 'application/fhir+json')).toBe(true)
  })

  it('blocks undeclared patch formats', () => {
    const caps = makeCaps()
    expect(isPatchFormatSupported(caps, 'application/xml-patch+xml')).toBe(false)
  })

  it('returns true when patchFormat is empty', () => {
    const caps = makeCaps({ patchFormat: new Set() })
    expect(isPatchFormatSupported(caps, 'anything')).toBe(true)
  })
})
