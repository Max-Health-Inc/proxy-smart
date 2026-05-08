import { describe, it, expect } from 'bun:test'
import { isScopeGranted, filterScopes } from '../../packages/auth/src/smart-scopes'

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
