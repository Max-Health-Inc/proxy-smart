/**
 * Help + version text for the CLI.
 *
 * Kept in one module so the usage string stays the single source of truth for
 * the documented command surface.
 */
import pkg from '../package.json' with { type: 'json' }
import { printLine } from './output'

/** The CLI version, sourced from package.json (single source of truth). */
export const VERSION: string = pkg.version

/** Print the version string. */
export function printVersion(): void {
  printLine(VERSION)
}

/** Print the top-level usage / help text. */
export function printHelp(): void {
  printLine(`proxy-smart — admin CLI for the proxy-smart SMART on FHIR proxy

USAGE
  proxy-smart [global flags] <command> [subcommand] [args] [flags]

GLOBAL FLAGS
  --url <url>             Proxy base URL — the authorization server the CLI
                          authenticates through (env: PROXY_SMART_URL) [required]
  --client-id <id>        OAuth client id (env: PROXY_SMART_CLIENT_ID)
  --client-secret <s>     OAuth client secret (env: PROXY_SMART_CLIENT_SECRET)
  --scope <scopes>        Requested OAuth scopes (env: PROXY_SMART_SCOPE)
  --json                  Emit JSON instead of tables where applicable
  -h, --help              Show help
  -v, --version           Show version

DIRECT-KEYCLOAK ESCAPE HATCH (advanced)
  By default the CLI authenticates through the proxy, where audience binding,
  token enrichment, and access control are applied. The flags below only apply
  when you opt into bypassing the proxy and talking to Keycloak directly.

  --direct-keycloak       Bypass the proxy and use Keycloak directly
                          (env: PROXY_SMART_DIRECT_KEYCLOAK=1). Requires both
                          --realm and --keycloak-url.
  --realm <realm>         Keycloak realm (env: PROXY_SMART_REALM)
  --keycloak-url <url>    Keycloak base URL (env: PROXY_SMART_KEYCLOAK_URL)

AUTH
  login                   Sign in (device flow; client_credentials when a
                          secret is set or --ci is passed)
  logout                  Remove the cached token
  whoami                  Show the identity behind the cached token

GENERIC
  request <METHOD> <path> [--data <json>]
                          Send a bearer-authed request to any proxy path

DOMAINS
  smart-apps        list | get <clientId> | create | update <clientId> | delete <clientId>
  healthcare-users  list | get <userId> | create | delete <userId>
  scope-sets        list | get <id> | create | delete <id>
  mcp-endpoint      get | update

SERVER OPS
  shutdown --yes          Gracefully stop the proxy server
  restart  --yes          Restart the proxy server

REQUEST BODIES
  Provide JSON via:  --data '<json>'  |  --data @file.json  |  --data -  (stdin)

EXAMPLES
  proxy-smart login
  proxy-smart smart-apps list --json
  proxy-smart smart-apps create --data @app.json
  proxy-smart scope-sets create --data '{"name":"Reader","scopes":["patient/*.read"]}'
  proxy-smart request GET /admin/smart-config
  proxy-smart restart --yes

Config + token cache live under ~/.proxy-smart (override with PROXY_SMART_HOME).`)
}
