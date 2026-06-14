/**
 * Generic authenticated escape hatch:
 *   proxy-smart request <METHOD> <path> [--data <json>]
 *
 * Sends a bearer-authed request to any path on the proxy and prints the JSON
 * (or text) response. This covers every admin endpoint the typed subcommands
 * do not yet wrap, so the CLI is never a blocker for new backend routes.
 */
import { CliError, printJson, printLine } from '../output'
import { readJsonData, requirePositional, type CommandContext } from './shared'

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

/** `proxy-smart request <METHOD> <path> [--data <json>]`. */
export async function requestCommand(ctx: CommandContext): Promise<void> {
  // positionals[0] is "request"; method/path follow.
  const method = requirePositional(ctx.args, 1, 'METHOD').toUpperCase()
  const path = requirePositional(ctx.args, 2, 'path')

  if (!SUPPORTED_METHODS.has(method)) {
    throw new CliError(`Unsupported HTTP method "${method}". Use one of: ${[...SUPPORTED_METHODS].join(', ')}.`)
  }

  const token = await ctx.session.getAccessToken()
  const body = readJsonData(ctx.args)
  const url = `${ctx.config.url}${path.startsWith('/') ? path : `/${path}`}`

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  }
  if (body !== undefined) headers['content-type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new CliError(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`)
  }

  if (!text) {
    printLine(`HTTP ${res.status} ${res.statusText} (empty response)`)
    return
  }
  try {
    printJson(JSON.parse(text))
  } catch {
    printLine(text)
  }
}
