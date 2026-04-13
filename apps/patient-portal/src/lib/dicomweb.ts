import { config } from "@/config"
import { smartAuth } from "@/lib/smart-auth"
import {
  createDicomwebClient,
  getStudyInstanceUID,
  getPrimaryModality,
  getStudyTitle,
  getModalityInfo,
} from "hl7.fhir.uv.ips-generated/dicomweb"
import {
  buildImageId,
  fetchSeriesImageIds as fetchSeriesImageIdsRaw,
} from "hl7.fhir.uv.ips-generated/dicomweb/cornerstone"

// ── Shared DICOMweb client instance ───────────────────────────────────────

const dicomwebBase = `${config.proxyBase || window.location.origin}/dicomweb`

const dw = createDicomwebClient({
  baseUrl: dicomwebBase,
  getAccessToken: () => smartAuth.getToken()?.access_token ?? null,
})

// ── Re-exports from @babelfhir-ts/dicomweb (typed to ImagingStudyUvIps) ──

export { getStudyInstanceUID, getPrimaryModality, getStudyTitle, getModalityInfo }

// ── URL builder wrappers (delegate to client instance) ────────────────────

export function getStudyThumbnailUrl(studyUID: string): string {
  return dw.studyThumbnailUrl(studyUID)
}

export function getSeriesThumbnailUrl(studyUID: string, seriesUID: string): string {
  return dw.seriesThumbnailUrl(studyUID, seriesUID)
}

export function getDicomwebAuthHeaders(): HeadersInit {
  return dw.authHeaders()
}

export function getAccessToken(): string | null {
  return smartAuth.getToken()?.access_token ?? null
}

// ── Cornerstone helpers (bound to this client's base URL) ─────────────────

export { buildImageId }

export async function fetchSeriesImageIds(
  studyUID: string,
  seriesUID: string,
): Promise<string[]> {
  return fetchSeriesImageIdsRaw(dicomwebBase, studyUID, seriesUID, dw.authHeaders())
}

// ── STOW-RS (Store) ──────────────────────────────────────────────────────

/** DICOM multipart/related boundary for STOW-RS */
const STOW_BOUNDARY = "----DICOMwebBoundary"

// ── PACS Status ──────────────────────────────────────────────────────────

export interface PacsStatus {
  configured: boolean
  reachable: boolean | null
  message: string
}

/**
 * Check if the PACS is configured and reachable.
 * Calls the unauthenticated `/dicomweb/status` endpoint.
 */
export async function checkPacsStatus(): Promise<PacsStatus> {
  try {
    const resp = await fetch(`${dicomwebBase}/status`)
    if (!resp.ok) {
      return { configured: false, reachable: null, message: "Could not check PACS status" }
    }
    return await resp.json() as PacsStatus
  } catch {
    return { configured: false, reachable: null, message: "Backend is not reachable" }
  }
}

/**
 * Build a STOW-RS multipart/related body from raw .dcm file ArrayBuffers.
 * Each part is application/dicom.
 */
function buildStowBody(dicomParts: ArrayBuffer[]): Blob {
  const parts: BlobPart[] = []
  const encoder = new TextEncoder()

  for (const dcm of dicomParts) {
    parts.push(encoder.encode(`\r\n--${STOW_BOUNDARY}\r\nContent-Type: application/dicom\r\n\r\n`))
    parts.push(dcm)
  }
  parts.push(encoder.encode(`\r\n--${STOW_BOUNDARY}--\r\n`))

  return new Blob(parts)
}

export interface StowResult {
  /** HTTP status from PACS */
  status: number
  /** Whether the store succeeded (2xx) */
  ok: boolean
  /** Number of instances sent */
  instanceCount: number
}

/**
 * Upload DICOM files to the PACS via STOW-RS.
 * Accepts an array of .dcm File objects (or ArrayBuffers).
 */
export async function storeInstances(files: File[]): Promise<StowResult> {
  const buffers = await Promise.all(files.map(f => f.arrayBuffer()))
  const body = buildStowBody(buffers)

  const token = smartAuth.getToken()?.access_token
  if (!token) throw new Error("No valid SMART token for STOW-RS upload")

  let resp: Response
  try {
    resp = await fetch(`${dicomwebBase}/studies`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; type="application/dicom"; boundary=${STOW_BOUNDARY}`,
        Authorization: `Bearer ${token}`,
        Accept: "application/dicom+json",
      },
      body,
    })
  } catch {
    throw new Error("Unable to connect to the imaging server. Please try again later.")
  }

  // Parse structured error responses from the proxy
  if (!resp.ok) {
    try {
      const errBody = await resp.json() as { error?: string; message?: string }
      const msg = errBody.message || errBody.error || `PACS returned status ${resp.status}`
      throw new Error(msg)
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== `PACS returned status ${resp.status}`) {
        throw parseErr // re-throw the structured message
      }
      throw new Error(`Upload failed with status ${resp.status}`)
    }
  }

  return {
    status: resp.status,
    ok: resp.ok,
    instanceCount: buffers.length,
  }
}
