// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Routing tests for the client protocol-mapper and role verbs.
 *
 * These verbs exist so Keycloak mechanics stop being hand-written against the
 * admin REST API, which means the behaviour worth pinning is exactly that: the
 * verb reaches the right endpoint with the right arguments, and the shorthands
 * (add-audience, --include-technical) put the caller's intent in the request
 * rather than making them encode it. The destructive verbs are gated on --yes
 * for the same reason the rest of the CLI gates them.
 */
import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { parseArgs } from '../src/args'
import { smartAppsCommand } from '../src/commands/smart-apps'
import { rolesCommand } from '../src/commands/roles'
import { type CommandContext } from '../src/commands/shared'

type Recorded = { call: string; args: unknown }

function createContext(argv: string[]) {
  const calls: Recorded[] = []
  const record = <T>(call: string, result: T) => mock(async (args?: unknown) => {
    calls.push({ call, args })
    return result
  })

  const smartApps = {
    getAdminSmartApps: record('apps.list', []),
    getAdminSmartAppsByClientIdMappers: record('apps.mappers', [
      {
        id: 'm1',
        name: 'fhir-resource-audience',
        protocolMapper: 'oidc-audience-mapper',
        config: { 'included.client.audience': 'fhir-resource-server', 'access.token.claim': 'true' },
      },
    ]),
    postAdminSmartAppsByClientIdMappers: record('apps.createMapper', { id: 'm2' }),
    postAdminSmartAppsByClientIdMappersAudience: record('apps.addAudience', {
      created: true, resolvedAs: 'client', mapper: { id: 'm3' },
    }),
    putAdminSmartAppsByClientIdMappersByMapperId: record('apps.updateMapper', { success: true }),
    deleteAdminSmartAppsByClientIdMappersByMapperId: record('apps.deleteMapper', { success: true }),
  }

  const roles = {
    getAdminRoles: record('roles.list', [
      { name: 'clinician', description: 'Clinical staff', composite: false, isTechnical: false },
    ]),
    getAdminRolesByRoleName: record('roles.get', {}),
    postAdminRoles: record('roles.create', {}),
    putAdminRolesByRoleName: record('roles.update', { success: true }),
    deleteAdminRolesByRoleName: record('roles.delete', { success: true }),
    getAdminRolesClientsByClientId: record('roles.clientList', []),
    getAdminRolesClientsByClientIdByRoleName: record('roles.clientGet', {}),
    postAdminRolesClientsByClientId: record('roles.clientCreate', {}),
    putAdminRolesClientsByClientIdByRoleName: record('roles.clientUpdate', { success: true }),
    deleteAdminRolesClientsByClientIdByRoleName: record('roles.clientDelete', { success: true }),
  }

  const ctx = {
    args: parseArgs(argv),
    config: { url: 'https://proxy.example.com' },
    session: {},
    api: { smartApps, roles },
  } as unknown as CommandContext

  return { ctx, calls }
}

/** Commands write through process.stdout; keep the test output clean. */
const originalWrite = process.stdout.write
beforeEach(() => {
  process.stdout.write = (() => true) as typeof process.stdout.write
})
afterEach(() => {
  process.stdout.write = originalWrite
})

