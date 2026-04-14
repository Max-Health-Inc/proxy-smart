import { describe, expect, it } from 'bun:test'
import {
  parseFhirPath,
  normalizeSearchParams,
  isInteractionSupported,
  isHistorySupported,
  isOperationSupported,
  isFormatSupported,
  isPatchFormatSupported,
  parseCapabilityStatement,
  serializeCapabilities,
  clearCapabilitiesCache,
  getCapabilitiesCacheStats,
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

// ── parseCapabilityStatement ───────────────────────────────────────────────

describe('parseCapabilityStatement', () => {

  it('parses a realistic HAPI FHIR CapabilityStatement', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      status: 'active',
      fhirVersion: '4.0.1',
      format: ['application/fhir+xml', 'application/fhir+json'],
      patchFormat: ['application/json-patch+json', 'application/fhir+json'],
      rest: [{
        mode: 'server',
        security: {
          cors: true,
          service: [
            { coding: [{ system: 'http://hl7.org/fhir/restful-security-service', code: 'SMART-on-FHIR' }] },
            { coding: [{ code: 'OAuth' }] },
          ],
        },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
            supportedProfile: [
              'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
            ],
            interaction: [
              { code: 'read' }, { code: 'vread' }, { code: 'search-type' },
              { code: 'create' }, { code: 'update' }, { code: 'delete' },
              { code: 'history-instance' }, { code: 'history-type' },
            ],
            versioning: 'versioned',
            readHistory: true,
            updateCreate: true,
            conditionalCreate: true,
            conditionalRead: 'full-support',
            conditionalUpdate: true,
            conditionalDelete: 'multiple',
            referencePolicy: ['literal', 'local'],
            searchInclude: ['Patient:organization', 'Patient:general-practitioner', '*'],
            searchRevInclude: ['Observation:patient', 'Condition:patient'],
            searchParam: [
              { name: 'name', type: 'string' },
              { name: 'birthdate', type: 'date' },
              { name: 'identifier', type: 'token' },
              { name: 'gender', type: 'token' },
              { name: 'family', type: 'string' },
              { name: 'given', type: 'string' },
            ],
            operation: [
              { name: 'everything', definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything' },
              { name: 'match', definition: 'http://hl7.org/fhir/OperationDefinition/Patient-match' },
            ],
          },
          {
            type: 'Observation',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              { name: 'patient', type: 'reference' },
              { name: 'category', type: 'token' },
              { name: 'code', type: 'token' },
              { name: 'date', type: 'date' },
            ],
          },
          {
            type: 'Flag',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            searchParam: [
              { name: 'patient', type: 'reference' },
              { name: 'date', type: 'date' },
            ],
          },
        ],
        interaction: [
          { code: 'transaction' },
          { code: 'batch' },
          { code: 'search-system' },
          { code: 'history-system' },
        ],
        searchParam: [
          { name: '_text', type: 'string' },
          { name: '_content', type: 'string' },
        ],
        operation: [
          { name: 'export', definition: 'http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export' },
        ],
        compartment: [
          'http://hl7.org/fhir/CompartmentDefinition/patient',
          'http://hl7.org/fhir/CompartmentDefinition/encounter',
        ],
      }],
    }

    const caps = parseCapabilityStatement(raw, 'http://hapi.example.com/fhir', 'hapi-test')

    // Top-level
    expect(caps.fhirVersion).toBe('4.0.1')
    expect(caps.status).toBe('active')
    expect(caps.serverUrl).toBe('http://hapi.example.com/fhir')
    expect(caps.serverIdentifier).toBe('hapi-test')

    // Formats
    expect(caps.format.has('application/fhir+json')).toBe(true)
    expect(caps.format.has('application/fhir+xml')).toBe(true)
    expect(caps.patchFormat.has('application/json-patch+json')).toBe(true)

    // Security
    expect(caps.security.cors).toBe(true)
    expect(caps.security.services).toContain('SMART-on-FHIR')
    expect(caps.security.services).toContain('OAuth')

    // Resource count
    expect(caps.resources.size).toBe(3)

    // Patient resource — full behavioral flags
    const patient = caps.resources.get('Patient')!
    expect(patient).toBeDefined()
    expect(patient.profile).toBe('http://hl7.org/fhir/StructureDefinition/Patient')
    expect(patient.supportedProfiles.has('http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient')).toBe(true)
    expect(patient.interactions.size).toBe(8)
    expect(patient.interactions.has('vread')).toBe(true)
    expect(patient.interactions.has('history-type')).toBe(true)
    expect(patient.versioning).toBe('versioned')
    expect(patient.readHistory).toBe(true)
    expect(patient.updateCreate).toBe(true)
    expect(patient.conditionalCreate).toBe(true)
    expect(patient.conditionalRead).toBe('full-support')
    expect(patient.conditionalUpdate).toBe(true)
    expect(patient.conditionalDelete).toBe('multiple')
    expect(patient.referencePolicy.has('literal')).toBe(true)
    expect(patient.referencePolicy.has('local')).toBe(true)
    expect(patient.searchParams.size).toBe(6)
    expect(patient.searchParams.get('family')).toBe('string')
    expect(patient.searchInclude.has('*')).toBe(true)
    expect(patient.searchInclude.has('Patient:organization')).toBe(true)
    expect(patient.searchRevInclude.has('Observation:patient')).toBe(true)
    expect(patient.operations.has('everything')).toBe(true)
    expect(patient.operations.has('match')).toBe(true)

    // Observation — minimal resource with defaults
    const obs = caps.resources.get('Observation')!
    expect(obs.interactions.size).toBe(2)
    expect(obs.versioning).toBeNull()
    expect(obs.readHistory).toBe(false)
    expect(obs.updateCreate).toBe(false)
    expect(obs.conditionalCreate).toBe(false)
    expect(obs.conditionalRead).toBeNull()
    expect(obs.conditionalUpdate).toBe(false)
    expect(obs.conditionalDelete).toBeNull()
    expect(obs.referencePolicy.size).toBe(0)
    expect(obs.searchInclude.size).toBe(0)
    expect(obs.searchRevInclude.size).toBe(0)
    expect(obs.operations.size).toBe(0)

    // Flag — no status search param (the original bug)
    const flag = caps.resources.get('Flag')!
    expect(flag.searchParams.has('status')).toBe(false)
    expect(flag.searchParams.has('patient')).toBe(true)

    // System-level capabilities
    expect(caps.systemInteractions.has('transaction')).toBe(true)
    expect(caps.systemInteractions.has('batch')).toBe(true)
    expect(caps.systemInteractions.has('search-system')).toBe(true)
    expect(caps.systemInteractions.has('history-system')).toBe(true)
    expect(caps.systemSearchParams.get('_text')).toBe('string')
    expect(caps.systemSearchParams.get('_content')).toBe('string')
    expect(caps.systemOperations.has('export')).toBe(true)

    // Compartments
    expect(caps.compartments.has('http://hl7.org/fhir/CompartmentDefinition/patient')).toBe(true)
    expect(caps.compartments.has('http://hl7.org/fhir/CompartmentDefinition/encounter')).toBe(true)
  })

  it('handles empty rest array gracefully', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [],
    }
    const caps = parseCapabilityStatement(raw, 'http://empty.example.com', 'empty')
    expect(caps.resources.size).toBe(0)
    expect(caps.systemInteractions.size).toBe(0)
    expect(caps.systemOperations.size).toBe(0)
    expect(caps.compartments.size).toBe(0)
    expect(caps.security.cors).toBe(false)
    expect(caps.security.services).toEqual([])
  })

  it('handles missing rest property', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
    }
    const caps = parseCapabilityStatement(raw, 'http://minimal.example.com', 'minimal')
    expect(caps.fhirVersion).toBe('unknown')
    expect(caps.status).toBeNull()
    expect(caps.resources.size).toBe(0)
    expect(caps.format.size).toBe(0)
    expect(caps.patchFormat.size).toBe(0)
  })

  it('prefers server mode rest entry over client mode', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [
        {
          mode: 'client',
          resource: [{ type: 'Patient', interaction: [{ code: 'read' }] }],
        },
        {
          mode: 'server',
          resource: [
            { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }] },
            { type: 'Observation', interaction: [{ code: 'read' }] },
          ],
        },
      ],
    }
    const caps = parseCapabilityStatement(raw, 'http://dual.example.com', 'dual')
    // Should pick the server entry (2 resources, 3 Patient interactions)
    expect(caps.resources.size).toBe(2)
    const patient = caps.resources.get('Patient')!
    expect(patient.interactions.size).toBe(3)
  })

  it('falls back to first rest entry when no server mode exists', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [
        {
          mode: 'client',
          resource: [{ type: 'AllergyIntolerance', interaction: [{ code: 'read' }] }],
        },
      ],
    }
    const caps = parseCapabilityStatement(raw, 'http://client-only.example.com', 'client-only')
    expect(caps.resources.size).toBe(1)
    expect(caps.resources.has('AllergyIntolerance')).toBe(true)
  })

  it('parses resources with no interactions or searchParams', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [{
        mode: 'server',
        resource: [
          { type: 'StructureDefinition' },
        ],
      }],
    }
    const caps = parseCapabilityStatement(raw, 'http://bare.example.com', 'bare')
    const sd = caps.resources.get('StructureDefinition')!
    expect(sd.interactions.size).toBe(0)
    expect(sd.searchParams.size).toBe(0)
    expect(sd.searchInclude.size).toBe(0)
    expect(sd.searchRevInclude.size).toBe(0)
    expect(sd.operations.size).toBe(0)
    expect(sd.profile).toBeNull()
    expect(sd.supportedProfiles.size).toBe(0)
  })

  it('parses security with no coding entries', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [{
        mode: 'server',
        security: {
          cors: false,
          service: [{ text: 'Basic Authentication' }],
        },
        resource: [],
      }],
    }
    const caps = parseCapabilityStatement(raw, 'http://basic.example.com', 'basic')
    expect(caps.security.cors).toBe(false)
    expect(caps.security.services).toEqual([])
  })

  it('parses security with no security block at all', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [{
        mode: 'server',
        resource: [{ type: 'Patient', interaction: [{ code: 'read' }] }],
      }],
    }
    const caps = parseCapabilityStatement(raw, 'http://nosec.example.com', 'nosec')
    expect(caps.security.cors).toBe(false)
    expect(caps.security.services).toEqual([])
  })

  it('deduplicates resource types (last wins)', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
      rest: [{
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }] },
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'create' }] },
        ],
      }],
    }
    const caps = parseCapabilityStatement(raw, 'http://dup.example.com', 'dup')
    expect(caps.resources.size).toBe(1)
    expect(caps.resources.get('Patient')!.interactions.size).toBe(2)
  })

  it('sets fetchedAt to a recent timestamp', () => {
    const before = Date.now()
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      fhirVersion: '4.0.1',
    }
    const caps = parseCapabilityStatement(raw, 'http://ts.example.com', 'ts')
    const after = Date.now()
    expect(caps.fetchedAt).toBeGreaterThanOrEqual(before)
    expect(caps.fetchedAt).toBeLessThanOrEqual(after)
  })
})

