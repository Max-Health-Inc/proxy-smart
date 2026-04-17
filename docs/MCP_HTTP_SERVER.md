# MCP HTTP Server Documentation

This document describes the MCP (Model Context Protocol) HTTP transport implementation in the Proxy Smart backend, following Microsoft's MCP specification and best practices.

## Overview

The MCP HTTP server provides a standards-compliant interface for clients to:
- **Discover available tools** via RFC 9728-aligned OAuth metadata
- **Call tools securely** with OAuth 2.0 bearer token authentication
- **Receive live updates** via Server-Sent Events (SSE) for tool availability changes
- **Manage sessions** with optional state stickiness across requests

### Key Features

- ✅ **OAuth 2.0 Discovery** - RFC 9728/RFC 8414 compliant resource and authorization server metadata
- ✅ **Bearer Token Auth** - Token validation with scope-based access control and role-based authorization
- ✅ **Server-Sent Events** - Real-time notifications for tool list changes and execution status
- ✅ **Session Management** - Optional session stickiness via MCP-Session-Id header
- ✅ **Request Resilience** - Built-in retry logic on 5xx errors and automatic tool cache refresh on 404
- ✅ **Tool Execution Tracking** - Execution timings, status (started/completed/failed), and error details

## Architecture

### Transport Layer

```
┌─────────────────────────────────────────────────────────────┐
│  Client (UI, AI SDK, External Tools)                        │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Bearer Token (OAuth 2.0)
             │
┌────────────▼────────────────────────────────────────────────┐
│  MCP Streamable HTTP Server (/mcp)                         │
│                                                              │
│  POST /mcp  ──► listTools | callTool (JSON or SSE stream)  │
│  GET  /mcp  ──► Optional SSE stream (live updates)         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Extract tools from Elysia route registry
             │
┌────────────▼────────────────────────────────────────────────┐
│  Tool Registry & Executor                                   │
│                                                              │
│  • Extract route schemas (TypeBox)                          │
│  • Validate inputs at runtime                              │
│  • Execute handlers directly                               │
│  • Track execution metrics (duration, status)              │
└─────────────────────────────────────────────────────────────┘
```

### OAuth Discovery Flow

The server exposes RFC 9728-aligned OAuth metadata for secure client discovery:

1. **Protected Resource Metadata** (`/.well-known/oauth-protected-resource`)
   ```json
   {
     "resource": "https://example.com/mcp",
     "authorization_servers": ["https://keycloak.example.com/auth/realms/master"],
     "bearer_methods_supported": ["header"],
     "scopes_supported": ["read:mcp", "execute:mcp"]
   }
   ```

2. **Authorization Server Metadata** (`/.well-known/openid-configuration`)
   - Provides token endpoint, JWKS URI, and supported grant types
   - Clients use this to obtain access tokens

3. **Client Token Acquisition**
   - Client authenticates (e.g., client credentials flow)
   - Obtains access token from authorization server
   - Includes token in Authorization header: `Bearer <access_token>`

## API Endpoints

### POST /mcp

Modern Streamable HTTP endpoint for tool discovery and invocation. Can return simple JSON responses or optionally stream via SSE.

#### Request Body

```typescript
type McpRequest = 
  | { type: 'listTools' }
  | { 
      type: 'callTool'
      name: string              // Tool name to invoke
      args?: Record<string, any> // Tool arguments
      id?: string               // Optional call ID for tracking
    }
```

#### listTools Response

```typescript
{
  tools: [
    {
      type: 'function',
      function: {
        name: string
        description: string
        parameters: object   // JSON Schema of input parameters
        strict?: boolean     // Strict schema validation (OpenAI-compatible)
      }
    }
  ]
}
```

**Example:**
```bash
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"listTools"}'
```

#### callTool Response

```typescript
{
  content: [
    {
      type: 'text',
      text: string  // Tool execution result
    }
  ],
  duration: number  // Execution time in milliseconds
}
```

**Example:**
```bash
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"callTool",
    "name":"get_user_details",
    "args":{"userId":"user123"},
    "id":"call-abc123"
  }'
```

### Error Responses

#### 401 Unauthorized
Token is missing, invalid, or audience doesn't match.

```json
{
  "error": "unauthorized",
  "code": "invalid_audience"
}
```

