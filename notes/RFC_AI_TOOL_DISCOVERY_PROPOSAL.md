# RFC Extension Proposal: OAuth 2.0 AI Tool Discovery for Autonomous Clients

**Status:** Draft Proposal  
**Authors:** Proxy Smart Team (Max Health Inc)  
**Date:** 2026-03-14  
**Target:** IETF OAuth Working Group / MCP Specification  

---

## Abstract

This document proposes extensions to existing OAuth 2.0 specifications (RFC 9728, RFC 8414, RFC 7591) that enable autonomous AI clients — including on-device LLMs, SMART on FHIR agents, and dynamically registered applications — to discover available AI tools (MCP servers, skill packages) through standard OAuth metadata mechanisms.

The proposal introduces no new protocols. It extends three existing RFCs with registered metadata fields and defines a new Well-Known URI (`/.well-known/ai-tools-configuration`) that follows the pattern established by SMART App Launch's `/.well-known/smart-configuration`.

---

## 1. Problem Statement

### 1.1 The Discovery Gap

The current OAuth + MCP stack provides a robust chain for authentication discovery:

```
Client → /.well-known/oauth-protected-resource  (RFC 9728)
       → discovers authorization_servers[]
       → /.well-known/oauth-authorization-server  (RFC 8414)
       → discovers token_endpoint, registration_endpoint, etc.
       → authenticates, obtains access token
       → ... now what?
```

After authentication, there is **no standardized mechanism** for a client to discover:

1. What AI tool servers (MCP endpoints) are available
2. What protocols those servers support (MCP Streamable HTTP, SSE, etc.)
3. What scopes are required to invoke tools
4. What skill packages or prompt templates exist
5. Which tools are recommended for this specific client

### 1.2 Target Scenarios

| Scenario | Client Type | Problem |
|----------|-------------|---------|
| On-device LLM (phone/edge) | Public client (PKCE) | Doesn't know what tools exist at the resource server |
| Autonomous agent self-registering | Dynamic registration (RFC 7591) | Registration response carries no AI capability info |
| Claude Desktop / MCP client | Bearer token via RFC 9728 | Discovers auth endpoints but not tool catalog |
| SMART on FHIR AI assistant | Standalone launch app | Has FHIR context but no tool discovery |

### 1.3 What This Does NOT Do

This proposal is a **discovery mechanism, not an enforcement mechanism**.

Just as `.well-known/smart-configuration` tells a client which FHIR endpoints exist without preventing the client from calling arbitrary URLs, `ai-tools-configuration` tells a client which AI tools are available without constraining what the client's LLM actually invokes.

Enforcement remains at the token/scope level: if a client doesn't have the required scope (e.g., `tools:execute`), the MCP endpoint returns `403 Forbidden` regardless of what the LLM attempts.

The discovery layer serves as a **curated recommendation** — an orchestration layer or system prompt can read it at startup to load the right tools. The LLM can still call whatever it wants; it just now knows what's available.

---

## 2. Prior Art & Standards Alignment

| Standard | Relationship |
|----------|-------------|
| **RFC 9728** (Protected Resource Metadata) | Extended with `ai_tools_configuration` link |
| **RFC 8414** (AS Metadata) | Unchanged — already discoverable via RFC 9728 |
| **RFC 7591** (Dynamic Client Registration) | Extended with AI capability negotiation fields |
| **SMART App Launch 2.2** | Pattern followed: `.well-known/smart-configuration` → `.well-known/ai-tools-configuration` |
| **MCP Specification** | Already uses RFC 9728 for auth discovery — tool discovery is the natural next step |
| **RFC 8707** (Resource Indicators) | Complementary — `resource` parameter scopes tokens to specific tool servers |

---

## 3. Specification

### 3.1 Extension to RFC 9728 — Protected Resource Metadata

Add the following OPTIONAL metadata fields to the Protected Resource Metadata response at `/.well-known/oauth-protected-resource`:

