/**
 * `proxy-smart shutdown` / `proxy-smart restart` — server lifecycle ops.
 *
 * Backed by the generated AdminApi (POST /admin/shutdown, /admin/restart).
 * These are destructive, so they require `--yes` to proceed non-interactively.
 */
import { flagBool } from '../args'
import { CliError, printJson } from '../output'
import { type CommandContext } from './shared'

/** `proxy-smart shutdown` — gracefully stop the proxy server. */
export async function shutdownCommand(ctx: CommandContext): Promise<void> {
  requireConfirmation(ctx, 'shutdown')
  const result = await ctx.api.admin.postAdminShutdown()
  printJson(result)
}

/** `proxy-smart restart` — restart the proxy server. */
export async function restartCommand(ctx: CommandContext): Promise<void> {
  requireConfirmation(ctx, 'restart')
  const result = await ctx.api.admin.postAdminRestart()
  printJson(result)
}

/** Guard destructive operations behind an explicit `--yes`. */
function requireConfirmation(ctx: CommandContext, operation: string): void {
  if (!flagBool(ctx.args.flags, 'yes')) {
    throw new CliError(`Refusing to ${operation} ${ctx.config.url} without confirmation. Re-run with --yes.`)
  }
}
