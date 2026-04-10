# DTR App

Da Vinci Documentation Templates & Rules (DTR) application. A SMART on FHIR app for prior authorization documentation, questionnaire rendering, and CQL-based auto-population.

## Overview

The DTR App implements the [Da Vinci DTR IG](http://hl7.org/fhir/us/davinci-dtr/) workflow: it launches from an EHR or standalone, fetches payer-defined Questionnaires, auto-populates answers using CQL expressions and patient data, and submits completed documentation for prior authorization.

```
┌───────────┐   SMART launch   ┌──────────────┐   FHIR R4   ┌─────────────┐
│  DTR App  │ ──────────────── │  Proxy Smart │ ──────────── │ FHIR Server │
│ (browser) │   Bearer token   │  /fhir/*     │             │ (PAS, DTR)  │
└───────────┘                  └──────────────┘             └─────────────┘
```

## Features

- **EHR Launch and Standalone Launch** with automatic launch mode detection
- **Patient Search** to select a patient context when launched standalone
- **Questionnaire Browser** for discovering available payer questionnaires
- **FHIR Questionnaire Renderer** powered by AEHRC Smart Forms
- **Prior Authorization Workflow** with service selection, documentation, and submission
- **PA Request List** showing submitted and pending prior auth requests
- **Patient Banner** displaying current patient context

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `dtr-app` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `launch`, `patient/Patient.read`, `patient/Questionnaire.read`, `patient/QuestionnaireResponse.*` |
| Redirect URI | `{base}/callback` |

## Development

```bash
# From the monorepo root
cd apps/dtr-app
bun run dev
# -> http://localhost:5175/apps/dtr/
```

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5175 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Key Components

| Component | Purpose |
|---|---|
| `Dashboard` | Main landing page after launch |
| `PatientSearch` | Search and select patient context |
| `PatientBanner` | Display current patient info |
| `ServiceSelector` | Choose the clinical service for PA |
| `QuestionnaireBrowser` | Browse available questionnaires |
| `QuestionnaireRenderer` | Render and fill FHIR Questionnaires |
| `SmartFormsQuestionnaireRenderer` | AEHRC Smart Forms integration |
| `NewPaWorkflow` | Step-by-step prior auth workflow |
| `PaRequestList` | View submitted PA requests |
| `PaReviewSubmit` | Review and submit completed documentation |

## Launch Modes

The DTR App detects its launch mode from URL parameters:

| Parameter | Mode | Behavior |
|---|---|---|
| `launch` + `iss` | EHR Launch | Uses provided launch context, skips patient search |
| Neither | Standalone | Shows patient search, user selects context |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | shadcn/ui (via shared-ui) |
| Forms | `@aehrc/smart-forms-renderer` |
| FHIR | `@types/fhir`, Da Vinci PAS types |
| Auth | SMART on FHIR (custom `smart-auth.ts`) |

*This documentation is indexed by the RAG knowledge base for AI-powered search.*
