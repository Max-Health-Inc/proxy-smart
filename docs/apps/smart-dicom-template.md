# SMART DICOM Template

Starter kit for building SMART on FHIR imaging algorithm apps. Clone this template, implement your algorithm in `src/algorithm.ts`, and deploy as a registered SMART app on Proxy Smart.

## Overview

The SMART DICOM Template provides the full boilerplate for a SMART-launched imaging app: authentication, DICOMweb study retrieval, Cornerstone3D rendering, and a pluggable algorithm interface. Partners implement one function and get a production-ready SMART app.

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

- **SMART App Launch 2.2.0** with PKCE, EHR launch, and standalone launch
- **DICOMweb Integration** for fetching studies, series, and instances
- **Cornerstone3D Viewer** with stack scrolling, zoom, pan, and window/level
- **Algorithm Runner UI** that calls your algorithm and displays results
- **Result Write-back** via FHIR DiagnosticReport creation
- **Shared UI Components** from `@proxy-smart/shared-ui`

## Quick Start

```bash
# 1. Copy the template
cp -r apps/smart-dicom-template apps/my-algorithm

# 2. Update package.json name and port
# 3. Implement your algorithm in src/algorithm.ts
# 4. Register as a SMART app in Proxy Smart admin

cd apps/my-algorithm
bun install
bun run dev
# -> http://localhost:5180/apps/smart-dicom-template/
```

## Algorithm Interface

Your algorithm lives in `src/algorithm.ts`. Implement the `runAlgorithm` function:

```typescript
import type { AlgorithmInput, AlgorithmResult } from './types'

export async function runAlgorithm(input: AlgorithmInput): Promise<AlgorithmResult> {
  // input.instances - array of DICOM instance metadata
  // input.pixelData - pixel data for processing
  // input.studyMetadata - study-level DICOM tags

  return {
    findings: [
      {
        code: { system: 'http://snomed.info/sct', code: '123456', display: 'Finding' },
        severity: 'moderate',
        description: 'Algorithm detected ...',
        confidence: 0.95,
      }
    ],
    summary: 'Analysis complete',
  }
}
```

### AlgorithmInput

| Field | Type | Description |
|---|---|---|
| `instances` | `DicomInstance[]` | DICOM instance metadata from DICOMweb |
| `pixelData` | `Float32Array` | Pixel data for the current viewport |
| `studyMetadata` | `Record<string, any>` | Study-level DICOM tags |
| `patientId` | `string` | FHIR Patient ID from launch context |
| `studyUid` | `string` | DICOM Study Instance UID |

### AlgorithmResult

| Field | Type | Description |
|---|---|---|
| `findings` | `Finding[]` | Array of detected findings with SNOMED codes |
| `summary` | `string` | Human-readable result summary |
| `diagnosticReport?` | `Partial<DiagnosticReport>` | Optional FHIR DiagnosticReport to write back |

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `smart-dicom-template` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `patient/Patient.read`, `patient/ImagingStudy.read`, `patient/DiagnosticReport.*` |
| Redirect URI | `{base}/callback` |

## Development

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5180 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Key Components

| Component | Purpose |
|---|---|
| `App` | SMART launch flow (auth, callback, session) |
| `AlgorithmRunner` | Fetches imaging data, runs algorithm, displays results |
| `smart-auth.ts` | SMART App Launch helpers |
| `dicomweb.ts` | DICOMweb client for study/series/instance queries |
| `algorithm.ts` | Partner-implemented algorithm entry point |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | shadcn/ui (via shared-ui) |
| Imaging | Cornerstone3D, `@babelfhir-ts/dicomweb` |
| Auth | SMART on FHIR (custom `smart-auth.ts`) |

*This documentation is indexed by the RAG knowledge base for AI-powered search.*
