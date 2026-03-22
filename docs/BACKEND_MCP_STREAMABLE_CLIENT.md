# Streamable MCP HTTP Client (backend)

This client lets our backend AI call remote MCP servers over a single HTTP endpoint using JSON-RPC with optional Server-Sent Events (SSE) streaming, authenticated via OAuth. It is preferred over the legacy split `/mcp/request` + `/mcp/stream` style.

- Location: `backend/src/lib/mcp/streamable-http-client.ts`
- Transport: POST `${baseUrl}/mcp` with `Accept: application/json` (non-streaming) or `Accept: text/event-stream` (streaming)
- Headers: `Authorization: Bearer <token>`, `MCP-Protocol-Version`, optional `Mcp-Session-Id`
- OAuth discovery: RFC 9728 (resource) and RFC 8414 (authorization server)
- Grants: `client_credentials`, `token_exchange` (supports `resource`, `audience`, `scope`)

## Usage

```ts
import McpStreamableHttpClient from '@/lib/mcp/streamable-http-client'

const client = new McpStreamableHttpClient({
  baseUrl: 'https://external-mcp.example.com',
  discovery: {
    authorizationServer: 'https://auth.example.com/.well-known/openid-configuration',
    // or: protectedResource: 'https://external-mcp.example.com/.well-known/oauth-protected-resource'
  },
  tokenGrant: {
    type: 'client_credentials',
    clientId: process.env.MCP_CLIENT_ID!,
    clientSecret: process.env.MCP_CLIENT_SECRET!,
    scope: 'mcp:tools.read mcp:tools.call'
  },
  protocolVersion: '1.0',
})

// JSON mode
const resp = await client.request({ type: 'callTool', name: 'searchPatients', args: { q: 'doe' } })

// Streaming mode (SSE)
for await (const evt of client.stream({ type: 'callTool', name: 'searchPatients', args: { q: 'doe' } })) {
  if (evt.event === 'message') {
    console.log('chunk', evt.data)
  } else if (evt.event === 'done') {
    break
  }
}
```

## Sessions

Servers can return `Mcp-Session-Id`; the client persists it and will send it back to allow resumable conversations or resource pinning. Call `clearSession()` to reset.

## Errors

- Parses `WWW-Authenticate` to surface realm/scope/resource metadata.
- Retries 5xx with exponential backoff (configurable).
- Timeouts via `requestTimeoutMs`.

## Security Notes

- Avoid exposing streamable MCP endpoints to browsers. If you must, validate `Origin` and bind to `127.0.0.1` in dev.
- Prefer server-side agents to protect secrets.
- Use narrow `scope` and `resource`/`audience` in OAuth grants.

## Elysia Streaming Reference

Elysia supports returning `ReadableStream` directly or wrapping with `sse()`. We refactored `GET /mcp/stream` to use `sse()` for robust formatting and heartbeats.

See Elysia docs: Response Streaming / Server Sent Event.

## Legacy Client

See `docs/BACKEND_MCP_HTTP_CLIENT.md` for the legacy HTTP client. New work should prefer the streamable client documented here.
