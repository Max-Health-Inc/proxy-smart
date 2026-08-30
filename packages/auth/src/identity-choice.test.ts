// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Choosing which of a human's identities a launch is for.
 *
 * The two behaviours being replaced both guessed: `patient_facing` decided from a client attribute
 * nothing sets on a dynamically-registered client, and AIHR took Practitioner whenever both
 * existed. What is pinned here is that the REQUEST decides where it can, and the human decides
 * where it cannot.
 */
import { describe, test, expect } from 'bun:test'
import { chooseIdentity, candidatesForScopes, isOfferedIdentity } from './identity-choice'
import type { IdentityCandidate } from './identity-choice'

const patient: IdentityCandidate = { reference: 'Patient/1', resourceType: 'Patient', display: 'Max N' }
const practitioner: IdentityCandidate = { reference: 'Practitioner/2', resourceType: 'Practitioner', display: 'Dr N' }
const related: IdentityCandidate = { reference: 'RelatedPerson/3', resourceType: 'RelatedPerson' }

describe('candidatesForScopes', () => {
  test('a standalone patient-context launch can only be satisfied by a Patient', () => {
    expect(candidatesForScopes([patient, practitioner], 'launch/patient openid')).toEqual([patient])
    expect(candidatesForScopes([patient, practitioner], 'patient/Observation.rs')).toEqual([patient])
  })

  test('an EHR launch is NOT narrowed, because the patient is somebody else', () => {
    // The trap in reusing `canReturnPatient`: it answers true for a bare `launch` too, so a
    // clinician who happens to have a chart of their own would have been handed it as `fhirUser`
    // while working on the patient the EHR put in context.
    expect(candidatesForScopes([patient, practitioner], 'launch openid'))
      .toEqual([patient, practitioner])
  })

  test('a launch code in context means the context was not established here', () => {
    expect(candidatesForScopes([patient, practitioner], 'launch/patient', true))
      .toEqual([patient, practitioner])
  })

  test('a request that asked for no patient context keeps every candidate', () => {
    expect(candidatesForScopes([patient, practitioner], 'user/Patient.rs openid'))
      .toEqual([patient, practitioner])
  })

  test('keeps everything when patient context is wanted but no Patient exists', () => {
    // Dropping them would leave the launch with nothing and no way to say why. The practitioner
    // gate downstream refuses this case with a message; an empty list cannot.
    expect(candidatesForScopes([practitioner, related], 'launch/patient')).toEqual([practitioner, related])
  })
})

describe('chooseIdentity', () => {
  test('resolves without prompting when the human is only a patient', () => {
    expect(chooseIdentity([patient], 'user/Patient.rs')).toEqual({ action: 'resolved', identity: patient })
  })

  test('resolves without prompting when the scopes settle it', () => {
    // A clinician with a chart opening a standalone patient app is NOT ambiguous — they asked for
    // patient context, and only one of their identities can carry it.
    expect(chooseIdentity([patient, practitioner], 'launch/patient'))
      .toEqual({ action: 'resolved', identity: patient })
  })

  test('asks in an EHR launch, rather than assuming the clinician is the patient', () => {
    expect(chooseIdentity([patient, practitioner], 'launch openid'))
      .toEqual({ action: 'choose', candidates: [patient, practitioner] })
  })

  test('asks when the request leaves it genuinely open', () => {
    const choice = chooseIdentity([patient, practitioner], 'user/Patient.rs openid fhirUser')
    expect(choice).toEqual({ action: 'choose', candidates: [patient, practitioner] })
  })

  test('answers none when the Person links to nothing usable', () => {
    expect(chooseIdentity([], 'launch/patient')).toEqual({ action: 'none' })
  })
})

describe('isOfferedIdentity', () => {
  test('accepts a reference the session offered', () => {
    expect(isOfferedIdentity('Practitioner/2', ['Patient/1', 'Practitioner/2'])).toBe(true)
  })

  test('refuses one it did not, which is the whole authorization check on the POST', () => {
    // The choice arrives in a form body. Without this, a session key would let anyone name any
    // Practitioner on the server and be issued a token as them.
    expect(isOfferedIdentity('Practitioner/999', ['Patient/1', 'Practitioner/2'])).toBe(false)
    expect(isOfferedIdentity('', ['Patient/1'])).toBe(false)
  })
})
