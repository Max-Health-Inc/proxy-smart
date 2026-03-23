# Consent App — SMART on FHIR Consent Management

> **Status**: Planning  
> **Target**: FHIR R4 primary, R5 stretch  
> **Path**: `consent-app/`  
> **Last Updated**: March 2026

---

## Overview

A **SMART on FHIR app** that lets a Person manage FHIR Consent resources for their linked Patient records. The first SMART app shipped with Proxy Smart — a real reference implementation that eats its own dog food.

**Who uses it?** A Person (identity) who is linked to one or more Patient records across FHIR servers.  
**What does it do?** Create, view, edit, and revoke FHIR Consent resources that control which Practitioners can access which Patient data.

---

## Architecture

```
Person (browser)
    │
    ▼
consent-app (SMART on FHIR app — Vite + React)
    │ SMART Standalone Launch
    │ Token includes: fhirUser=Person/456, scopes
    ▼
Proxy Smart (FHIR proxy + auth server)
    │ GET  Person/{id}           → linked Patients
    │ GET  Consent?patient=X     → existing consents
    │ POST Consent               → create consent
    │ PUT  Consent/{id}          → update consent
    │ GET  Practitioner?name=X   → find practitioners
    ▼
Upstream FHIR Server(s) (HAPI, Epic, etc.)
```

### SMART Launch Flow

1. Person navigates to consent-app
2. App initiates **SMART Standalone Launch** against Proxy Smart
3. Keycloak authenticates the Person, issues token with:
   - `fhirUser: Person/456`
   - `scope: openid fhirUser patient/*.read patient/Consent.*`
4. App reads `fhirUser` from token → fetches Person resource
5. Person.link[] → list of linked Patients across servers
6. App shows dashboard with Patient records and consent management

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 19 + Vite | Matches admin UI |
| Styling | Tailwind CSS 4 + shadcn/ui | Matches admin UI |
| FHIR Types | `@types/fhir` (R4) | Already in monorepo |
| Auth | SMART on FHIR (PKCE) | Standards-compliant |
| State | React state + hooks | Keep it simple |
| i18n | react-i18next | Matches admin UI |
| Icons | lucide-react | Matches admin UI |

### Shared with Admin UI

- shadcn/ui components (button, card, dialog, select, badge, etc.)
- Tailwind config / design tokens
- `@types/fhir` type definitions
- Pattern: `fhirService.ts`-style FHIR server interaction

---

## FHIR R4 Consent Structure

The core resource we're building and managing:

```json
{
  "resourceType": "Consent",
  "status": "active",
  "scope": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/consentscope",
      "code": "patient-privacy"
    }]
  },
  "category": [{
    "coding": [{
      "system": "http://loinc.org",
      "code": "57016-8",
      "display": "Privacy policy acknowledgment Document"
    }]
  }],
  "patient": { "reference": "Patient/123" },
  "dateTime": "2026-03-16T12:00:00Z",
  "performer": [{ "reference": "Person/456" }],
  "policyRule": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      "code": "OPTIN"
    }]
  },
  "provision": {
    "type": "permit",
    "period": {
      "start": "2026-03-16",
      "end": "2027-03-16"
    },
    "actor": [{
      "role": {
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          "code": "PRCP",
          "display": "primary information recipient"
        }]
      },
      "reference": { "reference": "Practitioner/dr-smith" }
    }],
    "action": [{
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/consentaction",
        "code": "access"
      }]
    }],
    "class": [
      { "system": "http://hl7.org/fhir/resource-types", "code": "Observation" },
      { "system": "http://hl7.org/fhir/resource-types", "code": "Condition" },
      { "system": "http://hl7.org/fhir/resource-types", "code": "MedicationRequest" }
    ]
  }
}
```

Key fields:
- **`performer`** = Person (who grants consent)
- **`patient`** = Patient (whose data)
- **`provision.actor`** = Practitioner (who gets access)
- **`provision.class`** = Resource types (what data)
- **`provision.action`** = access / disclose (read / write)
- **`provision.period`** = time-limited access
- **`provision.type`** = permit / deny

---

## Screens

### 1. Launch / Auth

- SMART Standalone Launch screen
- Keycloak login (redirects back with token)
- Extract `fhirUser` from token

### 2. Dashboard (Home)

- Person identity card (name, email from Person resource)
- List of linked Patients across all connected FHIR servers
- Per patient: active consent count, recent access events
- Quick actions: "Add Consent", "Review Access"

### 3. Patient Detail

- Patient demographics (name, DOB, MRN)
- Server info (which FHIR server, version)
- List of existing Consent resources for this patient
- Each consent shows: status, practitioner, resource types, period, actions
- Actions: Edit, Revoke, View Details

### 4. Consent Builder

- **Step 1 — Patient**: pre-selected from context
- **Step 2 — Practitioner**: search practitioners on the same FHIR server (`GET Practitioner?name=...`)
- **Step 3 — Access Scope**:
  - Resource types (checkboxes: Observation, Condition, MedicationRequest, DiagnosticReport, Encounter, AllergyIntolerance, Procedure, etc.)
  - Action: Read only / Read + Write
- **Step 4 — Time Period**:
  - Start date (default: today)
  - End date (default: 1 year, or no expiry)
- **Step 5 — Review & Submit**:
  - Preview the FHIR Consent JSON
  - Confirm and POST to server

### 5. Consent Detail / Edit

- Full view of an existing Consent resource
- Edit provision (change practitioner, resource types, period)
- Change status (active → inactive = revoke)
- View raw FHIR JSON