```json
{
  "resource": "https://proxy.example.com",
  "authorization_servers": [
    "https://keycloak.example.com/realms/proxy-smart"
  ],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["backend:read", "backend:write"],

  "ai_tools_configuration": "https://proxy.example.com/.well-known/ai-tools-configuration",
  "ai_capabilities_supported": ["mcp-streamable-http", "mcp-sse", "function-calling"],
  "ai_tool_scopes_supported": ["tools:read", "tools:execute"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ai_tools_configuration` | URI (OPTIONAL) | URL of the AI Tools Configuration document. If present, clients SHOULD fetch this to discover available tools. |
| `ai_capabilities_supported` | Array of String (OPTIONAL) | AI tool protocols supported by this resource server. Defined values: `mcp-streamable-http`, `mcp-sse`, `function-calling`, `a2a`. |
| `ai_tool_scopes_supported` | Array of String (OPTIONAL) | OAuth scopes that control AI tool access. Clients SHOULD request these scopes during authorization. |

This follows RFC 9728 Section 3: *"Additional metadata parameters MAY also be used."*

### 3.2 New Well-Known URI: `/.well-known/ai-tools-configuration`

#### 3.2.1 Public Access (No Token)

When fetched without a Bearer token, the endpoint returns the **public tool catalog** — all tools that are publicly discoverable:

```json
{
  "version": "1.0.0",
  "tools_endpoint": "https://proxy.example.com/mcp",
  "protocols_supported": ["mcp-streamable-http-2025-03-26"],
  "authentication_methods_supported": ["bearer"],
  "tool_scopes_supported": ["tools:read", "tools:execute"],

  "servers": [
    {
      "name": "fhir-tools",
      "url": "https://proxy.example.com/mcp/fhir",
      "description": "FHIR resource query and write operations",
      "protocol": "mcp-streamable-http",
      "scopes_required": ["tools:execute", "patient/*.read"],
      "tool_count": 12,
      "categories": ["clinical", "fhir"]
    },
    {
      "name": "clinical-reasoning",
      "url": "https://proxy.example.com/mcp/clinical",
      "description": "Clinical decision support and care gap analysis",
      "protocol": "mcp-streamable-http",
      "scopes_required": ["tools:execute"],
      "tool_count": 5,
      "categories": ["clinical", "cds"]
    }
  ],

  "skills": [
    {
      "name": "fhir-helper",
      "description": "FHIR query builder and resource navigator",
      "type": "prompt-template",
      "source_url": "https://github.com/example/fhir-helper-skill"
    }
  ]
}
```

#### 3.2.2 Authenticated Access (With Bearer Token)

When fetched with a valid Bearer token, the endpoint returns a **client-scoped view** — filtered by the client's configured permissions (stored as Keycloak client attributes in this reference implementation):

```json
{
  "version": "1.0.0",
  "client_id": "clinical-ai-assistant",
  "tools_endpoint": "https://proxy.example.com/mcp",
  "protocols_supported": ["mcp-streamable-http-2025-03-26"],

  "servers": [
    {
      "name": "fhir-tools",
      "url": "https://proxy.example.com/mcp/fhir",
      "description": "FHIR resource query and write operations",
      "protocol": "mcp-streamable-http",
      "scopes_required": ["tools:execute", "patient/*.read"],
      "tool_count": 12,
      "assigned": true
    }
  ],

  "skills": [
    {
      "name": "fhir-helper",
      "description": "FHIR query builder and resource navigator",
      "type": "prompt-template",
      "assigned": true
    }
  ]
}
```

The `assigned` field indicates whether this tool/skill was explicitly assigned to this client by an administrator. Clients MAY use this to prioritize tool loading.

#### 3.2.3 Field Definitions

