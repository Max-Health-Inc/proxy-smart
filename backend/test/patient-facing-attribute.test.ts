// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * `patient_facing` arrives from Keycloak as a plain string, not an array.
 *
 * It used to be read as `attrs[key]?.[0] ?? attrs[key]`, which indexes the string and yields
 * 't'. That matched neither 'true' nor 'false', so every client resolved to `undefined` —
 * passthrough — and a `Person/<id>` fhirUser reached patient-facing apps unresolved, with no
 * patient context behind it. The cache's other tests use a fake source, so none of them
 * touched a real attribute.
 */
import { describe, it, expect } from 'bun:test'
import { parsePatientFacing } from '../src/lib/smart-client-config-cache'

describe('parsePatientFacing', () => {
  it('reads the string shape Keycloak actually sends for a client', () => {
    expect(parsePatientFacing({ patient_facing: 'true' })).toBe(true)
    expect(parsePatientFacing({ patient_facing: 'false' })).toBe(false)
  })

  it('still reads the array shape', () => {
    expect(parsePatientFacing({ patient_facing: ['true'] })).toBe(true)
    expect(parsePatientFacing({ patient_facing: ['false'] })).toBe(false)
  })

  it('never mistakes a truthy fragment for a value', () => {
    expect(parsePatientFacing({ patient_facing: 't' })).toBeUndefined()
    expect(parsePatientFacing({ patient_facing: 'TRUE' })).toBeUndefined()
  })

  it('treats a cleared attribute, a missing one and no attributes as passthrough', () => {
    expect(parsePatientFacing({ patient_facing: '' })).toBeUndefined()
    expect(parsePatientFacing({ other: 'true' })).toBeUndefined()
    expect(parsePatientFacing(undefined)).toBeUndefined()
  })
})
