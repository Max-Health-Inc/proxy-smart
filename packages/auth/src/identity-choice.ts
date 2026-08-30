// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @proxy-smart/auth — which of a human's identities this launch is for.
 *
 * A `Person` fhirUser names the HUMAN, and a human can be more than one thing here: a clinician
 * with a chart of their own is a Practitioner and a Patient at once. SMART's `fhirUser` is single
 * valued, so something has to choose, and until now two different things guessed.
 *
 * Proxy Smart guessed from `patient_facing`, a hand-set client attribute that no dynamic
 * registration ever writes, so every DCR client fell through to being handed the raw Person that
 * most SMART apps cannot read. AIHR guessed the other way, taking Practitioner whenever both
 * existed, which silently decided that a clinician can never open their own record.
 *
 * NOBODY GUESSES HERE. The request already says what it needs, and {@link isStandaloneLaunch} is
 * the shared rule that reads it: an app asking for `launch/patient` or a `patient/` compartment
 * scope WITHOUT an EHR launch code is a standalone app whose user is the patient, and only a
 * Patient can be that. When one candidate survives, the launch continues with no prompt, which is
 * every human who is only a patient. When more than one survives, the person signing in is asked,
 * because at that point the answer is genuinely theirs.
 *
 * NOT `canReturnPatient`, which looks like the same question and is not. It also answers true for
 * a bare `launch` — an EHR launch, where a clinician has already picked a patient who is somebody
 * else. Narrowing on it would hand those launches the CLINICIAN'S own chart as `fhirUser` whenever
 * they happened to have one.
 */

import { isStandaloneLaunch, parseScopes } from './smart-scopes'

/** The resource types SMART permits as a `fhirUser`, other than the Person doing the linking. */
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

export type IdentityChoice =
  /** The Person links to nothing this launch could use. */
  | { action: 'none' }
  /** Exactly one candidate, so nobody is asked. */
  | { action: 'resolved'; identity: IdentityCandidate }
  /** More than one, and choosing for them is what produced the two bugs above. */
  | { action: 'choose'; candidates: IdentityCandidate[] }

/**
 * Narrow a Person's linked identities to the ones this request can actually use.
 *
 * Filtering happens ONLY for a standalone patient-context launch, where the user IS the patient
 * and a Patient exists to be them. Everywhere else every candidate stays: an EHR launch is a
 * clinician working on somebody else, and an app that asked for no patient context has expressed
 * no preference. Inventing one for either is the guess this module exists to remove.
 *
 * `patientContextEstablished` is the launch code's effect — a patient already in context means the
 * context did not have to be established here, so this is not a standalone launch.
 */
export function candidatesForScopes(
  candidates: readonly IdentityCandidate[],
  scope: string | undefined,
  patientContextEstablished = false,
): IdentityCandidate[] {
  if (!isStandaloneLaunch(parseScopes(scope), patientContextEstablished)) return [...candidates]
  const patients = candidates.filter((c) => c.resourceType === 'Patient')
  return patients.length > 0 ? patients : [...candidates]
}

/** Decide without prompting anyone, so the decision is testable on its own. */
export function chooseIdentity(
  candidates: readonly IdentityCandidate[],
  scope: string | undefined,
  patientContextEstablished = false,
): IdentityChoice {
  const usable = candidatesForScopes(candidates, scope, patientContextEstablished)
  const [first] = usable
  if (!first) return { action: 'none' }
  if (usable.length === 1) return { action: 'resolved', identity: first }
  return { action: 'choose', candidates: usable }
}

/**
 * Whether `reference` is one the session actually offered.
 *
 * The choice arrives in a form POST, so it is attacker-controlled: without this, anyone holding a
 * session key could name any Practitioner on the server and have the token issued as them. The
 * candidates were derived from the signed-in human's own Person, so membership in that list IS the
 * authorization check.
 */
export function isOfferedIdentity(reference: string, offered: readonly string[]): boolean {
  return offered.includes(reference)
}
