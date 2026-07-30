// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Identity Provider Mapper Routing Tests
 *
 * The mapper routes live in their own module but share the `/idps` prefix with
 * the provider CRUD routes, so `GET /idps/mapper-status` sits next to
 * `GET /idps/:alias`. These tests pin that static segments still win after the
 * two modules are merged — a regression here would silently route the realm-wide
 * status request into "get provider with alias mapper-status".
 */

import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

/** Mirrors the path shapes of identity-providers.ts */
const providerRoutes = new Elysia({ prefix: '/idps' })
  .get('/count', () => 'count')
  .get('/', () => 'list')
  .get('/:alias', ({ params }) => `provider:${params.alias}`)

/** Mirrors the path shapes of identity-provider-mappers.ts */
const mapperRoutes = new Elysia({ prefix: '/idps' })
  .get('/mapper-status', () => 'realm-status')
  .get('/:alias/mapper-status', ({ params }) => `status:${params.alias}`)
  .get('/:alias/mapper-types', ({ params }) => `types:${params.alias}`)
  .get('/:alias/mappers', ({ params }) => `mappers:${params.alias}`)
  .post('/:alias/mappers', ({ params }) => `create:${params.alias}`)
  .post('/:alias/mappers/fix', ({ params }) => `fix:${params.alias}`)
  .put('/:alias/mappers/:mapperId', ({ params }) => `update:${params.alias}/${params.mapperId}`)
  .delete('/:alias/mappers/:mapperId', ({ params }) => `delete:${params.alias}/${params.mapperId}`)

const app = new Elysia({ prefix: '/admin' })
  .use(providerRoutes)
  .use(mapperRoutes)

const text = async (method: string, path: string): Promise<string> => {
  const response = await app.handle(new Request(`http://localhost${path}`, { method }))
  return response.text()
}

describe('identity provider mapper route precedence', () => {
  it('routes the realm-wide status to its own handler, not to /:alias', async () => {
    expect(await text('GET', '/admin/idps/mapper-status')).toBe('realm-status')
  })

  it('keeps the existing static and dynamic provider routes intact', async () => {
    expect(await text('GET', '/admin/idps/count')).toBe('count')
    expect(await text('GET', '/admin/idps/')).toBe('list')
    expect(await text('GET', '/admin/idps/hospital-oidc')).toBe('provider:hospital-oidc')
  })

  it('resolves the per-provider mapper routes', async () => {
    expect(await text('GET', '/admin/idps/hospital-oidc/mapper-status')).toBe('status:hospital-oidc')
    expect(await text('GET', '/admin/idps/hospital-oidc/mapper-types')).toBe('types:hospital-oidc')
    expect(await text('GET', '/admin/idps/hospital-oidc/mappers')).toBe('mappers:hospital-oidc')
    expect(await text('POST', '/admin/idps/hospital-oidc/mappers')).toBe('create:hospital-oidc')
  })

  it('does not let POST /mappers/fix collide with the mapper id routes', async () => {
    expect(await text('POST', '/admin/idps/hospital-oidc/mappers/fix')).toBe('fix:hospital-oidc')
    expect(await text('PUT', '/admin/idps/hospital-oidc/mappers/m-1')).toBe('update:hospital-oidc/m-1')
    expect(await text('DELETE', '/admin/idps/hospital-oidc/mappers/m-1')).toBe('delete:hospital-oidc/m-1')
  })
})
