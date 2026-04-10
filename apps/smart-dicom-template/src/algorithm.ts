/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SMART DICOM Algorithm Template                                ║
 * ║                                                                ║
 * ║  This is the ONLY file you need to edit.                       ║
 * ║  Implement your imaging analysis logic in `runAlgorithm()`.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type { ImagingStudy } from "fhir/r4"

// ── Input provided to your algorithm ─────────────────────────────────────

export interface AlgorithmInput {
  /** DICOM Study Instance UID */
  studyUID: string

  /** Cornerstone3D wadors: image IDs for immediate pixel-level access */
  imageIds: string[]

  /** The full FHIR ImagingStudy resource from the EHR */
  imagingStudy: ImagingStudy

  /** FHIR patient reference, e.g. "Patient/123" */
  patientReference: string

  /** OAuth2 access token for authenticated API calls */
  accessToken: string | null
}

// ── Result your algorithm must return ────────────────────────────────────

export interface AlgorithmResult {
  /** Short title for the finding (displayed in the UI) */
  title: string

  /** Detailed description of the analysis result */
  description: string

  /** Confidence score between 0 and 1 (optional) */
  confidence?: number

  /** Clinical code for the finding, e.g. SNOMED CT or LOINC (optional) */
  code?: {
    system: string
    code: string
    display: string
  }

  /** Severity: info, warning, or critical (optional, default: "info") */
  severity?: "info" | "warning" | "critical"
}

// ── Your algorithm implementation ────────────────────────────────────────

export async function runAlgorithm(input: AlgorithmInput): Promise<AlgorithmResult> {
  // ┌──────────────────────────────────────────────────────────────┐
  // │  Replace this stub with your imaging analysis logic.        │
  // │                                                             │
  // │  You have access to:                                        │
  // │    input.imageIds      — Cornerstone wadors: image IDs      │
  // │    input.studyUID      — DICOM Study Instance UID           │
  // │    input.imagingStudy  — FHIR ImagingStudy resource         │
  // │    input.patientReference — e.g. "Patient/123"              │
  // │    input.accessToken   — For authenticated API calls        │
  // │                                                             │
  // │  Examples:                                                  │
  // │    • Call an external AI inference API with pixel data       │
  // │    • Run a WASM-compiled model in the browser               │
  // │    • Apply DICOM metadata rules (modality, body part, etc.) │
  // │    • Check image quality metrics                            │
  // └──────────────────────────────────────────────────────────────┘

  console.log(`[Algorithm] Processing study ${input.studyUID} with ${input.imageIds.length} images`)

  return {
    title: "Sample Finding",
    description:
      "This is a placeholder result. Replace runAlgorithm() in src/algorithm.ts with your imaging analysis logic.",
    confidence: 0.95,
    severity: "info",
  }
}
