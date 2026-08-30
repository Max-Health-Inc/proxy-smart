// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * authorize-oidc-params.test.ts — standard OIDC authorize params survive validation.
 *
 * The interceptor forwards every param it is given, so the schema is the allowlist that
 * decides what reaches the IdP at all. `prompt` was undeclared, so a client asking to
 * re-authenticate was silently answered from the live SSO session instead — "use a different
 * account" could not work behind this proxy, and no error said why.
 */

import { describe, test, expect } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { AuthorizationQuery } from '../src/schemas/auth/oauth'

/** What Elysia does to a query before a handler sees it: drop undeclared properties. */
function validated(query: Record<string, string>): Record<string, unknown> {
  return Value.Clean(AuthorizationQuery, { ...query }) as Record<string, unknown>
}

const BASE = {
  response_type: 'code',
  client_id: 'admin-console',
  redirect_uri: 'https://app.example.com/callback',
  scope: 'openid profile email',
  state: 'abc',
}

describe('AuthorizationQuery keeps the OIDC params the interceptor forwards', () => {
  test.each([
    ['prompt', 'login'],
    ['nonce', 'n-0S6_WzA2Mj'],
    ['login_hint', 'someone@example.com'],
    ['max_age', '0'],
  ])('keeps %s', (param, value) => {
    expect(validated({ ...BASE, [param]: value })[param]).toBe(value)
  })

  test('still drops a param nobody declared', () => {
    // The allowlist is the point: widening it is a decision, not a side effect.
    expect(validated({ ...BASE, made_up_param: 'x' }).made_up_param).toBeUndefined()
  })

  test('leaves the existing params alone', () => {
    const out = validated({ ...BASE, aud: 'https://fhir.example.com/R4', launch: 'xyz' })
    expect(out.aud).toBe('https://fhir.example.com/R4')
    expect(out.launch).toBe('xyz')
    expect(out.state).toBe('abc')
  })
})