**WWW-Authenticate Header:**
```
Bearer realm="Proxy Smart MCP", error="invalid_token", 
  resource_metadata="https://example.com/.well-known/oauth-protected-resource"
```

#### 403 Forbidden / Insufficient Scope
User lacks required scope or role.

```json
{
  "error": "insufficient_scope",
  "code": "read:mcp"
}
```

Or:

```json
{
  "error": "forbidden",
  "code": "admin_required"
}
```

#### 404 Tool Not Found
Tool name doesn't exist.

```json
{
  "error": "tool_not_found",
  "code": "get_user_details"
}
```

#### 500 Execution Failed
Tool raised an exception during execution.

```json
{
  "error": "execution_failed",
  "details": "User not found in database"
}
```

### GET /mcp

Optional SSE endpoint for real-time server→client notifications. Clients can subscribe to this to receive live updates about tool changes and execution progress.

#### Headers

```
Accept: text/event-stream
Authorization: Bearer <token>
[Optional] token=<query_param_for_SSE>  // For browsers without custom headers
```

#### Event Types

##### ready
Sent when connection is established.

```json
{
  "event": "ready",
  "data": {
    "sub": "user-id",
    "ts": 1729520000000
  }
}
```

##### ping
Heartbeat to keep connection alive (every 15 seconds).

```json
{
  "event": "ping",
  "data": {}
}
```

##### tools_list_changed
Emitted when the set of available tools changes (e.g., hot reload, dynamic registration).

```json
{
  "event": "message",
  "data": {
    "type": "tools_list_changed",
    "count": 42,
    "hash": "abc123ff",
    "timestamp": "2025-10-21T14:30:00Z"
  }
}
```

Clients should invalidate their tool cache and call `listTools` again.

##### tool_call_started
Emitted when a tool execution begins.

```json
{
  "event": "message",
  "data": {
    "type": "tool_call_started",
    "toolName": "get_user_details",
    "toolCallId": "call-xyz789",
    "timestamp": "2025-10-21T14:30:05Z"
  }
}
```

##### tool_call_completed
Emitted when a tool execution finishes (success or failure).

```json
{
  "event": "message",
  "data": {
    "type": "tool_call_completed",
    "toolName": "get_user_details",
    "success": true,
    "duration": 150,
    "timestamp": "2025-10-21T14:30:05.150Z"
  }
}
```

Or with error:

```json
{
  "event": "message",
  "data": {
    "type": "tool_call_completed",
    "toolName": "delete_resource",
    "success": false,
    "duration": 50,
    "error": "Permission denied: only admins can delete",
    "timestamp": "2025-10-21T14:30:05.050Z"
  }
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  https://example.com/mcp
```

## Client Implementation Guide

### 1. Basic Synchronous Client

```typescript
import McpHttpClient from './mcp-http-client';

const client = new McpHttpClient({
  baseUrl: 'https://example.com',
  discovery: {
    protectedResource: 'https://example.com/.well-known/oauth-protected-resource'
  },
  tokenGrant: {
    type: 'client_credentials',
    clientId: 'my-client',
    clientSecret: 'my-secret'
  }
});

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.map(t => t.name));

// Call a tool
const result = await client.callTool({
  name: 'get_user_details',
  arguments: { userId: 'user123' }
});
console.log('Result:', result);
```

### 2. Streaming Client with Live Updates

```typescript
import McpStreamableHttpClient from './mcp-streamable-http-client';

const client = new McpStreamableHttpClient({
  baseUrl: 'https://example.com',
  discovery: {
    protectedResource: 'https://example.com/.well-known/oauth-protected-resource'
  },
  tokenGrant: {
    type: 'client_credentials',
    clientId: 'my-client',
    clientSecret: 'my-secret'
  },
  requestTimeoutMs: 30000,
  maxRetries: 1
});

// Subscribe to server updates
const sseController = await client.subscribeToUpdates();

// Set up message handler
// (In a real app, integrate with event bus or reactive framework)

// List tools (with automatic caching)
const tools = await client.listTools();

// Call a tool (auto-refresh on 404, then retry)
const result = await client.callTool(
  'get_user_details',
  { userId: 'user123' },
  'call-abc123'  // Optional call ID
);

// Clean up
sseController.abort();
```

