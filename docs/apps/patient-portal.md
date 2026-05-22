# Patient Portal

> **Note:** This app has been extracted to a separate repository: [max-health-inc/patient-portal](https://github.com/Max-Health-Inc/patient-portal). The documentation below describes the app's role within the Proxy Smart ecosystem.

International Patient Portal built on IPS (International Patient Summary) and IPA (International Patient Access) standards. Patients can view their health summary, medical imaging, and clinical documents through a SMART on FHIR interface.

## Overview

The Patient Portal launches via SMART App Launch, authenticates the patient, and presents their health data using standardized FHIR profiles. It supports IPS document rendering, DICOM image viewing with Cornerstone3D, and navigation across clinical resources.

```
┌────────────────┐  SMART launch  ┌──────────────┐  FHIR R4   ┌─────────────┐
│ Patient Portal │ ────────────── │  Proxy Smart │ ─────────── │ FHIR Server │
│   (browser)    │  Bearer token  │  /fhir/*     │            │ (IPS, IPA)  │
│                │                │  /dicomweb/* │            │    PACS     │
└────────────────┘                └──────────────┘            └─────────────┘
```

## Features

- **International Patient Summary (IPS)** rendering from `$summary` operation
- **IPA-compliant Patient Access** for allergies, conditions, medications, immunizations, and observations
- **DICOM Image Viewer** powered by Cornerstone3D with stack scrolling, zoom, pan, and window/level
- **Study Browser** for navigating imaging studies, series, and instances via DICOMweb
- **EHR Launch and Standalone Launch** with automatic context detection
- **Responsive Layout** for desktop and mobile devices

## SMART Configuration

| Field | Value |
|---|---|
| Client ID | `patient-portal` |
| Launch Type | Standalone, EHR Launch |
| Scopes | `openid`, `profile`, `patient/Patient.read`, `patient/Condition.read`, `patient/Observation.read`, `patient/AllergyIntolerance.read`, `patient/MedicationRequest.read`, `patient/Immunization.read`, `patient/DocumentReference.read`, `patient/ImagingStudy.read` |
| Redirect URI | `{base}/callback` |

## Development

See the [patient-portal repository](https://github.com/Max-Health-Inc/patient-portal) for development instructions.

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5173 |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |

## Imaging Integration

The Patient Portal uses the [DICOMweb Proxy](/dicomweb-proxy) built into Proxy Smart. When `DICOMWEB_BASE_URL` is configured on the backend, imaging features become available.

### Viewer Controls

| Control | Action |
|---|---|
| Scroll wheel | Navigate through slices in a stack |
| Left drag | Window/Level adjustment |
| Right drag | Zoom |
| Middle drag | Pan |

See [Patient Portal Imaging](/patient-portal-imaging) for detailed imaging architecture.

## IPS Integration

The portal requests the patient's International Patient Summary via the FHIR `$summary` operation:

```
GET /fhir/Patient/{id}/$summary
```

The IPS Bundle is parsed into sections (allergies, medications, conditions, immunizations, etc.) and rendered as navigable cards.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite, Tailwind CSS |
| UI | shadcn/ui (via shared-ui) |
| FHIR | `hl7.fhir.uv.ips-generated` (IPS 2.0.0 types) |
| Imaging | Cornerstone3D, `@babelfhir-ts/dicomweb` |
| Auth | SMART on FHIR (`SmartAppShell`) |