### 6. Access Log (v2)

- Filtered view of consent monitoring events for my patients
- Who accessed what, when, decision (permit/deny)
- Powered by existing consent-monitoring endpoints

---

## Project Structure

```
consent-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── public/
│   └── smart-manifest.json        # SMART app manifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config.ts                   # FHIR server URL, client ID
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (shared)
│   │   ├── Dashboard.tsx
│   │   ├── PatientDetail.tsx
│   │   ├── ConsentBuilder.tsx
│   │   ├── ConsentDetail.tsx
│   │   ├── ConsentList.tsx
│   │   ├── PractitionerSearch.tsx
│   │   ├── ResourceTypeSelector.tsx
│   │   └── PersonCard.tsx
│   ├── lib/
│   │   ├── smart-auth.ts           # SMART launch + PKCE
│   │   ├── fhir-client.ts          # FHIR REST operations
│   │   ├── consent-builder.ts      # Build R4 Consent JSON
│   │   └── fhir-types.ts           # Re-export @types/fhir
│   ├── hooks/
│   │   ├── usePerson.ts            # Fetch + cache Person
│   │   ├── usePatients.ts          # Linked patients
│   │   ├── useConsents.ts          # Consent CRUD
│   │   └── usePractitioners.ts     # Search practitioners
│   └── i18n/
│       └── en.json
```

---

## FHIR Operations

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Get Person | `GET /proxy/{server}/{ver}/Person/{id}` | Load logged-in user's Person resource |
| Get Patient | `GET /proxy/{server}/{ver}/Patient/{id}` | Load linked patient details |
| Search Consents | `GET /proxy/{server}/{ver}/Consent?patient=Patient/{id}` | List consents for a patient |
| Create Consent | `POST /proxy/{server}/{ver}/Consent` | Create new consent |
| Update Consent | `PUT /proxy/{server}/{ver}/Consent/{id}` | Edit existing consent |
| Search Practitioners | `GET /proxy/{server}/{ver}/Practitioner?name={q}` | Find practitioners to grant access to |
| Get Practitioner | `GET /proxy/{server}/{ver}/Practitioner/{id}` | Load practitioner details |

All go through Proxy Smart's FHIR proxy with the SMART token for auth.

---

## Keycloak Client Registration

Register as a SMART app in Proxy Smart's admin UI:

| Setting | Value |
|---------|-------|
| Client ID | `consent-app` |
| Client Type | Public (SPA) |
| Root URL | `http://localhost:5174` (dev) / production URL |
| Redirect URIs | `http://localhost:5174/callback` |
| PKCE | Required (S256) |
| Scopes | `openid fhirUser patient/*.read patient/Consent.*` |
| SMART Launch | Standalone |

---

## Phases

### Phase 1 — Foundation ✨

- [ ] Scaffold Vite + React project at `consent-app/`
- [ ] SMART Standalone Launch with PKCE (smart-auth.ts)
- [ ] Extract fhirUser from token, fetch Person resource
- [ ] Resolve Person.link[] → show linked Patients
- [ ] Register `consent-app` client in Keycloak

### Phase 2 — Consent CRUD

- [ ] Consent Builder (multi-step form)
- [ ] Practitioner search on FHIR server
- [ ] Resource type selector component
- [ ] POST Consent to FHIR server
- [ ] Consent List per patient (GET Consent?patient=...)
- [ ] Consent Detail view
- [ ] Revoke consent (status → inactive)

### Phase 3 — Multi-Server

- [ ] Aggregate patients across all connected FHIR servers
- [ ] Server selector in UI
- [ ] Version-aware Consent building (R4 vs R5 structure)

### Phase 4 — Access Log

- [ ] Connect to consent monitoring WebSocket/SSE
- [ ] Filter events by my patients
- [ ] Show who accessed what, when, decision

### Phase 5 — Polish

- [ ] i18n translations
- [ ] Dark/light theme
- [ ] Mobile responsive
- [ ] SMART app manifest for app gallery
- [ ] Docker build for deployment
- [ ] Add to monorepo scripts (dev:consent, build:consent)

---

## Dev Scripts (root package.json)

```json
{
  "dev:consent": "cd consent-app && bun run dev",
  "build:consent": "cd consent-app && bun run build"
}
```

---

## R4 vs R5 Differences

| Field | R4 | R5 |
|-------|----|----|
| Top-level decision | `provision.type` | `decision` |
| Provision | Single object | Array |
| Scope | `scope` (CodeableConcept) | Removed |
| Category | `category` (CodeableConcept[]) | Restructured |
| Verification | `verification[]` | Enhanced |

Strategy: Build for R4. Detect server version from metadata. Adapt JSON construction in `consent-builder.ts` based on version. The existing `@types/fhir` package has both R4 and R5 types.

---

## References

- [FHIR R4 Consent](https://www.hl7.org/fhir/r4/consent.html)
- [FHIR R5 Consent](https://www.hl7.org/fhir/r5/consent.html)
- [SMART App Launch](https://hl7.org/fhir/smart-app-launch/)
- [SHARES Consent Portal](https://github.com/asushares/portal) — R5 reference implementation
- [Consent Scope Codes](http://terminology.hl7.org/CodeSystem/consentscope)
- [Consent Action Codes](http://terminology.hl7.org/CodeSystem/consentaction)
- [V3 ParticipationType](http://terminology.hl7.org/CodeSystem/v3-ParticipationType)
