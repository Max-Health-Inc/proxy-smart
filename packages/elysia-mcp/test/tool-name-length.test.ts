// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Tool names must fit the client's cap, or the tool is dropped.
 *
 * THE DEFECT THIS PINS. Tool names are constrained to `^[a-zA-Z0-9_-]{1,64}$`, and a
 * name over the cap is not truncated — the whole tool is rejected. Nothing on the
 * server side notices: the registry lists it, the route works over HTTP, and it is
 * simply absent from every session. Three admin routes generated 66- and 67-character
 * names this way:
 *
 *   delete_admin_healthcare-users_userId_client-roles_clientId_roleName   (67)
 *   create_admin_healthcare-users_userId_federated-identities_provider    (66)
 *   delete_admin_healthcare-users_userId_federated-identities_provider    (66)
 *
 * The margin is thin — the longest surviving name was 61 — so this is a boundary the
 * surface will keep crossing as paths get deeper. Hence a property test over generated
 * paths rather than three literal cases.
 */

import { describe, it, expect } from 'bun:test'
import { Elysia, t } from 'elysia'
import {
  extractRouteTools,
  pathToToolName,
  uniqueToolName,
  MAX_TOOL_NAME_LENGTH,
} from '../src/index'

const VALID_TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/

/** The three real routes whose names were over the cap. */
const REGRESSION_ROUTES: Array<[string, string]> = [
  ['DELETE', '/admin/healthcare-users/:userId/client-roles/:clientId/:roleName'],
  ['POST', '/admin/healthcare-users/:userId/federated-identities/:provider'],
  ['DELETE', '/admin/healthcare-users/:userId/federated-identities/:provider'],
]

describe('pathToToolName length cap', () => {
  it('produced names a client rejects, before the cap existed', () => {
    // The pre-fix algorithm, kept literal so the regression cannot be argued away.
    const legacy = (path: string, prefix: string) =>
      `${prefix}_${path.replace(/^\//, '').replace(/\//g, '_').replace(/:/g, '')}`

    expect(legacy(REGRESSION_ROUTES[0][1], 'delete').length).toBe(67)
    expect(legacy(REGRESSION_ROUTES[1][1], 'create').length).toBe(66)
    expect(legacy(REGRESSION_ROUTES[2][1], 'delete').length).toBe(66)
  })

  it.each(REGRESSION_ROUTES)('keeps %s %s within the cap', (method, path) => {
    const name = pathToToolName(path, method)
    expect(name.length).toBeLessThanOrEqual(MAX_TOOL_NAME_LENGTH)
    expect(name).toMatch(VALID_TOOL_NAME)
  })

  it('drops path parameters first, keeping the segments that say what it acts on', () => {
    expect(pathToToolName('/admin/healthcare-users/:userId/client-roles/:clientId/:roleName', 'DELETE'))
      .toBe('delete_admin_healthcare-users_client-roles')
    expect(pathToToolName('/admin/healthcare-users/:userId/federated-identities/:provider', 'POST'))
      .toBe('create_admin_healthcare-users_federated-identities')
  })

  it('leaves a name that already fits exactly as it was', () => {
    // Shortening must never rename a tool clients are already calling.
    expect(pathToToolName('/admin/users', 'POST')).toBe('create_admin_users')
    expect(pathToToolName('/admin/roles/:roleName', 'DELETE')).toBe('delete_admin_roles_roleName')
    expect(pathToToolName('/admin/auth-flows/executions/:executionId/raise-priority', 'POST'))
      .toBe('create_admin_auth-flows_executions_executionId_raise-priority')
  })

  it('keeps the trailing underscore of a trailing-slash route', () => {
    // Many routes are declared as '/admin/profile/', so their live names end in '_'.
    // Tidying that up would rename 30 working tools to fix 3 unreachable ones.
    expect(pathToToolName('/admin/profile/', 'GET')).toBe('get_admin_profile_')
    expect(pathToToolName('/admin/smart-apps/', 'POST')).toBe('create_admin_smart-apps_')
  })

  it('falls back to a digest when even a parameterless path is too long', () => {
    const long = '/admin/' + Array.from({ length: 12 }, (_, i) => `segment-number-${i}`).join('/')
    const name = pathToToolName(long, 'POST')
    expect(name.length).toBe(MAX_TOOL_NAME_LENGTH)
    expect(name).toMatch(VALID_TOOL_NAME)
  })

  it('is deterministic across calls, so a redeploy does not rename tools', () => {
    const long = '/admin/' + Array.from({ length: 12 }, (_, i) => `segment-number-${i}`).join('/')
    expect(pathToToolName(long, 'POST')).toBe(pathToToolName(long, 'POST'))
  })

  it('distinguishes paths that only differ past the truncation point', () => {
    const base = '/admin/' + Array.from({ length: 12 }, (_, i) => `segment-number-${i}`).join('/')
    expect(pathToToolName(`${base}/alpha`, 'POST')).not.toBe(pathToToolName(`${base}/beta`, 'POST'))
  })
})

describe('uniqueToolName', () => {
  it('returns the candidate when it is free', () => {
    expect(uniqueToolName('create_admin_users', '/admin/users', 'POST', new Set())).toBe('create_admin_users')
  })

  it('disambiguates rather than letting one tool overwrite another', () => {
    const taken = new Set(['delete_admin_healthcare-users_client-roles'])
    const name = uniqueToolName(
      'delete_admin_healthcare-users_client-roles',
      '/admin/healthcare-users/:userId/client-roles',
      'DELETE',
      taken,
    )
    expect(name).not.toBe('delete_admin_healthcare-users_client-roles')
    expect(name.length).toBeLessThanOrEqual(MAX_TOOL_NAME_LENGTH)
    expect(name).toMatch(VALID_TOOL_NAME)
  })
})

describe('extractRouteTools over a route table', () => {
  it('registers every route, and every name is client-acceptable', () => {
    const app = new Elysia()
      .get('/admin/branding', () => ({}))
      .post('/admin/healthcare-users/:userId/federated-identities/:provider', () => ({}), {
        body: t.Object({ userId: t.String() }),
      })
      .delete('/admin/healthcare-users/:userId/federated-identities/:provider', () => ({}))
      .delete('/admin/healthcare-users/:userId/client-roles/:clientId/:roleName', () => ({}))
      .delete('/admin/healthcare-users/:userId/client-roles', () => ({}))

    const tools = extractRouteTools(app, { prefixes: ['/admin/'] })

    // Five routes in, five tools out: none silently lost to a name collision.
    expect(tools.size).toBe(5)
    for (const name of tools.keys()) {
      expect(name).toMatch(VALID_TOOL_NAME)
    }

    // Every registered route is still reachable under some name.
    const paths = [...tools.values()].map((tool) => `${tool.method} ${tool.path}`)
    expect(paths).toContain('DELETE /admin/healthcare-users/:userId/client-roles/:clientId/:roleName')
    expect(paths).toContain('DELETE /admin/healthcare-users/:userId/client-roles')
  })
})
