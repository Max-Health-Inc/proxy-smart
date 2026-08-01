/**
 * Global auth commands: login, logout, whoami.
 *
 * `login` defaults to the interactive device flow but switches to
 * client_credentials when a client secret is present (or `--ci` is passed),
 * which is the ergonomic CI path. `whoami` calls the proxy's /auth/userinfo
 * with the cached bearer token.
 */
import { flagBool } from '../args'
import { normalizeUrl, readPersistedConfig, writePersistedConfig } from '../config'
import { CliError, printJson, printLine } from '../output'
import { type CommandContext } from './shared'

/**
 * Remember the deployment we just authenticated against.
 *
 * Resolution order is flag > env > persisted > default, and the default is localhost — so
 * without this, `login --url https://beta…` authenticated against beta and the very next bare
 * command targeted localhost instead, presenting a beta token and returning an opaque 401. The
 * token cache also records its own origin ({@link CachedToken.url}) so a mismatch is refused
 * rather than merely confusing; this is the half that stops the mismatch arising at all.
 *
 * Writing it is best-effort: a read-only or unwritable home must not fail a login that
 * otherwise succeeded, since the token itself is already cached and usable with `--url`.
 */
function rememberDeployment(ctx: CommandContext): void {
  try {
    writePersistedConfig(ctx.config.homeDir, { ...readPersistedConfig(ctx.config.homeDir), url: ctx.config.url })
  } catch {
    printLine(`Note: could not save ${ctx.config.url} as the default target — pass --url on later commands.`)
  }
  warnIfEnvOverrides(ctx)
}

/**
 * Warn when `PROXY_SMART_URL` will send the NEXT command somewhere else.
 *
 * Persisting the target is not enough on its own: resolution is flag > env > persisted, so
 * `--url beta` with `PROXY_SMART_URL` set to production authenticates against beta and then sends
 * every bare command to production. That is not a bug in the order — an env var should outrank a
 * stored default — but silently authenticating one place and operating another is worth saying out
 * loud, at the moment the two diverge. Observed 2026-08-01 with PROXY_SMART_URL pointing at prod.
 *
 * The token binding in {@link Session.getAccessToken} still refuses the mismatched call; this only
 * means you find out at login instead of at the next command.
 */
function warnIfEnvOverrides(ctx: CommandContext): void {
  const fromEnv = process.env.PROXY_SMART_URL
  if (!fromEnv || normalizeUrl(fromEnv) === ctx.config.url) return
  printLine('')
  printLine(`Warning: PROXY_SMART_URL is set to ${normalizeUrl(fromEnv)}, which is NOT where you just`)
  printLine(`signed in. Commands without --url will target that instead and be refused. Either:`)
  printLine(`  proxy-smart --url ${ctx.config.url} <command>`)
  printLine(`  $env:PROXY_SMART_URL = '${ctx.config.url}'    # or unset it`)
}

/** `proxy-smart login` — acquire and cache a token. */
export async function loginCommand(ctx: CommandContext): Promise<void> {
  const useClientCredentials = flagBool(ctx.args.flags, 'ci') || Boolean(ctx.config.clientSecret)

  if (useClientCredentials) {
    if (!ctx.config.clientSecret) {
      throw new CliError('client_credentials login requires a client secret (PROXY_SMART_CLIENT_SECRET or --client-secret).')
    }
    await ctx.session.loginWithClientCredentials()
    rememberDeployment(ctx)
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
  rememberDeployment(ctx)
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