**Top-Level Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | String | REQUIRED | Schema version (semver) |
| `client_id` | String | OPTIONAL | Present only in authenticated responses. The `azp` or `client_id` from the token. |
| `tools_endpoint` | URI | OPTIONAL | Base URL for MCP tool invocation |
| `tool_discovery_endpoint` | URI | OPTIONAL | Endpoint that returns tool definitions (e.g., MCP `listTools`) |
| `protocols_supported` | Array of String | REQUIRED | Supported tool protocols with version identifiers |
| `authentication_methods_supported` | Array of String | REQUIRED | How to authenticate tool calls (`bearer`, `dpop`, `mtls`) |
| `tool_scopes_supported` | Array of String | OPTIONAL | OAuth scopes relevant to tool access |
| `servers` | Array of Server | OPTIONAL | Available MCP server endpoints |
| `skills` | Array of Skill | OPTIONAL | Available skill packages / prompt templates |

**Server Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | REQUIRED | Unique server identifier |
| `url` | URI | REQUIRED | MCP server endpoint URL |
| `description` | String | OPTIONAL | Human-readable description |
| `protocol` | String | REQUIRED | Protocol identifier (e.g., `mcp-streamable-http`) |
| `scopes_required` | Array of String | OPTIONAL | Scopes needed to call tools on this server |
| `tool_count` | Integer | OPTIONAL | Number of tools available |
| `categories` | Array of String | OPTIONAL | Tool categories for filtering |
| `assigned` | Boolean | OPTIONAL | Whether this server is assigned to the authenticated client |

**Skill Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | REQUIRED | Unique skill identifier |
| `description` | String | OPTIONAL | Human-readable description |
| `type` | String | REQUIRED | Skill type (`prompt-template`, `claude-skill`, `custom`) |
| `source_url` | URI | OPTIONAL | Source repository or documentation URL |
| `assigned` | Boolean | OPTIONAL | Whether this skill is assigned to the authenticated client |

### 3.3 Extension to RFC 7591 — Dynamic Client Registration

Add OPTIONAL fields to the registration request and response.

#### 3.3.1 Registration Request Extensions

```json
{
  "redirect_uris": ["http://localhost:8080/callback"],
  "client_name": "Clinical AI Assistant",
  "grant_types": ["authorization_code"],
  "scope": "openid fhirUser patient/*.read tools:execute",

  "ai_capabilities_requested": ["mcp-streamable-http"],
  "ai_tool_categories_requested": ["clinical", "fhir"],
  "ai_agent_type": "autonomous-llm"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ai_capabilities_requested` | Array of String (OPTIONAL) | Tool protocols the client supports |
| `ai_tool_categories_requested` | Array of String (OPTIONAL) | Categories of tools the client wants access to |
| `ai_agent_type` | String (OPTIONAL) | Type of AI agent. Values: `autonomous-llm`, `human-supervised`, `backend-service`, `interactive-assistant` |

#### 3.3.2 Registration Response Extensions

```json
{
  "client_id": "smart_app_abc123",
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": "openid fhirUser patient/*.read tools:execute",

  "ai_capabilities_granted": ["mcp-streamable-http"],
  "ai_tools_configuration": "https://proxy.example.com/.well-known/ai-tools-configuration",
  "ai_tool_servers_granted": ["fhir-tools"],
  "ai_tool_count": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ai_capabilities_granted` | Array of String (OPTIONAL) | Protocols actually available to this client |
| `ai_tools_configuration` | URI (OPTIONAL) | URL to fetch client-specific tool configuration |
| `ai_tool_servers_granted` | Array of String (OPTIONAL) | Names of MCP servers assigned to this client |
| `ai_tool_count` | Integer (OPTIONAL) | Total number of tools available |

---

## 4. Complete Discovery Flow

### 4.1 Autonomous On-Device LLM (Public Client)

