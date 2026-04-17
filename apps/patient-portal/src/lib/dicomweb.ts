import { config } from "@/config"
import { smartAuth } from "@/lib/smart-auth"
import {
  createDicomwebClient,
  getStudyInstanceUID,
  getPrimaryModality,
  getStudyTitle,
  getModalityInfo,
} from "@babelfhir-ts/dicomweb"
import { createCornerstoneDicomweb, type CornerstoneDicomweb } from "@babelfhir-ts/dicomweb/cornerstone"

// -- Shared DICOMweb client instance --

const dicomwebBase = `${config.proxyBase || window.location.origin}/dicomweb`

const dw = createDicomwebClient({
  baseUrl: dicomwebBase,
  getAccessToken: () => smartAuth.getToken()?.access_token ?? null,
})

// -- Cornerstone-integrated client (lazy) --

let csDw: CornerstoneDicomweb | null = null

export function initCornerstoneDicomweb(
  dicomImageLoader: import("@babelfhir-ts/dicomweb/cornerstone").DicomImageLoaderLike,
) {
  if (csDw) return csDw
  csDw = createCornerstoneDicomweb({
    baseUrl: dicomwebBase,
    getAccessToken: () => smartAuth.getToken()?.access_token ?? null,
    cornerstone: { dicomImageLoader },
  })
  return csDw
}

export function getCornerstoneDicomweb(): CornerstoneDicomweb {
  if (!csDw) throw new Error("Cornerstone DICOMweb client not initialized")
  return csDw
}

// -- Re-exports --

export { getStudyInstanceUID, getPrimaryModality, getStudyTitle, getModalityInfo }

// -- URL builder wrappers --

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

// -- PACS Status --

export interface PacsStatus {
  configured: boolean
  reachable: boolean | null
  message: string
}

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

// -- STOW-RS (Store) --

const STOW_BOUNDARY = "----DICOMwebBoundary"

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
  status: number
  ok: boolean
  instanceCount: number
}

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

  if (!resp.ok) {
    try {
      const errBody = await resp.json() as { error?: string; message?: string }
      const msg = errBody.message || errBody.error || `PACS returned status ${resp.status}`
      throw new Error(msg)
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== `PACS returned status ${resp.status}`) {
        throw parseErr
      }
      throw new Error(`Upload failed with status ${resp.status}`)
    }
  }

  return { status: resp.status, ok: resp.ok, instanceCount: buffers.length }
}
