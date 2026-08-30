// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Keycloak's ClientRepresentation.attributes is Map<String,String>. A non-string
 * value fails to deserialize, and Keycloak answers the whole PUT with
 * "Cannot parse the JSON: unknown_error" without naming a field — so the shape
 * is asserted against the real route rather than discovered in production.
 *
 * smartVersion/fhirVersion were written as arrays on update while create wrote
 * plain strings, which is why only update was broken.
 */

import { describe, it, expect, mock } from 'bun:test'
import { Elysia } from 'elysia'

const updates: { id: string; body: Record<string, unknown> }[] = []

const existingClient = {
  id: 'internal-id',
  clientId: 'demo-app',
  enabled: true,
  publicClient: true,
  attributes: { smart_version: '2.0.0', fhir_version: 'R4', existing_key: 'kept' },
}

mock.module('../src/lib/auth', () => ({
  validateToken: mock(async () => ({ sub: 'u', realm_access: { roles: ['admin'] } })),
  validateAdminToken: mock(async () => ({ sub: 'u', realm_access: { roles: ['admin'] } })),
}))

const fakeAdmin = {
  clients: {
    find: async () => [existingClient],
    findOne: async () => existingClient,
    update: async ({ id }: { id: string }, body: Record<string, unknown>) => {
      updates.push({ id, body })
    },
    listRoles: async () => [],
    createRole: async () => ({}),
    listDefaultClientScopes: async () => [],
    listOptionalClientScopes: async () => [],
    addDefaultClientScope: async () => ({}),
    delDefaultClientScope: async () => ({}),
  },
  roles: { find: async () => [] },
  clientScopes: { find: async () => [] },
}

mock.module('../src/lib/keycloak-plugin', () => ({
  keycloakPlugin: new Elysia({ name: 'kc-stub' }).decorate('getAdmin', async () => fakeAdmin),
}))

const { smartAppsRoutes } = await import('../src/routes/admin/smart-apps')

const app = () => new Elysia().use(smartAppsRoutes)

function put(body: unknown) {
  return new Request('http://localhost/smart-apps/demo-app', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  })
}

/** Every attribute value Keycloak receives must be a string. */
function nonStringAttributes(body: Record<string, unknown>): string[] {
  const attrs = (body.attributes ?? {}) as Record<string, unknown>
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && typeof v !== 'string')
    .map(([k]) => k)
}

describe('PUT /smart-apps/:clientId — Keycloak attribute contract', () => {
  it('sends fhirVersion as a string, not an array', async () => {
    updates.length = 0
    const res = await app().handle(put({ fhirVersion: 'R4B' }))

    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0]!.body.attributes).toMatchObject({ fhir_version: 'R4B' })
    expect(nonStringAttributes(updates[0]!.body)).toEqual([])
  })

  it('sends smartVersion as a string, not an array', async () => {
    updates.length = 0
    await app().handle(put({ smartVersion: '2.2.0' }))

    expect(updates[0]!.body.attributes).toMatchObject({ smart_version: '2.2.0' })
    expect(nonStringAttributes(updates[0]!.body)).toEqual([])
  })

  it('keeps every attribute a string when both versions are sent together', async () => {
    updates.length = 0
    await app().handle(put({ fhirVersion: 'R4B', smartVersion: '2.2.0', patientFacing: true }))

    expect(nonStringAttributes(updates[0]!.body)).toEqual([])
  })

  it('clears patient_facing when null is sent, so an app can go back to passthrough', async () => {
    // The resolver has three states — Patient, Practitioner, and raw passthrough for an app that
    // resolves the Person itself or serves both roles. Only two were reachable: `undefined` on
    // the request means "leave unchanged", so once set an app could never return to the third.
    updates.length = 0
    await app().handle(put({ patientFacing: null }))

    const attrs = updates[0]!.body.attributes as Record<string, unknown>
    expect(attrs.patient_facing).toBe('')
    expect(nonStringAttributes(updates[0]!.body)).toEqual([])
  })

  it('still writes the boolean when one is sent', async () => {
    updates.length = 0
    await app().handle(put({ patientFacing: true }))

    expect((updates[0]!.body.attributes as Record<string, unknown>).patient_facing).toBe('true')
  })

  it('preserves an existing version when the field is omitted', async () => {
    updates.length = 0
    await app().handle(put({ patientFacing: false }))

    const attrs = updates[0]!.body.attributes as Record<string, unknown>
    expect(attrs.fhir_version).toBe('R4')
    expect(attrs.smart_version).toBe('2.0.0')
    expect(attrs.existing_key).toBe('kept')
  })
})
