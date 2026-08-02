// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Every realm export must survive Keycloak's realm import.
 *
 * THE BUG THIS GUARDS. A `"//"` key was added inside a seeded user to explain
 * why that account is the sole administrator. JSON has no comments, and
 * Keycloak deserializes `users[]` into `UserRepresentation` with unknown fields
 * rejected — so the import failed with `Unrecognized field "//"`, which aborts
 * startup entirely. Keycloak never came up and the beta deploy died with it.
 * Nothing caught it before the deploy because the file is still valid JSON and
 * nothing else reads that key.
 *
 * The rationale that comment carried now lives in docs/deployment.md.
 *
 * Asserting "no `//` key" alone would only re-fix the instance, so this asserts
 * the shape: a seeded user may only carry fields UserRepresentation declares.
 * The property list is Keycloak's own, copied from the error it printed.
 */
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

const REPO = join(import.meta.dir, '..', '..')

/**
 * Dockerfile.keycloak copies keycloak/realm-export.json and then layers
 * deploy/<env>/realm-export.json over it, so all three seed a real realm.
 */
const EXPORT_PATHS = [
  'keycloak/realm-export.json',
  'deploy/beta/realm-export.json',
  'deploy/prod/realm-export.json',
]

/** Fields Keycloak's UserRepresentation accepts (from its own rejection message). */
const USER_REPRESENTATION_FIELDS = new Set([
  'disableableCredentialTypes', 'lastName', 'emailVerified', 'self', 'applicationRoles',
  'createdTimestamp', 'groups', 'username', 'attributes', 'id', 'email', 'federationLink',
  'serviceAccountClientId', 'access', 'origin', 'userProfileMetadata', 'realmRoles',
  'clientRoles', 'totp', 'credentials', 'enabled', 'clientConsents', 'socialLinks',
  'firstName', 'requiredActions', 'notBefore', 'federatedIdentities',
])

interface RealmExport {
  users?: Record<string, unknown>[]
}

const EXPORTS = EXPORT_PATHS.map((name) => ({
  name,
  raw: readFileSync(join(REPO, name), 'utf8'),
})).map((entry) => ({ ...entry, realm: JSON.parse(entry.raw) as RealmExport }))

/** Walk every object key in the document, reporting dotted paths. */
function* everyKey(value: unknown, path = '$'): Generator<{ key: string; path: string }> {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* everyKey(item, `${path}[${i}]`)
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      yield { key, path: `${path}.${key}` }
      yield* everyKey(child, `${path}.${key}`)
    }
  }
}

describe.each(EXPORTS)('$name', ({ realm }) => {
  it('carries no pseudo-comment keys anywhere', () => {
    // Not scoped to users: Keycloak tolerates unknown fields on some
    // representations and not others, and which is which is not worth
    // depending on. JSON has no comments, so none of these belong.
    const comments = [...everyKey(realm)]
      .filter(({ key }) => key.startsWith('//'))
      .map(({ path }) => path)

    expect(comments).toEqual([])
  })

  it('declares only fields UserRepresentation accepts on every seeded user', () => {
    const unknown = (realm.users ?? []).flatMap((user) =>
      Object.keys(user)
        .filter((key) => !USER_REPRESENTATION_FIELDS.has(key))
        .map((key) => `${String(user.username ?? '<unnamed>')}.${key}`),
    )

    expect(unknown).toEqual([])
  })
})
