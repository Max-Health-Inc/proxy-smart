# Patient Picker

Embedded patient selection UI shown during SMART standalone launch flows when patient context is needed.

The Patient Picker is **not a standalone SMART app**. The backend renders it mid-authorization: when a SMART app requests `launch/patient` scope in a standalone launch, there is no EHR to supply the patient, so the flow pauses here for the user to choose one before the authorization completes.

```
┌────────────────┐   authorize   ┌──────────────┐   redirect   ┌────────────────┐
│ Requesting App │ ────────────► │  Proxy Smart │ ────────────► │ Patient Picker │
│ (SMART app)    │               │  /auth       │               │ /patient-picker│
└────────────────┘               └──────────────┘               └───────┬────────┘
                                                                        │
                                                                        │ POST /auth/patient-select
                                                                        ▼
                                                                ┌──────────────┐
                                                                │ Authorization│
                                                                │ completes    │
                                                                └──────────────┘
```

## How It Works

1. User initiates a standalone SMART launch from a client app
2. Backend detects `launch/patient` scope but no patient context
3. Backend redirects to `/patient-picker/?session=...&code=...&aud=...`
4. Patient Picker renders a searchable patient list from the FHIR server
5. User selects a patient and clicks "Continue"
6. Patient Picker POSTs to `/auth/patient-select` with `{ session, code, patient }`
7. Backend binds the patient to the session and completes the auth code exchange

## URL Parameters

| Parameter | Description |
|-----------|-------------|
| `session` | Backend session ID for the in-progress authorization |
| `code` | Authorization code from Keycloak |
| `aud` | FHIR server base URL (used for patient search) |

Because it interrupts a flow the user is already committed to, the UI stays deliberately thin: a searchable patient list, names rendered through `formatHumanName()` from shared-ui, and an explicit error when a required parameter is missing. There is no sign-out, no navigation, and no authentication of its own.

## Development

```bash
cd packages/patient-picker
bun run dev
# -> http://localhost:5176/patient-picker/
```

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5176 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Key Components

| Component | Purpose |
|---|---|
| `PatientList` | Fetches and displays searchable list of FHIR Patient resources |
| `App` | Orchestrates parameter parsing, selection state, and form submission |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | `@proxy-smart/shared-ui` (AppHeader, Button, formatHumanName) |
| FHIR | FHIR R4 Patient search via fetch |

## Notes

- This app does **not** use `SmartAppShell` because it's not a SMART app itself -- it has no authentication flow
- It receives its FHIR base URL from the `aud` parameter (set by the backend during redirect)
- The patient list queries the FHIR server directly using the backend's service token (proxied through the backend)
