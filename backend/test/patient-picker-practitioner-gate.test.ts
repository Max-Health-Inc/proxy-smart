// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Who is allowed to choose a patient.
 *
 * THE EXPOSURE THIS CLOSES. The picker is a searchable directory of every Patient on the server, and
 * `/auth/patient-search` proxies to FHIR with no bearer token — so whoever reaches it can page and
 * search the whole table by name. Reaching it required only a launch session key.
 *
 * The old control was "skip the picker when we can resolve a patient from fhirUser", which is a
 * convenience, not a gate: a user whose identity did not resolve fell through to the directory. The
 * rule is now positive — practitioner or nothing — and the search endpoint refuses anything the gate
 * did not clear, so the gate is not the only thing in front of the data.
 */
import { describe, it, expect } from 'bun:test'
import { isPractitioner } from '@proxy-smart/auth'

describe('isPractitioner', () => {
  it('accepts a practitioner', () => {
    expect(isPractitioner('Practitioner/abc')).toBe(true)
  })

  it('accepts a PractitionerRole', () => {
    expect(isPractitioner('PractitionerRole/abc')).toBe(true)
  })

  it('accepts an absolute reference, which is what some IdPs emit', () => {
    expect(isPractitioner('https://fhir.example.com/R4/Practitioner/abc')).toBe(true)
  })

  it('refuses a patient', () => {
    // The case the old code handled by skipping; now it is refused outright if it ever gets here.
    expect(isPractitioner('Patient/123')).toBe(false)
  })

  it('refuses an identity we cannot establish', () => {
    // THE HOLE. Unknown used to fall through to the picker.
    expect(isPractitioner(undefined)).toBe(false)
    expect(isPractitioner('')).toBe(false)
  })

  it('refuses a related person or any other resource type', () => {
    expect(isPractitioner('RelatedPerson/9')).toBe(false)
    expect(isPractitioner('Person/9')).toBe(false)
  })

  it('is not fooled by a type-shaped id', () => {
    // `Patient/Practitioner` is a Patient whose id happens to read like a type.
    expect(isPractitioner('Patient/Practitioner')).toBe(false)
  })
})