// ── serializeCapabilities ──────────────────────────────────────────────────

describe('serializeCapabilities', () => {

  it('round-trips all scalar fields', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    expect(json.serverUrl).toBe(caps.serverUrl)
    expect(json.serverIdentifier).toBe(caps.serverIdentifier)
    expect(json.fhirVersion).toBe(caps.fhirVersion)
    expect(json.status).toBe(caps.status)
    expect(json.security).toEqual(caps.security)
    expect(json.resourceCount).toBe(caps.resources.size)
  })

  it('converts Sets to arrays', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    expect(Array.isArray(json.format)).toBe(true)
    expect(Array.isArray(json.patchFormat)).toBe(true)
    expect(Array.isArray(json.systemInteractions)).toBe(true)
    expect(Array.isArray(json.systemOperations)).toBe(true)
    expect(Array.isArray(json.compartments)).toBe(true)

    expect(json.format).toContain('json')
    expect(json.systemInteractions).toContain('search-system')
    expect(json.systemOperations).toContain('export')
    expect(json.compartments).toContain('http://hl7.org/fhir/CompartmentDefinition/patient')
  })

  it('converts Maps to plain objects', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    expect(typeof json.systemSearchParams).toBe('object')
    expect(json.systemSearchParams).toHaveProperty('_text', 'string')
  })

  it('serializes resource capabilities with all fields', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    const patient = json.resources['Patient'] as Record<string, unknown>
    expect(patient).toBeDefined()
    expect(patient.profile).toBe('http://hl7.org/fhir/StructureDefinition/Patient')
    expect(Array.isArray(patient.supportedProfiles)).toBe(true)
    expect(Array.isArray(patient.interactions)).toBe(true)
    expect(Array.isArray(patient.searchInclude)).toBe(true)
    expect(Array.isArray(patient.searchRevInclude)).toBe(true)
    expect(Array.isArray(patient.operations)).toBe(true)
    expect(Array.isArray(patient.referencePolicy)).toBe(true)
    expect(typeof patient.searchParams).toBe('object')
    expect((patient.searchParams as Record<string, string>).name).toBe('string')
    expect(patient.versioning).toBe('versioned')
    expect(patient.readHistory).toBe(true)
    expect(patient.updateCreate).toBe(false)
    expect(patient.conditionalCreate).toBe(false)
    expect(patient.conditionalRead).toBe('full-support')
    expect(patient.conditionalUpdate).toBe(true)
    expect(patient.conditionalDelete).toBe('multiple')
  })

  it('produces a valid ISO timestamp for fetchedAt', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    expect(typeof json.fetchedAt).toBe('string')
    const parsed = Date.parse(json.fetchedAt)
    expect(isNaN(parsed)).toBe(false)
  })

  it('includes cacheAgeMs as a non-negative number', () => {
    const caps = makeCaps()
    const json = serializeCapabilities(caps)
    expect(typeof json.cacheAgeMs).toBe('number')
    expect(json.cacheAgeMs).toBeGreaterThanOrEqual(0)
  })

  it('round-trips through parse → serialize for a realistic CapabilityStatement', () => {
    const raw = {
      resourceType: 'CapabilityStatement' as const,
      status: 'active',
      fhirVersion: '4.0.1',
      format: ['json', 'xml'],
      patchFormat: ['application/json-patch+json'],
      rest: [{
        mode: 'server',
        security: { cors: true, service: [{ coding: [{ code: 'SMART-on-FHIR' }] }] },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [{ name: 'name', type: 'string' }],
            searchInclude: ['Patient:organization'],
            operation: [{ name: 'everything', definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything' }],
            versioning: 'versioned',
            readHistory: true,
            conditionalRead: 'full-support',
            referencePolicy: ['literal'],
          },
        ],
        interaction: [{ code: 'transaction' }],
        searchParam: [{ name: '_text', type: 'string' }],
        operation: [{ name: 'export', definition: 'http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export' }],
        compartment: ['http://hl7.org/fhir/CompartmentDefinition/patient'],
      }],
    }
    const parsed = parseCapabilityStatement(raw, 'http://rt.example.com', 'round-trip')
    const json = serializeCapabilities(parsed)

    // Verify structural integrity
    expect(json.fhirVersion).toBe('4.0.1')
    expect(json.format).toContain('json')
    expect(json.format).toContain('xml')
    expect(json.patchFormat).toContain('application/json-patch+json')
    expect(json.security.cors).toBe(true)
    expect(json.security.services).toContain('SMART-on-FHIR')
    expect(json.resourceCount).toBe(1)
    expect(json.systemInteractions).toContain('transaction')
    expect(json.systemSearchParams).toHaveProperty('_text', 'string')
    expect(json.systemOperations).toContain('export')
    expect(json.compartments).toContain('http://hl7.org/fhir/CompartmentDefinition/patient')

    const patient = json.resources['Patient'] as Record<string, unknown>
    expect((patient.interactions as string[])).toContain('read')
    expect((patient.interactions as string[])).toContain('search-type')
    expect((patient.searchParams as Record<string, string>).name).toBe('string')
    expect((patient.searchInclude as string[])).toContain('Patient:organization')
    expect((patient.operations as string[])).toContain('everything')
    expect(patient.versioning).toBe('versioned')
    expect(patient.readHistory).toBe(true)
    expect(patient.conditionalRead).toBe('full-support')
    expect((patient.referencePolicy as string[])).toContain('literal')
  })
})

// ── clearCapabilitiesCache & getCapabilitiesCacheStats ─────────────────────

describe('clearCapabilitiesCache', () => {
  it('does not throw when clearing empty cache', () => {
    expect(() => clearCapabilitiesCache()).not.toThrow()
  })

  it('does not throw when clearing specific key from empty cache', () => {
    expect(() => clearCapabilitiesCache('nonexistent')).not.toThrow()
  })
})

describe('getCapabilitiesCacheStats', () => {
  it('returns size and entries array', () => {
    clearCapabilitiesCache()
    const stats = getCapabilitiesCacheStats()
    expect(typeof stats.size).toBe('number')
    expect(Array.isArray(stats.entries)).toBe(true)
  })
})
