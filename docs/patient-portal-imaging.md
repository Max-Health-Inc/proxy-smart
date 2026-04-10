# Patient Portal — Medical Imaging

The Patient Portal includes a medical imaging module that displays FHIR ImagingStudy resources with DICOMweb thumbnails and a full Cornerstone3D DICOM viewer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Patient Portal (React)                                 │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ ImagingStudyCard│  │ DicomViewerDialog             │  │
│  │  • thumbnails   │──│  • Cornerstone3D (lazy)       │  │
│  │  • modality     │  │  • stack viewport             │  │
│  │  • series list  │  │  • scroll / W-L / pan / zoom  │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│           │                        │                    │
│     dicomweb.ts            dicomweb.ts                  │
│   (URL builders)        (fetchSeriesImageIds)           │
└───────────┬────────────────────────┬────────────────────┘
            │    Bearer token        │
            ▼                        ▼
     GET /dicomweb/*          GET /dicomweb/*
       (thumbnails)        (QIDO-RS + WADO-RS)
```

## Components

### ImagingStudyCard

Displays FHIR `ImagingStudy` resources as expandable cards with DICOMweb thumbnails.

**Features:**
- Thumbnail images fetched from the DICOMweb proxy with auth headers
- Modality badges with emoji labels (CT, MR, US, XR, etc.)
- Expandable series list showing individual series with thumbnails
- Study metadata (date, series count, instance count)
- Quick-view button opens the DICOM viewer for the first series
- Per-series view button for targeted viewing

### DicomViewerDialog

Full-screen DICOM image viewer built on [Cornerstone3D](https://www.cornerstonejs.org/) v4.

**Features:**
- **Lazy-loaded** — Cornerstone3D (~2 MB) is only imported when the viewer is first opened, keeping the initial bundle small
- **Stack viewport** with scroll navigation through all instances in a series
- **Window/Level** adjustment via left-click drag
- **Pan** via middle-click drag
- **Zoom** via right-click drag
- **Image counter** showing current position (e.g. "12 / 48")
- Modal overlay built with Radix Dialog

**Exported types:**
- `ViewerTarget` — `{ studyUID: string, seriesUID: string, seriesDescription?: string, modality?: string }`
- `DicomViewerDialog` — React component accepting `target`, `open`, and `onOpenChange` props

## Client Library (`dicomweb.ts`)

Utility functions for DICOMweb URL construction and data fetching.

### URL Builders

| Function | Returns |
|---|---|
| `getDicomwebBase()` | Proxy DICOMweb base URL |
| `getStudyThumbnailUrl(studyUID)` | WADO-RS study thumbnail URL |
| `getSeriesThumbnailUrl(studyUID, seriesUID)` | WADO-RS series thumbnail URL |
| `getInstanceRenderedUrl(studyUID, seriesUID, sopUID)` | Rendered instance image URL |
| `getStudyMetadataUrl(studyUID)` | DICOM JSON metadata URL |
| `getSeriesSearchUrl(studyUID)` | QIDO-RS series search URL |
| `getInstancesSearchUrl(studyUID, seriesUID)` | QIDO-RS instance search URL |

### FHIR Helpers

| Function | Description |
|---|---|
| `getStudyInstanceUID(study)` | Extracts DICOM Study Instance UID from FHIR identifiers |
| `getModalityInfo(code)` | Maps modality code to `{ label, emoji }` |
| `getPrimaryModality(study)` | Gets primary modality from study resource |
| `getStudyTitle(study)` | Display title from procedure code or description |

### Cornerstone3D Helpers

| Function | Description |
|---|---|
| `getAccessToken()` | Raw access token for XHR requests |
| `buildImageId(studyUID, seriesUID, sopUID, frame?)` | Builds `wadors:` image ID for Cornerstone |
| `fetchSeriesImageIds(studyUID, seriesUID)` | Fetches QIDO-RS instances, returns array of Cornerstone image IDs |

## Supported Modalities

| Code | Label | Emoji |
|---|---|---|
| CT | CT Scan | 🫁 |
| MR | MRI | 🧲 |
| US | Ultrasound | 📡 |
| XR / DX / CR | X-Ray | ☢️ |
| MG | Mammography | 🩺 |
| NM | Nuclear Medicine | ⚛️ |
| PT | PET Scan | 🔬 |
| RF | Fluoroscopy | 📺 |
| XA | Angiography | 💉 |
| OT | Other | 📋 |

## Usage

The imaging module integrates into the Patient Portal dashboard automatically when `ImagingStudy` resources are present in the patient's FHIR data:

```tsx
import { ImagingStudyCard } from "@/components/ImagingStudyCard"

<ImagingStudyCard
  imagingStudies={patient.imagingStudies}
  radiologyResults={patient.radiologyResults}
/>
```

The viewer can also be used standalone:

```tsx
import { DicomViewerDialog, type ViewerTarget } from "@/components/DicomViewer"

const [target, setTarget] = useState<ViewerTarget | null>(null)

<DicomViewerDialog
  target={target}
  open={!!target}
  onOpenChange={(open) => !open && setTarget(null)}
/>
```
