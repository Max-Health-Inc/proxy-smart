# Proxy Smart — Documentation

Comprehensive documentation for the Proxy Smart platform: a stateless FHIR proxy with OAuth 2.0, SMART App Launch 2.2.0, and an intelligent admin interface.

## Platform Overview

Proxy Smart sits between SMART apps and FHIR servers, handling authentication and authorization without storing clinical data. It includes an admin dashboard, AI assistant with RAG-powered documentation search, MCP server integration, consent management, and access control.

### Key Features

- **SMART App Launch 2.2.0** — Full OAuth 2.0 with PKCE, JWT validation, scope-based access control, refresh token rotation
- **Stateless FHIR Proxy** — No clinical data stored; requests pass through to your FHIR servers
- **Admin Dashboard** — React UI for managing apps, users, servers, scopes, and identity providers
- **AI Assistant & RAG** — Built-in assistant with semantic documentation search (`search_documentation` tool)
- **MCP Server** — Streamable HTTP endpoint at `/mcp` exposing all admin tools + documentation search
- **Consent Management** — Patient consent app for authorization flows (`consent-app/`)
- **DTR App** — Documentation, Templates & Rules app (`dtr-app/`)
- **Access Control** — Physical access integrations (Kisi, UniFi Access)
- **AI Skills System** — Installable skills for extending AI assistant capabilities
- **Docker-Ready** — Mono-container and multi-container deployments

## Documentation

### Admin UI

- [Dashboard Overview](./admin-ui/dashboard.md) — System overview and health monitoring
- [User Management](./admin-ui/user-management.md) — Healthcare users and FHIR associations
- [SMART Apps](./admin-ui/smart-apps.md) — Application registration and management
- [FHIR Servers](./admin-ui/fhir-servers.md) — Server configuration and monitoring
- [Scope Management](./admin-ui/scope-management.md) — FHIR permissions and templates

### AI & MCP

- [MCP HTTP Server](./MCP_HTTP_SERVER.md) — Streamable HTTP endpoint architecture and usage
- [AI MCP Integration](./AI_MCP_INTEGRATION.md) — How the AI assistant connects to MCP servers
- [Backend API Tools](./BACKEND_API_TOOLS.md) — Auto-generated tools from Elysia routes
- [Backend MCP HTTP Client](./BACKEND_MCP_HTTP_CLIENT.md) — HTTP-based MCP client
- [Backend MCP Streamable Client](./BACKEND_MCP_STREAMABLE_CLIENT.md) — Streamable HTTP MCP client
- [AI Interactive Actions](./AI_INTERACTIVE_ACTIONS.md) — Interactive action system
- [Adding Custom Tools](./ai/ADDING_CUSTOM_TOOLS.md) — Guide for adding custom AI tools
- [Action Quick Reference](./ai/action-quick-reference.md) — AI action reference card
- [Interactive Actions Guide](./ai/interactive-actions.md) — Detailed interactive actions docs

### SMART on FHIR

- [SMART 2.2.0 Implementation Checklist](./SMART_2.2.0_CHECKLIST.md) — Spec compliance status

### Guides

- [Version Management](./tutorials/version-management.md) — Branching, versioning, and releases

## AI Assistant

The platform includes an AI assistant powered by RAG (Retrieval Augmented Generation). It indexes all documentation in this `docs/` directory using OpenAI embeddings and serves relevant context via:

- **AI chat tool** — `search_documentation` called by the assistant during conversations
- **MCP endpoint** — Available to external MCP clients at `/mcp`
- **Public HTTP API** — `GET /docs/search/semantic?q=...` for direct access

The assistant can answer questions about SMART on FHIR, platform configuration, OAuth flows, and admin operations using up-to-date documentation.

## Additional Resources

- [SMART App Launch Framework](https://hl7.org/fhir/smart-app-launch/)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect](https://openid.net/connect/)

---

*This documentation is indexed by the RAG knowledge base for AI-powered search.*
