// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Realm SESSION LIFETIME settings — the subset of the Keycloak realm this proxy will manage.
 *
 * WHY ONLY A SUBSET. A RealmRepresentation has ~200 fields, most of which have no business being
 * reachable through an application's admin API. Proxying a whole-realm update would be a far
 * larger surface than the problem needs, so this names the lifetime fields explicitly and refuses
 * everything else.
 *
 * WHY IT EXISTS AT ALL. A realm export applies only at realm CREATION; a running realm lives in
 * Postgres. So every lifetime change split into "edit the export" plus "somebody opens the
 * Keycloak console", and the second half quietly did not happen — which is how
 * `offlineSessionMaxLifespanEnabled` stayed false on a live deployment while the export said
 * otherwise, leaving offline sessions with no ceiling.
 *
 * The validation below is about failures that are SILENT rather than loud. Keycloak accepts all of
 * these happily and then behaves in a way nobody intended.
 */

/** The lifetime fields this proxy manages. All optional: a partial update is the common case. */
export interface SessionSettings {
  /** Seconds an SSO session may sit idle before expiring. */
  ssoSessionIdleTimeout?: number
  /** Seconds an SSO session may live regardless of activity. */
  ssoSessionMaxLifespan?: number
  /** Seconds an OFFLINE session may sit idle before expiring. */
  offlineSessionIdleTimeout?: number
  /** Seconds an offline session may live regardless of activity. Only applies when enabled. */
  offlineSessionMaxLifespan?: number
  /** Whether the offline ceiling is enforced at all. False means offline sessions are unbounded. */
  offlineSessionMaxLifespanEnabled?: boolean
}

/** Exactly the keys we will write. Anything else a caller sends is dropped, not applied. */
export const SESSION_SETTING_KEYS = [
  'ssoSessionIdleTimeout',
  'ssoSessionMaxLifespan',
  'offlineSessionIdleTimeout',
  'offlineSessionMaxLifespan',
  'offlineSessionMaxLifespanEnabled',
] as const

/** Keep only the fields this module owns, so an extra realm key cannot ride along into the realm. */
export function pickSessionSettings(input: Record<string, unknown>): SessionSettings {
  const out: Record<string, unknown> = {}
  for (const key of SESSION_SETTING_KEYS) {
    if (input[key] !== undefined) out[key] = input[key]
  }
  return out as SessionSettings
}

const DURATIONS = [
  'ssoSessionIdleTimeout',
  'ssoSessionMaxLifespan',
  'offlineSessionIdleTimeout',
  'offlineSessionMaxLifespan',
] as const

/**
 * Why a proposed change should be refused, or undefined when it is fine.
 *
 * Returns a message rather than throwing so the route can answer 400 with the reason; the caller
 * needs to know WHICH rule it broke, since every one of these is a mistake that otherwise takes
 * effect silently.
 */
export function validateSessionSettings(input: SessionSettings): string | undefined {
  const settings = pickSessionSettings(input as Record<string, unknown>)

  for (const key of DURATIONS) {
    const value = settings[key]
    if (value === undefined) continue
    if (!Number.isInteger(value)) return `${key} must be a whole number of seconds`
    // Zero is not "unlimited" — Keycloak reads it that way, and an unbounded lifetime is the
    // misconfiguration this module exists to correct.
    if (value <= 0) return `${key} must be greater than zero (Keycloak treats 0 as unlimited)`
  }

  // A ceiling below the idle window expires sessions before the idle rule can ever apply, which
  // makes the idle setting meaningless and the behaviour impossible to explain.
  if (
    settings.ssoSessionMaxLifespan !== undefined &&
    settings.ssoSessionIdleTimeout !== undefined &&
    settings.ssoSessionMaxLifespan <= settings.ssoSessionIdleTimeout
  ) {
    return 'ssoSessionMaxLifespan must exceed ssoSessionIdleTimeout'
  }
  if (
    settings.offlineSessionMaxLifespan !== undefined &&
    settings.offlineSessionIdleTimeout !== undefined &&
    settings.offlineSessionMaxLifespan <= settings.offlineSessionIdleTimeout
  ) {
    return 'offlineSessionMaxLifespan must exceed offlineSessionIdleTimeout'
  }

  // Enabling the ceiling while setting it to nothing is a no-op that LOOKS like a fix — the worst
  // possible outcome for a security setting somebody believes they have just applied.
  if (settings.offlineSessionMaxLifespanEnabled === true && settings.offlineSessionMaxLifespan === 0) {
    return 'offlineSessionMaxLifespan must be set when enabling the offline session ceiling'
  }

  return undefined
}
