import { config } from "@/config"
import { smartAuth } from "@/lib/smart-auth"
import type { ImagingStudy } from "@/lib/fhir-client"

/**
 * DICOMweb URL helpers for the patient portal.
 *
 * Constructs proxy-relative URLs that hit the backend's /dicomweb/* route,
 * which in turn proxies to the configured upstream PACS (Orthanc, etc.).
 *
 * The base URL uses the same origin as the FHIR proxy (config.proxyBase).
 */

/** Base URL for the DICOMweb proxy (e.g. "http://localhost:8445/dicomweb") */
export function getDicomwebBase(): string {
  const origin = config.proxyBase || window.location.origin
  return `${origin}/dicomweb`
}

// ── UID extraction from FHIR ImagingStudy ─────────────────────────────────

/**
 * Extract the DICOM Study Instance UID from an ImagingStudy resource.
 * Looks in identifiers for system "urn:dicom:uid" or "urn:oid:",
 * then falls back to parsing the resource id.
 */
export function getStudyInstanceUID(study: ImagingStudy): string | null {
  // Standard: identifier with system urn:dicom:uid, value prefixed "urn:oid:"
  for (const id of study.identifier ?? []) {
    if (id.system === "urn:dicom:uid" && id.value) {
      return id.value.replace(/^urn:oid:/, "")
    }
  }
  // Fallback: any identifier with urn:oid: in its value
  for (const id of study.identifier ?? []) {
    if (id.value?.startsWith("urn:oid:")) {
      return id.value.replace(/^urn:oid:/, "")
    }
  }
  return null
}

// ── URL builders ──────────────────────────────────────────────────────────

/** WADO-RS: Retrieve rendered (JPEG/PNG) thumbnail for a study */
export function getStudyThumbnailUrl(studyUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/thumbnail`
}

/** WADO-RS: Retrieve rendered thumbnail for a specific series */
export function getSeriesThumbnailUrl(studyUID: string, seriesUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/series/${seriesUID}/thumbnail`
}

/** WADO-RS: Retrieve rendered (JPEG/PNG) image for an instance */
export function getInstanceRenderedUrl(studyUID: string, seriesUID: string, sopUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/series/${seriesUID}/instances/${sopUID}/rendered`
}

/** WADO-RS: Retrieve study metadata (DICOM JSON array) */
export function getStudyMetadataUrl(studyUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/metadata`
}

/** QIDO-RS: Search for series in a study */
export function getSeriesSearchUrl(studyUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/series`
}

/** QIDO-RS: Search for instances in a series */
export function getInstancesSearchUrl(studyUID: string, seriesUID: string): string {
  return `${getDicomwebBase()}/studies/${studyUID}/series/${seriesUID}/instances`
}

// ── Display helpers ───────────────────────────────────────────────────────

/** Map DICOM modality code to a human-readable label + emoji */
const MODALITY_LABELS: Record<string, { label: string; emoji: string }> = {
  CT: { label: "CT Scan", emoji: "🔬" },
  MR: { label: "MRI", emoji: "🧲" },
  US: { label: "Ultrasound", emoji: "📡" },
  XR: { label: "X-Ray", emoji: "☢️" },
  CR: { label: "X-Ray (CR)", emoji: "☢️" },
  DX: { label: "Digital X-Ray", emoji: "☢️" },
  MG: { label: "Mammography", emoji: "🩻" },
  NM: { label: "Nuclear Medicine", emoji: "⚛️" },
  PT: { label: "PET Scan", emoji: "⚛️" },
  RF: { label: "Fluoroscopy", emoji: "📺" },
  XA: { label: "Angiography", emoji: "🫀" },
  OT: { label: "Other", emoji: "📋" },
  SC: { label: "Secondary Capture", emoji: "📸" },
  SR: { label: "Structured Report", emoji: "📄" },
  DOC: { label: "Document", emoji: "📄" },
}

export function getModalityInfo(code: string): { label: string; emoji: string } {
  return MODALITY_LABELS[code] ?? { label: code, emoji: "🏥" }
}

/** Get the primary modality code from an ImagingStudy */
export function getPrimaryModality(study: ImagingStudy): string | null {
  // Study-level modality array
  if (study.modality?.length) {
    return study.modality[0].code ?? null
  }
  // Fallback: first series modality
  if (study.series?.length) {
    return study.series[0].modality?.code ?? null
  }
  return null
}

/** Get a display title for an ImagingStudy */
export function getStudyTitle(study: ImagingStudy): string {
  return (
    study.procedureCode?.[0]?.coding?.[0]?.display ||
    study.description ||
    "Imaging Study"
  )
}

/** Build an authorization header value for DICOMweb fetch requests */
export function getDicomwebAuthHeaders(): HeadersInit {
  const token = smartAuth.getToken()
  if (!token?.access_token) return {}
  return { Authorization: `Bearer ${token.access_token}` }
}

/** Get the current access token string (for Cornerstone loader beforeSend) */
export function getAccessToken(): string | null {
  return smartAuth.getToken()?.access_token ?? null
}

/**
 * Build Cornerstone3D WADO-RS imageId for a single frame.
 * Format: `wadors:{wadoRsRoot}/studies/{study}/series/{series}/instances/{sop}/frames/{frame}`
 */
export function buildImageId(
  studyUID: string,
  seriesUID: string,
  sopUID: string,
  frame = 1,
): string {
  return `wadors:${getDicomwebBase()}/studies/${studyUID}/series/${seriesUID}/instances/${sopUID}/frames/${frame}`
}

/**
 * Fetch WADO-RS metadata for a series and return Cornerstone imageIds.
 * Calls QIDO-RS instances search, then builds imageId per instance.
 */
export async function fetchSeriesImageIds(
  studyUID: string,
  seriesUID: string,
): Promise<string[]> {
  const url = getInstancesSearchUrl(studyUID, seriesUID)
  const res = await fetch(url, { headers: getDicomwebAuthHeaders() })
  if (!res.ok) return []

  const instances: Array<Record<string, unknown>> = await res.json()

  // QIDO-RS returns DICOM JSON: tag 00080018 = SOP Instance UID
  const SOP_INSTANCE_UID_TAG = "00080018"
  return instances
    .map((inst) => {
      const sopObj = inst[SOP_INSTANCE_UID_TAG] as { Value?: string[] } | undefined
      const sopUID = sopObj?.Value?.[0]
      if (!sopUID) return null
      return buildImageId(studyUID, seriesUID, sopUID)
    })
    .filter((id): id is string => id !== null)
}
