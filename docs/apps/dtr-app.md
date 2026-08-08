# DTR App

> **Note:** This app lives in a separate repository: [max-health-inc/dtr-app](https://github.com/Max-Health-Inc/dtr-app). It deploys independently -- its CI builds static assets and pushes them into the `apps_static` Docker volume on the target server. The backend serves it at `/apps/dtr-app/`.

Da Vinci Documentation Templates & Rules (DTR) application. A SMART on FHIR app for prior authorization documentation, questionnaire rendering, and CQL-based auto-population.

The DTR App implements the [Da Vinci DTR IG](http://hl7.org/fhir/us/davinci-dtr/) workflow: it launches from an EHR or standalone, fetches payer-defined Questionnaires, auto-populates answers using CQL expressions and patient data, and submits completed documentation for prior authorization.

```
┌───────────┐   SMART launch   ┌──────────────┐   FHIR R4   ┌─────────────┐
│  DTR App  │ ──────────────── │  Proxy Smart │ ──────────── │ FHIR Server │
│ (browser) │   Bearer token   │  /fhir/*     │             │ (PAS, DTR)  │
└───────────┘                  └──────────────┘             └─────────────┘
```

The workflow starts from a clinical service, finds the payer questionnaires that apply to it, and renders them through [AEHRC Smart Forms](https://github.com/aehrc/smart-forms). Answers that can be derived from the patient record are populated by CQL before the practitioner sees the form, so the manual step is review rather than transcription. Completed documentation is reviewed once more and submitted as a prior authorization request, and submitted requests stay visible with their status.

Launch mode is detected rather than configured (see [Launch Modes](#launch-modes) below): an EHR launch arrives with its patient context already set, and a standalone launch opens patient search first.

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `dtr-app` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `launch`, `patient/Patient.read`, `patient/Questionnaire.read`, `patient/QuestionnaireResponse.*` |
| Redirect URI | `{base}/callback` |

## Development

See the [dtr-app repository](https://github.com/Max-Health-Inc/dtr-app) for development instructions.

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
| Auth | SMART on FHIR (`SmartAppShell`) |
