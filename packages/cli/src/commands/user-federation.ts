// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * `proxy-smart user-federation <verb>` — manage LDAP providers and their mappers.
 *
 * Backed by the generated UserFederationApi. LDAP mappers decide which
 * directory attributes reach the Keycloak user, so `mappers` is where an admin
 * checks whether imported users carry `fhirUser` at all. Unlike identity
 * providers there is no fix verb: the directory attribute holding the FHIR
 * reference is deployment-specific, so it cannot be guessed.
 */
import {
  CreateUserFederationRequestFromJSON,
  CreateUserFederationMapperRequestFromJSON,
  UpdateUserFederationRequestFromJSON,
  UpdateUserFederationMapperRequestFromJSON,
} from '../api-client'
import { flagBool, flagList, flagString } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

const VERBS = [
  'list', 'get', 'create', 'update', 'delete', 'sync',
  'mappers', 'mapper-types', 'create-mapper', 'update-mapper', 'delete-mapper',
] as const

/** Keycloak user attribute a SMART launch resolves the imported user through */
const SMART_USER_ATTRIBUTE = 'fhirUser'

/** Dispatch a user-federation verb. positionals[1] is the verb. */
export async function userFederationCommand(ctx: CommandContext): Promise<void> {
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
    case 'sync':
      return syncProvider(ctx)
    case 'mappers':
      return listMappers(ctx)
    case 'mapper-types':
      return listMapperTypes(ctx)
    case 'create-mapper':
      return createMapper(ctx)
    case 'update-mapper':
      return updateMapper(ctx)
    case 'delete-mapper':
      return deleteMapper(ctx)
    default:
      throw new CliError(`Unknown user-federation verb "${verb}". Use: ${VERBS.join(' | ')}.`)
  }
}

async function listProviders(ctx: CommandContext): Promise<void> {
  const providers = await ctx.api.userFederation.getAdminUserFederation()
  if (ctx.args.flags.json === true) {
    printJson(providers)
    return
  }
  printTable(providers as unknown as Array<Record<string, unknown>>, flagList(ctx.args.flags, 'columns'))
}

async function getProvider(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  printJson(await ctx.api.userFederation.getAdminUserFederationById({ id }))
}

async function createProvider(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.userFederation.postAdminUserFederation({
    createUserFederationRequest: CreateUserFederationRequestFromJSON(data),
  })
  printJson(created)
}

async function updateProvider(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.userFederation.putAdminUserFederationById({
    id,
    updateUserFederationRequest: UpdateUserFederationRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteProvider(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  if (!flagBool(ctx.args.flags, 'yes')) {
    throw new CliError(`Deleting a federation provider unlinks its imported users. Re-run with --yes.`)
  }
  printJson(await ctx.api.userFederation.deleteAdminUserFederationById({ id }))
}

/** `sync <id> [--action triggerFullSync|triggerChangedUsersSync]`. */
async function syncProvider(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const action = flagString(ctx.args.flags, 'action') ?? 'triggerFullSync'
  if (action !== 'triggerFullSync' && action !== 'triggerChangedUsersSync') {
    throw new CliError('--action must be triggerFullSync or triggerChangedUsersSync.')
  }
  printJson(await ctx.api.userFederation.postAdminUserFederationByIdSync({
    id,
    userFederationSyncRequest: { action },
  }))
}

async function listMappers(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const mappers = await ctx.api.userFederation.getAdminUserFederationByIdMappers({ id })
  if (ctx.args.flags.json === true) {
    printJson(mappers)
    return
  }

  const rows = mappers.map(mapper => {
    const config = (mapper.config ?? {}) as Record<string, string>
    return {
      id: mapper.id ?? '-',
      name: mapper.name ?? '-',
      ldapAttribute: config['ldap.attribute'] ?? '-',
      userAttribute: config['user.model.attribute'] ?? '-',
      type: mapper.providerId ?? '-',
    }
  })
  printTable(rows, flagList(ctx.args.flags, 'columns'))

  // Same CI gate as `idps mapper-status`: a directory user without fhirUser
  // cannot be resolved to a FHIR resource in a SMART launch.
  if (flagBool(ctx.args.flags, 'strict') && !rows.some(row => row.userAttribute === SMART_USER_ATTRIBUTE)) {
    throw new CliError(`No mapper writes the ${SMART_USER_ATTRIBUTE} user attribute.`)
  }
}

async function listMapperTypes(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const types = await ctx.api.userFederation.getAdminUserFederationByIdMapperTypes({ id })
  if (ctx.args.flags.json === true) {
    printJson(types)
    return
  }
  printTable(
    types.map(type => ({
      id: type.id,
      properties: type.properties.map(property => property.name).join(','),
    })),
    flagList(ctx.args.flags, 'columns'),
  )
}

async function createMapper(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.userFederation.postAdminUserFederationByIdMappers({
    id,
    createUserFederationMapperRequest: CreateUserFederationMapperRequestFromJSON(data),
  })
  printJson(created)
}

async function updateMapper(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.userFederation.putAdminUserFederationByIdMappersByMapperId({
    id,
    mapperId,
    updateUserFederationMapperRequest: UpdateUserFederationMapperRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteMapper(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  printJson(await ctx.api.userFederation.deleteAdminUserFederationByIdMappersByMapperId({ id, mapperId }))
}
