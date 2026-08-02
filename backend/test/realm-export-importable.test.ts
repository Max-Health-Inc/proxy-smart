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
 *
 * THE SECOND BUG THIS GUARDS. Two realm-role descriptions grew past 255
 * characters while documenting why the `admin` composite exists. `--import-realm`
 * writes straight into Keycloak's schema, where those columns are varchar(255),
 * so the import aborted and Keycloak again refused to start:
 *
 *   ERROR: value too long for type character varying(255)
 *   [update KEYCLOAK_ROLE set CLIENT=?,...,DESCRIPTION=?,NAME=?,...]
 *
 * That took the SMART compliance workflow down for a day, reported as
 * "proxy-smart realm not found" — which reads as a broken test rig rather than
 * an over-long string. The reasoning moved to docs/keycloak-features.md.
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

/** Keycloak stores these as varchar(255); the import aborts on overflow. */
const VARCHAR_255 = 255

interface NamedWithDescription {
  name?: string
  clientId?: string
  description?: string
}

interface RealmExport {
  users?: Record<string, unknown>[]
  roles?: { realm?: NamedWithDescription[]; client?: Record<string, NamedWithDescription[]> }
  clients?: NamedWithDescription[]
  clientScopes?: NamedWithDescription[]
}

/** Every (label, value) pair the import writes into a varchar(255) column. */
function boundedFields(realm: RealmExport): { where: string; field: string; value: string }[] {
  const out: { where: string; field: string; value: string }[] = []
  const add = (where: string, field: string, value?: string) => {
    if (typeof value === 'string') out.push({ where, field, value })
  }

  for (const role of realm.roles?.realm ?? []) {
    add(`realm role ${role.name}`, 'name', role.name)
    add(`realm role ${role.name}`, 'description', role.description)
  }
  for (const [clientId, roles] of Object.entries(realm.roles?.client ?? {})) {
    for (const role of roles) {
      add(`client role ${clientId}/${role.name}`, 'name', role.name)
      add(`client role ${clientId}/${role.name}`, 'description', role.description)
    }
  }
  for (const client of realm.clients ?? []) {
    add(`client ${client.clientId}`, 'name', client.name)
    add(`client ${client.clientId}`, 'description', client.description)
  }
  for (const scope of realm.clientScopes ?? []) {
    add(`client scope ${scope.name}`, 'description', scope.description)
  }
  return out
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

  it('keeps every name and description within Keycloak\'s varchar(255) columns', () => {
    // A description is a UI label with a hard length cap, not somewhere to put
    // rationale — that belongs in docs/keycloak-features.md.
    const tooLong = boundedFields(realm)
      .filter(({ value }) => value.length > VARCHAR_255)
      .map(({ where, field, value }) => `${where}.${field} is ${value.length} chars`)

    expect(tooLong).toEqual([])
  })
})