```
┌─────────────────────┐
│  On-Device LLM      │  Knows: resource server URL
│  (Public Client)    │  Has: Nothing yet
└─────────┬───────────┘
          │
          │ ① GET /.well-known/oauth-protected-resource
          ▼
┌─────────────────────┐
│  Resource Server    │  Returns: authorization_servers[]
│  (Proxy Smart)      │           ai_tools_configuration URL
└─────────┬───────────┘
          │
          │ ② GET /.well-known/oauth-authorization-server
          ▼
┌─────────────────────┐
│  Authorization      │  Returns: registration_endpoint
│  Server (Keycloak)  │           token_endpoint
└─────────┬───────────┘
          │
          │ ③ POST /auth/register  (RFC 7591)
          │    { ai_capabilities_requested, ai_agent_type }
          ▼
┌─────────────────────┐
│  Registration       │  Returns: client_id
│  Endpoint           │           ai_capabilities_granted
└─────────┬───────────┘           ai_tools_configuration
          │
          │ ④ OAuth 2.0 Authorization Code + PKCE
          │    scope: "openid tools:execute patient/*.read"
          ▼
┌─────────────────────┐
│  Token Endpoint     │  Returns: access_token
└─────────┬───────────┘           (with tools:execute scope)
          │
          │ ⑤ GET /.well-known/ai-tools-configuration
          │    Authorization: Bearer <token>
          ▼
┌─────────────────────┐
│  AI Tools Config    │  Returns: filtered server list
│  (client-scoped)    │           assigned skills
└─────────┬───────────┘           protocol info
          │
          │ ⑥ POST /mcp/fhir  (MCP Streamable HTTP)
          │    { type: "listTools" }
          │    { type: "callTool", name: "...", args: {...} }
          ▼
┌─────────────────────┐
│  MCP Tool Server    │  Validates scope, executes tool
└─────────────────────┘
```

### 4.2 Pre-Registered SMART App

For apps already registered via the admin UI, the flow is simpler — skip steps ② and ③ since the client already has credentials:

```
① GET /.well-known/oauth-protected-resource
④ OAuth flow (already has client_id)
⑤ GET /.well-known/ai-tools-configuration (with token)
⑥ MCP tool calls
```

### 4.3 MCP Client (Claude Desktop)

MCP clients already implement steps ① and ② per the MCP spec. This proposal adds step ⑤:

```
① GET /.well-known/oauth-protected-resource  (already implemented)
② GET /.well-known/oauth-authorization-server  (already implemented)
④ OAuth flow  (already implemented)
⑤ GET /.well-known/ai-tools-configuration  (NEW)
⑥ MCP Streamable HTTP  (already implemented)
```

---

## 5. Security Considerations

### 5.1 Tool Catalog Is Not Access Control

The `ai-tools-configuration` endpoint provides **discovery only**. Even if a tool is listed in the catalog, the MCP server MUST independently validate the bearer token's scopes before executing any tool call. Omitting a tool from the catalog does not constitute a security boundary.

### 5.2 Public vs Authenticated Catalogs

Servers MAY return different catalogs based on authentication status:
- **Unauthenticated**: Public tools only (useful for discovery before login)
- **Authenticated**: Client-scoped catalog filtered by admin assignments

Servers SHOULD NOT include sensitive tool descriptions or internal URLs in the unauthenticated response.

### 5.3 Rate Limiting

The `ai-tools-configuration` endpoint SHOULD be rate-limited, especially for unauthenticated access, to prevent catalog enumeration attacks.

### 5.4 Agent Type Disclosure

The `ai_agent_type` field in dynamic registration is self-declared and MUST NOT be trusted for security decisions. It is informational metadata for admin dashboards and audit logs.

### 5.5 CORS

The `ai-tools-configuration` endpoint SHOULD support CORS with `Access-Control-Allow-Origin: *` for public access, following the same model as `.well-known/smart-configuration` (SMART App Launch 2.2 §2.1).

---

## 6. IANA Considerations

### 6.1 Well-Known URI Registration

Register `ai-tools-configuration` in the IANA "Well-Known URIs" registry:

| Field | Value |
|-------|-------|
| URI suffix | `ai-tools-configuration` |
| Change controller | IETF |
| Reference | This document |
| Status | permanent |

