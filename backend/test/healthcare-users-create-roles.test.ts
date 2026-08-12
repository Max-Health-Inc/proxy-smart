// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Creating a user with realmRoles used to accept them and apply none: the
 * assignment was guarded on an id the client does not always return, and every
 * failure was downgraded to a warning, so the caller got 200 and an account with
 * no rights. These pin the signal.
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'

const realmRoleMappings: { id: string; roles: { name: string }[] }[] = []
let createReturnsId = true

const REALM_ROLES = [
  { id: 'r1', name: 'admin' },
  { id: 'r2', name: 'user' },
]

mock.module('../src/lib/auth', () => ({
  validateToken: mock(async () => ({ sub: 'u', realm_access: { roles: ['admin'] } })),
  validateAdminToken: mock(async () => ({ sub: 'u', realm_access: { roles: ['admin'] } })),
}))

const createdUser = {
  id: 'new-user-id',
  username: 'newdoc',
  email: 'newdoc@example.com',
  firstName: 'New',
  lastName: 'Doc',
  enabled: true,
  attributes: {},
}

const fakeAdmin = {
  users: {
    // The quirk the guard tripped over: no id on the create result.
    create: async () => (createReturnsId ? { id: createdUser.id } : {}),
    find: async () => [createdUser],
    findOne: async () => createdUser,
    addRealmRoleMappings: async ({ id, roles }: { id: string; roles: { name: string }[] }) => {
      realmRoleMappings.push({ id, roles })
    },
    addClientRoleMappings: async () => ({}),
    listRealmRoleMappings: async () => [],
    listClientRoleMappings: async () => [],
    listSessions: async () => [],
  },
  roles: { find: async () => REALM_ROLES },
  clients: { find: async () => [], listRoles: async () => [] },
}

mock.module('../src/lib/keycloak-plugin', () => ({
  keycloakPlugin: new Elysia({ name: 'kc-stub' }).decorate('getAdmin', async () => fakeAdmin),
}))

const { healthcareUsersRoutes } = await import('../src/routes/admin/healthcare-users')

const app = () => new Elysia().use(healthcareUsersRoutes)

function create(body: Record<string, unknown>) {
  return new Request('http://localhost/healthcare-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify({
      username: 'newdoc',
      email: 'newdoc@example.com',
      firstName: 'New',
      lastName: 'Doc',
      ...body,
    }),
  })
}

beforeEach(() => {
  realmRoleMappings.length = 0
  createReturnsId = true
})

describe('POST /healthcare-users — realmRoles', () => {
  it('actually assigns the requested realm roles', async () => {
    const res = await app().handle(create({ realmRoles: ['admin', 'user'] }))

    expect(res.status).toBe(200)
    expect(realmRoleMappings).toHaveLength(1)
    expect(realmRoleMappings[0]!.roles.map(r => r.name).sort()).toEqual(['admin', 'user'])
  })

  it('reports the assigned roles in the response, so silence is not mistaken for success', async () => {
    const res = await app().handle(create({ realmRoles: ['admin'] }))
    const body = await res.json() as { realmRoles?: string[] }

    expect(body.realmRoles).toEqual(['admin'])
  })

  it('still assigns when the create result carries no id', async () => {
    createReturnsId = false
    const res = await app().handle(create({ realmRoles: ['admin'] }))

    expect(res.status).toBe(200)
    expect(realmRoleMappings).toHaveLength(1)
    expect(realmRoleMappings[0]!.id).toBe(createdUser.id)
  })

  it('does not claim roles it could not find', async () => {
    const res = await app().handle(create({ realmRoles: ['admin', 'does-not-exist'] }))
    const body = await res.json() as { realmRoles?: string[] }

    expect(body.realmRoles).toEqual(['admin'])
    expect(realmRoleMappings[0]!.roles.map(r => r.name)).toEqual(['admin'])
  })

  it('creates a user with no roles when none were asked for', async () => {
    const res = await app().handle(create({}))
    const body = await res.json() as { realmRoles?: string[] }

    expect(res.status).toBe(200)
    expect(realmRoleMappings).toHaveLength(0)
    expect(body.realmRoles).toEqual([])
  })
})
