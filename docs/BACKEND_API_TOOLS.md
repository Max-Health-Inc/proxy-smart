# Backend API Tool Integration

The backend auto-generates MCP tools from its Elysia admin API routes and exposes them via the built-in MCP endpoint at `/mcp`.

## Overview

All admin API routes (under `/admin/*`) are automatically discovered at startup and converted into MCP tool definitions. External MCP clients (VS Code, Claude Desktop, etc.) can call these tools after authenticating via OAuth 2.0.

## Architecture

```
┌─────────────────┐
│  MCP Clients    │  (VS Code, Claude Desktop, etc.)
└────────┬────────┘
         │  Streamable HTTP
         ▼
┌─────────────────────────────────────┐
│  Proxy Smart Backend (Elysia/Bun)   │
│                                     │
│  /mcp endpoint                      │
│    ├─ tools/list → auto-generated   │
│    ├─ tools/call → route dispatch   │
│    └─ OAuth 2.0 token validation    │
└─────────────────────────────────────┘
```

## Auto-Generated Tools

At startup, the backend introspects all registered Elysia routes and generates MCP tool definitions including:

- Tool name derived from HTTP method + route path
- Input schema from route validation (body, params, query)
- Description from route metadata

### Example Tools

| Tool | Route | Purpose |
|------|-------|---------|
| `list_healthcare_users` | `GET /admin/healthcare-users` | Get all users |
| `get_healthcare_user` | `GET /admin/healthcare-users/:userId` | Get user details |
| `create_healthcare_user` | `POST /admin/healthcare-users` | Create new user |
| `list_smart_apps` | `GET /admin/smart-apps` | Get all registered SMART apps |
| `list_fhir_servers` | `GET /admin/dicom-servers` | Get all FHIR/DICOM servers |
| `list_roles` | `GET /admin/roles` | Get all available roles |

## Regenerating Tools

When backend API routes change, tools are regenerated automatically on next startup. To export the OpenAPI spec:

```bash
cd backend && bun run export-openapi
```

The generated spec can also be used by `bun run generate:ui` to regenerate the frontend API client.

## Security

- All MCP tool calls require a valid OAuth 2.0 access token
- Tokens are validated against Keycloak (JWT signature + claims)
- Scope-based access control restricts which tools a client can invoke
- Rate limiting is applied per-client

## Client Configuration

See [MCP HTTP Server](./MCP_HTTP_SERVER.md) for full client setup (VS Code, Claude Desktop, etc.).
