# @max-health-inc/elysia-mcp

Derives MCP tools and resources from an Elysia app's route table, and executes them back through that app.

An admin API that already exists as typed Elysia routes is, structurally, already a tool catalog: each route has a name, an input schema, and a handler. This package reads that route table rather than asking you to declare the same thing twice. Routes stay the single source of truth, and a route added tomorrow is a tool tomorrow.

The HTTP edge is deliberately not here. Hosts serve MCP with `@maxhealth.tech/mcp-http`, which tracks the protocol through the SDK; this package only bridges Elysia to it.

## Install

```bash
bun add @max-health-inc/elysia-mcp
```

```ts
import { extractRouteTools, executeTool } from '@max-health-inc/elysia-mcp'

const tools = extractRouteTools(app, { prefixes: ['/admin/'] })
const meta = tools.get('create_admin_users')
await executeTool('create_admin_users', meta, args, token, decorators)
```

Subpath entries expose the pieces individually: `./introspect`, `./transport`, `./typebox-schema`.

## Introspection

`extractRouteTools(app, options?)` returns a `Map<string, ToolMetadata>` keyed by generated tool name. It reads Elysia's internal `routes` array, pulling path, method, body/query/params schemas, the handler reference, and the route's `meta.public` flag. `HEAD` and `OPTIONS` are skipped; `GET` routes are marked `readOnly` and take their input schema from `query` rather than `body`.

`extractRouteResources(app, options?)` returns a `Map<string, ResourceMetadata>` covering `GET` routes only. Static paths become fixed-URI resources and parameterized paths become URI templates, with the parameter names collected into `pathParams`.

`IntrospectOptions` controls both. `prefixes` limits which routes are considered and defaults to `['/admin/', '/api/']`, so nothing is exposed merely by existing. `toolNameGenerator` and `resourceNameGenerator` override the naming functions below.

## Naming

`pathToToolName(path, method)` prefixes the flattened path with a verb derived from the method: `GET` becomes `get`, `POST` becomes `create`, `PUT` and `PATCH` become `update`, `DELETE` becomes `delete`. Slashes become underscores and `:` is stripped from parameters. Hyphens in a path segment survive.

| Method | Path | Tool name |
|---|---|---|
| `GET` | `/admin/healthcare-users` | `get_admin_healthcare-users` |
| `GET` | `/admin/healthcare-users/:userId` | `get_admin_healthcare-users_userId` |
| `POST` | `/admin/healthcare-users` | `create_admin_healthcare-users` |
| `PUT` | `/admin/smart-apps/:clientId` | `update_admin_smart-apps_clientId` |
| `DELETE` | `/admin/roles/:roleName` | `delete_admin_roles_roleName` |

`pathToResourceName(path)` is different in two ways, because a resource name reads as a noun rather than an action: parameters become `by_<name>` and hyphens become underscores. `/admin/roles/:roleName` yields `admin_roles_by_roleName`.

`pathToResourceUri(path, scheme?)` produces the RFC 6570 URI template, turning `:param` into `{param}`. With scheme `proxy-smart`, `/admin/roles/:roleName` yields `proxy-smart://admin/roles/{roleName}`.

## Annotations

`annotationsForMethod(method)` maps REST semantics onto the MCP `ToolAnnotations` flags:

| Method | readOnly | destructive | idempotent |
|---|---|---|---|
| `GET` | yes | — | yes |
| `DELETE` | no | yes | yes |
| `PUT` | no | no | yes |
| `PATCH` | no | no | no |
| `POST` | no | no | no |

`DELETE` is idempotent as well as destructive, since deleting an already-deleted thing leaves the same state. `openWorldHint` is false for every route: these tools act on the app's own admin surface, a closed domain.

These are advisory hints a client may use to shape its UX, such as confirming before a destructive call. They are not a security boundary, and nothing enforces them.

## Schema conversion

`typeboxToSchema(schema)` converts a TypeBox schema into the Standard Schema the MCP SDK's `registerTool` accepts. TypeBox schemas are already valid JSON Schema carrying extra Symbol metadata, so the conversion is a JSON roundtrip (which strips the symbols) followed by a handoff to `fromJsonSchema`. There is nothing to translate field by field. It returns `undefined` for anything that is not an object type, so a caller registers the tool with no input schema rather than a broken one.

`getMergedInputSchema(meta)` flattens a route's body and path-params schemas into one object, because an MCP client sees a single flat argument object with no notion of where a value rides in the HTTP request. Path params win on key collision and are always required; the merged `required` array is the union of both.

## Execution

`executeTool(toolName, meta, args, authToken?, contextDecorators?)` validates `args` against the merged schema and then runs the route one of two ways.

**Pipeline dispatch** is used when an Elysia app is supplied through the `DISPATCH_APP_KEY` (`__app`) context decorator. The call is turned back into an HTTP `Request` and sent through `app.handle()`, which runs the full Elysia lifecycle: `beforeHandle` guards, response-schema coercion, and `onAfterResponse` hooks such as audit logging. Pass the **root** app so global plugins and route prefixes resolve.

**Synthetic context** is the fallback when no app reference is present. A hand-built Elysia-like context goes straight to the handler, which bypasses guards, response schemas, and lifecycle hooks. It exists only for environments that cannot dispatch through an app, and it is not the path to use when authorization lives in a guard.

`executeResource` follows the same shape for resource reads.

## CORS

Streamable HTTP has a header contract a host's CORS layer has to honour, and getting it wrong fails browser clients at preflight rather than at call time.

`MCP_REQUEST_HEADERS` lists what belongs in `Access-Control-Allow-Headers`: `Mcp-Session-Id`, `Mcp-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, and `Last-Event-ID`. `Mcp-Method` and `Mcp-Name` became required of clients in MCP 2026-07-28 so intermediaries can route without parsing the JSON-RPC body, which means every conformant browser client sends them and any server omitting them fails that client's preflight.

`MCP_EXPOSED_RESPONSE_HEADERS` lists what belongs in `Access-Control-Expose-Headers`, which the allow-list does not grant. It is deliberately short: only `Mcp-Protocol-Version`. `Mcp-Session-Id` was here while the server was stateful and had to be echoed by the client; statelessly there is no session id to emit, so exposing it advertised a header that is never sent.

## Types

`ToolMetadata` carries a route's `path`, `method`, `handler`, its `schema` and `paramsSchema`, and the `public`, `readOnly` and `annotations` flags. `ResourceMetadata` is the `GET`-only equivalent, adding `pathParams`. `ToolAnnotations` is the MCP annotations object described above.

## Related

- [MCP HTTP Server](https://max-health-inc.github.io/proxy-smart/MCP_HTTP_SERVER) documents the transport and client setup.
- [Backend API Tools](https://max-health-inc.github.io/proxy-smart/BACKEND_API_TOOLS) covers how the proxy-smart backend wires this package up.
