// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Mapper command tests.
 *
 * These commands are the scriptable half of claim mapping, so the behaviour
 * worth pinning is the routing (which verb hits which endpoint, with which
 * arguments) and the --strict gate that makes them usable as CI checks.
 */
import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { parseArgs } from '../src/args'
import { CliError } from '../src/output'
import { identityProvidersCommand } from '../src/commands/identity-providers'
import { userFederationCommand } from '../src/commands/user-federation'
import { type CommandContext } from '../src/commands/shared'

type Recorded = { call: string; args: unknown }

function createContext(argv: string[]) {
  const calls: Recorded[] = []
  const record = <T>(call: string, result: T) => mock(async (args?: unknown) => {
    calls.push({ call, args })
    return result
  })

  const healthyStatus = {
    status: [{
      alias: 'hospital-oidc',
      providerId: 'oidc',
      enabled: true,
      attributeMapperType: 'oidc-user-attribute-idp-mapper',
      mappers: [],
      missingRequired: [],
      missingOptional: [],
      healthy: true,
      unsupported: false,
    }],
    definitions: [],
    timestamp: 'now',
  }

  const identityProviders = {
    getAdminIdps: record('idps.list', []),
    getAdminIdpsByAlias: record('idps.get', {}),
    getAdminIdpsMapperStatus: record('idps.mapperStatus.realm', healthyStatus),
    getAdminIdpsByAliasMapperStatus: record('idps.mapperStatus.one', healthyStatus),
    getAdminIdpsByAliasMappers: record('idps.mappers', []),
    getAdminIdpsByAliasMapperTypes: record('idps.mapperTypes', []),
    postAdminIdpsByAliasMappersFix: record('idps.fixMappers', {
      message: 'ok', alias: 'hospital-oidc', attributeMapperType: null,
      created: [], skipped: [], unsupported: false, errors: [], timestamp: 'now',
    }),
    deleteAdminIdpsByAliasMappersByMapperId: record('idps.deleteMapper', { success: true }),
  }

  const userFederation = {
    getAdminUserFederation: record('ldap.list', []),
    getAdminUserFederationByIdMappers: record('ldap.mappers', [
      { id: 'm1', name: 'username', providerId: 'user-attribute-ldap-mapper', config: { 'ldap.attribute': 'uid', 'user.model.attribute': 'username' } },
    ]),
    getAdminUserFederationByIdMapperTypes: record('ldap.mapperTypes', []),
    postAdminUserFederationByIdSync: record('ldap.sync', { added: 0 }),
    deleteAdminUserFederationById: record('ldap.delete', { success: true }),
  }

  const ctx = {
    args: parseArgs(argv),
    config: { url: 'https://proxy.example.com' },
    session: {},
    api: { identityProviders, userFederation },
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

describe('idps command routing', () => {
  it('defaults to listing providers', async () => {
    const { ctx, calls } = createContext(['idps'])
    await identityProvidersCommand(ctx)
    expect(calls.map(c => c.call)).toEqual(['idps.list'])
  })

  it('hits the realm-wide status endpoint when no alias is given', async () => {
    const { ctx, calls } = createContext(['idps', 'mapper-status'])
    await identityProvidersCommand(ctx)
    expect(calls[0]?.call).toBe('idps.mapperStatus.realm')
  })

  it('hits the per-provider status endpoint when an alias is given', async () => {
    const { ctx, calls } = createContext(['idps', 'mapper-status', 'hospital-oidc'])
    await identityProvidersCommand(ctx)
    expect(calls[0]?.call).toBe('idps.mapperStatus.one')
    expect(calls[0]?.args).toEqual({ alias: 'hospital-oidc' })
  })

  it('passes includeOptional=false only for --required-only', async () => {
    const plain = createContext(['idps', 'fix-mappers', 'hospital-oidc'])
    await identityProvidersCommand(plain.ctx)
    expect(plain.calls[0]?.args).toEqual({ alias: 'hospital-oidc', includeOptional: undefined })

    const requiredOnly = createContext(['idps', 'fix-mappers', 'hospital-oidc', '--required-only'])
    await identityProvidersCommand(requiredOnly.ctx)
    expect(requiredOnly.calls[0]?.args).toEqual({ alias: 'hospital-oidc', includeOptional: 'false' })
  })

  it('requires an alias for mapper listing', async () => {
    const { ctx } = createContext(['idps', 'mappers'])
    await expect(identityProvidersCommand(ctx)).rejects.toThrow(/Missing required argument <alias>/)
  })

  it('requires both alias and mapperId to delete a mapper', async () => {
    const { ctx } = createContext(['idps', 'delete-mapper', 'hospital-oidc'])
    await expect(identityProvidersCommand(ctx)).rejects.toThrow(/Missing required argument <mapperId>/)
  })

  it('rejects an unknown verb and names the valid ones', async () => {
    const { ctx } = createContext(['idps', 'frobnicate'])
    await expect(identityProvidersCommand(ctx)).rejects.toThrow(/Unknown idps verb "frobnicate"/)
  })
})

describe('idps mapper-status --strict', () => {
  it('stays silent when every provider is healthy', async () => {
    const { ctx } = createContext(['idps', 'mapper-status', '--strict'])
    await identityProvidersCommand(ctx)
  })

  it('fails when a required import is missing', async () => {
    const { ctx } = createContext(['idps', 'mapper-status', '--strict'])
    const api = ctx.api.identityProviders as unknown as {
      getAdminIdpsMapperStatus: () => Promise<unknown>
    }
    api.getAdminIdpsMapperStatus = async () => ({
      status: [{
        alias: 'hospital-oidc', providerId: 'oidc', enabled: true,
        attributeMapperType: 'oidc-user-attribute-idp-mapper', mappers: [],
        missingRequired: ['fhirUser-import'], missingOptional: [],
        healthy: false, unsupported: false,
      }],
      definitions: [],
      timestamp: 'now',
    })

    await expect(identityProvidersCommand(ctx)).rejects.toThrow(CliError)
  })
})

describe('user-federation command routing', () => {
  it('defaults to listing providers', async () => {
    const { ctx, calls } = createContext(['user-federation'])
    await userFederationCommand(ctx)
    expect(calls.map(c => c.call)).toEqual(['ldap.list'])
  })

  it('sends the sync action in the request body, defaulting to a full sync', async () => {
    const { ctx, calls } = createContext(['user-federation', 'sync', 'ldap-1'])
    await userFederationCommand(ctx)
    expect(calls[0]?.args).toEqual({ id: 'ldap-1', userFederationSyncRequest: { action: 'triggerFullSync' } })
  })

  it('rejects an unsupported sync action', async () => {
    const { ctx } = createContext(['user-federation', 'sync', 'ldap-1', '--action', 'triggerNonsense'])
    await expect(userFederationCommand(ctx)).rejects.toThrow(/--action must be/)
  })

  it('refuses to delete a provider without --yes', async () => {
    const { ctx, calls } = createContext(['user-federation', 'delete', 'ldap-1'])
    await expect(userFederationCommand(ctx)).rejects.toThrow(/--yes/)
    expect(calls).toEqual([])
  })

  it('fails --strict when no mapper writes fhirUser', async () => {
    const { ctx } = createContext(['user-federation', 'mappers', 'ldap-1', '--strict'])
    await expect(userFederationCommand(ctx)).rejects.toThrow(/fhirUser/)
  })

  it('passes --strict when a mapper writes fhirUser', async () => {
    const { ctx } = createContext(['user-federation', 'mappers', 'ldap-1', '--strict'])
    const api = ctx.api.userFederation as unknown as {
      getAdminUserFederationByIdMappers: () => Promise<unknown>
    }
    api.getAdminUserFederationByIdMappers = async () => ([
      { id: 'm2', name: 'fhir-user', providerId: 'user-attribute-ldap-mapper', config: { 'ldap.attribute': 'employeeNumber', 'user.model.attribute': 'fhirUser' } },
    ])

    await userFederationCommand(ctx)
  })
})
