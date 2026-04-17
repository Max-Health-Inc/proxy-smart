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