### 3. Resilience Patterns

The client implements several resilience strategies:

#### Tool Cache with TTL
```typescript
// Tools are cached for 60 seconds by default
const tools = await client.listTools();
// Subsequent calls within 60s hit the cache

// Manually refresh
await client.refreshTools();
```

#### Automatic Retry on 404
```typescript
// If callTool gets 404 (tool not found):
// 1. Refresh the tools list
// 2. Retry the call once
const result = await client.callTool('some_tool', { ...args });
```

#### SSE-Driven Cache Invalidation
```typescript
// When server emits tools_list_changed:
// Client automatically invalidates cache
// Next listTools() call fetches fresh list
```

#### 5xx Retry with Backoff
```typescript
// On 5xx errors, client retries with exponential backoff
// maxRetries: 1 → max 2 attempts
// Backoff: 2^attempt * 200ms (capped)
```

## Client Authentication & Registration

### OAuth Discovery Flow

MCP clients discover how to authenticate via a two-step metadata chain defined by RFC 9728 and RFC 8414:

```
1. GET /.well-known/oauth-protected-resource
   → Returns: authorization_servers[], resource (canonical URL), scopes_supported

2. GET /.well-known/oauth-authorization-server  (from authorization_servers[0])
   → Returns: authorization_endpoint, token_endpoint, registration_endpoint, ...
```

Both endpoints are served by `backend/src/routes/auth/mcp-metadata.ts` and proxy to Keycloak's actual OIDC configuration.

### Client Registration Priority (MCP Spec)

When an MCP client (e.g. VS Code, Claude Desktop) connects, it resolves a `client_id` in this order:

1. **Pre-registered client** — Client already has a known `client_id` (e.g. hardcoded or from prior registration)
2. **Client ID Metadata Document (CIMD)** — Client sends its `client_id` as a URL (e.g. `https://vscode.dev/mcp-client`); Keycloak fetches the metadata document from that URL and processes the request without prior registration. Requires Keycloak `--features=cimd`.
3. **Dynamic Client Registration (DCR)** — Client calls `registration_endpoint` (`/auth/register`) to auto-register
4. **Prompt user** — Fallback: ask the user to provide a `client_id` manually

Our server advertises both CIMD and DCR via `client_registration_types_supported` in the AS metadata. Keycloak handles CIMD natively (option 2), and our `/auth/register` proxy handles DCR (option 3).

#### CIMD Setup (Keycloak Admin Console)

To enable CIMD for MCP clients like VS Code, configure a client policy in Keycloak:

1. **Enable the feature**: Keycloak must be started with `--features=cimd` (already configured in all deployment compose files and Dockerfile).
2. **Create a Client Profile** (`Realm Settings → Client Policies → Profiles`):
   - Add the `client-id-metadata-document` executor
   - Set **Trusted domains** (e.g. `vscode.dev`, `127.0.0.1`)
   - Set **Restrict same domain**: `OFF` (VS Code uses localhost redirects)
   - Set **Only Allow Confidential Client**: `OFF` (VS Code is a public client)
3. **Create a Client Policy** (`Realm Settings → Client Policies → Policies`):
   - Add the `client-id-uri` condition
   - Set **URI scheme**: `https`
   - Set **Trusted domains**: `vscode.dev` (or whatever MCP clients you support)
   - Associate the profile from step 2

With this configuration, when an MCP client sends `client_id=https://vscode.dev/mcp-client`, Keycloak fetches the metadata and issues tokens without DCR. The resulting JWT is validated identically by the proxy.

### Pre-registered Clients (Keycloak)

| Client ID | Type | Flow | Use Case |
|-----------|------|------|----------|
| `mcp-client` | Public | Authorization Code + PKCE | VS Code, Claude Desktop, browser-based MCP clients |
| `ai-assistant-agent` | Confidential (client-jwt) | Service Account (client_credentials) | Machine-to-machine backend integrations |

**Important:** `ai-assistant-agent` has `standardFlowEnabled: false` and requires client-jwt authentication. It **cannot** be used with VS Code or any browser-based OAuth flow that needs Authorization Code + PKCE.

### VS Code MCP Configuration

VS Code's `.vscode/mcp.json` schema for `http` type servers supports only: `type`, `url`, `headers`, `dev`. There is **no `clientId` field** — VS Code handles OAuth internally.

