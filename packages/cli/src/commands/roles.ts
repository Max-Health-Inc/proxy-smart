// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * `proxy-smart roles <verb>` — manage realm roles and client roles.
 *
 * Backed by the generated RolesApi. Client roles get their own verbs rather
 * than a `--client` flag on the realm ones: they are a different Keycloak
 * resource with a different container, and keeping that visible in the verb
 * stops a realm-role command from silently writing a client role (or the
 * reverse) when a flag is forgotten.
 *
 * Every client-facing verb takes the OAuth client id. Resolving it to
 * Keycloak's internal UUID happens server-side, so nothing here needs the
 * Keycloak admin API.
 */
import {
  CreateRoleRequestFromJSON,
  UpdateRoleRequestFromJSON,
  type RoleResponse,
} from '../api-client'
import { flagBool, flagList } from '../args'
import { CliError, printJson, printTable } from '../output'
import { requireJsonData, requirePositional, type CommandContext } from './shared'

const VERBS = [
  'list', 'get', 'create', 'update', 'delete',
  'client-roles', 'client-get', 'client-create', 'client-update', 'client-delete',
] as const

/** Dispatch a roles verb. positionals[1] is the verb. */
export async function rolesCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'list'
  switch (verb) {
    case 'list':
      return listRoles(ctx)
    case 'get':
      return getRole(ctx)
    case 'create':
      return createRole(ctx)
    case 'update':
      return updateRole(ctx)
    case 'delete':
      return deleteRole(ctx)
    case 'client-roles':
      return listClientRoles(ctx)
    case 'client-get':
      return getClientRole(ctx)
    case 'client-create':
      return createClientRole(ctx)
    case 'client-update':
      return updateClientRole(ctx)
    case 'client-delete':
      return deleteClientRole(ctx)
    default:
      throw new CliError(`Unknown roles verb "${verb}". Use: ${VERBS.join(' | ')}.`)
  }
}

/**
 * Render roles as a table, or as JSON with --json.
 *
 * The columns are the ones that answer "what is this role and what does it
 * claim to represent" — the represented scopes are a descriptive label, never
 * an access grant, which is why they read as a plain list.
 */
function printRoles(ctx: CommandContext, roles: RoleResponse[]): void {
  if (ctx.args.flags.json === true) {
    printJson(roles)
    return
  }
  printTable(
    roles.map(role => ({
      name: role.name ?? '-',
      description: role.description ?? '-',
      composite: role.composite ?? false,
      technical: role.isTechnical ?? false,
      representedScopeSet: role.representedScopeSetName ?? '-',
      representedScopes: role.representedScopes?.join(',') || '-',
    })),
    flagList(ctx.args.flags, 'columns'),
  )
}

async function listRoles(ctx: CommandContext): Promise<void> {
  // Plumbing roles are hidden server-side unless explicitly asked for.
  const roles = await ctx.api.roles.getAdminRoles({
    includeTechnical: flagBool(ctx.args.flags, 'include-technical') ? 'true' : undefined,
  })
  printRoles(ctx, roles)
}

async function getRole(ctx: CommandContext): Promise<void> {
  const roleName = requirePositional(ctx.args, 2, 'roleName')
  printJson(await ctx.api.roles.getAdminRolesByRoleName({ roleName }))
}

async function createRole(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.roles.postAdminRoles({
    createRoleRequest: CreateRoleRequestFromJSON(data),
  }))
}

async function updateRole(ctx: CommandContext): Promise<void> {
  const roleName = requirePositional(ctx.args, 2, 'roleName')
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.roles.putAdminRolesByRoleName({
    roleName,
    updateRoleRequest: UpdateRoleRequestFromJSON(data),
  }))
}

async function deleteRole(ctx: CommandContext): Promise<void> {
  const roleName = requirePositional(ctx.args, 2, 'roleName')
  requireConfirmation(ctx, `role "${roleName}"`)
  printJson(await ctx.api.roles.deleteAdminRolesByRoleName({ roleName }))
}

async function listClientRoles(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  printRoles(ctx, await ctx.api.roles.getAdminRolesClientsByClientId({ clientId }))
}

async function getClientRole(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const roleName = requirePositional(ctx.args, 3, 'roleName')
  printJson(await ctx.api.roles.getAdminRolesClientsByClientIdByRoleName({ clientId, roleName }))
}

async function createClientRole(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.roles.postAdminRolesClientsByClientId({
    clientId,
    createRoleRequest: CreateRoleRequestFromJSON(data),
  }))
}

async function updateClientRole(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const roleName = requirePositional(ctx.args, 3, 'roleName')
  const data = requireJsonData(ctx.args)
  printJson(await ctx.api.roles.putAdminRolesClientsByClientIdByRoleName({
    clientId,
    roleName,
    updateRoleRequest: UpdateRoleRequestFromJSON(data),
  }))
}

async function deleteClientRole(ctx: CommandContext): Promise<void> {
  const clientId = requirePositional(ctx.args, 2, 'clientId')
  const roleName = requirePositional(ctx.args, 3, 'roleName')
  requireConfirmation(ctx, `role "${roleName}" on client "${clientId}"`)
  printJson(await ctx.api.roles.deleteAdminRolesClientsByClientIdByRoleName({ clientId, roleName }))
}

/**
 * Deleting a role revokes it from every user and client that holds it, and
 * Keycloak offers no undo — so it takes the same explicit `--yes` the other
 * destructive commands in this CLI require.
 */
function requireConfirmation(ctx: CommandContext, target: string): void {
  if (!flagBool(ctx.args.flags, 'yes')) {
    throw new CliError(`Refusing to delete ${target} without --yes.`)
  }
}
