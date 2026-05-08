import { describe, it, expect } from 'bun:test'
import { isScopeGranted, filterScopes, expandScopesToWildcards } from '../../packages/auth/src/smart-scopes'

describe('SMART Scopes Delegation logic', () => {

  it('approves granular scope when wildcard is granted', () => {
    const granted = new Set(['openid', 'user/*.read'])
    expect(isScopeGranted('user/Patient.read', granted)).toBe(true)
    expect(isScopeGranted('user/Observation.read', granted)).toBe(true)
  })

  it('approves granular RS scope when RS wildcard is granted', () => {
    const granted = new Set(['user/*.rs'])
    expect(isScopeGranted('user/ImagingStudy.rs', granted)).toBe(true)
  })

  it('rejects granular scope when different compartment is granted', () => {
    const granted = new Set(['patient/*.read'])
    expect(isScopeGranted('user/Patient.read', granted)).toBe(false)
  })

  it('rejects granular scope when different operation is granted', () => {
    const granted = new Set(['user/*.read'])
    expect(isScopeGranted('user/Patient.write', granted)).toBe(false)
  })

  it('approves granular scope when global wildcard is granted', () => {
    const granted = new Set(['user/*.*'])
    expect(isScopeGranted('user/Patient.rs', granted)).toBe(true)
  })

  it('filters scopes correctly using filterScopes', () => {
    const requested = 'openid user/Patient.read user/Observation.rs'
    const granted = 'openid fhirUser user/*.read user/*.rs'
    const result = filterScopes(requested, granted)
    
    expect(result).toContain('openid')
    expect(result).toContain('fhirUser')
    expect(result).toContain('user/Patient.read')
    expect(result).toContain('user/Observation.rs')
  })

  it('removes requested scopes that are not granted via wildcards', () => {
    const requested = 'user/Patient.write user/Observation.read'
    const granted = 'user/*.read'
    const result = filterScopes(requested, granted)

    expect(result).toContain('user/Observation.read')
    expect(result).not.toContain('user/Patient.write')
  })
})

describe('expandScopesToWildcards (authorize interceptor — the critical path)', () => {
  it('expands granular scope to wildcard before sending to Keycloak', () => {
    const result = expandScopesToWildcards('openid fhirUser user/ImagingStudy.rs')
    expect(result).toContain('user/*.rs')
    expect(result).not.toContain('user/ImagingStudy.rs')
    expect(result).toContain('openid')
    expect(result).toContain('fhirUser')
  })

  it('deduplicates wildcards when multiple granular scopes map to the same wildcard', () => {
    const result = expandScopesToWildcards('user/Patient.read user/Observation.read user/ImagingStudy.read')
    const parts = result.split(' ')
    expect(parts.filter(s => s === 'user/*.read').length).toBe(1)
  })

  it('leaves already-wildcard scopes unchanged', () => {
    expect(expandScopesToWildcards('openid user/*.read')).toBe('openid user/*.read')
  })

  it('handles empty/undefined scope gracefully', () => {
    expect(expandScopesToWildcards('')).toBe('')
    expect(expandScopesToWildcards(undefined)).toBe('')
  })

  it('does not expand launch/* or other non-resource scopes', () => {
    const result = expandScopesToWildcards('openid launch/patient fhirUser')
    expect(result).toBe('openid launch/patient fhirUser')
  })
})
