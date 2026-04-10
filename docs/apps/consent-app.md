# Consent App

SMART on FHIR application for managing patient consent. Practitioners can create, review, and revoke FHIR Consent resources linked to Patient records.

## Overview

The Consent App launches via SMART App Launch (standalone or EHR launch), authenticates with Proxy Smart, and reads/writes FHIR Consent and related resources through the proxy. It supports both practitioner and patient workflows.

```
┌──────────────┐   SMART launch   ┌──────────────┐   FHIR R4   ┌─────────────┐
│  Consent App │ ──────────────── │  Proxy Smart │ ──────────── │ FHIR Server │
│  (browser)   │   Bearer token   │  /fhir/*     │             │ (Consent)   │
└──────────────┘                  └──────────────┘             └─────────────┘
```

## Features

- **SMART App Launch 2.2.0** with PKCE, token refresh, and session expiry handling
- **Consent Builder** for creating new Consent resources with scope, period, and provision rules
- **Consent List** with filtering by status, patient, and date
- **Consent Detail** view with full provision breakdown and audit timeline
- **Practitioner Dashboard** with consent statistics and quick actions
- **Patient Detail** showing all consents linked to a patient
- **Access Request Management** for handling consent-based access requests

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `consent-app` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `patient/Consent.*`, `patient/Patient.read` |
| Redirect URI | `{base}/callback` |

## Development

```bash
# From the monorepo root
bun run dev:consent

# Or directly
cd apps/consent-app
bun run dev
# -> http://localhost:5174/apps/consent/
```

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5174 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Key Components

| Component | Purpose |
|---|---|
| `ConsentBuilder` | Form for creating new Consent resources |
| `ConsentList` | Filterable table of existing consents |
| `ConsentDetail` | Full consent view with provisions and audit trail |
| `ConsentStats` | Dashboard statistics (active, revoked, expired) |
| `AccessRequestForm` | Create consent-based access requests |
| `AccessRequestList` | Review and approve/deny access requests |
| `PractitionerDashboard` | Practitioner-focused overview |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | shadcn/ui (via shared-ui) |
| FHIR | `@types/fhir`, Da Vinci PAS types |
| Auth | SMART on FHIR (custom `smart-auth.ts`) |

*This documentation is indexed by the RAG knowledge base for AI-powered search.*
