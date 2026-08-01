/**
 * Validation for the realm SESSION LIFETIME settings.
 *
 * WHY THIS ENDPOINT EXISTS. Session and token lifetimes live in the Keycloak realm, and the realm
 * lives in Postgres — a realm export only applies at realm CREATION. So every lifetime fix split
 * into "change the export" plus "somebody opens the Keycloak console", and the second half
 * silently didn't happen. That is how `offlineSessionMaxLifespanEnabled` sat at false on a running
 * deployment while the export said otherwise, leaving offline sessions with no ceiling at all.
 *
 * The realm object has ~200 fields and most of them have no business being reachable from here, so
 * this exposes exactly the lifetime settings and validates them rather than proxying a realm
 * update wholesale.
 *
 * The rules encode failures that are silent rather than loud: a max below the idle window expires
 * sessions before the idle rule can ever apply, and a ceiling of zero means "no ceiling" in
 * Keycloak — the precise misconfiguration this endpoint was added to fix.
 */
import { describe, it, expect } from 'bun:test'
import { validateSessionSettings } from '../src/lib/session-settings'

const VALID = {
  ssoSessionIdleTimeout: 1800,
  ssoSessionMaxLifespan: 36000,
  offlineSessionIdleTimeout: 2592000,
  offlineSessionMaxLifespan: 5184000,
  offlineSessionMaxLifespanEnabled: true,
}

describe('validateSessionSettings', () => {
  it('accepts the realm defaults', () => {
    expect(validateSessionSettings(VALID)).toBeUndefined()
  })

  it('accepts a partial update, so one field can change alone', () => {
    // The common case: flipping the ceiling on without restating every lifetime.
    expect(validateSessionSettings({ offlineSessionMaxLifespanEnabled: true })).toBeUndefined()
  })

  it('rejects a max lifespan below its idle timeout', () => {
    // Sessions would be cut off before the idle rule ever applied, making the idle setting
    // meaningless and the behaviour impossible to reason about.
    expect(validateSessionSettings({ ...VALID, ssoSessionMaxLifespan: 60 })).toMatch(/ssoSessionMaxLifespan/)
    expect(
      validateSessionSettings({ ...VALID, offlineSessionMaxLifespan: 60 }),
    ).toMatch(/offlineSessionMaxLifespan/)
  })

  it('rejects a zero or negative lifetime', () => {
    // Zero is not "unlimited" here — Keycloak treats it as such, which is exactly the
    // unbounded-offline-session state this endpoint exists to correct.
    expect(validateSessionSettings({ offlineSessionMaxLifespan: 0 })).toBeDefined()
    expect(validateSessionSettings({ ssoSessionIdleTimeout: -1 })).toBeDefined()
  })

  it('rejects enabling the ceiling without one being set anywhere', () => {
    // Turning the flag on with no value is a no-op that LOOKS like a fix — the worst outcome for
    // a security setting somebody just convinced themselves they had applied.
    expect(
      validateSessionSettings({ offlineSessionMaxLifespanEnabled: true, offlineSessionMaxLifespan: 0 }),
    ).toBeDefined()
  })

  it('rejects a non-integer, since Keycloak stores whole seconds', () => {
    expect(validateSessionSettings({ ssoSessionIdleTimeout: 12.5 })).toBeDefined()
  })

  it('ignores fields it does not own', () => {
    // A caller passing extra realm keys must not have them silently applied to the realm.
    expect(validateSessionSettings({ displayName: 'hacked' } as never)).toBeUndefined()
  })
})
