# `proxy` — administer a SMART on FHIR proxy from the conversation

Proxy Smart sits between SMART apps and FHIR servers and handles OAuth 2.0 and SMART App
Launch 2.2.0. This plugin connects an assistant to a deployment's admin API so onboarding an
app and debugging a failed launch happen in the conversation rather than in the Keycloak
console. It bundles:

- **The `smart-app-onboarding` skill** — which combination of app type, client authentication,
  PKCE, scopes, scope sets, FHIR server access, organizations, and audience mappers is actually
  correct for the app being registered, and how to verify it afterwards.
- **The `smart-launch-debugging` skill** — locating which of the four stages (authorize, login,
  token, FHIR call) a launch stopped at, and the causes specific to each.
- **The deployment's MCP server** — a Streamable HTTP endpoint at `/mcp` whose tools are
  generated from the backend's admin routes, so the tool surface is whatever that deployment
  exposes rather than a fixed list.

## Point it at your deployment

Proxy Smart is self-hosted: there is no single hosted endpoint, because the whole product is
the instance you run. Set `PROXY_SMART_URL` before installing, and the plugin builds the
endpoint from it:

```bash
export PROXY_SMART_URL=https://proxy.your-hospital.example
```

There is deliberately no default. A default would have to be a demo environment, and an
assistant silently administering someone else's demo instead of your deployment is a worse
outcome than a server that reports an unset variable. To explore Proxy Smart without deploying
one, install [`proxy-beta`](../proxy-beta/README.md), which is pinned to the public beta and
says what that environment is for.

You sign in on first use. The endpoint is OAuth-protected and discovers its authorization
server through RFC 9728, so a plugin-aware client runs the flow itself; clients that cannot
register dynamically can use the pre-registered `mcp-client`. Tools are admin-scoped, so the
account you sign in with decides what the assistant can do — read-only accounts get a
read-only assistant.

## Install — Claude Code

```
/plugin marketplace add Max-Health-Inc/maxhealth.tech
/plugin install proxy@max-health
```

Then restart Claude Code (or `/reload-plugins`). Try it locally first with
`claude --plugin-dir ./plugins/proxy`.

## Install — Codex

```
codex plugin marketplace add Max-Health-Inc/maxhealth.tech
codex plugin add proxy@max-health
```

`marketplace add` registers the source; `plugin add` installs the plugin (`proxy@max-health` =
the `proxy` plugin from the `max-health` marketplace). Restart Codex after installing.

## Manual MCP config (any MCP client)

```json
{
  "mcpServers": {
    "proxy-smart": { "url": "https://your-instance.example.com/mcp" }
  }
}
```

## What the server exposes

Tools are derived from the Elysia admin routes at startup, so they track the deployment's own
API rather than a hand-maintained list. The naming is `<verb>_<path>`, giving
`get_admin_smart-apps`, `create_admin_smart-apps`, `update_admin_smart-apps_clientId`, and so
on. The families:

| Area | Covers |
| --- | --- |
| SMART apps | Register, read, update, delete OAuth clients and their SMART configuration |
| Scopes and scope sets | SMART scopes, batch creation, reusable scope profiles |
| Healthcare users | Users, realm and client roles, federated identities |
| FHIR and DICOM servers | Registered servers and their access rules |
| Organizations | Keycloak Organizations, membership, per-tenant branding |
| Identity providers | External IdPs and their mappers |
| Access control | SMART access control and client policies |
| MCP endpoint | Which of the above tools the endpoint exposes |

Which tools are actually reachable is configurable per deployment: the endpoint supports an
allowlist or a blocklist, and read-only GET routes can additionally be exposed as MCP
resources. An administrator can narrow the surface without changing this plugin.

Each FHIR server can also serve its own scoped endpoint at `/fhir/{server_id}/mcp`, exposing
`fhir_read`, `fhir_search`, `fhir_create`, and `fhir_update` for that server, gated by the
signed-in user's SMART scopes. Add it as a second entry when you want an assistant working
against FHIR data rather than against the deployment's configuration.

## Layout

```
plugins/proxy/
├── .claude-plugin/plugin.json      # Claude Code manifest
├── .codex-plugin/plugin.json       # Codex manifest
├── .mcp.json                       # Claude: { mcpServers: { proxy-smart: { type: http, url } } }
├── .mcp.codex.json                 # Codex MCP server config
└── skills/
    ├── smart-app-onboarding/SKILL.md
    └── smart-launch-debugging/SKILL.md
```

Learn more:
[Proxy Smart documentation](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/index.md) ·
[MCP HTTP server](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/MCP_HTTP_SERVER.md) ·
[Backend API tools](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/BACKEND_API_TOOLS.md)
