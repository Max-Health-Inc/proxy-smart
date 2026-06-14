/**
 * `proxy-smart smart-apps <verb>` — manage SMART on FHIR applications.
 *
 * Backed by the generated SmartAppsApi. Verbs mirror the MCP tool taxonomy:
 * list / get / create / update / delete.
 */
import {
  CreateSmartAppRequestFromJSON,
  UpdateSmartAppRequestFromJSON,
} from '../api-client'
import { flagList } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

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
    default:
      throw new CliError(`Unknown smart-apps verb "${verb}". Use: list | get | create | update | delete.`)
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
