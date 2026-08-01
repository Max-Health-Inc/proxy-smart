/**
 * Every seeded user must receive the realm's DEFAULT ROLE COMPOSITE, not a hand-written copy of
 * the roles inside it.
 *
 * THE BUG THIS GUARDS. `default-roles-proxy-smart` grants `offline_access` and `user`, but no
 * seeded user was assigned it — each declared explicit `realmRoles` instead, and a realm import
 * takes that list literally. `testuser` and `doctor` had `offline_access` hand-patched back in;
 * `admin` did not. So `admin` could log in and then fail the token exchange with
 * "Offline tokens not allowed for the user or client" — after a successful login, which reads as
 * a broken server. Reproduced against beta 2026-08-01: identical request, only the requested
 * scope differing, issues a token without `offline_access` and fails with it.
 *
 * Asserting "admin has offline_access" would have re-fixed the instance and left the shape
 * intact, so these assert the shape: the composite is the single source of baseline roles, and
 * nobody may restate its contents per-user.
 */
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

interface RealmUser {
  username?: string
  realmRoles?: string[]
}
interface RealmExport {
  defaultRole?: { name?: string; composites?: { realm?: string[] } }
  users?: RealmUser[]
  roles?: { realm?: { name?: string }[] }
}

const realm = JSON.parse(
  readFileSync(join(import.meta.dir, '..', '..', 'keycloak', 'realm-export.json'), 'utf8'),
) as RealmExport

const DEFAULT_ROLE = 'default-roles-proxy-smart'
const composite = realm.defaultRole?.composites?.realm ?? []
/** Users the import actually creates with roles; service accounts carry none. */
const seeded = (realm.users ?? []).filter((u) => u.realmRoles !== undefined)

describe('realm default role composite', () => {
  it('is the realm default and grants offline_access', () => {
    // offline_access here is what lets ANY user obtain a refresh-token grant that Keycloak gates
    // on the role. Stock Keycloak ships it in this composite; dropping it breaks every client
    // that requests the scope, at the token exchange rather than at login.
    expect(realm.defaultRole?.name).toBe(DEFAULT_ROLE)
    expect(composite).toContain('offline_access')
    expect(composite).toContain('user')
  })

  it('defines every role the composite references', () => {
    const defined = new Set((realm.roles?.realm ?? []).map((r) => r.name))
    for (const role of composite) {
      expect(defined.has(role)).toBe(true)
    }
  })
})

describe('the generic admin role', () => {
  const admin = (realm.roles?.realm ?? []).find((r) => r.name === 'admin') as
    | { name?: string; composite?: boolean; composites?: { realm?: string[] } }
    | undefined

  it('is a composite that grants the per-product admin role', () => {
    // "Administrator of everything" belongs in Keycloak as composition, not re-encoded in each
    // service. Keycloak expands composites into the token's realm_access.roles — demonstrated by
    // its own `realm-admin`, whose constituents all appear alongside it — so a user granted
    // `admin` arrives carrying `proxy-smart-admin`, and each service can accept only its own role.
    expect(admin?.composite).toBe(true)
    expect(admin?.composites?.realm).toContain('proxy-smart-admin')
  })

  it('grants only roles this export defines', () => {
    // This export cannot know about other products' roles (llm-gateway's `gateway-admin` is in no
    // Proxy Smart export), so each repo contributes its own and the live realm accumulates them.
    const defined = new Set((realm.roles?.realm ?? []).map((r) => r.name))
    for (const role of admin?.composites?.realm ?? []) {
      expect(defined.has(role)).toBe(true)
    }
  })
})

describe('seeded users', () => {
  it('exist, so the assertions below are not vacuous', () => {
    expect(seeded.length).toBeGreaterThan(0)
  })

  it('are all assigned the default composite', () => {
    // A realm import takes `realmRoles` literally — omitting this is how a user silently ends up
    // without the baseline every other user has.
    for (const user of seeded) {
      expect(user.realmRoles).toContain(DEFAULT_ROLE)
    }
  })

  it('never restate a role the composite already grants', () => {
    // The actual defect: `offline_access` copied onto two users and forgotten on the third. If
    // the composite is the source of truth, duplicating its contents per-user is how they drift.
    for (const user of seeded) {
      for (const role of user.realmRoles ?? []) {
        expect(composite).not.toContain(role)
      }
    }
  })

  it('keeps genuinely per-user roles, which are not in the composite', () => {
    // The rule above must not have been satisfied by flattening everyone to the same roles:
    // admin still carries its own elevated grants.
    const admin = seeded.find((u) => u.username === 'admin')
    expect(admin?.realmRoles).toContain('realm-admin')
  })
})
