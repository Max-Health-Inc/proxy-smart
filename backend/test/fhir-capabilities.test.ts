import { describe, expect, it } from 'bun:test'
import {
  parseFhirPath,
  normalizeSearchParams,
  isInteractionSupported,
  type ServerCapabilities,
  type ResourceCapability,
} from '../src/lib/fhir-capabilities'

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

function makeCapabilities(overrides?: Partial<ServerCapabilities>): ServerCapabilities {
  const patientCap: ResourceCapability = {
    type: 'Patient',
    interactions: new Set(['read', 'search-type', 'create', 'update', 'delete']),
    searchParams: new Map([['name', 'string'], ['birthdate', 'date'], ['identifier', 'token'], ['gender', 'token']]),
    searchInclude: new Set(['Patient:organization']),
    searchRevInclude: new Set(),
    operations: new Set(),
  }

  const flagCap: ResourceCapability = {
    type: 'Flag',
    interactions: new Set(['read', 'search-type', 'create']),
    searchParams: new Map([['patient', 'reference'], ['date', 'date']]),
    searchInclude: new Set(),
    searchRevInclude: new Set(),
    operations: new Set(),
  }

  return {
    serverUrl: 'http://fhir.example.com',
    serverIdentifier: 'test-server',
    fhirVersion: '4.0.1',
    resources: new Map([['Patient', patientCap], ['Flag', flagCap]]),
    systemSearchParams: new Map(),
    systemInteractions: new Set(['search-system']),
    fetchedAt: Date.now(),
    ...overrides,
  }
}

describe('normalizeSearchParams', () => {
  it('passes everything through when capabilities are null (fail-open)', () => {
    const result = normalizeSearchParams(null, 'Patient', '?name=smith&status=active')
    expect(result.strippedParams).toEqual([])
    expect(result.normalizedParams.get('name')).toBe('smith')
    expect(result.normalizedParams.get('status')).toBe('active')
  })

  it('strips unsupported params', () => {
    const caps = makeCapabilities()
    const result = normalizeSearchParams(caps, 'Flag', '?patient=Patient/123&status=active')
    expect(result.strippedParams).toEqual(['status'])
    expect(result.normalizedParams.get('patient')).toBe('Patient/123')
    expect(result.normalizedParams.has('status')).toBe(false)
  })

  it('preserves universal params always', () => {
    const caps = makeCapabilities()
    const result = normalizeSearchParams(caps, 'Patient', '?_count=10&_summary=true&name=smith')
    expect(result.strippedParams).toEqual([])
    expect(result.normalizedParams.get('_count')).toBe('10')
    expect(result.normalizedParams.get('_summary')).toBe('true')
  })

  it('handles modifiers (param:modifier)', () => {
    const caps = makeCapabilities()
    const result = normalizeSearchParams(caps, 'Patient', '?name:exact=Smith&foo:not=bar')
    expect(result.normalizedParams.get('name:exact')).toBe('Smith')
    expect(result.strippedParams).toEqual(['foo:not'])
  })

  it('handles chained params (param.subparam)', () => {
    const caps = makeCapabilities()
    // "name" is supported for Patient, so "name.given" should pass
    const result = normalizeSearchParams(caps, 'Patient', '?name.given=John&unknown.field=x')
    expect(result.normalizedParams.get('name.given')).toBe('John')
    expect(result.strippedParams).toEqual(['unknown.field'])
  })

  it('passes through for unknown resource types', () => {
    const caps = makeCapabilities()
    const result = normalizeSearchParams(caps, 'MedicationRequest', '?status=active&patient=Patient/1')
    expect(result.strippedParams).toEqual([])
    expect(result.supported).toBe(false)
  })
})

// ── isInteractionSupported ─────────────────────────────────────────────────

describe('isInteractionSupported', () => {
  it('returns true when capabilities are null (fail-open)', () => {
    expect(isInteractionSupported(null, 'Patient', 'GET', true)).toBe(true)
  })

  it('returns true for unknown resource types', () => {
    const caps = makeCapabilities()
    expect(isInteractionSupported(caps, 'Unknown', 'GET', false)).toBe(true)
  })

  it('allows supported interactions', () => {
    const caps = makeCapabilities()
    expect(isInteractionSupported(caps, 'Patient', 'GET', true)).toBe(true)   // search-type
    expect(isInteractionSupported(caps, 'Patient', 'GET', false)).toBe(true)  // read
    expect(isInteractionSupported(caps, 'Patient', 'POST', false)).toBe(true) // create
    expect(isInteractionSupported(caps, 'Patient', 'DELETE', false)).toBe(true)
  })

  it('blocks unsupported interactions', () => {
    const caps = makeCapabilities()
    // Flag only supports read, search-type, create — no delete
    expect(isInteractionSupported(caps, 'Flag', 'DELETE', false)).toBe(false)
    expect(isInteractionSupported(caps, 'Flag', 'PUT', false)).toBe(false)
  })
})
