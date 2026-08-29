/**
 * `proxy-smart mcp-endpoint <verb>` — inspect and configure the /mcp endpoint.
 *
 * Backed by the generated McpManagementApi. v1 verbs: get / update.
 * `update` PATCHes the endpoint config (enabled, disabledTools, enabledTools,
 * exposeResourcesAsTools).
 */
import { PatchAdminMcpEndpointRequestFromJSON } from '../api-client'
import { CliError, printJson } from '../output'
import { requireJsonData, type CommandContext } from './shared'

/** Dispatch an mcp-endpoint verb. positionals[1] is the verb. */
export async function mcpEndpointCommand(ctx: CommandContext): Promise<void> {
  const verb = ctx.args.positionals[1] ?? 'get'
  switch (verb) {
    case 'get':
      return getMcpEndpoint(ctx)
    case 'update':
      return updateMcpEndpoint(ctx)
    default:
      throw new CliError(`Unknown mcp-endpoint verb "${verb}". Use: get | update.`)
  }
}

async function getMcpEndpoint(ctx: CommandContext): Promise<void> {
  const status = await ctx.api.mcp.getAdminMcpEndpoint()
  printJson(status)
}

async function updateMcpEndpoint(ctx: CommandContext): Promise<void> {
  const data = requireJsonData(ctx.args)
  const result = await ctx.api.mcp.patchAdminMcpEndpoint({
    patchAdminMcpEndpointRequest: PatchAdminMcpEndpointRequestFromJSON(data),
  })
  printJson(result)
}
