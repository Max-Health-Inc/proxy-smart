# AI MCP Integration

This document explains how the AI assistant integrates with the internal MCP (Model Context Protocol) server to execute backend tools.

## Architecture Overview

The system now uses a **direct integration** approach where the AI assistant:
1. Connects to the internal MCP HTTP endpoint (`/mcp`)
2. Discovers available backend tools via `listTools`
3. Executes tools via `callTool` when needed
4. Supports connecting to external MCP servers for additional capabilities

```
┌─────────────────┐
│   AI Assistant  │
│   (ai-mcp.ts)   │
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          │
         v                          v
┌────────────────────┐    ┌──────────────────────┐
│  Internal MCP      │    │  External MCP Server │
│  (mcp-http.ts)     │    │  (Optional)          │
│                    │    │                      │
│  Tools:            │    │  Tools:              │
│  - User mgmt       │    │  - Filesystem        │
│  - App mgmt        │    │  - Database          │
│  - FHIR servers    │    │  - etc.              │
│  - Identity        │    │                      │
└────────────────────┘    └──────────────────────┘
```

## Components

### 1. MCP Client (`lib/ai/mcp-client.ts`)

Provides client classes for connecting to MCP servers:

**`McpClient`** - Single MCP server connection
- `listTools()` - Fetch available tools from server
- `callTool(name, args)` - Execute a tool
- `createInternalClient(token)` - Factory for internal backend connection
- `createExternalClient(url, name, auth?)` - Factory for external servers

**`McpConnectionManager`** - Multi-server aggregation
- `addServer(name, client)` - Register an MCP server
- `getAllTools()` - Aggregate tools from all servers (prefixed by server name)
- `callTool(toolName, args)` - Route execution to correct server
- Tool names are prefixed: `internal-backend__getUserById`, `external-mcp__readFile`

### 2. AI Routes (`routes/admin/ai-mcp.ts`)

**POST `/admin/ai/chat`** - Main chat endpoint

Flow:
1. **Authentication**: Validates Bearer token, extracts user identity
2. **Setup**: Creates `McpConnectionManager`, adds internal + optional external servers
3. **Tool Discovery**: Fetches all tools via `getAllTools()`
4. **AI Execution**: Uses Vercel AI SDK (`streamText`) with OpenAI models
5. **Tool Calling**: AI can call tools; manager routes to correct server
6. **Response**: Returns answer with metadata (tokens, duration, tools used)

Key features:
- User-scoped tools (admin tools only visible to admins)
- OAuth token forwarded for authentication
- Supports multiple MCP servers
- Detailed logging of tool execution
- Error handling with graceful fallbacks

### 3. Internal MCP Server (`routes/admin/mcp-http.ts`)

Exposes backend routes as MCP tools:

**POST `/mcp`** with `{ type: 'listTools' }`
- Extracts tools from Elysia routes (prefixes: `/admin/*`, `/fhir-servers/*`)
- Returns OpenAI function format tools
- Filters by user role (public vs admin scope)

**POST `/mcp`** with `{ type: 'callTool', name, args }`
- Executes the actual route handler
- Returns `{ content: [{ type: 'text', text: '...' }] }`
- Handles authentication via Bearer token
- Enforces scope requirements

**GET `/mcp`** - SSE notifications (optional)
- Server-to-client push notifications
- Fan-out by subject/user

## Configuration

### Environment Variables

```bash
# OpenAI API Key (required for AI assistant)
OPENAI_API_KEY=sk-...

# Optional: External MCP Server URL
MCP_SERVER_URL=http://localhost:8081

# Base URL for internal MCP
BASE_URL=http://localhost:8445

# OAuth/Keycloak settings (for authentication)
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=proxy-smart
# ... other Keycloak settings
```

### Tool Extraction

Tools are auto-generated from backend routes in `tool-registry.ts`:

```typescript
const routeTools = extractRouteTools(appInstance, { 
  prefixes: ['/admin/', '/fhir-servers/'] 
})
```

Each route becomes an MCP tool:
- **Name**: Route path converted to camelCase (e.g., `/admin/users/:id` → `getUserById`)
- **Description**: From route metadata or auto-generated
- **Parameters**: Extracted from TypeBox schemas (path params, query, body)
- **Access**: `public: false` for `/admin/*` routes (requires admin scope)

