import { Elysia, t } from 'elysia'
import { validateToken } from '../lib/auth'
import { AuthenticationError, ConfigurationError, extractBearerToken } from '../lib/admin-utils'
import { config } from '../config'
import { logger } from '../lib/logger'

/**
 * DICOMweb proxy routes
 * 
 * Proxies WADO-RS and QIDO-RS requests to an upstream DICOMweb-enabled PACS
 * (e.g. Orthanc, DCM4CHEE, Google Cloud Healthcare API).
 * 
 * Authentication: Validates the caller's SMART on FHIR bearer token before
 * forwarding. Optionally attaches upstream PACS credentials (Basic auth, etc.).
 * 
 * Route surface (mirrors the DICOMweb standard):
 * 
 * QIDO-RS (query):
 *   GET /dicomweb/studies
 *   GET /dicomweb/studies/:studyUID/series
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/instances
 * 
 * WADO-RS (retrieve):
 *   GET /dicomweb/studies/:studyUID
 *   GET /dicomweb/studies/:studyUID/metadata
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/metadata
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/instances/:sopUID
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/instances/:sopUID/frames/:frame
 *   GET /dicomweb/studies/:studyUID/rendered
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/rendered
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/instances/:sopUID/rendered
 *   GET /dicomweb/studies/:studyUID/thumbnail
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/thumbnail
 *   GET /dicomweb/studies/:studyUID/series/:seriesUID/instances/:sopUID/thumbnail
 */

// UID format: DICOM UIDs are dot-separated numeric strings (1.2.840.10008...)
const UidParam = t.String({ pattern: '^[0-9.]+$', description: 'DICOM UID (dot-separated numeric)' })

/** Build upstream URL from the DICOMweb base and the incoming sub-path + query string */
function buildUpstreamUrl(subPath: string, queryString: string): string {
  const base = config.dicomweb.baseUrl
  if (!base) throw new ConfigurationError('DICOMweb is not configured (DICOMWEB_BASE_URL not set)')
  // Normalize: strip trailing slash from base, prepend "/" to subPath if needed
  const normalizedBase = base.replace(/\/+$/, '')
  const path = subPath.startsWith('/') ? subPath : `/${subPath}`
  return `${normalizedBase}${path}${queryString}`
}

