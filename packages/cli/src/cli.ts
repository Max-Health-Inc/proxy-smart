/**
 * Command dispatcher: parse argv, resolve config, build a session + API
 * client, and route to the matching command handler.
 *
 * This is the one place that knows the full command map, keeping the entry
 * point (index.ts) thin and the handlers decoupled from argv parsing.
 */
import { parseArgs, flagString, flagBool, type ParsedArgs } from './args'
import { resolveConfig, type ConfigOverrides } from './config'
import { Session } from './session'
import { createApiClient } from './client'
import { describeError, printError, CliError } from './output'
import { printHelp, printVersion } from './help'
import { type CommandContext, type CommandHandler } from './commands/shared'
import { loginCommand, logoutCommand, whoamiCommand } from './commands/auth'
import { requestCommand } from './commands/request'
import { smartAppsCommand } from './commands/smart-apps'
import { healthcareUsersCommand } from './commands/healthcare-users'
import { scopeSetsCommand } from './commands/scope-sets'
import { mcpEndpointCommand } from './commands/mcp-endpoint'
import { shutdownCommand, restartCommand } from './commands/server'

/** Top-level command name → handler. */
const COMMANDS: Record<string, CommandHandler> = {
  login: loginCommand,
  logout: logoutCommand,
  whoami: whoamiCommand,
  request: requestCommand,
  'smart-apps': smartAppsCommand,
  'healthcare-users': healthcareUsersCommand,
  'scope-sets': scopeSetsCommand,
  'mcp-endpoint': mcpEndpointCommand,
  shutdown: shutdownCommand,
  restart: restartCommand,
}

/** Map kebab-case global flags onto config overrides. Pure. */
export function overridesFromFlags(flags: ParsedArgs['flags']): ConfigOverrides {
  return {
    url: flagString(flags, 'url'),
    clientId: flagString(flags, 'client-id'),
    clientSecret: flagString(flags, 'client-secret'),
    realm: flagString(flags, 'realm'),
    keycloakUrl: flagString(flags, 'keycloak-url'),
    scope: flagString(flags, 'scope'),
    // Only forward an explicit opt-in; absence must fall through to env / file.
    directKeycloak: flagBool(flags, 'direct-keycloak') ? true : undefined,
  }
}

/**
 * Run the CLI for a given argv slice (without the node/bun + script path).
 * Returns the process exit code.
 */
export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv)
  const command = args.positionals[0]

  // Version / help short-circuit before any auth or config work. Version is
  // checked first so `proxy-smart --version` (no command) is not swallowed by
  // the "no command → show help" rule.
  if (flagBool(args.flags, 'version') || command === 'version') {
    printVersion()
    return 0
  }
  if (flagBool(args.flags, 'help') || command === 'help' || command === undefined) {
    printHelp()
    return 0
  }

  const handler = COMMANDS[command]
  if (!handler) {
    printError(`Unknown command "${command}". Run \`proxy-smart --help\` for usage.`)
    return 1
  }

  const config = resolveConfig(overridesFromFlags(args.flags))
  const session = new Session(config)
  const api = createApiClient(config, session)
  const ctx: CommandContext = { args, config, session, api }

  try {
    await handler(ctx)
    return 0
  } catch (error) {
    printError(await describeError(error))
    return error instanceof CliError ? error.exitCode : 1
  }
}
