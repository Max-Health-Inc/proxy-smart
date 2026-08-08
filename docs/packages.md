# Packages

Four packages are published from this repository. Each one exists because something in the platform was worth using without the platform.

| Package | What it owns | Reference |
|---|---|---|
| `@proxy-smart/auth` | The SMART authorization layer: launch context, session handling, scope gating, token enrichment | [README](https://github.com/Max-Health-Inc/proxy-smart/blob/main/packages/auth/README.md) |
| `@max-health-inc/elysia-mcp` | Deriving MCP tools and resources from an Elysia route table, and executing them back through it | [README](https://github.com/Max-Health-Inc/proxy-smart/blob/main/packages/elysia-mcp/README.md) |
| `@proxy-smart/app-store` | Visibility and publication state for the app catalog | [README](https://github.com/Max-Health-Inc/proxy-smart/blob/main/packages/app-store/README.md) |
| `@proxy-smart/cli` | The `proxy-smart` admin CLI, and the OAuth and config machinery behind it | [README](https://github.com/Max-Health-Inc/proxy-smart/blob/main/packages/cli/README.md) |

The backend is the first consumer of the first three, not their owner. That distinction is what keeps them honest: `@proxy-smart/auth` is framework-agnostic and IdP-pluggable because it has to work without Elysia and without Keycloak, and `@max-health-inc/elysia-mcp` deliberately stops short of the HTTP edge, which hosts serve with `@maxhealth.tech/mcp-http` instead.

## Where the boundaries fall

`@proxy-smart/auth` holds the part of SMART App Launch that a general-purpose identity provider does not do: establishing a patient and encounter in context, resolving a `fhirUser`, and narrowing scopes to a compartment. It sits in front of an IdP that handles identity well rather than replacing one. Every handler takes plain parameters and returns a description of what the caller should do, so the web framework stays outside the package.

`@max-health-inc/elysia-mcp` treats an existing typed route table as the tool catalog it already structurally is. Routes stay the single source of truth, which is why a route added to the admin API is a tool without anyone declaring it twice.

`@proxy-smart/app-store` is small and exists for one reason: apps arrive in the catalog by two different routes, keyed two different ways, and the rule for hiding one is not the rule for hiding the other. Keeping that in a package keeps the distinction in one place.

`@proxy-smart/cli` is a binary first, but its entry point re-exports the pieces it is built from, so a deploy script can reuse the config resolution and token handling instead of shelling out.

## Versioning

All four version in lockstep with the platform. See [Version Management](./tutorials/version-management.md) for how the version is set and which branch produces which release type.