### 6.2 OAuth Protected Resource Metadata Registry

Register the following in the "OAuth Protected Resource Metadata" registry established by RFC 9728:

- `ai_tools_configuration`
- `ai_capabilities_supported`
- `ai_tool_scopes_supported`

### 6.3 OAuth Dynamic Client Registration Metadata Registry

Register the following in the "OAuth Dynamic Client Registration Metadata" registry established by RFC 7591:

- `ai_capabilities_requested`
- `ai_capabilities_granted`
- `ai_tool_categories_requested`
- `ai_agent_type`
- `ai_tool_servers_granted`
- `ai_tool_count`

---

## 7. Reference Implementation

This proposal is implemented as part of the Proxy Smart platform:

- **Repository:** `Max-Health-Inc/proxy-smart`
- **Protected Resource Metadata:** `backend/src/routes/auth/mcp-metadata.ts`
- **Dynamic Client Registration:** `backend/src/routes/auth/client-registration.ts`
- **Admin UI for tool/skill assignments:** `ui/src/components/McpServersManager.tsx`
- **MCP server management:** `backend/src/routes/admin/mcp-servers.ts`
- **Skills management:** `backend/src/routes/admin/ai-tools-skills.ts`
- **Client attribute storage:** Keycloak client attributes (`allowed_mcp_server_names`, `allowed_skill_names`, `mcp_access_type`)

The reference implementation stores tool/skill assignments as Keycloak client attributes and returns them via the admin API. The `/.well-known/ai-tools-configuration` endpoint reads these attributes when presented with a valid Bearer token to produce a client-scoped catalog.

---

## 8. Relationship to MCP Specification

The Model Context Protocol (MCP) already establishes:

1. **Auth discovery** via RFC 9728 (`oauth-protected-resource` → `authorization_servers`)
2. **Tool invocation** via MCP Streamable HTTP (`listTools`, `callTool`)

This proposal fills the gap **between auth discovery and tool invocation** — the client knows how to authenticate but doesn't know what tools exist or where to find them until it connects to a specific MCP server URL. The `ai-tools-configuration` endpoint provides that catalog.

For MCP clients, this means they no longer need hardcoded server URLs. Instead:

```
Before:  User manually configures MCP server URLs in Claude Desktop
After:   Client discovers MCP server URLs from ai-tools-configuration
```

---

## 9. Relationship to SMART App Launch

SMART App Launch already defines `.well-known/smart-configuration` for FHIR capability discovery. This proposal follows the same pattern for AI tool discovery:

| Aspect | SMART Configuration | AI Tools Configuration |
|--------|-------------------|----------------------|
| URI | `/.well-known/smart-configuration` | `/.well-known/ai-tools-configuration` |
| Purpose | Discover FHIR + OAuth endpoints | Discover AI tool servers + skills |
| Auth required | No | Optional (filters results when present) |
| CORS | Required | Required |
| Scope hint | `scopes_supported` | `tool_scopes_supported` |
| Discovery link | In FHIR CapabilityStatement | In RFC 9728 metadata |

A SMART on FHIR application that also uses AI tools would discover both configurations:

1. `/.well-known/smart-configuration` → FHIR endpoints, OAuth config
2. `/.well-known/ai-tools-configuration` → MCP servers, skills

---

## 10. Open Questions

1. **Should `ai-tools-configuration` be merged into `smart-configuration`?**  
   Keeping them separate follows the single-responsibility principle and doesn't pollute the SMART spec with non-FHIR concerns. However, a unified document reduces round-trips.

2. **Should tool definitions (schemas) be inlined or linked?**  
   The current proposal links to MCP servers that provide their own `listTools`. Inlining tool schemas would increase the payload but reduce discovery round-trips for constrained clients.

3. **Should there be a `tools:discover` scope separate from `tools:execute`?**  
   This would allow read-only tool catalog access without execution permission. Useful for admin dashboards and audit tools.

