/**
 * `proxy-smart healthcare-users <verb>` — manage healthcare users.
 *
 * Backed by the generated HealthcareUsersApi. v1 verbs: list / get / create /
 * delete (update and federated-identity management are reachable today via the
 * generic `request` escape hatch and can be promoted later).
 */
import { CreateHealthcareUserRequestFromJSON } from '../api-client'
import { flagList, flagString } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

/** Dispatch a healthcare-users verb. positionals[1] is the verb. */
export async function healthcareUsersCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listUsers(ctx)
    case 'get':
      return getUser(ctx)
    case 'create':
      return createUser(ctx)
    case 'delete':
      return deleteUser(ctx)
    default:
      throw new CliError(`Unknown healthcare-users verb "${verb}". Use: list | get | create | delete.`)
  }
}

async function listUsers(ctx: CommandContext): Promise<void> {
  const limit = flagString(ctx.args.flags, 'limit')
  const offset = flagString(ctx.args.flags, 'offset')
  const users = await ctx.api.healthcareUsers.getAdminHealthcareUsers({
    limit: limit !== undefined ? Number(limit) : undefined,
    offset: offset !== undefined ? Number(offset) : undefined,
  })
  if (ctx.args.flags.json === true) {
    printJson(users)
    return
  }
  printTable(users as unknown as Array<Record<string, unknown>>, flagList(ctx.args.flags, 'columns'))
}

async function getUser(ctx: CommandContext): Promise<void> {
  const userId = requirePositional(ctx.args, 2, 'userId')
  const user = await ctx.api.healthcareUsers.getAdminHealthcareUsersByUserId({ userId })
  printJson(user)
}

async function createUser(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.healthcareUsers.postAdminHealthcareUsers({
    createHealthcareUserRequest: CreateHealthcareUserRequestFromJSON(data),
  })
  printJson(created)
}

async function deleteUser(ctx: CommandContext): Promise<void> {
  const userId = requirePositional(ctx.args, 2, 'userId')
  const result = await ctx.api.healthcareUsers.deleteAdminHealthcareUsersByUserId({ userId })
  printJson(result)
}
