// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'
import { extractRouteTools, extractResponseSchema } from '../src/introspect'
import { typeboxToOutputSchema } from '../src/typebox-schema'

const Role = t.Object({ id: t.String(), name: t.String() })

/** What the admin routes actually declare: a success entry plus shared errors. */
const CommonErrorResponses = {
  400: t.Object({ error: t.String() }),
  401: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
}

describe('extractResponseSchema', () => {
  it('picks the success entry out of a status-keyed map', () => {
    expect(extractResponseSchema({ 200: Role, ...CommonErrorResponses })).toBe(Role)
  })

  it('accepts a bare schema that is not a status map', () => {
    expect(extractResponseSchema(Role)).toBe(Role)
  })

  it('prefers 200, then 201', () => {
    const created = t.Object({ created: t.Boolean() })
    expect(extractResponseSchema({ 201: created, ...CommonErrorResponses })).toBe(created)
    expect(extractResponseSchema({ 200: Role, 201: created })).toBe(Role)
  })

  it('ignores an error-only declaration', () => {
    // Nothing here describes a successful call, so advertising any of it as the
    // output schema would make every success look non-conforming.
    expect(extractResponseSchema(CommonErrorResponses)).toBeUndefined()
  })

  it('ignores 204, which carries no body', () => {
    expect(extractResponseSchema({ 204: t.Void(), ...CommonErrorResponses })).toBeUndefined()
  })

  it('tolerates a missing or malformed declaration', () => {
    expect(extractResponseSchema(undefined)).toBeUndefined()
    expect(extractResponseSchema(null)).toBeUndefined()
    expect(extractResponseSchema({})).toBeUndefined()
    expect(extractResponseSchema('nonsense')).toBeUndefined()
  })
})

describe('extractRouteTools response schemas', () => {
  const app = new Elysia()
    .post('/admin/roles', () => ({ id: '1', name: 'clinician' }), {
      body: t.Object({ name: t.String() }),
      response: { 200: Role, ...CommonErrorResponses },
    })
    .get('/admin/roles', () => [], {
      response: { 200: t.Array(Role), ...CommonErrorResponses },
    })
    .delete('/admin/roles/:name', () => ({ success: true }), {
      response: { 200: t.Object({ success: t.Boolean() }) },
    })
    .put('/admin/untyped', () => ({ ok: true }))

  const tools = extractRouteTools(app, { prefixes: ['/admin/'] })

  it('carries the declared success schema onto the tool metadata', () => {
    expect(tools.get('create_admin_roles')?.responseSchema).toBeDefined()
    expect(tools.get('delete_admin_roles_name')?.responseSchema).toBeDefined()
  })

  it('leaves responseSchema undefined for a route that declares none', () => {
    expect(tools.get('update_admin_untyped')?.responseSchema).toBeUndefined()
  })

  it('keeps an array-rooted list schema instead of discarding it', () => {
    // The list endpoints are the largest responses; dropping their schema
    // because the root is not an object is what this is guarding against.
    const listSchema = tools.get('get_admin_roles')?.responseSchema
    expect(listSchema).toBeDefined()
    expect((listSchema as { type?: string }).type).toBe('array')
  })
})

describe('typeboxToOutputSchema', () => {
  it('converts an object root', () => {
    expect(typeboxToOutputSchema(Role)).toBeDefined()
  })

  it('converts an array root, which an input schema would reject', () => {
    expect(typeboxToOutputSchema(t.Array(Role))).toBeDefined()
  })

  it('returns undefined for nothing to advertise', () => {
    expect(typeboxToOutputSchema(undefined)).toBeUndefined()
    expect(typeboxToOutputSchema(null)).toBeUndefined()
    expect(typeboxToOutputSchema({})).toBeUndefined()
  })
})