When connecting to our MCP endpoint, VS Code will:
1. Fetch `/.well-known/oauth-protected-resource` → gets AS URL
2. Fetch `/.well-known/oauth-authorization-server` → gets `registration_endpoint`
3. Call `/auth/register` (DCR) → receives a dynamically registered `client_id`
4. Open browser for Authorization Code + PKCE flow
5. Exchange code for tokens and connect

If DCR fails, VS Code falls back to prompting the user — enter `mcp-client` when asked.

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "proxy-smart": {
      "type": "http",
      "url": "https://your-instance.example.com/mcp"
    }
  }
}
```

### Dynamic Client Registration (DCR)

The `/auth/register` endpoint proxies RFC 7591 requests to Keycloak. Dynamically registered clients appear in Keycloak with auto-generated IDs (e.g., `vscode-copilot-...`). These are public clients with standard flow enabled, suitable for browser-based auth.

DCR is confirmed working on all environments. Existing dynamically registered VS Code clients can be seen in Keycloak's admin console.

### Grant Types by Client

| Grant Type | Client | When Used |
|-----------|--------|-----------|
| `authorization_code` + PKCE | `mcp-client`, DCR clients | Interactive (VS Code, Claude Desktop, browsers) |
| `client_credentials` | `ai-assistant-agent` | M2M backend calls (requires client-jwt assertion) |
| `urn:ietf:params:oauth:grant-type:token-exchange` | Backend internal | Token exchange for downstream FHIR calls |

## Security Considerations

### 1. Token Validation

The server validates all incoming tokens:
- **Signature verification** against JWKS endpoint
- **Audience (aud) claim** must match canonical resource or server URL
- **Expiration (exp)** must be in the future
- **Issued at (iat)** must be reasonable

### 2. Scope-Based Access Control

Tools are exposed via scope claims in the token:
- `read:mcp` - Required to call any tool
- Tool-specific scopes (future): `execute:tool_xyz`

### 3. Role-Based Authorization

Non-public tools require specific roles:
```typescript
if (!meta.public && !isAdmin(jwt)) {
  // Deny access
  return { error: 'forbidden', code: 'admin_required' };
}
```

### 4. CORS & CSP

The server enforces strict CORS policies:
- Only allow requests from trusted origins
- Avoid exposing sensitive error details to clients
- Use CSP headers to prevent XSS

### 5. Rate Limiting (Recommended)

Clients should implement rate limiting:
```typescript
// Example: Token bucket per user per minute
const rateLimit = new Map<string, number>();
if (rateLimit.get(userId) > 100) {
  throw new Error('Rate limit exceeded');
}
```

## Configuration

### Environment Variables

```bash
# OAuth/OIDC
KEYCLOAK_URL=https://keycloak.example.com
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=my-backend-client
KEYCLOAK_CLIENT_SECRET=...

# MCP Server
MCP_CANONICAL_RESOURCE=https://example.com/mcp
MCP_RESOURCE_BASE=https://example.com
MCP_SCOPE_CHALLENGE=read:mcp

# AI/Internal
MONO_MODE=true                    # Use internal Node AI v2
OPENAI_MODEL=gpt-4-turbo         # Or gpt-5-mini, etc.
OPENAI_API_KEY=...
```

### Code Configuration

```typescript
// backend/src/config.ts
export const config = {
  mcp: {
    canonicalResource: process.env.MCP_CANONICAL_RESOURCE,
    resourceBase: process.env.MCP_RESOURCE_BASE,
    scopeChallenge: process.env.MCP_SCOPE_CHALLENGE,
  },
  ai: {
    useInternalAI: process.env.MONO_MODE === 'true',
    useRemoteAI: process.env.MONO_MODE !== 'true',
  }
};
```

## Deployment

### Docker

```dockerfile
# Already included in docker-compose.development.yml
services:
  backend:
    environment:
      - MONO_MODE=true
      - OPENAI_API_KEY=sk-...
    ports:
      - "3000:3000"
    depends_on:
      - keycloak
