/**
 * Global auth commands: login, logout, whoami.
 *
 * `login` defaults to the interactive device flow but switches to
 * client_credentials when a client secret is present (or `--ci` is passed),
 * which is the ergonomic CI path. `whoami` calls the proxy's /auth/userinfo
 * with the cached bearer token.
 */
import { flagBool } from '../args'
import { CliError, printJson, printLine } from '../output'
import { type CommandContext } from './shared'

/** `proxy-smart login` — acquire and cache a token. */
export async function loginCommand(ctx: CommandContext): Promise<void> {
  const useClientCredentials = flagBool(ctx.args.flags, 'ci') || Boolean(ctx.config.clientSecret)

  if (useClientCredentials) {
    if (!ctx.config.clientSecret) {
      throw new CliError('client_credentials login requires a client secret (PROXY_SMART_CLIENT_SECRET or --client-secret).')
    }
    await ctx.session.loginWithClientCredentials()
    printLine(`Authenticated to ${ctx.config.url} via client_credentials as "${ctx.config.clientId}".`)
    return
  }

  await ctx.session.loginWithDeviceFlow((device) => {
    printLine('')
    printLine('To sign in, open the following URL in your browser:')
    printLine(`  ${device.verification_uri_complete ?? device.verification_uri}`)
    if (!device.verification_uri_complete) {
      printLine('')
      printLine(`And enter the code:  ${device.user_code}`)
    }
    printLine('')
    printLine('Waiting for authorization...')
  })
  printLine(`Authenticated to ${ctx.config.url} as "${ctx.config.clientId}".`)
}

/** `proxy-smart logout` — clear the cached token. */
export async function logoutCommand(ctx: CommandContext): Promise<void> {
  ctx.session.logout()
  printLine('Logged out. Cached token removed.')
}

/** `proxy-smart whoami` — show the identity behind the cached token. */
export async function whoamiCommand(ctx: CommandContext): Promise<void> {
  const token = await ctx.session.getAccessToken()
  const res = await fetch(`${ctx.config.url}/auth/userinfo`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!res.ok) {
    throw new CliError(`Failed to fetch identity (HTTP ${res.status}). The token may be expired — try \`proxy-smart login\`.`)
  }
  printJson(await res.json())
}
