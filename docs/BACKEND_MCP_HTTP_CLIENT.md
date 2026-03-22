# Internal MCP HTTP client (backend)

Deprecated: Prefer the new Streamable MCP HTTP Client documented in `docs/BACKEND_MCP_STREAMABLE_CLIENT.md` for new integrations. This legacy client only supports separate request and SSE endpoints.

This module lets the backend AI call a remote MCP server over HTTP using OAuth, without exposing MCP-over-HTTP routes in our server.

Location: backend/src/lib/mcp/http-client.ts

Capabilities
- OAuth discovery: Supports RFC 9728 (resource metadata) and RFC 8414 (AS metadata)
- Grants: client_credentials and token_exchange (with resource/audience)
- Methods:
  - listTools(): Fetches available tools
  - callTool({ name, arguments }): Executes a tool

Configuration
Provide baseUrl of the external MCP server and one of the following:
- discovery.authorizationServer: URL to AS metadata (/.well-known/openid-configuration or oauth-authorization-server)
- discovery.protectedResource: URL to RS metadata (/.well-known/oauth-protected-resource)

Add an OAuth grant:
- client_credentials: clientId, clientSecret (or public client with PKCE/token exchange upstream)
- token_exchange: clientId, clientSecret (optional), subjectToken (incoming access token), resource/audience/scope as needed

Example

import McpHttpClient from '@/lib/mcp/http-client'

const client = new McpHttpClient({
  baseUrl: 'https://external-mcp.example.com',
  discovery: {
    authorizationServer: 'https://auth.example.com/.well-known/openid-configuration',
    // or: protectedResource: 'https://external-mcp.example.com/.well-known/oauth-protected-resource'
  },
  tokenGrant: {
    type: 'client_credentials',
    clientId: process.env.MCP_CLIENT_ID!,
    clientSecret: process.env.MCP_CLIENT_SECRET!,
    scope: 'mcp:tools.read mcp:tools.call' // adjust to server policy
  }
})

const tools = await client.listTools()
const result = await client.callTool({ name: 'searchPatients', arguments: { q: 'doe' } })

Notes
- Tokens are cached in-memory until expiry; reuse client instance per request scope where possible.
- If using token_exchange, pass the subject user's access token and optionally a resource (the MCP server URL) to constrain audience.
- We intentionally do not implement SSE here. If needed later, add a method that creates an EventSource with the same authorizedFetch helper.