```

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-smart-mcp
spec:
  selector:
    app: proxy-smart
  ports:
    - port: 443
      targetPort: 3000
      protocol: TCP
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxy-smart
spec:
  replicas: 3
  selector:
    matchLabels:
      app: proxy-smart
  template:
    metadata:
      labels:
        app: proxy-smart
    spec:
      containers:
      - name: backend
        image: proxy-smart-backend:latest
        env:
        - name: MONO_MODE
          value: "true"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai
              key: api-key
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /admin/ai/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /admin/ai/chat
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Testing

### Integration Tests

```bash
# Run full test suite
bun run test:backend

# Run specific MCP tests
bun run test:backend -- --grep "mcp-http"
```

### Manual Testing with cURL

```bash
# 1. Get OAuth token
TOKEN=$(curl -X POST https://keycloak.example.com/auth/realms/master/protocol/openid-connect/token \
  -d "client_id=my-client&client_secret=...&grant_type=client_credentials" \
  | jq -r '.access_token')

# 2. List tools
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"listTools"}'

# 3. Call a tool
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"callTool",
    "name":"get_admin_users",
    "args":{}
  }'

# 4. Stream events
curl -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  https://example.com/mcp
```

## Performance

### Benchmarks

On a modern machine (M1 MacBook), typical latencies:

| Operation | Latency | Notes |
|-----------|---------|-------|
| OAuth discovery | 5–10ms | Cached after first call |
| listTools (cached) | 1–2ms | From in-memory cache |
| listTools (fresh) | 20–50ms | Introspects Elysia routes |
| callTool (simple) | 10–30ms | Depends on tool complexity |
| callTool (w/ network) | 100–500ms | External API calls |
| SSE connection | 5–15ms | Negligible overhead |

### Optimization Tips

1. **Tool Discovery Caching** - Clients cache tools for 60s; adjust as needed
2. **Request Batching** - Group multiple tool calls to reduce latency
3. **Connection Pooling** - Reuse HTTP/2 connections
4. **Token Caching** - Cache access tokens until 30s before expiry

## Troubleshooting

### "Invalid audience" Error

**Cause:** Token's `aud` claim doesn't match `MCP_CANONICAL_RESOURCE` or `MCP_RESOURCE_BASE`.

**Fix:**
```bash
# Check token payload
jwt decode $TOKEN

# Ensure `aud` includes:
# - MCP_CANONICAL_RESOURCE
# - MCP_RESOURCE_BASE
# - Backend URL
```

### 404 Tool Not Found

**Cause:** Tool name is misspelled or tool registration failed.

**Fix:**
```bash
# List available tools
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"listTools"}' | jq '.tools[].function.name'
```

### SSE Connection Drops

**Cause:** Network timeout or server restart.

**Fix:**
- Clients should auto-reconnect with exponential backoff
- Use heartbeat ping to detect stale connections
- Implement health checks in your infrastructure

### "Insufficient Scope" Error

**Cause:** Token lacks required scope.

**Fix:**
```bash
# Re-request token with scope
curl -X POST https://keycloak.example.com/auth/realms/master/protocol/openid-connect/token \
  -d "scope=read:mcp execute:mcp&..." 
```

## References

- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [RFC 9728: OAuth 2.0 Resource Metadata](https://tools.ietf.org/html/rfc9728)
- [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [RFC 7591: OAuth 2.0 Dynamic Client Registration](https://tools.ietf.org/html/rfc7591)
- [OAuth Client ID Metadata Document (CIMD)](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-01.html)
- [RFC 6750: OAuth 2.0 Bearer Token Usage](https://tools.ietf.org/html/rfc6750)
- [Keycloak MCP Integration Guide](https://www.keycloak.org/securing-apps/mcp-authz-server)
- [Microsoft MCP Learn Docs](https://learn.microsoft.com/en-us/semantic-kernel/concepts/mcp/)
- [Elysia Web Framework](https://elysiajs.com/)

## Contributing

To extend the MCP HTTP server:

1. Add new routes under `backend/src/routes/admin/` or `backend/src/routes/`
2. Export route schemas from `backend/src/schemas/`
3. Routes are automatically discovered and exposed via MCP
4. Test with `bun run test:backend`
5. Routes are automatically discovered and exposed via the built-in MCP endpoint

---

**Last Updated:** October 21, 2025  
**Version:** 0.0.1-alpha  
**License:** AGPL-3.0-or-later
