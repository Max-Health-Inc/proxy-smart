/**
 * `proxy-smart smart-scopes <verb>` — manage the Keycloak client scopes that
 * back SMART authorization (e.g. `patient/ImagingStudy.cruds`, `user/Claim.cud`).
 *
 * These are the individual client scopes an app requests via the `scope`
 * parameter. If a requested scope does not exist here, Keycloak rejects the whole
 * authorization request with `invalid_scope`. (Distinct from `scope-sets`, which
 * are reusable named *groups* of scopes.)
 *
 * Backed by the generated AdminApi. Verbs: list / create / batch / delete.
 */
import {
  CreateSmartScopeRequestFromJSON,
  CreateSmartScopeBatchRequestFromJSON,
} from '../api-client'
import { flagList, flagBool } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

/** Dispatch a smart-scopes verb. positionals[1] is the verb. */
export async function smartScopesCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listSmartScopes(ctx)
    case 'create':
      return createSmartScope(ctx)
    case 'batch':
      return batchCreateSmartScopes(ctx)
    case 'delete':
      return deleteSmartScope(ctx)
    default:
      throw new CliError(
        `Unknown smart-scopes verb "${verb}". Use: list | create | batch | delete.`,
      )
  }
}

async function listSmartScopes(ctx: CommandContext): Promise<void> {
  // `--smart-only` narrows the list to SMART scopes (skips Keycloak built-ins).
  const smartOnly = flagBool(ctx.args.flags, 'smart-only') ? 'true' : undefined
  const response = await ctx.api.admin.getAdminSmartScopes({ smartOnly })
  if (ctx.args.flags.json === true) {
    printJson(response)
    return
  }
  printTable(
    response.scopes as unknown as Array<Record<string, unknown>>,
    flagList(ctx.args.flags, 'columns'),
  )
}

async function createSmartScope(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const created = await ctx.api.admin.postAdminSmartScopes({
    createSmartScopeRequest: CreateSmartScopeRequestFromJSON(data),
  })
  printJson(created)
}

async function batchCreateSmartScopes(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.admin.postAdminSmartScopesBatch({
    createSmartScopeBatchRequest: CreateSmartScopeBatchRequestFromJSON(data),
  })
  printJson(result)
}

async function deleteSmartScope(ctx: CommandContext): Promise<void> {
  const scopeId = requirePositional(ctx.args, 2, 'scopeId')
  const result = await ctx.api.admin.deleteAdminSmartScopesByScopeId({ scopeId })
  printJson(result)
}