## Usage Example

### 1. Frontend sends chat request

```typescript
POST /admin/ai/chat
Authorization: Bearer <keycloak-token>
Content-Type: application/json

{
  "message": "List all FHIR servers",
  "model": "gpt-4o-mini",
  "conversationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 2. AI Assistant processes request

```typescript
// Setup MCP connections
const mcpManager = new McpConnectionManager()
mcpManager.addServer('internal-backend', McpClient.createInternalClient(token))

// Discover tools
const tools = await mcpManager.getAllTools()
// Returns: [
//   { function: { name: 'internal-backend__listFhirServers', ... } },
//   { function: { name: 'internal-backend__getUserById', ... } },
//   ...
// ]

// AI generates tool call
const result = await streamText({
  model: openai('gpt-4o-mini'),
  messages: [{ role: 'user', content: 'List all FHIR servers' }],
  tools: { ... }
})

// Tool execution
await mcpManager.callTool('internal-backend__listFhirServers', {})
```

### 3. MCP Server executes tool

```typescript
// POST /mcp
{
  "type": "callTool",
  "name": "listFhirServers",
  "args": {}
}

// Calls GET /admin/fhir-servers route handler
// Returns:
{
  "content": [{
    "type": "text",
    "text": "[{\"id\":\"1\",\"name\":\"Main FHIR\",\"baseUrl\":\"...\"}]"
  }]
}
```

### 4. AI returns response

```json
{
  "answer": "Here are the FHIR servers:\n\n1. **Main FHIR** - http://...",
  "conversationId": "123e4567-e89b-12d3-a456-426614174000",
  "model": "gpt-4o-mini",
  "toolsUsed": [
    {
      "toolName": "internal-backend__listFhirServers",
      "status": "completed",
      "duration": 45
    }
  ],
  "totalDuration": 1234,
  "tokensUsed": {
    "inputTokens": 123,
    "outputTokens": 456,
    "totalTokens": 579
  }
}
```

## Available Backend Tools

Tools extracted from routes (examples):

### User Management (`/admin/users/*`)
- `listUsers` - Get all users
- `getUserById` - Get user by ID
- `createUser` - Create new user
- `updateUser` - Update user
- `deleteUser` - Delete user

### App Management (`/admin/apps/*`)
- `listApps` - Get all registered apps
- `getAppById` - Get app details
- `createApp` - Register new app
- `updateApp` - Update app configuration
- `deleteApp` - Unregister app

### FHIR Servers (`/fhir-servers/*`)
- `listFhirServers` - Get all FHIR servers
- `getFhirServerById` - Get FHIR server details
- `createFhirServer` - Register FHIR server
- `updateFhirServer` - Update FHIR server
- `deleteFhirServer` - Remove FHIR server

### Identity Providers (`/admin/identity-providers/*`)
- `listIdentityProviders` - Get all IdPs
- `getIdentityProviderById` - Get IdP details
- `createIdentityProvider` - Register IdP
- `updateIdentityProvider` - Update IdP config
- `deleteIdentityProvider` - Remove IdP

## Security

### Authentication Flow
1. User authenticates with Keycloak, receives JWT
2. Frontend sends JWT in `Authorization: Bearer <token>` header
3. Backend validates JWT (signature, expiry, audience)
4. JWT forwarded to internal MCP server
5. MCP server validates JWT again, checks scopes
6. Tool execution only if user has required scope

### Scope Requirements
- **Public tools**: No special scope required (e.g., `listFhirServers`)
- **Admin tools**: Requires `admin` scope in JWT (e.g., `createUser`)
- **Insufficient scope**: Returns `insufficient_scope` error per RFC 6750

### Token Validation
Both `ai-mcp.ts` and `mcp-http.ts` validate tokens:
- Signature verification via JWKS
- Expiry check
- Audience claim must match `config.mcp.audience`
- HTTPS enforcement in production

## Adding External MCP Servers

To connect additional MCP servers:

```typescript
// In ai-mcp.ts POST /chat handler
const mcpManager = new McpConnectionManager()

// Internal backend (always added)
mcpManager.addServer('internal-backend', 
  McpClient.createInternalClient(token))

// External filesystem MCP
mcpManager.addServer('filesystem', 
  McpClient.createExternalClient(
    'http://localhost:3000/mcp',
    'filesystem-mcp',
    { token: 'external-api-key' }
  ))

// External database MCP
mcpManager.addServer('database',
  McpClient.createExternalClient(
    'http://localhost:3001/mcp',
    'database-mcp'
  ))

// Tools are prefixed: filesystem__readFile, database__query, etc.
```

## Monitoring & Debugging

### Logging

All tool executions are logged:

```typescript
logger.server.info('Executing MCP tool', {
  tool: 'internal-backend__getUserById',
  args: { id: '123' }
})

logger.server.info('Tool execution completed', {
  tool: 'internal-backend__getUserById',
  duration: 45,
  resultLength: 234
})
```

### Error Handling

Errors are caught and logged with context:

```typescript
logger.server.error('Tool execution failed', {
  tool: 'internal-backend__getUserById',
  duration: 123,
  error: 'User not found'
})
```

### Response Metadata

Each response includes diagnostic info:

```json
{
  "toolsUsed": [...],
  "totalDuration": 1234,
  "tokensUsed": {
    "inputTokens": 123,
    "outputTokens": 456,
    "totalTokens": 579
  },
  "timestamp": "2025-10-29T12:34:56.789Z"
}
```

## Differences from Previous Architecture

### Before (External Proxy)
- AI assistant proxied requests to external Python MCP server
- Backend tools not accessible to AI
- Separate Python implementation required
- Two-hop latency (Backend → Python → AI)

### After (Internal Integration)
- AI assistant calls internal MCP endpoint directly
- All backend routes available as tools
- Single TypeScript codebase
- Single-hop execution (Backend → AI)
- Supports both internal AND external MCP servers

## Future Enhancements

1. **Tool Caching**: Cache tool definitions with TTL
2. **Streaming Responses**: SSE for real-time tool execution updates
3. **Tool Composition**: Chain multiple tools in single request
4. **Context Management**: Maintain conversation history in database
5. **Rate Limiting**: Per-user tool execution limits
6. **Analytics**: Track tool usage, success rates, latency
7. **Tool Descriptions**: Enhanced documentation via JSDoc extraction

## Related Files

- `backend/src/lib/ai/mcp-client.ts` - MCP client implementation
- `backend/src/routes/admin/ai-mcp.ts` - AI assistant routes
- `backend/src/routes/admin/mcp-http.ts` - Internal MCP server
- `backend/src/lib/tool-registry.ts` - Tool extraction from routes
- `backend/src/config.ts` - Configuration (includes `ai.openaiApiKey`)
- `docs/BACKEND_MCP_HTTP_CLIENT.md` - MCP HTTP protocol details

## Testing

### Manual Testing

1. Start backend: `cd backend && bun run dev`
2. Get Keycloak token (admin user)
3. Send chat request:

```bash
curl -X POST http://localhost:8445/admin/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all users in the system",
    "model": "gpt-4o-mini"
  }'
```

### Integration Tests

```typescript
// test/ai-mcp.test.ts
describe('AI MCP Integration', () => {
  it('should discover internal backend tools', async () => {
    const client = McpClient.createInternalClient(token)
    const tools = await client.listTools()
    expect(tools).toContainEqual(
      expect.objectContaining({
        function: expect.objectContaining({
          name: expect.stringContaining('listUsers')
        })
      })
    )
  })

  it('should execute tool and return result', async () => {
    const manager = new McpConnectionManager()
    manager.addServer('internal-backend', 
      McpClient.createInternalClient(token))
    
    const result = await manager.callTool(
      'internal-backend__listFhirServers', 
      {}
    )
    expect(result.content[0].text).toContain('id')
  })
})
```

## Troubleshooting

### "OpenAI API key not configured"
**Solution**: Set `OPENAI_API_KEY` environment variable

### "MCP server internal-backend returned 401"
**Solution**: Check JWT validity, ensure token not expired

### "insufficient_scope" error
**Solution**: User needs `admin` scope in JWT for admin tools

### "Tool execution failed"
**Solution**: Check logs for detailed error, verify route handler works

### Empty tool list
**Solution**: Ensure routes are registered with correct prefixes (`/admin/*`, `/fhir-servers/*`)
