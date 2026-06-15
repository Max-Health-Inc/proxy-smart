# @proxy-smart/cli

`proxy-smart` — an admin CLI for the [proxy-smart](https://github.com/Max-Health-Inc/proxy-smart)
SMART on FHIR authorization proxy. It authenticates via Keycloak OAuth and drives
the proxy's admin REST API through a generated, fully typed API client.

It is a Bun TypeScript-source package (no build step). The `bin` points straight
at `src/index.ts`, which carries a `#!/usr/bin/env bun` shebang.

## Install

The package is published to the GitHub npm registry in lockstep with the rest of
the monorepo. With a registry-scoped `.npmrc` configured for `@proxy-smart`:

```bash
bun add -g @proxy-smart/cli
# or run it without installing, from a checkout:
bun run packages/cli/src/index.ts --help
```

Within this monorepo it is wired as a workspace, so `bun install` at the repo
root resolves it and you can run it directly with `bun`.

## Configuration

Settings resolve in this precedence order (highest first):

1. command-line flags
2. environment variables (`PROXY_SMART_*`)
3. the persisted config file at `~/.proxy-smart/config.json`
4. built-in defaults

| Setting        | Flag                | Env var                       | Default                  |
| -------------- | ------------------- | ----------------------------- | ------------------------ |
| Proxy base URL | `--url`             | `PROXY_SMART_URL`             | `http://localhost:8445`  |
| Client id      | `--client-id`       | `PROXY_SMART_CLIENT_ID`       | `admin-ui`               |
| Client secret  | `--client-secret`   | `PROXY_SMART_CLIENT_SECRET`   | (unset)                  |
| Scopes         | `--scope`           | `PROXY_SMART_SCOPE`           | `openid profile email`   |
| CLI home dir   | —                   | `PROXY_SMART_HOME`            | `~/.proxy-smart`         |

The config file and the cached token live under `~/.proxy-smart/` (override the
whole directory with `PROXY_SMART_HOME`). The token cache is written with
owner-only (`0600`) permissions.

## Authentication

The CLI is **proxy-first**: by default every grant flows through the proxy's
auth layer (`${PROXY_SMART_URL}/auth/...`), where audience binding, token
enrichment, and access control are applied. Endpoints are discovered from the
proxy's mirrored OIDC document at `/auth/.well-known/openid-configuration`.

Two grants are supported, matching what the backend already accepts:

### Interactive device flow (humans)

```bash
proxy-smart login
```

Prints a verification URL (and a user code) to open in a browser, then polls
until you approve. The resulting token (and refresh token, when issued) is cached
and transparently refreshed on later commands.

### `client_credentials` (CI / service accounts)

Set a client secret and `login` automatically uses the `client_credentials`
grant (or pass `--ci` to force it):

```bash
export PROXY_SMART_URL=https://proxy.example.com
export PROXY_SMART_CLIENT_ID=admin-service
export PROXY_SMART_CLIENT_SECRET=...    # provided by CI secrets
proxy-smart smart-apps list --json
```

With a secret present the CLI will even mint a token on demand if none is cached,
so a bare `proxy-smart <command>` works in CI without an explicit `login` step.

### Direct-Keycloak escape hatch (advanced)

For debugging you can bypass the proxy and talk to Keycloak directly. This is
opt-in and requires the realm + Keycloak URL:

```bash
proxy-smart --direct-keycloak --realm app --keycloak-url https://kc.example.com login
# or: PROXY_SMART_DIRECT_KEYCLOAK=1 PROXY_SMART_REALM=app PROXY_SMART_KEYCLOAK_URL=... proxy-smart login
```

Tokens minted this way skip the proxy and may be rejected by its fail-closed
audience checks — use it only when you know you need it.

## Commands

```
login                 Sign in (device flow; client_credentials when a secret is set)
logout                Remove the cached token
whoami                Show the identity behind the cached token

request <METHOD> <path> [--data <json>]
                      Authenticated escape hatch — call any proxy path

smart-apps        list | get <clientId> | create | update <clientId> | delete <clientId>
healthcare-users  list | get <userId> | create | delete <userId>
scope-sets        list | get <id> | create | delete <id>
mcp-endpoint      get | update

shutdown --yes        Gracefully stop the proxy server (POST /admin/shutdown)
restart  --yes        Restart the proxy server (POST /admin/restart)
```

Request bodies are supplied as JSON via `--data`:

- `--data '{"name":"X"}'` — inline JSON
- `--data @file.json` — read from a file
- `--data -` — read from stdin

`list` commands render an aligned table by default; pass `--json` for raw JSON.

### Examples

```bash
proxy-smart login
proxy-smart smart-apps list --json
proxy-smart smart-apps get my-client-id
proxy-smart smart-apps create --data @app.json
proxy-smart scope-sets create --data '{"name":"Reader","scopes":["patient/*.read"]}'
proxy-smart healthcare-users list --limit 50
proxy-smart mcp-endpoint update --data '{"enabled":true,"disabledTools":["delete_admin_smart_apps"]}'
proxy-smart request GET /admin/smart-config
proxy-smart restart --yes
```

## The generated API client

`src/api-client/` is a **generated copy**, produced from the backend's exported
OpenAPI document with the same generator the admin UI uses. Model types are
never hand-rolled.

The generator, `openapi-ts-fetch`, is this repo's own pure-Python tool. It is
installed from PyPI with pip/uv and pinned to `==0.2.2` in CI (it is **not** a
bun/npm package and is not resolved via `bunx` or the GitHub package registry):

```bash
pip install openapi-ts-fetch==0.2.2   # or: uv pip install openapi-ts-fetch==0.2.2
```

Regenerate the client whenever the admin API changes:

```bash
# 1. export the OpenAPI document from the backend
bun run --filter backend export-openapi      # writes backend/dist/openapi.json

# 2. regenerate the scoped client
cd packages/cli && bun run generate
```

The `generate` script scopes the client to the tags the CLI actually drives via
the generator's `--tags` flag (supported by `openapi-ts-fetch==0.2.2`):

```
openapi-ts-fetch ../../backend/dist/openapi.json ./src/api-client \
  --tags smart-apps,healthcare-users,scope-sets,mcp-management,admin
```

It requires `backend/dist/openapi.json` to exist first (step 1 above).

## Why a hand-rolled arg parser?

The command surface is small and well-defined, Bun ships a capable runtime, and
a zero-runtime-dependency CLI binary is faster to start and trivially
reproducible. So instead of pulling in `commander`/`yargs`, argument parsing is a
~100-line, fully unit-tested module (`src/args.ts`). If the command surface grows
substantially, swapping in a commander-style library is a contained change.

## Development

```bash
cd packages/cli
bun run typecheck   # tsc --noEmit
bun run lint        # eslint . (the generated client is ignored)
bun test            # pure unit tests for config, token cache, and auth logic
```
