// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * `proxy-smart idps <verb>` — manage identity providers and their claim mappers.
 *
 * Backed by the generated IdentityProvidersApi. Brokered users only carry the
 * attributes an IdP mapper imports for them, so `mapper-status` and
 * `fix-mappers` are the scriptable half of this surface: the first answers
 * "can federated users in this realm launch a SMART app?", the second
 * provisions the imports that answer requires.
 */
import {
  CreateIdentityProviderRequestFromJSON,
  CreateIdentityProviderMapperRequestFromJSON,
  UpdateIdentityProviderRequestFromJSON,
  UpdateIdentityProviderMapperRequestFromJSON,
} from '../api-client'
import { flagBool, flagList } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

const VERBS = [
  'list', 'get', 'create', 'update', 'delete',
  'mapper-status', 'mappers', 'mapper-types', 'fix-mappers',
  'create-mapper', 'update-mapper', 'delete-mapper',
] as const

/** Dispatch an idps verb. positionals[1] is the verb. */
export async function identityProvidersCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listProviders(ctx)
    case 'get':
      return getProvider(ctx)
    case 'create':
      return createProvider(ctx)
    case 'update':
      return updateProvider(ctx)
    case 'delete':
      return deleteProvider(ctx)
    case 'mapper-status':
      return mapperStatus(ctx)
    case 'mappers':
      return listMappers(ctx)
    case 'mapper-types':
      return listMapperTypes(ctx)
    case 'fix-mappers':
      return fixMappers(ctx)
    case 'create-mapper':
      return createMapper(ctx)
    case 'update-mapper':
      return updateMapper(ctx)
    case 'delete-mapper':
      return deleteMapper(ctx)
    default:
      throw new CliError(`Unknown idps verb "${verb}". Use: ${VERBS.join(' | ')}.`)
  }
}

async function listProviders(ctx: CommandContext): Promise<void> {
  const providers = await ctx.api.identityProviders.getAdminIdps()
  if (ctx.args.flags.json === true) {
    printJson(providers)
    return
  }
  printTable(providers as unknown as Array<Record<string, unknown>>, flagList(ctx.args.flags, 'columns'))
}

async function getProvider(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  printJson(await ctx.api.identityProviders.getAdminIdpsByAlias({ alias }))
}

async function createProvider(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.identityProviders.postAdminIdps({
    createIdentityProviderRequest: CreateIdentityProviderRequestFromJSON(data),
  })
  printJson(created)
}

async function updateProvider(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.identityProviders.putAdminIdpsByAlias({
    alias,
    updateIdentityProviderRequest: UpdateIdentityProviderRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteProvider(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  printJson(await ctx.api.identityProviders.deleteAdminIdpsByAlias({ alias }))
}

/**
 * `mapper-status [alias]` — realm-wide without an alias, one provider with one.
 *
 * The table view is the CI-friendly shape: one row per provider with its
 * health, so a pipeline can assert every provider is ready.
 */
async function mapperStatus(ctx: CommandContext): Promise<void> {
  const alias = ctx.args.positionals[2]
  const response = alias === undefined
    ? await ctx.api.identityProviders.getAdminIdpsMapperStatus()
    : await ctx.api.identityProviders.getAdminIdpsByAliasMapperStatus({ alias })

  if (ctx.args.flags.json === true) {
    printJson(response)
    return
  }

  const rows = response.status.map(entry => ({
    alias: entry.alias,
    providerId: entry.providerId,
    enabled: entry.enabled,
    healthy: entry.healthy,
    missingRequired: entry.missingRequired.join(',') || '-',
    missingOptional: entry.missingOptional.join(',') || '-',
    mapperType: entry.attributeMapperType ?? '-',
  }))
  printTable(rows, flagList(ctx.args.flags, 'columns'))

  // Non-zero exit on drift so `idps mapper-status` works as a CI gate.
  if (flagBool(ctx.args.flags, 'strict') && response.status.some(entry => !entry.healthy)) {
    throw new CliError('One or more identity providers are missing required attribute imports.')
  }
}

async function listMappers(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const mappers = await ctx.api.identityProviders.getAdminIdpsByAliasMappers({ alias })
  if (ctx.args.flags.json === true) {
    printJson(mappers)
    return
  }
  printTable(
    mappers.map(mapper => ({
      id: mapper.id ?? '-',
      name: mapper.name,
      claim: mapper.externalName ?? '-',
      userAttribute: mapper.userAttribute ?? '-',
      syncMode: mapper.syncMode ?? '-',
      type: mapper.identityProviderMapper,
    })),
    flagList(ctx.args.flags, 'columns'),
  )
}

async function listMapperTypes(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const types = await ctx.api.identityProviders.getAdminIdpsByAliasMapperTypes({ alias })
  if (ctx.args.flags.json === true) {
    printJson(types)
    return
  }
  printTable(
    types.map(type => ({
      id: type.id,
      name: type.name ?? '-',
      category: type.category ?? '-',
      properties: type.properties.map(property => property.name).join(','),
    })),
    flagList(ctx.args.flags, 'columns'),
  )
}

async function fixMappers(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const result = await ctx.api.identityProviders.postAdminIdpsByAliasMappersFix({
    alias,
    // Only the required imports when asked; optional ones are provisioned by default.
    includeOptional: flagBool(ctx.args.flags, 'required-only') ? 'false' : undefined,
  })
  printJson(result)
  if (result.errors.length > 0) {
    throw new CliError(`Provisioning reported ${result.errors.length} error(s).`)
  }
}

async function createMapper(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.identityProviders.postAdminIdpsByAliasMappers({
    alias,
    createIdentityProviderMapperRequest: CreateIdentityProviderMapperRequestFromJSON(data),
  })
  printJson(created)
}

async function updateMapper(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.identityProviders.putAdminIdpsByAliasMappersByMapperId({
    alias,
    mapperId,
    updateIdentityProviderMapperRequest: UpdateIdentityProviderMapperRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteMapper(ctx: CommandContext): Promise<void> {
  const alias = requirePositional(ctx.args, 2, 'alias')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  printJson(await ctx.api.identityProviders.deleteAdminIdpsByAliasMappersByMapperId({ alias, mapperId }))
}
