# SMART DICOM Template

Starter kit for building SMART on FHIR imaging algorithm apps. Clone this template, implement your algorithm in `src/algorithm.ts`, and deploy as a registered SMART app on Proxy Smart.

## Overview

The SMART DICOM Template provides the full boilerplate for a SMART-launched imaging app: authentication, DICOMweb study retrieval, Cornerstone3D image loading, and a pluggable algorithm interface. Partners implement one function and get a production-ready SMART app.

```
┌────────────────────┐  SMART launch  ┌──────────────┐  DICOMweb  ┌──────┐
│ DICOM Algorithm App│ ────────────── │  Proxy Smart │ ─────────── │ PACS │
│     (browser)      │  Bearer token  │  /dicomweb/* │            │      │
└────────────────────┘                └──────────────┘            └──────┘
         │
         ▼
   ┌─────────────┐
   │ algorithm.ts │  Your imaging algorithm
   └─────────────┘
```

## Features

- **SMART App Launch 2.2.0** with PKCE via `SmartAppShell`
- **DICOMweb Integration** via `@babelfhir-ts/dicomweb` for study/series/instance retrieval
- **Cornerstone3D** for WADO-RS pixel data loading with OAuth token injection
- **Algorithm Runner UI** — study selector, run button, and result card display
- **Pluggable Algorithm** — implement `runAlgorithm()` and get a complete UI
- **Shared UI Components** from `@proxy-smart/shared-ui` (SmartAppShell, Card, Button, Spinner)

## Quick Start

```bash
# 1. Copy the template
cp -r frontend/smart-dicom-template frontend/my-algorithm

# 2. Update package.json name, port, and clientId in src/config.ts
# 3. Implement your algorithm in src/algorithm.ts
# 4. Register as a SMART app in Proxy Smart admin

cd frontend/my-algorithm
bun install
bun run dev
# -> http://localhost:5180/apps/smart-dicom-template/
```

## Algorithm Interface

Your algorithm lives in `src/algorithm.ts`. Implement the `runAlgorithm` function:

```typescript
import type { ImagingStudy } from "hl7.fhir.uv.ips-generated"

export interface AlgorithmInput {
  studyUID: string
  imageIds: string[]
  imagingStudy: ImagingStudy
  patientReference: string
  accessToken: string | null
}

export interface AlgorithmResult {
  title: string
  description: string
  confidence?: number
  code?: { system: string; code: string; display: string }
  severity?: "info" | "warning" | "critical"
}

export async function runAlgorithm(input: AlgorithmInput): Promise<AlgorithmResult> {
  // Your algorithm logic here
  return {
    title: "Finding Title",
    description: "What was detected...",
    confidence: 0.95,
    severity: "info",
  }
}
```

### AlgorithmInput

| Field | Type | Description |
|---|---|---|
| `studyUID` | `string` | DICOM Study Instance UID |
| `imageIds` | `string[]` | Cornerstone3D `wadors:` image IDs for pixel-level access |
| `imagingStudy` | `ImagingStudy` | Full FHIR ImagingStudy resource from the EHR |
| `patientReference` | `string` | FHIR patient reference, e.g. `"Patient/123"` |
| `accessToken` | `string \| null` | OAuth2 Bearer token for authenticated API calls |

### AlgorithmResult

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Short title displayed in the result card |
| `description` | `string` | Detailed description of the analysis result |
| `confidence?` | `number` | Score between 0 and 1 (shown as percentage in UI) |
| `code?` | `{ system, code, display }` | Clinical code (e.g. SNOMED CT, LOINC) |
| `severity?` | `"info" \| "warning" \| "critical"` | Controls result card color (default: `"info"`) |

## SMART Configuration

Configured in `src/config.ts`:

```typescript
import { createSmartAppConfig } from '@proxy-smart/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'smart-dicom-template',
  scopes: 'openid fhirUser patient/ImagingStudy.read patient/DiagnosticReport.write',
})
```

| Field | Value |
|---|---|
| Client ID | `smart-dicom-template` |
| Scopes | `openid`, `fhirUser`, `patient/ImagingStudy.read`, `patient/DiagnosticReport.write` |
| Redirect URI | `{base}/callback` |

## How It Works

1. **SMART Launch** — `SmartAppShell` handles OAuth 2.0 + PKCE flow via `createSmartAuth()`
2. **Study Fetch** — `AlgorithmRunner` queries `GET /ImagingStudy?patient={id}` using the FHIR bearer token
3. **Study Selection** — User picks a study from the card grid (with thumbnails via DICOMweb)
4. **Image Loading** — Cornerstone3D initializes, then loads all series image IDs via `@babelfhir-ts/dicomweb/cornerstone`
5. **Algorithm Execution** — `runAlgorithm()` receives image IDs and study metadata
6. **Result Display** — Result card shows title, description, confidence, severity, and clinical code

## Development

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5180 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Project Structure

```
src/
├── algorithm.ts          # ← YOUR CODE GOES HERE
├── App.tsx               # SmartAppShell wrapper
├── config.ts             # SMART client configuration
├── main.tsx              # React entry point
├── index.css             # Tailwind CSS
├── components/
│   └── AlgorithmRunner.tsx  # Study selector + algorithm runner UI
└── lib/
    ├── smart-auth.ts        # createSmartAuth() instance
    ├── dicomweb.ts          # DICOMweb client (thumbnails, series loading)
    ├── cornerstone-init.ts  # Lazy Cornerstone3D + DICOM loader init
    └── auth-error.ts        # Shared auth error handler (re-export)
```

## Key Libraries

| Library | Purpose |
|---|---|
| `@proxy-smart/shared-ui` | SmartAppShell, createSmartAuth, UI components |
| `@babelfhir-ts/dicomweb` | DICOMweb client (QIDO-RS, WADO-RS, thumbnails) |
| `@babelfhir-ts/dicomweb/cornerstone` | Cornerstone3D integration for series loading |
| `@cornerstonejs/core` | Medical image rendering engine |
| `@cornerstonejs/dicom-image-loader` | DICOM P10 / WADO-RS image loader |
| `hl7.fhir.uv.ips-generated` | FHIR R4 TypeScript types (ImagingStudy, etc.) |
| `lucide-react` | Icons (Play, ImageIcon, AlertTriangle, etc.) |