/** Forward a request to the upstream PACS and stream the response back */
async function proxyDicomWeb(request: Request, subPath: string, set: Record<string, any>): Promise<Response | string | object> {
  if (!config.dicomweb.enabled) {
    set.status = 501
    return { error: 'DICOMweb proxy is not configured', message: 'Set DICOMWEB_BASE_URL to enable DICOM imaging' }
  }

  // 1) Validate caller token
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    set.status = 401
    return { error: 'Authentication required' }
  }

  try {
    await validateToken(token)
  } catch (err) {
    if (err instanceof AuthenticationError) {
      set.status = 401
      return { error: 'Authentication failed', details: { message: err.message } }
    }
    throw err
  }

  // 2) Build upstream URL
  const requestUrl = new URL(request.url)
  const target = buildUpstreamUrl(subPath, requestUrl.search)

  // 3) Build upstream headers
  const headers = new Headers()
  // Forward Accept so the PACS can honour content negotiation (e.g. multipart/related, image/jpeg)
  const accept = request.headers.get('accept')
  if (accept) headers.set('accept', accept)

  // Attach upstream PACS auth if configured
  if (config.dicomweb.upstreamAuth) {
    headers.set('authorization', config.dicomweb.upstreamAuth)
  }

  // 4) Fetch from upstream PACS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.dicomweb.timeoutMs)

  try {
    logger.fhir.debug('DICOMweb proxy →', { target, method: 'GET' })

    const resp = await fetch(target, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    // Copy status
    set.status = resp.status

    // Copy relevant response headers (content-type is critical for multipart DICOM)
    const passthroughHeaders = ['content-type', 'content-length', 'content-disposition', 'etag', 'transfer-encoding']
    for (const h of passthroughHeaders) {
      const v = resp.headers.get(h)
      if (v) set.headers = { ...set.headers, [h]: v }
    }

    const contentType = resp.headers.get('content-type') || ''

    // For JSON responses (QIDO-RS metadata), parse and return as object
    if (contentType.includes('json')) {
      const text = await resp.text()
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    }

    // For binary/multipart responses (WADO-RS pixel data, rendered images),
    // return raw bytes so Elysia sends them as-is
    const buffer = await resp.arrayBuffer()
    return new Response(buffer, {
      status: resp.status,
      headers: { 'content-type': contentType },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.fhir.error('DICOMweb upstream timeout', { target, timeoutMs: config.dicomweb.timeoutMs })
      set.status = 504
      return { error: 'DICOMweb upstream timeout' }
    }
    logger.fhir.error('DICOMweb proxy error', { target, error: err })
    set.status = 502
    return { error: 'DICOMweb upstream error', details: err instanceof Error ? { message: err.message } : undefined }
  } finally {
    clearTimeout(timeout)
  }
}

/** Forward a POST (STOW-RS) request to the upstream PACS, streaming the body through */
async function proxyDicomWebPost(request: Request, subPath: string, set: Record<string, any>): Promise<Response | string | object> {
  if (!config.dicomweb.enabled) {
    set.status = 501
    return { error: 'DICOMweb proxy is not configured', message: 'Set DICOMWEB_BASE_URL to enable DICOM imaging' }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    set.status = 401
    return { error: 'Authentication required' }
  }

  try {
    await validateToken(token)
  } catch (err) {
    if (err instanceof AuthenticationError) {
      set.status = 401
      return { error: 'Authentication failed', details: { message: err.message } }
    }
    throw err
  }

  const requestUrl = new URL(request.url)
  const target = buildUpstreamUrl(subPath, requestUrl.search)

  const headers = new Headers()
  // STOW-RS requires the Content-Type with boundary for multipart/related
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const accept = request.headers.get('accept')
  if (accept) headers.set('accept', accept)
  if (config.dicomweb.upstreamAuth) {
    headers.set('authorization', config.dicomweb.upstreamAuth)
  }

  const controller = new AbortController()
  // STOW-RS uploads can be large — use 5× the normal timeout
  const timeout = setTimeout(() => controller.abort(), config.dicomweb.timeoutMs * 5)

  try {
    logger.fhir.info('DICOMweb STOW-RS →', { target })

    const resp = await fetch(target, {
      method: 'POST',
      headers,
      body: request.body,
      signal: controller.signal,
      // @ts-expect-error duplex needed for streaming body in some runtimes
      duplex: 'half',
    })

    set.status = resp.status
    const passthroughHeaders = ['content-type', 'content-length', 'etag']
    for (const h of passthroughHeaders) {
      const v = resp.headers.get(h)
      if (v) set.headers = { ...set.headers, [h]: v }
    }

    const respContentType = resp.headers.get('content-type') || ''
    if (respContentType.includes('json') || respContentType.includes('xml')) {
      return new Response(await resp.text(), {
        status: resp.status,
        headers: { 'content-type': respContentType },
      })
    }

    const buffer = await resp.arrayBuffer()
    return new Response(buffer, {
      status: resp.status,
      headers: { 'content-type': respContentType },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.fhir.error('DICOMweb STOW-RS timeout', { target })
      set.status = 504
      return { error: 'DICOMweb upstream timeout (STOW-RS)' }
    }
    logger.fhir.error('DICOMweb STOW-RS error', { target, error: err })
    set.status = 502
    return { error: 'DICOMweb upstream error', details: err instanceof Error ? { message: err.message } : undefined }
  } finally {
    clearTimeout(timeout)
  }
}

// ----- Elysia route plugin -----

const DicomWebErrorResponse = t.Object({
  error: t.String(),
  message: t.Optional(t.String()),
  details: t.Optional(t.Object({ message: t.Optional(t.String()) })),
})

const dicomwebDetail = (summary: string, description: string) => ({
  summary,
  description,
  tags: ['dicomweb'],
  security: [{ BearerAuth: [] }],
})

export const dicomwebRoutes = new Elysia({ prefix: '/dicomweb', tags: ['dicomweb'] })

  // ==================== QIDO-RS (Query) ====================

  .get('/studies', async ({ request, set }) => {
    return proxyDicomWeb(request, '/studies', set)
  }, {
    detail: dicomwebDetail('Search Studies (QIDO-RS)', 'Query for DICOM studies. Supports standard QIDO-RS query parameters (PatientName, PatientID, StudyDate, ModalitiesInStudy, etc.)'),
  })

  .get('/studies/:studyUID/series', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Search Series (QIDO-RS)', 'Query for series within a study'),
  })

  .get('/studies/:studyUID/series/:seriesUID/instances', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam }),
    detail: dicomwebDetail('Search Instances (QIDO-RS)', 'Query for instances within a series'),
  })

  // ==================== WADO-RS (Retrieve) ====================

  // Study-level
  .get('/studies/:studyUID', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Retrieve Study (WADO-RS)', 'Retrieve all instances of a study as multipart DICOM'),
  })

  .get('/studies/:studyUID/metadata', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/metadata`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Study Metadata (WADO-RS)', 'Retrieve DICOM JSON metadata for all instances in a study'),
  })

  .get('/studies/:studyUID/rendered', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/rendered`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Rendered Study (WADO-RS)', 'Retrieve a rendered (JPEG/PNG) representation of a study'),
  })

  .get('/studies/:studyUID/thumbnail', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/thumbnail`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Study Thumbnail (WADO-RS)', 'Retrieve a thumbnail image for a study'),
  })

  // Series-level
  .get('/studies/:studyUID/series/:seriesUID', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam }),
    detail: dicomwebDetail('Retrieve Series (WADO-RS)', 'Retrieve all instances of a series as multipart DICOM'),
  })

  .get('/studies/:studyUID/series/:seriesUID/metadata', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/metadata`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam }),
    detail: dicomwebDetail('Series Metadata (WADO-RS)', 'Retrieve DICOM JSON metadata for all instances in a series'),
  })

  .get('/studies/:studyUID/series/:seriesUID/rendered', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/rendered`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam }),
    detail: dicomwebDetail('Rendered Series (WADO-RS)', 'Retrieve a rendered representation of a series'),
  })

  .get('/studies/:studyUID/series/:seriesUID/thumbnail', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/thumbnail`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam }),
    detail: dicomwebDetail('Series Thumbnail (WADO-RS)', 'Retrieve a thumbnail image for a series'),
  })

  // Instance-level
  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam, sopUID: UidParam }),
    detail: dicomwebDetail('Retrieve Instance (WADO-RS)', 'Retrieve a single DICOM instance'),
  })

  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID/metadata', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}/metadata`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam, sopUID: UidParam }),
    detail: dicomwebDetail('Instance Metadata (WADO-RS)', 'Retrieve DICOM JSON metadata for a single instance'),
  })

  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID/rendered', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}/rendered`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam, sopUID: UidParam }),
    detail: dicomwebDetail('Rendered Instance (WADO-RS)', 'Retrieve a rendered (JPEG/PNG) representation of an instance'),
  })

  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID/thumbnail', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}/thumbnail`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam, sopUID: UidParam }),
    detail: dicomwebDetail('Instance Thumbnail (WADO-RS)', 'Retrieve a thumbnail image for an instance'),
  })

  // Frame-level
  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID/frames/:frame', async ({ request, params, set }) => {
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}/frames/${params.frame}`, set)
  }, {
    params: t.Object({
      studyUID: UidParam,
      seriesUID: UidParam,
      sopUID: UidParam,
      frame: t.String({ pattern: '^[0-9,]+$', description: 'Frame number(s), comma-separated for multi-frame' }),
    }),
    detail: dicomwebDetail('Retrieve Frame (WADO-RS)', 'Retrieve specific frame(s) from a multi-frame DICOM instance'),
  })

  // Bulkdata
  .get('/studies/:studyUID/series/:seriesUID/instances/:sopUID/bulkdata/*', async ({ request, params, set }) => {
    const wildcard = (params as any)['*'] || ''
    return proxyDicomWeb(request, `/studies/${params.studyUID}/series/${params.seriesUID}/instances/${params.sopUID}/bulkdata/${wildcard}`, set)
  }, {
    params: t.Object({ studyUID: UidParam, seriesUID: UidParam, sopUID: UidParam }),
    detail: dicomwebDetail('Retrieve Bulkdata (WADO-RS)', 'Retrieve bulkdata for an instance (e.g. pixel data by tag)'),
  })

  // ==================== STOW-RS (Store) ====================

  .post('/studies', async ({ request, set }) => {
    return proxyDicomWebPost(request, '/studies', set)
  }, {
    detail: dicomwebDetail('Store Instances (STOW-RS)', 'Store DICOM instances via multipart/related POST. Body must be multipart/related with application/dicom parts.'),
  })

  .post('/studies/:studyUID', async ({ request, params, set }) => {
    return proxyDicomWebPost(request, `/studies/${params.studyUID}`, set)
  }, {
    params: t.Object({ studyUID: UidParam }),
    detail: dicomwebDetail('Store Instances in Study (STOW-RS)', 'Store DICOM instances into a specific study via multipart/related POST.'),
  })
