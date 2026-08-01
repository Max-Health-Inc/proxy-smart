# Agent plugins

Claude Code and Codex plugins that connect an assistant to a Proxy Smart deployment's admin
API over MCP. Three of them, differing only in which deployment they point at and who installs
them.

| Plugin | Endpoint | For |
| --- | --- | --- |
| `proxy` | `api.proxy-smart.com/mcp` | the Max Health hosted deployment |
| `proxy-beta` | `beta.proxy-smart.com/mcp` | evaluating, with nothing deployed |
| `proxy-smart` | the customer's own instance | a customer running Proxy Smart |

## Everything here is generated

`plugins/proxy/` and `plugins/proxy-beta/` are BUILD OUTPUT. Editing them is always the wrong
move — the next build overwrites it, and CI (`bun run plugins:check`) fails first. Edit
[`source/`](source/) and rebuild:

```bash
bun run plugins          # rewrite the committed plugin directories
bun run plugins:check    # fail if they are out of date (runs in CI)
```

The reason is the skills. `smart-app-onboarding` and `smart-launch-debugging` are the same in
every plugin, and a `git-subdir` install clones only its own subdirectory — so they cannot be
shared by path, only copied. One copy in `source/skills/` and a build step beats three copies
that drift.

```
source/
├── targets.json                  # per-plugin deltas: endpoint, wording, which skills
├── README.md.tmpl                # the shared README, with __PLACEHOLDERS__
├── skills/                       # bundled by every plugin
│   ├── smart-app-onboarding/
│   └── smart-launch-debugging/
└── skills-beta/                  # bundled by proxy-beta only
    └── proxy-smart-beta-tour/
```

A plugin's README bullet for each skill is read out of that skill's own frontmatter
`description`, so it cannot drift from the skill it describes.

## Building the customer artifact

`proxy-smart` is not committed — it is built per customer against their endpoint and handed
over, because the marketplace it would otherwise come from is a private Max Health repo:

```bash
bun run plugins:customer -- --url https://proxy.their-hospital.example
# -> dist/plugins/proxy-smart/   (self-contained; no marketplace needed)
```

The endpoint is baked into `.mcp.json` so the plugin works as shipped, wrapped in
`${PROXY_SMART_URL:-…}` so they can repoint it without a rebuild. `--out <dir>` writes
somewhere other than `dist/plugins/proxy-smart`.

Only `https` is accepted: the token audience binds to this URL, and an `http` endpoint would
put bearer tokens on the wire.
