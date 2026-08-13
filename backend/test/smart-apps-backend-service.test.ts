// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Registering a backend-service client that can actually get a token.
 *
 * THE DEFECTS THIS PINS, all found registering `maxhealth-provisioning` against production:
 *
 *  1. A jwksUri backend service came back with `clientAuthenticatorType: client-secret`. The
 *     authenticator computed from tokenEndpointAuthMethod (federated-jwt) was correct and then
 *     overwritten immediately afterwards, so a client registered for assertion auth expected a
 *     shared secret. The jwksString path never did this.
 *  2. The signing alg was hardcoded RS384 on that same path. An ES384 client is then configured to
 *     reject every assertion it sends, and there was no field to say otherwise.
 *  3. `systemScopes` was in the request schema and read nowhere, so a backend service registered
 *     with system/Patient.c came back with no scope attached and no error.
 *
 * Each one is silent: the create returns 200 and the client is unusable.
 */
import { describe, it, expect } from 'bun:test'
import { CreateSmartAppRequest, UpdateSmartAppRequest } from '../src/schemas/admin/smart-apps'
import { toKeycloakAuthType } from '../src/lib/auth-method-mapping'

/** Whether a TypeBox schema accepts a property at all (Elysia strips undeclared ones). */
function declares(schema: { properties?: unknown }, field: string): boolean {
  return Object.prototype.hasOwnProperty.call((schema.properties ?? {}) as object, field)
}

describe('private_key_jwt maps to assertion auth, not a shared secret', () => {
  it('resolves to federated-jwt', () => {
    // The value the create path computes before anything overwrites it.
    expect(toKeycloakAuthType('private_key_jwt', true)).toBe('federated-jwt')
    expect(toKeycloakAuthType('private_key_jwt', false)).toBe('federated-jwt')
  })

  it('keeps client-secret for the methods that use one', () => {
    expect(toKeycloakAuthType('client_secret_post', true)).toBe('client-secret')
    expect(toKeycloakAuthType('client_secret_basic', false)).toBe('client-secret')
    expect(toKeycloakAuthType('none', false)).toBe('none')
  })
})

describe('the signing algorithm is statable', () => {
  it('is accepted on create and update', () => {
    // Without this an ES384 client silently gets an RS384 Keycloak config: a jwksUri is never
    // fetched, so nothing can detect the algorithm on its behalf.
    expect(declares(CreateSmartAppRequest, 'tokenEndpointAuthSigningAlg')).toBe(true)
    expect(declares(UpdateSmartAppRequest, 'tokenEndpointAuthSigningAlg')).toBe(true)
  })

  it('offers both algorithm families SMART Backend Services allows', () => {
    const field = (CreateSmartAppRequest.properties as unknown as Record<string, { enum?: string[] }>)
      .tokenEndpointAuthSigningAlg
    expect(field.enum).toContain('RS384')
    expect(field.enum).toContain('ES384')
  })
})

describe('systemScopes is not silently dropped', () => {
  it('is declared on create and update', () => {
    expect(declares(CreateSmartAppRequest, 'systemScopes')).toBe(true)
    expect(declares(UpdateSmartAppRequest, 'systemScopes')).toBe(true)
  })

  it('merges with optional scopes and de-duplicates', () => {
    // Mirrors the route: assigning one scope twice is itself a Keycloak error, so a caller passing
    // a scope in both lists must not produce a duplicate assignment.
    const optionalClientScopes = ['system/Person.c', 'system/Patient.c']
    const systemScopes = ['system/Patient.c', 'system/Consent.c']
    const merged = [...new Set([...optionalClientScopes, ...systemScopes])]

    expect(merged).toEqual(['system/Person.c', 'system/Patient.c', 'system/Consent.c'])
  })
})

describe('optional request fields carry no injected default', () => {
  /*
   * THE BUG THIS PINS. `t.UnionEnum([...])` sets `default` to its FIRST member, and Elysia
   * populates defaults on every request — so a PUT that changed one field arrived with appType
   * standalone-app, clientType public, tokenEndpointAuthMethod none and serverAccessType
   * all-servers, none of which the caller sent. That silently downgraded a confidential
   * backend-service client to a public standalone app, and the handler could not tell the
   * difference between omitted and chosen.
   */
  const OPTIONAL_ENUMS = [
    'appType',
    'clientType',
    'tokenEndpointAuthMethod',
    'serverAccessType',
    'tokenEndpointAuthSigningAlg',
  ]

  for (const [name, schema] of [
    ['create', CreateSmartAppRequest],
    ['update', UpdateSmartAppRequest],
  ] as const) {
    it(`${name}: omitting a field means omitted`, () => {
      const properties = schema.properties as unknown as Record<string, { default?: unknown }>
      const withDefaults = OPTIONAL_ENUMS.filter((field) => properties[field]?.default !== undefined)

      expect(withDefaults).toEqual([])
    })
  }
})
