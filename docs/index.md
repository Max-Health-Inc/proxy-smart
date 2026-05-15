---
layout: home

hero:
  name: Proxy Smart
  text: Healthcare Interoperability Proxy
  tagline: SMART App Launch 2.2.0, OAuth 2.0, MCP Server & AI-Powered Admin
  actions:
    - theme: brand
      text: Get Started
      link: /admin-ui/dashboard
    - theme: alt
      text: MCP & AI
      link: /MCP_HTTP_SERVER

features:
  - title: SMART App Launch 2.2.0
    details: Full OAuth 2.0 with PKCE, JWT validation, scope-based access control, and refresh token rotation.
  - title: Stateless FHIR Proxy
    details: No clinical data stored — requests pass through to your FHIR servers with full audit logging.
  - title: 6 SMART Apps
    details: Patient Portal, Consent Manager, DTR/Prior Auth, Patient Picker, DICOM Algorithm Template, and Admin UI.
  - title: MCP Server
    details: Streamable HTTP endpoint at /mcp exposing all admin tools and documentation search to AI clients.
  - title: Shared UI Library
    details: "@proxy-smart/shared-ui — reusable components, SmartAppShell, hooks, and MaxHealth design system."
  - title: Medical Imaging
    details: DICOMweb proxy with QIDO-RS & WADO-RS, Cornerstone3D viewer, and SMART DICOM algorithm template.
  - title: AI Assistant & RAG
    details: Built-in assistant with semantic documentation search powered by OpenAI embeddings.
  - title: Docker & AWS CDK
    details: Docker Compose for dev/staging. AWS CDK (ECS Fargate, RDS, WAF, ALB) for production.
---

# Proxy Smart — Documentation

Comprehensive documentation for the Proxy Smart platform: a stateless FHIR proxy with OAuth 2.0, SMART App Launch 2.2.0, and an intelligent admin interface.

## Platform Overview

Proxy Smart sits between SMART apps and FHIR servers, handling authentication and authorization without storing clinical data. The platform includes 6 frontend apps, an AI assistant, MCP server, and a shared component library.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Apps                           │
│  Patient Portal │ Consent │ DTR │ Patient Picker │ Admin UI │
│                      SMART DICOM Template                   │
│                                                             │
│  All built with @proxy-smart/shared-ui (SmartAppShell)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ SMART App Launch 2.2.0
┌──────────────────────────▼──────────────────────────────────┐
│                    Proxy Smart Backend                        │
│  Elysia/Bun │ OAuth Proxy │ FHIR Proxy │ MCP Server │ AI    │
└──────────┬──────────┬──────────┬────────────────────────────┘
           │          │          │
     ┌─────▼───┐ ┌────▼────┐ ┌──▼───────┐
     │Keycloak │ │FHIR R4  │ │Orthanc   │
     │  (IdP)  │ │Server(s)│ │(DICOMweb)│
     └─────────┘ └─────────┘ └──────────┘
```

### Apps

| App | Port | Purpose |
|-----|------|---------|
| [Patient Portal](./apps/patient-portal.md) | 5173 | Patient-facing health records, imaging, SHL sharing |
| [Consent Manager](./apps/consent-app.md) | 5174 | FHIR Consent resource management |
| [DTR / Prior Auth](./apps/dtr-app.md) | 5175 | Da Vinci DTR questionnaires and PA workflow |
| [Patient Picker](./apps/patient-picker.md) | 5176 | Patient selection during standalone SMART launch |
| [Admin UI](./apps/admin-ui.md) | 5177 | Platform administration dashboard |
| [SMART DICOM Template](./apps/smart-dicom-template.md) | 5180 | Starter kit for imaging algorithm SMART apps |

### Key Features

- **SMART App Launch 2.2.0** — Full OAuth 2.0 with PKCE, JWT validation, scope-based access control, refresh token rotation
- **Stateless FHIR Proxy** — No clinical data stored; requests pass through to your FHIR servers
- **Shared UI Library** — `@proxy-smart/shared-ui` with `SmartAppShell`, design system, hooks
- **Admin Dashboard** — React UI for managing apps, users, servers, scopes, and identity providers
- **AI Assistant & RAG** — Built-in assistant with semantic documentation search
- **MCP Server** — Streamable HTTP endpoint at `/mcp` exposing all admin tools
- **Consent Management** — Patient consent app for authorization flows
- **DTR App** — Da Vinci Documentation, Templates & Rules
- **Medical Imaging** — DICOMweb proxy (QIDO-RS & WADO-RS) with Cornerstone3D viewer
- **Access Control** — Physical access integrations (Kisi, UniFi Access)
- **Docker & CDK** — Docker Compose for dev/staging, AWS CDK for production (ECS Fargate, RDS, WAF)

## Documentation

### Apps

- [Patient Portal](./apps/patient-portal.md) — Health records, imaging, SHL viewer
- [Consent Manager](./apps/consent-app.md) — FHIR Consent resource management
- [DTR / Prior Auth](./apps/dtr-app.md) — Da Vinci DTR workflow
- [Patient Picker](./apps/patient-picker.md) — Patient selection for standalone launch
- [Admin UI](./apps/admin-ui.md) — Platform administration
- [SMART DICOM Template](./apps/smart-dicom-template.md) — Imaging algorithm starter kit

### Shared UI

- [Shared UI Library](./shared-ui.md) — `@proxy-smart/shared-ui`, SmartAppShell, design system, hooks

### Admin UI

- [Dashboard Overview](./admin-ui/dashboard.md) — System overview and health monitoring
- [User Management](./admin-ui/user-management.md) — Healthcare users and FHIR associations
- [SMART Apps](./admin-ui/smart-apps.md) — Application registration and management
- [FHIR Servers](./admin-ui/fhir-servers.md) — Server configuration and monitoring
- [Scope Management](./admin-ui/scope-management.md) — FHIR permissions and templates
- [Access Control](./admin-ui/access-control.md) — Physical door management (Kisi, UniFi Access)
- [Monitoring & Observability](./admin-ui/monitoring.md) — OAuth, FHIR health, consent, and audit monitoring

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

### Imaging & DICOMweb

- [DICOMweb Proxy](./dicomweb-proxy.md) — QIDO-RS & WADO-RS proxy endpoints, authentication, and deployment
- [Patient Portal Imaging](./patient-portal-imaging.md) — ImagingStudy cards, Cornerstone3D viewer, and DICOMweb client library

### SMART on FHIR

- [SMART 2.2.0 Implementation Checklist](./SMART_2.2.0_CHECKLIST.md) — Spec compliance status

### Guides

- [Deployment](./deployment.md) — Docker Compose, production, AWS CDK
- [Environment Variables](./environment-variables.md) — Configuration reference
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