4. **How should tool versioning work?**  
   If a server upgrades its tools (adds/removes/changes), clients fetching the catalog at different times will see different tools. Should there be an ETag or version field for cache coordination?

5. **Should the A2A (Agent-to-Agent) protocol be a first-class capability?**  
   Google's A2A protocol defines its own discovery mechanism via `/.well-known/agent.json`. This proposal could reference A2A agents alongside MCP servers in the `servers` array.

---

## Appendix A: Full Example — Protected Resource Metadata

```http
GET /.well-known/oauth-protected-resource HTTP/1.1
Host: proxy.example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "resource": "https://proxy.example.com",
  "authorization_servers": [
    "https://keycloak.example.com/realms/proxy-smart"
  ],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://proxy.example.com/docs",
  "scopes_supported": [
    "backend:read",
    "backend:write",
    "backend:admin"
  ],
  "ai_tools_configuration": "https://proxy.example.com/.well-known/ai-tools-configuration",
  "ai_capabilities_supported": [
    "mcp-streamable-http",
    "function-calling"
  ],
  "ai_tool_scopes_supported": [
    "tools:read",
    "tools:execute"
  ]
}
```

## Appendix B: Full Example — Dynamic Client Registration

```http
POST /auth/register HTTP/1.1
Host: proxy.example.com
Content-Type: application/json

{
  "redirect_uris": ["http://localhost:8080/callback"],
  "client_name": "Clinical AI Assistant v2",
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "scope": "openid fhirUser patient/*.read tools:execute",
  "token_endpoint_auth_method": "none",
  "ai_capabilities_requested": ["mcp-streamable-http"],
  "ai_tool_categories_requested": ["clinical", "fhir"],
  "ai_agent_type": "autonomous-llm"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "client_id": "smart_app_7f3a2b1c-...",
  "client_id_issued_at": 1773676800,
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "client_name": "Clinical AI Assistant v2",
  "scope": "openid fhirUser patient/*.read tools:execute",
  "token_endpoint_auth_method": "none",
  "ai_capabilities_granted": ["mcp-streamable-http"],
  "ai_tools_configuration": "https://proxy.example.com/.well-known/ai-tools-configuration",
  "ai_tool_servers_granted": ["fhir-tools", "clinical-reasoning"],
  "ai_tool_count": 17
}
```

## Appendix C: Full Example — AI Tools Configuration (Authenticated)

```http
GET /.well-known/ai-tools-configuration HTTP/1.1
Host: proxy.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=300

{
  "version": "1.0.0",
  "client_id": "smart_app_7f3a2b1c-...",
  "tools_endpoint": "https://proxy.example.com/mcp",
  "tool_discovery_endpoint": "https://proxy.example.com/mcp/tools",
  "protocols_supported": ["mcp-streamable-http-2025-03-26"],
  "authentication_methods_supported": ["bearer"],
  "tool_scopes_supported": ["tools:read", "tools:execute"],
  "servers": [
    {
      "name": "fhir-tools",
      "url": "https://proxy.example.com/mcp/fhir",
      "description": "FHIR resource query and write operations",
      "protocol": "mcp-streamable-http",
      "scopes_required": ["tools:execute", "patient/*.read"],
      "tool_count": 12,
      "categories": ["clinical", "fhir"],
      "assigned": true
    },
    {
      "name": "clinical-reasoning",
      "url": "https://proxy.example.com/mcp/clinical",
      "description": "Clinical decision support and care gap analysis",
      "protocol": "mcp-streamable-http",
      "scopes_required": ["tools:execute"],
      "tool_count": 5,
      "categories": ["clinical", "cds"],
      "assigned": true
    }
  ],
  "skills": [
    {
      "name": "fhir-helper",
      "description": "FHIR query builder and resource navigator",
      "type": "prompt-template",
      "source_url": "https://github.com/example/fhir-helper-skill",
      "assigned": true
    }
  ]
}
```
