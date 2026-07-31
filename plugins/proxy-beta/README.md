# `proxy-beta` — the public Proxy Smart deployment

A live SMART on FHIR authorization proxy you can point an assistant at right now, with nothing
to deploy. `beta.proxy-smart.com` runs the whole stack — the proxy, Keycloak, and a HAPI FHIR
server with seeded demo data — and this plugin connects to its admin MCP endpoint.

It bundles the **`proxy-smart-beta-tour` skill**: what is in the environment, which of the
seeded clients are worth reading as examples of each SMART app type, and what not to do in a
shared sandbox.

## Demo environment, and only that

The beta is public, shared, and reset without notice. Never put real patient data in it, do not
build anything you intend to keep on it, and expect other people's changes alongside yours. The
credentials documented in this repository are public credentials for this environment; they are
not secrets and must not be reused anywhere else.

For a deployment of your own, install the [`proxy`](../proxy/README.md) plugin instead: same
tools, your instance, plus the onboarding and launch-debugging skills for production work.

## Install — Claude Code

```
/plugin marketplace add Max-Health-Inc/maxhealth.tech
/plugin install proxy-beta@max-health
```

Then restart Claude Code (or `/reload-plugins`). Try it locally first with
`claude --plugin-dir ./plugins/proxy-beta`.

## Install — Codex

```
codex plugin marketplace add Max-Health-Inc/maxhealth.tech
codex plugin add proxy-beta@max-health
```

## Manual MCP config (any MCP client)

```json
{
  "mcpServers": {
    "proxy-smart-beta": { "url": "https://beta.proxy-smart.com/mcp" }
  }
}
```

You sign in on first use. The endpoint discovers its authorization server through RFC 9728, so
a client that can register dynamically runs the flow itself; others can use the pre-registered
`mcp-client`.

## What is in the environment

| | |
| --- | --- |
| Proxy and admin UI | `https://beta.proxy-smart.com` |
| Keycloak | `/auth`, realm `proxy-smart` |
| FHIR | `/proxy-smart-backend/{server}/{version}/`, with per-server `.well-known/smart-configuration` |
| MCP | `/mcp` (Streamable HTTP), tools generated from the admin API |
| Seeded data | Two patients and two practitioners with roughly fifty observations, plus conditions, encounters, medications, allergies, immunizations, procedures, reports, imaging studies, and questionnaires |
| Seeded clients | SMART apps (`patient-portal`, `dicom-viewer`, `consent-app`, `dtr-app`), a backend service (`inferno-backend-services`), and the resource servers that make RFC 8707 audience binding work |
| Compliance | Tested against Inferno's `smart_stu2_2` suite in CI; report under `testing/beta/report` |

The tool surface is the same as any Proxy Smart deployment — see the
[`proxy` plugin README](../proxy/README.md) for the families of tools and the per-server FHIR
endpoint at `/fhir/{server_id}/mcp`.

## Layout

```
plugins/proxy-beta/
├── .claude-plugin/plugin.json      # Claude Code manifest
├── .codex-plugin/plugin.json       # Codex manifest
├── .mcp.json                       # Claude: pinned to https://beta.proxy-smart.com/mcp
├── .mcp.codex.json                 # Codex MCP server config
└── skills/
    └── proxy-smart-beta-tour/SKILL.md
```
