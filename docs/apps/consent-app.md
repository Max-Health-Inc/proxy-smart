# Consent App

> **Note:** This app lives in a separate repository: [max-health-inc/consent-app](https://github.com/Max-Health-Inc/consent-app). It deploys independently -- its CI builds static assets and pushes them into the `apps_static` Docker volume on the target server. The backend serves it at `/apps/consent-app/`.

SMART on FHIR application for managing patient consent. Practitioners can create, review, and revoke FHIR Consent resources linked to Patient records.

It launches via SMART App Launch (standalone or EHR launch), authenticates with Proxy Smart, and reads and writes FHIR Consent resources through the proxy. Both practitioner and patient workflows are supported.

```
┌──────────────┐   SMART launch   ┌──────────────┐   FHIR R4   ┌─────────────┐
│  Consent App │ ──────────────── │  Proxy Smart │ ──────────── │ FHIR Server │
│  (browser)   │   Bearer token   │  /fhir/*     │             │ (Consent)   │
└──────────────┘                  └──────────────┘             └─────────────┘
```

A practitioner builds a Consent resource by choosing its scope, period, and provision rules, then reviews it alongside the patient's existing consents. The detail view expands the full provision breakdown and the audit timeline behind each decision, which is what makes a revocation defensible after the fact. Access requests run through the same app: a request for consent-based access is raised, reviewed, and approved or denied in place.

Session handling comes from `SmartAppShell`, so PKCE, token refresh, and expiry are not this app's concern.

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `consent-app` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `patient/Consent.*`, `patient/Patient.read` |
| Redirect URI | `{base}/callback` |

## Development

See the [consent-app repository](https://github.com/Max-Health-Inc/consent-app) for development instructions.

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
| Auth | SMART on FHIR (`SmartAppShell`) |
