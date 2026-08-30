// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @proxy-smart/auth — which of a human's identities a launch is for.
 *
 * A `Person` fhirUser names the human; SMART's fhirUser is single valued, so something must
 * choose. The request decides where it can (see `candidatesForScopes`); the human decides where
 * it cannot. Nothing guesses.
 *
 * A seat is not scoped to the account holding it: the Practitioner hangs off the Person, so it is
 * offered whichever account signed in. Decided 2026-08-30 — do not add a per-party filter.
 */

import { isStandaloneLaunch, parseScopes } from './smart-scopes'

/**
 * SMART also permits PractitionerRole as a fhirUser; it is absent deliberately, because
 * `Person.link.target` (R4) is Patient | Practitioner | RelatedPerson | Person.
 */
export const IDENTITY_TYPES = ['Patient', 'Practitioner', 'RelatedPerson'] as const

export type IdentityType = (typeof IDENTITY_TYPES)[number]

/** One identity a Person links to, as offered to whoever is signing in. */
export interface IdentityCandidate {
  /** A reference the token can carry verbatim, e.g. `Practitioner/123`. */
  reference: string
  resourceType: IdentityType
  /** Human-readable, for the picker. Absent is fine; the reference is always shown. */
  display?: string
}

/** What kind of launch this is, which is the context the choice is read from. */
export interface LaunchShape {
  /** An EHR launch code already named a patient, so the context was not established here. */
  patientContextEstablished?: boolean
  /** Launched from inside an EHR: the human is there as a clinician. */
  ehrLaunch?: boolean
}

export type IdentityChoice =
  /** The Person links to nothing this launch could use. */
  | { action: 'none' }
  /** Exactly one candidate, so nobody is asked. */
  | { action: 'resolved'; identity: IdentityCandidate }
  /** More than one, and choosing for them is what produced the two bugs above. */
  | { action: 'choose'; candidates: IdentityCandidate[] }

/**
 * Narrow to what this request can use. NOT `canReturnPatient`, which is also true for a bare
 * `launch` — an EHR launch, where the patient is somebody else.
 */
export function candidatesForScopes(
  candidates: readonly IdentityCandidate[],
  scope: string | undefined,
  shape: LaunchShape = {},
): IdentityCandidate[] {
  // First: stronger than the scopes, which an EHR-launched app also sets.
  if (shape.ehrLaunch) {
    const practitioners = candidates.filter((c) => c.resourceType === 'Practitioner')
    if (practitioners.length > 0) return practitioners
    return [...candidates]
  }

  if (!isStandaloneLaunch(parseScopes(scope), !!shape.patientContextEstablished)) return [...candidates]
  const patients = candidates.filter((c) => c.resourceType === 'Patient')
  return patients.length > 0 ? patients : [...candidates]
}

/** Decide without prompting anyone, so the decision is testable on its own. */
export function chooseIdentity(
  candidates: readonly IdentityCandidate[],
  scope: string | undefined,
  shape: LaunchShape = {},
): IdentityChoice {
  const usable = candidatesForScopes(candidates, scope, shape)
  const [first] = usable
  if (!first) return { action: 'none' }
  if (usable.length === 1) return { action: 'resolved', identity: first }
  return { action: 'choose', candidates: usable }
}

/** Membership in the offer IS the authorization: the POST is attacker-controlled. */
export function isOfferedIdentity(reference: string, offered: readonly string[]): boolean {
  return offered.includes(reference)
}
