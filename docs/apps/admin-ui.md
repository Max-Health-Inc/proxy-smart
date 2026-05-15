# Admin UI

React-based administration dashboard for managing the Proxy Smart platform. Provides full control over SMART apps, users, FHIR servers, scopes, identity providers, consent, and monitoring.

## Overview

The Admin UI is a single-page application that communicates with the backend's admin REST API. It is served as static files from the backend at `/apps/ui/` and is protected by admin-level authentication.

```
┌────────────┐   Admin API   ┌──────────────┐
│  Admin UI  │ ─────────────►│  Backend     │
│  (React)   │  /admin/*     │  (Elysia)    │
└────────────┘               └──────────────┘
```

## Features

### App & Client Management
- **SMART Apps** — Register, configure, and manage SMART on FHIR client applications
- **Scope Management** — Define and assign FHIR scopes, create scope templates
- **Dynamic Client Registration** — Configure DCR settings

### User & Identity
- **Healthcare Users** — Manage users with FHIR resource associations
- **Identity Providers** — Configure external IdPs (SAML, OIDC)
- **User Federation** — LDAP and other external user stores
- **Organizations** — Multi-tenant organization management
- **Branding** — Per-organization branding (logos, colors)

### Infrastructure
- **FHIR Servers** — Register and monitor FHIR server endpoints
- **DICOM Servers** — Manage Orthanc/DICOMweb PACS connections
- **Keycloak Config** — Frontend URL, CIMD, and realm settings
- **MCP Endpoint** — Configure the MCP server endpoint

### Security & Access
- **Access Control** — Physical door management (Kisi, UniFi Access)
- **Launch Contexts** — Configure patient/encounter/tenant contexts per user
- **Consent Settings** — Consent enforcement and webhook configuration
- **IAL Settings** — Identity Assurance Level configuration
- **Backend Services** — Service-to-service client credentials

### Monitoring
- **OAuth Monitoring** — Token exchange metrics, error rates
- **FHIR Health** — Server availability and response times
- **Consent Monitoring** — Consent decision auditing
- **Auth Monitoring** — Login attempts, failures, session tracking
- **Audit Dashboard** — Full admin action audit trail

### AI Assistant
- **AI Chat** — Built-in assistant with RAG-powered documentation search
- **Interactive Actions** — AI-proposed actions with human approval

## Development

```bash
cd apps/ui
bun run dev
# -> http://localhost:5177/apps/ui/
```

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5177 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |
| `bun run test` | Vitest unit tests |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | shadcn/ui (via `@proxy-smart/shared-ui`), Radix primitives |
| Routing | Component-based navigation (no router — single admin SPA) |
| State | React hooks, service layer with fetch |
| Theme | Dark/light/system via ThemeProvider |
| Modals | `ModalStackProvider` from shared-ui |

## Architecture

The Admin UI does **not** use `SmartAppShell` — it has its own `LoginForm` + `AdminApp` shell since it authenticates differently (admin credentials, not SMART launch).

```
App.tsx
  └─ ThemeProvider
      └─ ModalStackProvider
          └─ AdminApp (login gate + navigation + content)
              ├─ LoginForm (when unauthenticated)
              └─ Navigation + Feature Components (when authenticated)
```

## Detailed Feature Docs

See the [Admin UI section](../admin-ui/dashboard.md) for per-feature documentation:

- [Dashboard](../admin-ui/dashboard.md)
- [User Management](../admin-ui/user-management.md)
- [SMART Apps](../admin-ui/smart-apps.md)
- [FHIR Servers](../admin-ui/fhir-servers.md)
- [Scope Management](../admin-ui/scope-management.md)
- [Access Control](../admin-ui/access-control.md)
- [Monitoring](../admin-ui/monitoring.md)

---

*This documentation is indexed by the RAG knowledge base for AI-powered search.*
