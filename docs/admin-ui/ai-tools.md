# AI Tools

The AI Tools page manages MCP (Model Context Protocol) servers, the built-in MCP endpoint, and AI skill packages. These tools power the admin AI chat assistant and can be exposed to external MCP clients.

## Accessing

Navigate to **AI Tools** in the admin sidebar. The page has three tabs:

## MCP Servers Tab

Manages connections to external MCP servers that provide additional tools to the AI assistant.

### Server List

Displays all configured MCP servers with:
- Server name and URL
- Type badge — `internal` (from templates) or `external` (dynamically added)
- Connection status — `connected`, `disconnected`, `error`, `unknown`
- Tool count
- Last health check timestamp

### Adding a Server

**From Template Gallery** — Browse pre-configured MCP server templates organized by category (Healthcare, Development, Data, etc.). Click a template to install with pre-filled configuration.

**Custom Server** — Click **Add Server** to configure a custom MCP server:

| Field | Description |
|---|---|
| **Name** | Unique identifier for the server |
| **URL** | MCP server endpoint URL (Streamable HTTP) |
| **Description** | Optional description of the server's capabilities |

### Server Operations

- **Health Check** — Test connectivity and retrieve server capabilities
- **View Tools** — List all tools exposed by the server with their input schemas
- **Refresh All** — Re-check health of all configured servers
- **Delete** — Remove a dynamically added server

### Registry Search

Search the public MCP server registry to discover and install community servers. Results show server name, description, and install action.

### Server Persistence

Server configuration is stored in `mcp.json` alongside the backend. Template servers come from `mcp-server-templates.json`.

## MCP Endpoint Tab

Configures the built-in MCP endpoint that exposes Proxy Smart's own backend tools as an MCP server.

| Setting | Description |
|---|---|
| **Enabled** | Whether the MCP endpoint is active (enabled by default) |
| **Path** | URL path for the endpoint (default: `/mcp`) |

When enabled, external MCP clients (Claude Desktop, Cursor, etc.) can connect to `{BASE_URL}/mcp` and access all admin API tools via the MCP protocol. Authentication uses OAuth Bearer tokens with RFC 9728 discovery.

See [MCP HTTP Server](../MCP_HTTP_SERVER) for protocol details.

## Skills Tab

Manages AI skill packages — structured prompts and tool configurations that enhance the AI assistant's capabilities.

### Installed Skills

Lists currently installed skills with:
- Skill name and description
- Source URL (e.g., GitHub repository)
- Type — `claude-skill` or `custom`
- Install date
- Enabled/disabled toggle

### Adding Skills

**From Registry** — Browse and search the skills.sh registry for community skills. Click install to add a skill.

**Custom Skill** — Create a custom skill with a name and description.

### Deleting Skills

Remove installed skills that are no longer needed. Built-in default skills can be re-installed from the registry.

## API Endpoints

### MCP Servers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/mcp-servers/templates` | List available server templates |
| `GET` | `/admin/mcp-servers/` | List all configured servers |
| `GET` | `/admin/mcp-servers/:name/health` | Check server health |
| `GET` | `/admin/mcp-servers/:name/tools` | List server tools |
| `POST` | `/admin/mcp-servers/refresh` | Refresh all server statuses |
| `POST` | `/admin/mcp-servers/` | Add a new server |
| `PATCH` | `/admin/mcp-servers/:name` | Update server configuration |
| `DELETE` | `/admin/mcp-servers/:name` | Remove a server |
| `GET` | `/admin/mcp-servers/registry/search` | Search public registry |

### MCP Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/mcp-endpoint/` | Get endpoint configuration |
| `PATCH` | `/admin/mcp-endpoint/` | Update endpoint settings |

### Skills

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/ai-tools/skills/` | List installed skills |
| `POST` | `/admin/ai-tools/skills/` | Install a custom skill |
| `DELETE` | `/admin/ai-tools/skills/:name` | Remove a skill |
| `GET` | `/admin/ai-tools/skills/registry/browse` | Browse skill registry |
| `GET` | `/admin/ai-tools/skills/registry/search` | Search skill registry |
| `POST` | `/admin/ai-tools/skills/registry/install` | Install from registry |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | API key for AI model access (enables AI features) | — |
| `AI_TIMEOUT_MS` | AI request timeout in milliseconds | `30000` |
| `MCP_ENDPOINT_ENABLED` | Enable/disable MCP endpoint | `true` |
| `MCP_ENDPOINT_PATH` | URL path for MCP endpoint | `/mcp` |
