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

// ── SHL mode override ─────────────────────────────────────────────────────
// When active, DICOM requests are routed through the SHL DICOMweb proxy
// with the opaque SHL session token instead of the SMART access token.

let shlOverride: { baseUrl: string; token: string } | null = null

/** Activate SHL mode — routes DICOMweb through /api/shl/dicomweb with the given token */
export function setShlDicomwebMode(token: string, apiBase: string) {
  const base = apiBase.replace(/\/fhir\/?$/, '')
  shlOverride = { baseUrl: `${base}/dicomweb`, token }
  // Rebuild clients with the SHL base
  activeDw = createDicomwebClient({
    baseUrl: shlOverride.baseUrl,
    getAccessToken: () => shlOverride?.token ?? null,
  })
  activeCsDw = null // force re-init on next use
}

/** Deactivate SHL mode — restores normal SMART-authenticated DICOMweb */
export function resetShlDicomwebMode() {
  shlOverride = null
  activeDw = defaultDw
  activeCsDw = null
}

/** Resolve the current access token (SHL-aware) */
function getEffectiveToken(): string | null {
  return shlOverride?.token ?? smartAuth.getToken()?.access_token ?? null
}

const defaultDw = createDicomwebClient({
  baseUrl: dicomwebBase,
  getAccessToken: () => getEffectiveToken(),
})

// Swappable active client — SHL mode replaces this with an SHL-scoped client
let activeDw = defaultDw

// -- Cornerstone-integrated client (lazy) --

let activeCsDw: CornerstoneDicomweb | null = null
let cachedImageLoader: import("@babelfhir-ts/dicomweb/cornerstone").DicomImageLoaderLike | null = null
const serverCsDwClients = new Map<string, CornerstoneDicomweb>()

export function initCornerstoneDicomweb(
  dicomImageLoader: import("@babelfhir-ts/dicomweb/cornerstone").DicomImageLoaderLike,
) {
  cachedImageLoader = dicomImageLoader
  if (activeCsDw) return activeCsDw
  const base = shlOverride?.baseUrl ?? dicomwebBase
  activeCsDw = createCornerstoneDicomweb({
    baseUrl: base,
    getAccessToken: () => getEffectiveToken(),
    cornerstone: { dicomImageLoader },
  })
  return activeCsDw
}

export function getCornerstoneDicomweb(): CornerstoneDicomweb {
  if (!activeCsDw) throw new Error("Cornerstone DICOMweb client not initialized")
  return activeCsDw
}

/** Get a Cornerstone DICOMweb client scoped to a specific server (created lazily) */
export function getServerCornerstoneDicomweb(serverId: string): CornerstoneDicomweb {
  let client = serverCsDwClients.get(serverId)
  if (!client) {
    if (!cachedImageLoader) throw new Error("Cornerstone DICOMweb client not initialized — call initCornerstoneDicomweb first")
    client = createCornerstoneDicomweb({
      baseUrl: getDicomwebBaseUrl(serverId),
      getAccessToken: () => getEffectiveToken(),
      cornerstone: { dicomImageLoader: cachedImageLoader },
    })
    serverCsDwClients.set(serverId, client)
  }
  return client
}

// -- Re-exports --

export { getStudyInstanceUID, getPrimaryModality, getStudyTitle, getModalityInfo }

// -- Server-scoped client cache --

const serverScopedClients = new Map<string, ReturnType<typeof createDicomwebClient>>()

/** Get (or create) a DICOMweb client scoped to a specific DICOM server by ID */
function getServerClient(serverId: string) {
  let client = serverScopedClients.get(serverId)
  if (!client) {
    const base = `${config.proxyBase || window.location.origin}/dicomweb/servers/${encodeURIComponent(serverId)}`
    client = createDicomwebClient({
      baseUrl: base,
      getAccessToken: () => getEffectiveToken(),
    })
    serverScopedClients.set(serverId, client)
  }
  return client
}

/** Resolve the effective DICOMweb client — server-scoped if serverId given, else active default */
function resolveClient(serverId?: string) {
  return serverId ? getServerClient(serverId) : activeDw
}

// -- URL builder wrappers --

export function getStudyThumbnailUrl(studyUID: string, serverId?: string): string {
  return resolveClient(serverId).studyThumbnailUrl(studyUID)
}

export function getSeriesThumbnailUrl(studyUID: string, seriesUID: string, serverId?: string): string {
  return resolveClient(serverId).seriesThumbnailUrl(studyUID, seriesUID)
}

export function getDicomwebAuthHeaders(): HeadersInit {
  return activeDw.authHeaders()
}

export function getAccessToken(): string | null {
  return getEffectiveToken()
}

/**
 * Get the DICOMweb base URL for a specific server (for Cornerstone integration).
 * Returns the default base when no serverId is specified.
 */
export function getDicomwebBaseUrl(serverId?: string): string {
  if (serverId) {
    return `${config.proxyBase || window.location.origin}/dicomweb/servers/${encodeURIComponent(serverId)}`
  }
  return shlOverride?.baseUrl ?? dicomwebBase
}

/**
 * Extract a DICOM server ID from an ImagingStudy.endpoint reference.
 * Convention: The Endpoint resource ID = the Proxy Smart DICOM server config ID.
 * e.g. "Endpoint/orthanc-1" → "orthanc-1"
 */
export function extractServerIdFromEndpoint(
  endpoints?: Array<{ reference?: string }>,
): string | undefined {
  if (!endpoints?.length) return undefined
  const ref = endpoints[0].reference
  if (!ref?.startsWith('Endpoint/')) return undefined
  return ref.replace('Endpoint/', '')
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
      throw new Error(`Upload failed with status ${resp.status}`, { cause: parseErr })
    }
  }

  return { status: resp.status, ok: resp.ok, instanceCount: buffers.length }
}
