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

// ── Re-exports (typed to ImagingStudyUvIps) ──────────────────────────────

export { getStudyInstanceUID, getPrimaryModality, getStudyTitle, getModalityInfo }

// ── URL builder wrappers ─────────────────────────────────────────────────

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

// ── Cornerstone helpers ──────────────────────────────────────────────────

export { buildImageId }

export async function fetchSeriesImageIds(
  studyUID: string,
  seriesUID: string,
): Promise<string[]> {
  return fetchSeriesImageIdsRaw(dicomwebBase, studyUID, seriesUID, dw.authHeaders())
}
