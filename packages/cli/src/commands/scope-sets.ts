/**
 * `proxy-smart scope-sets <verb>` — manage reusable SMART scope sets.
 *
 * Backed by the generated ScopeSetsApi. v1 verbs: list / get / create / delete.
 */
import { CreateScopeSetRequestFromJSON } from '../api-client'
import { flagList } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

/** Dispatch a scope-sets verb. positionals[1] is the verb. */
export async function scopeSetsCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listScopeSets(ctx)
    case 'get':
      return getScopeSet(ctx)
    case 'create':
      return createScopeSet(ctx)
    case 'delete':
      return deleteScopeSet(ctx)
    default:
      throw new CliError(`Unknown scope-sets verb "${verb}". Use: list | get | create | delete.`)
  }
}

async function listScopeSets(ctx: CommandContext): Promise<void> {
  const response = await ctx.api.scopeSets.getAdminScopeSets()
  if (ctx.args.flags.json === true) {
    printJson(response)
    return
  }
  printTable(
    response.scopeSets as unknown as Array<Record<string, unknown>>,
    flagList(ctx.args.flags, 'columns'),
  )
}

async function getScopeSet(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const scopeSet = await ctx.api.scopeSets.getAdminScopeSetsById({ id })
  printJson(scopeSet)
}

async function createScopeSet(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.scopeSets.postAdminScopeSets({
    createScopeSetRequest: CreateScopeSetRequestFromJSON(data),
  })
  printJson(created)
}

async function deleteScopeSet(ctx: CommandContext): Promise<void> {
  const id = requirePositional(ctx.args, 2, 'id')
  const result = await ctx.api.scopeSets.deleteAdminScopeSetsById({ id })
  printJson(result)
}
