// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * `proxy-smart smart-apps <verb>` — manage SMART on FHIR applications.
 *
 * Backed by the generated SmartAppsApi. Verbs mirror the MCP tool taxonomy:
 * list / get / create / update / delete, plus the protocol-mapper sub-resource
 * that decides what a client's tokens actually contain.
 *
 * `add-audience` is the one verb that is more than a thin wrapper: putting an
 * entry in a client's `aud` is the single most common reason a launch fails
 * against the proxy's fail-closed audience check, and doing it by hand means
 * knowing which of two Keycloak config keys applies. The proxy resolves that;
 * the CLI just names the audience.
 */
import {
  CreateSmartAppRequestFromJSON,
  UpdateSmartAppRequestFromJSON,
  CreateProtocolMapperRequestFromJSON,
  UpdateProtocolMapperRequestFromJSON,
} from '../api-client'
import { flagBool, flagList, flagString } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

const VERBS = [
  'list', 'get', 'create', 'update', 'delete',
  'mappers', 'create-mapper', 'update-mapper', 'delete-mapper', 'add-audience',
] as const

/** Dispatch a smart-apps verb. positionals[1] is the verb. */
export async function smartAppsCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listSmartApps(ctx)
    case 'get':
      return getSmartApp(ctx)
    case 'create':
      return createSmartApp(ctx)
    case 'update':
      return updateSmartApp(ctx)
    case 'delete':
      return deleteSmartApp(ctx)
    case 'mappers':
      return listMappers(ctx)
    case 'create-mapper':
      return createMapper(ctx)
    case 'update-mapper':
      return updateMapper(ctx)
    case 'delete-mapper':
      return deleteMapper(ctx)
    case 'add-audience':
      return addAudience(ctx)
    default:
      throw new CliError(`Unknown smart-apps verb "${verb}". Use: ${VERBS.join(' | ')}.`)
  }
}

async function listSmartApps(ctx: CommandContext): Promise<void> {
  const apps = await ctx.api.smartApps.getAdminSmartApps()
  if (ctx.args.flags.json === true) {
    printJson(apps)
    return
  }
  printTable(apps as unknown as Array<Record<string, unknown>>, flagList(ctx.args.flags, 'columns'))
}

async function getSmartApp(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const app = await ctx.api.smartApps.getAdminSmartAppsByClientId({ clientId })
  printJson(app)
}

async function createSmartApp(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.smartApps.postAdminSmartApps({
    createSmartAppRequest: CreateSmartAppRequestFromJSON(data),
  })
  printJson(created)
}

async function updateSmartApp(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.smartApps.putAdminSmartAppsByClientId({
    clientId,
    updateSmartAppRequest: UpdateSmartAppRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteSmartApp(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const result = await ctx.api.smartApps.deleteAdminSmartAppsByClientId({ clientId })
  printJson(result)
}

/**
 * `mappers <clientId>` — what this client's tokens are built from.
 *
 * The table collapses each mapper's config to the audience it emits (for
 * audience mappers) or the claim it writes, because those are what an operator
 * is actually checking when a launch produces the wrong token.
 */
async function listMappers(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const mappers = await ctx.api.smartApps.getAdminSmartAppsByClientIdMappers({ clientId })

  if (ctx.args.flags.json === true) {
    printJson(mappers)
    return
  }

  printTable(
    mappers.map(mapper => {
      const config = mapper.config ?? {}
      return {
        id: mapper.id ?? '-',
        name: mapper.name ?? '-',
        type: mapper.protocolMapper ?? '-',
        audience: config['included.client.audience'] || config['included.custom.audience'] || '-',
        claim: config['claim.name'] ?? '-',
        accessToken: config['access.token.claim'] ?? '-',
      }
    }),
    flagList(ctx.args.flags, 'columns'),
  )
}

async function createMapper(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.smartApps.postAdminSmartAppsByClientIdMappers({
    clientId,
    createProtocolMapperRequest: CreateProtocolMapperRequestFromJSON(data),
  }))
}

async function updateMapper(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.smartApps.putAdminSmartAppsByClientIdMappersByMapperId({
    clientId,
    mapperId,
    updateProtocolMapperRequest: UpdateProtocolMapperRequestFromJSON(data),
  }))
}

async function deleteMapper(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const mapperId = requirePositional(ctx.args, 3, 'mapperId')
  printJson(await ctx.api.smartApps.deleteAdminSmartAppsByClientIdMappersByMapperId({ clientId, mapperId }))
}

/**
 * `add-audience <clientId> <audience>` — idempotently put an entry in `aud`.
 *
 * Idempotent by design so it can run unguarded from a deploy or reconcile step:
 * a second run reports `created: false` and changes nothing.
 */
async function addAudience(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const audience = requirePositional(ctx.args, 3, 'audience')
  printJson(await ctx.api.smartApps.postAdminSmartAppsByClientIdMappersAudience({
    clientId,
    addAudienceMapperRequest: {
      audience,
      name: flagString(ctx.args.flags, 'name'),
      includeInIdToken: flagBool(ctx.args.flags, 'id-token') ? true : undefined,
    },
  }))
}