describe('smart-apps mapper verbs', () => {
  it('lists the mappers on a client', async () => {
    const { ctx, calls } = createContext(['smart-apps', 'mappers', 'patient-portal'])
    await smartAppsCommand(ctx)
    expect(calls[0]?.call).toBe('apps.mappers')
    expect(calls[0]?.args).toEqual({ clientId: 'patient-portal' })
  })

  it('requires a clientId to list mappers', async () => {
    const { ctx } = createContext(['smart-apps', 'mappers'])
    await expect(smartAppsCommand(ctx)).rejects.toThrow(/Missing required argument <clientId>/)
  })

  it('requires both clientId and mapperId to delete a mapper', async () => {
    const { ctx } = createContext(['smart-apps', 'delete-mapper', 'patient-portal'])
    await expect(smartAppsCommand(ctx)).rejects.toThrow(/Missing required argument <mapperId>/)
  })

  it('sends the audience positionally, leaving the optional fields unset', async () => {
    const { ctx, calls } = createContext(['smart-apps', 'add-audience', 'patient-portal', 'fhir-resource-server'])
    await smartAppsCommand(ctx)
    expect(calls[0]?.call).toBe('apps.addAudience')
    expect(calls[0]?.args).toEqual({
      clientId: 'patient-portal',
      addAudienceMapperRequest: {
        audience: 'fhir-resource-server',
        name: undefined,
        includeInIdToken: undefined,
      },
    })
  })

  it('forwards --name and --id-token onto the audience request', async () => {
    const { ctx, calls } = createContext([
      'smart-apps', 'add-audience', 'patient-portal', 'https://fhir.example.com/R4',
      '--name', 'custom-aud', '--id-token',
    ])
    await smartAppsCommand(ctx)
    expect(calls[0]?.args).toEqual({
      clientId: 'patient-portal',
      addAudienceMapperRequest: {
        audience: 'https://fhir.example.com/R4',
        name: 'custom-aud',
        includeInIdToken: true,
      },
    })
  })

  it('requires an audience', async () => {
    const { ctx } = createContext(['smart-apps', 'add-audience', 'patient-portal'])
    await expect(smartAppsCommand(ctx)).rejects.toThrow(/Missing required argument <audience>/)
  })

  it('requires a body to create a mapper', async () => {
    const { ctx } = createContext(['smart-apps', 'create-mapper', 'patient-portal'])
    await expect(smartAppsCommand(ctx)).rejects.toThrow(/requires a request body/)
  })

  it('rejects an unknown verb and names the valid ones', async () => {
    const { ctx } = createContext(['smart-apps', 'frobnicate'])
    await expect(smartAppsCommand(ctx)).rejects.toThrow(/Unknown smart-apps verb "frobnicate"/)
  })
})

describe('roles command routing', () => {
  it('defaults to listing realm roles with technical roles hidden', async () => {
    const { ctx, calls } = createContext(['roles'])
    await rolesCommand(ctx)
    expect(calls[0]?.call).toBe('roles.list')
    expect(calls[0]?.args).toEqual({ includeTechnical: undefined })
  })

  it('asks for technical roles only when --include-technical is passed', async () => {
    const { ctx, calls } = createContext(['roles', 'list', '--include-technical'])
    await rolesCommand(ctx)
    expect(calls[0]?.args).toEqual({ includeTechnical: 'true' })
  })

  it('routes client verbs to the client-role endpoints', async () => {
    const { ctx, calls } = createContext(['roles', 'client-roles', 'admin-ui'])
    await rolesCommand(ctx)
    expect(calls[0]?.call).toBe('roles.clientList')
    expect(calls[0]?.args).toEqual({ clientId: 'admin-ui' })
  })

  it('takes clientId then roleName for a single client role', async () => {
    const { ctx, calls } = createContext(['roles', 'client-get', 'admin-ui', 'app-admin'])
    await rolesCommand(ctx)
    expect(calls[0]?.call).toBe('roles.clientGet')
    expect(calls[0]?.args).toEqual({ clientId: 'admin-ui', roleName: 'app-admin' })
  })

  it('refuses to delete a realm role without --yes', async () => {
    const { ctx, calls } = createContext(['roles', 'delete', 'clinician'])
    await expect(rolesCommand(ctx)).rejects.toThrow(/--yes/)
    expect(calls).toEqual([])
  })

  it('refuses to delete a client role without --yes', async () => {
    const { ctx, calls } = createContext(['roles', 'client-delete', 'admin-ui', 'app-admin'])
    await expect(rolesCommand(ctx)).rejects.toThrow(/--yes/)
    expect(calls).toEqual([])
  })

  it('deletes a client role once --yes is given', async () => {
    const { ctx, calls } = createContext(['roles', 'client-delete', 'admin-ui', 'app-admin', '--yes'])
    await rolesCommand(ctx)
    expect(calls[0]?.call).toBe('roles.clientDelete')
    expect(calls[0]?.args).toEqual({ clientId: 'admin-ui', roleName: 'app-admin' })
  })

  it('rejects an unknown verb and names the valid ones', async () => {
    const { ctx } = createContext(['roles', 'frobnicate'])
    await expect(rolesCommand(ctx)).rejects.toThrow(/Unknown roles verb "frobnicate"/)
  })
})
