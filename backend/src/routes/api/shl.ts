/**
 * SMART Health Links (SHL) API Routes — Proxy Architecture
 *
 * Spec-compliant SHL creation and manifest serving for QR-based patient data sharing.
 * Uses kill-the-clipboard for JWE encryption (alg:dir, enc:A256GCM) and SHL URI generation.
 *
 * PROXY PATTERN: No real tokens leave the server. The SHL manifest contains an opaque
 * session token + aud pointing to /api/shl/fhir. The viewer calls our FHIR proxy,
 * and the backend uses a Keycloak service account to fetch data from the real FHIR server.
 *
 * Content type: application/smart-api-access (SMART Access Token Response)
 * @see https://build.fhir.org/ig/HL7/smart-health-cards-and-links/links-specification.html
 */

import { Elysia, t } from 'elysia'
import { SHL, encryptSHLFile } from 'kill-the-clipboard'
import type { SHLFileContentType } from 'kill-the-clipboard'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'
import { getAllServers } from '@/lib/fhir-server-store'
import { getDefaultDicomServer } from '@/lib/runtime-config'
import { shortenUrl } from '@/lib/url-shortener'
import * as crypto from 'crypto'

// KTC doesn't support smart-api-access yet (in their Future Work).
// The JWE format is identical — just a different cty header string.
const SMART_API_ACCESS = 'application/smart-api-access' as SHLFileContentType

// ── In-memory SHL session store (TTL-based, no real tokens stored) ──────────

interface ShlSession {
  /** SHL payload from kill-the-clipboard (for manifest serving) */
  shl: { url: string; key: string; exp?: number; flag?: string; label?: string }
  /** JWE compact string (spec-compliant, encrypted with SHL key) */
  jwe: string
  /** Opaque session token (256-bit, base64url) — used as Bearer token by viewer */
  sessionToken: string
  /** Patient ID to scope FHIR requests */
  patientId: string
  /** Upstream FHIR server base URL */
  fhirServerUrl: string
  /** Expiry timestamp (ms) */
  expiresAt: number
  /** Whether verified-only filter is active */
  verifiedOnly: boolean
  /** Number of manifest accesses */
  accessCount: number
  /** Optional passcode (hashed) */
  passcodeHash?: string
}

const shlStore = new Map<string, ShlSession>()
/** Reverse index: sessionToken → shlId for fast FHIR proxy lookups */
const tokenIndex = new Map<string, string>()

// Cleanup expired entries every 60s
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of shlStore) {
    if (now > entry.expiresAt) {
      tokenIndex.delete(entry.sessionToken)
      shlStore.delete(id)
    }
  }
}, 60_000)
cleanupInterval.unref()

// ── Service Account Token Cache ─────────────────────────────────────────────

let serviceAccountToken: { token: string; expiresAt: number } | null = null

/** Get a Keycloak service account token (client_credentials grant), cached until near-expiry */
async function getServiceAccountToken(): Promise<string> {
  // Return cached token if still valid (with 30s buffer)
  if (serviceAccountToken && Date.now() < serviceAccountToken.expiresAt - 30_000) {
    return serviceAccountToken.token
  }

  const kcBase = config.keycloak.baseUrl
  const realm = config.keycloak.realm
  if (!kcBase || !realm) throw new Error('Keycloak not configured')

  const clientId = process.env.SHL_EXCHANGE_CLIENT_ID || 'shl-exchange'
  const clientSecret = process.env.SHL_EXCHANGE_CLIENT_SECRET
  if (!clientSecret) throw new Error('SHL_EXCHANGE_CLIENT_SECRET not configured')

  const tokenUrl = `${kcBase}/realms/${realm}/protocol/openid-connect/token`
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid patient/*.read',
    }).toString(),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>
    logger.auth.error('SHL service account token failed', {
      status: resp.status,
      error: err.error,
      description: err.error_description,
    })
    throw new Error(`Service account auth failed: ${err.error_description || resp.statusText}`)
  }

  const data = await resp.json() as { access_token: string; expires_in: number }
  serviceAccountToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

/** Resolve the first available FHIR server URL */
async function getDefaultFhirServerUrl(): Promise<string> {
  const servers = await getAllServers()
  if (servers.length > 0) return servers[0].url
  return config.fhir.serverBases[0] || 'http://localhost:8081/fhir'
}

// ── Route schemas ───────────────────────────────────────────────────────────

const ErrorResponse = t.Object({ error: t.String() })

const CreateShlBody = t.Object({
  label: t.Optional(t.String({ description: 'Label shown to recipient' })),
  passcode: t.Optional(t.String({ description: 'Optional passcode to protect the SHL' })),
  expiresInMinutes: t.Optional(t.Number({ description: 'Expiry in minutes (default 60, max 4320 = 72h)', default: 60 })),
  verifiedOnly: t.Optional(t.Boolean({ description: 'Whether to include only verified resources', default: false })),
  shortenUrl: t.Optional(t.Boolean({ description: 'Opt-in: shorten the viewer URL via go.maxhealth.tech (stored securely, auto-expires)', default: false })),
  maxUses: t.Optional(t.Number({ description: 'Maximum number of times the shortened URL can be accessed before expiring (only when shortenUrl is true)', minimum: 1 })),
})

const ShlResponse = t.Object({
  shlinkPayload: t.String({ description: 'Base64url-encoded SHL payload for QR encoding' }),
  viewerUrl: t.String({ description: 'Full URL for QR code (viewer app with SHL in hash)' }),
  shortUrl: t.Optional(t.String({ description: 'Shortened viewer URL via go.maxhealth.tech (if available)' })),
  expiresAt: t.String({ description: 'ISO 8601 expiry timestamp' }),
})

const ManifestRequest = t.Object({
  recipient: t.Optional(t.String({ description: 'Recipient identifier (for audit)' })),
  passcode: t.Optional(t.String({ description: 'Passcode if SHL is passcode-protected' })),
  embeddedLengthMax: t.Optional(t.Number({ description: 'Max embedded payload size in bytes' })),
})

// ── SHL FHIR proxy handler ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function shlFhirProxyHandler({ request, params, headers, set }: any) {
  try {
    const bearerToken = extractBearerToken(headers)
    if (!bearerToken) {
      set.status = 401
      return { error: 'Bearer token required' }
    }

    const shlId = tokenIndex.get(bearerToken)
    if (!shlId) {
      set.status = 401
      return { error: 'Invalid or expired session token' }
    }

    const session = shlStore.get(shlId)
    if (!session) {
      tokenIndex.delete(bearerToken)
      set.status = 401
      return { error: 'Session not found' }
    }

    if (Date.now() > session.expiresAt) {
      tokenIndex.delete(bearerToken)
      shlStore.delete(shlId)
      set.status = 410
      return { error: 'Share link has expired' }
    }

    // Extract the FHIR path after /fhir/ (empty string for base /fhir route)
    const fhirPath = (params as Record<string, string>)?.['*'] || ''

    // Scope enforcement: only allow requests scoped to the session's patient
    const url = new URL(request.url)
    const patientParam = url.searchParams.get('patient')
    const pathSegments = fhirPath.split('/')

    if (pathSegments[0] === 'Patient') {
      if (pathSegments[1] && pathSegments[1] !== session.patientId) {
        set.status = 403
        return { error: 'Access denied: patient scope mismatch' }
      }
    } else if (patientParam && patientParam !== `Patient/${session.patientId}` && patientParam !== session.patientId) {
      set.status = 403
      return { error: 'Access denied: patient scope mismatch' }
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      set.status = 405
      return { error: 'Only read operations are allowed on shared links' }
    }

    let serviceToken: string
    try {
      serviceToken = await getServiceAccountToken()
    } catch (tokenError) {
      const msg = tokenError instanceof Error ? tokenError.message : 'Unknown auth error'
      logger.auth.error('SHL service account token failed', { shlId, error: msg })
      set.status = 503
      return { error: `Service account auth unavailable: ${msg}` }
    }

    const queryString = url.search
    const targetUrl = `${session.fhirServerUrl}/${fhirPath}${queryString}`

    let resp: Response
    try {
      resp = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Accept': 'application/fhir+json',
          'Authorization': `Bearer ${serviceToken}`,
        },
      })
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : 'Unknown network error'
      logger.auth.error('SHL FHIR upstream unreachable', { shlId, targetUrl, error: msg })
      set.status = 502
      return { error: `Upstream FHIR server unreachable: ${msg}` }
    }

    set.status = resp.status
    const contentType = resp.headers.get('content-type')
    if (contentType) set.headers['content-type'] = contentType
    set.headers['access-control-allow-origin'] = '*'
    set.headers['access-control-allow-headers'] = 'Authorization, Content-Type'

    logger.auth.debug('SHL FHIR proxy request', {
      shlId,
      method: request.method,
      fhirPath,
      targetUrl,
      status: resp.status,
    })

    // Rewrite upstream FHIR URLs to point through the SHL proxy
    const text = await resp.text()
    const proxyBase = `${config.baseUrl}/api/shl/fhir`
    return text.replaceAll(session.fhirServerUrl, proxyBase)
  } catch (error) {
    logger.auth.error('SHL FHIR proxy error', { error })
    set.status = 500
    return { error: 'Internal SHL proxy error' }
  }
}

// ── SHL DICOMweb proxy handler ──────────────────────────────────────────────

/** Build auth header for a DICOM server config */
function buildDicomAuthHeader(server: { authType?: string; authHeader?: string; username?: string; password?: string }): string | null {
  switch (server.authType) {
    case 'basic':
      if (server.username && server.password) {
        return `Basic ${Buffer.from(`${server.username}:${server.password}`).toString('base64')}`
      }
      return null
    case 'bearer':
    case 'header':
      return server.authHeader || null
    default:
      return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function shlDicomwebProxyHandler({ request, params, headers, set }: any) {
  try {
    const bearerToken = extractBearerToken(headers)
    if (!bearerToken) {
      set.status = 401
      return { error: 'Bearer token required' }
    }

    const shlId = tokenIndex.get(bearerToken)
    if (!shlId) {
      set.status = 401
      return { error: 'Invalid or expired session token' }
    }

    const session = shlStore.get(shlId)
    if (!session) {
      tokenIndex.delete(bearerToken)
      set.status = 401
      return { error: 'Session not found' }
    }

    if (Date.now() > session.expiresAt) {
      tokenIndex.delete(bearerToken)
      shlStore.delete(shlId)
      set.status = 410
      return { error: 'Share link has expired' }
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      set.status = 405
      return { error: 'Only read operations are allowed on shared links' }
    }

    // Resolve the configured DICOM server
    const dicomServer = getDefaultDicomServer()
    if (!dicomServer) {
      set.status = 501
      return { error: 'DICOMweb proxy is not configured' }
    }

    const dicomPath = (params as Record<string, string>)?.['*'] || ''
    const url = new URL(request.url)
    const targetUrl = `${dicomServer.baseUrl.replace(/\/+$/, '')}/${dicomPath}${url.search}`

    // Build upstream headers
    const upstreamHeaders = new Headers()
    const accept = request.headers.get('accept')
    if (accept) upstreamHeaders.set('accept', accept)
    const upstreamAuth = buildDicomAuthHeader(dicomServer)
    if (upstreamAuth) upstreamHeaders.set('authorization', upstreamAuth)

    let resp: Response
    try {
      resp = await fetch(targetUrl, {
        method: request.method,
        headers: upstreamHeaders,
      })
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : 'Unknown network error'
      logger.auth.error('SHL DICOMweb upstream unreachable', { shlId, targetUrl, error: msg })
      set.status = 502
      return { error: `Upstream DICOMweb server unreachable: ${msg}` }
    }

    set.status = resp.status
    // Forward content-type faithfully (DICOM uses multipart/related, application/dicom+json, etc.)
    const contentType = resp.headers.get('content-type')
    if (contentType) set.headers['content-type'] = contentType
    set.headers['access-control-allow-origin'] = '*'
    set.headers['access-control-allow-headers'] = 'Authorization, Content-Type, Accept'

    logger.auth.debug('SHL DICOMweb proxy request', {
      shlId,
      method: request.method,
      dicomPath,
      targetUrl,
      status: resp.status,
    })

    // Return raw binary/multipart body — no URL rewriting needed for DICOMweb
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'Authorization, Content-Type, Accept',
      },
    })
  } catch (error) {
    logger.auth.error('SHL DICOMweb proxy error', { error })
    set.status = 500
    return { error: 'Internal SHL DICOMweb proxy error' }
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

export const shlRoutes = new Elysia({ prefix: '/shl', tags: ['shl'] })

  /**
   * Create a new SMART Health Link.
   * Generates an opaque proxy session — no real tokens leave the server.
   */
  .post('/', async ({ body, headers, set }) => {
    try {
      const userToken = extractBearerToken(headers)
      if (!userToken) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const tokenPayload = await validateToken(userToken)

      const expiresInMinutes = Math.min(body.expiresInMinutes ?? 60, 4320) // max 72h
      const ttlSeconds = expiresInMinutes * 60
      const expiresAt = Date.now() + ttlSeconds * 1000

      // Resolve patient ID from token claims:
      // 1. Explicit smart_patient / patient claim (clinician with patient context)
      // 2. Fallback: derive from fhirUser if it's a Patient reference (patient portal user IS the patient)
      let patientId = tokenPayload.smart_patient || tokenPayload.patient
      if (!patientId && tokenPayload.fhirUser) {
        const match = String(tokenPayload.fhirUser).match(/Patient\/([^/]+)$/)
        if (match) patientId = match[1]
      }
      if (!patientId) {
        set.status = 400
        return { error: 'No patient context in token (smart_patient, patient, or fhirUser Patient reference required)' }
      }

      // Generate opaque session token (256-bit, base64url-encoded)
      const sessionToken = crypto.randomBytes(32).toString('base64url')

      // Resolve the upstream FHIR server URL
      const fhirServerUrl = await getDefaultFhirServerUrl()

      // Build the SMART API Access token response (per SHL spec)
      // aud points to our FHIR proxy — the viewer never talks to the real FHIR server
      const smartApiAccess = JSON.stringify({
        access_token: sessionToken,
        token_type: 'Bearer',
        expires_in: ttlSeconds,
        scope: 'patient/*.read',
        patient: patientId,
        aud: `${config.baseUrl}/api/shl/fhir`,
      })

      // Generate SHL using kill-the-clipboard
      const shlId = crypto.randomUUID()
      const shl = SHL.generate({
        id: shlId,
        baseManifestURL: `${config.baseUrl}/api/shl/`,
        manifestPath: shlId,
        expirationDate: new Date(expiresAt),
        flag: body.passcode ? 'P' : undefined,
        label: body.label,
      })

      // JWE-encrypt the token response using SHL's key (spec: alg:dir, enc:A256GCM)
      const jwe = await encryptSHLFile({
        content: smartApiAccess,
        key: shl.key,
        contentType: SMART_API_ACCESS,
      })

      const passcodeHash = body.passcode
        ? crypto.createHash('sha256').update(body.passcode).digest('hex')
        : undefined

      // Store session (proxy token → patient data mapping, no real tokens)
      shlStore.set(shlId, {
        shl: shl.payload,
        jwe,
        sessionToken,
        patientId,
        fhirServerUrl,
        expiresAt,
        verifiedOnly: body.verifiedOnly ?? false,
        accessCount: 0,
        passcodeHash,
      })
      tokenIndex.set(sessionToken, shlId)

      // Build the SHL URI and viewer URL
      const shlinkURI = shl.toURI()
      const shlinkPayload = shlinkURI.replace('shlink:/', '')
      const viewerUrl = `${config.baseUrl}/apps/patient-portal/#${shlinkURI}`

      // Shorten the viewer URL for QR codes / messaging (opt-in, best-effort)
      const shortUrl = body.shortenUrl
        ? await shortenUrl(viewerUrl, {
            expiresAt: new Date(expiresAt).toISOString(),
            ...(body.maxUses && { maxUses: body.maxUses }),
          })
        : null

      logger.auth.info('SHL created', {
        shlId,
        patientId,
        expiresInMinutes,
        hasPasscode: !!passcodeHash,
        verifiedOnly: body.verifiedOnly ?? false,
      })

      return {
        shlinkPayload,
        viewerUrl,
        ...(shortUrl && { shortUrl }),
        expiresAt: new Date(expiresAt).toISOString(),
      }
    } catch (error) {
      logger.auth.error('SHL creation failed', { error })
      set.status = 500
      return { error: error instanceof Error ? error.message : 'SHL creation failed' }
    }
  }, {
    body: CreateShlBody,
    response: { 200: ShlResponse, 401: ErrorResponse, 500: ErrorResponse },
    detail: {
      summary: 'Create SMART Health Link',
      description: 'Create a spec-compliant SHL for QR-based patient data sharing. Uses JWE (A256GCM) encryption via kill-the-clipboard.',
      tags: ['shl'],
      security: [{ BearerAuth: [] }],
    },
  })

  /**
   * SHL Manifest endpoint (recipient POST).
   * Returns spec-compliant manifest with JWE-encrypted smart-api-access file.
   * kill-the-clipboard builds URLs as {baseManifestURL}{key}/{id}
   */
  .post('/:key/:id', async ({ params, body, set }) => {
    const entry = shlStore.get(params.id)
    if (!entry) {
      set.status = 404
      return { error: 'SHL not found or expired' }
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      shlStore.delete(params.id)
      set.status = 410
      return { error: 'SHL has expired' }
    }

    // Passcode validation (per SHL spec)
    if (entry.passcodeHash) {
      if (!body.passcode) {
        set.status = 401
        return JSON.stringify({ remainingAttempts: 3 })
      }
      const hash = crypto.createHash('sha256').update(body.passcode).digest('hex')
      if (hash !== entry.passcodeHash) {
        set.status = 401
        return JSON.stringify({ remainingAttempts: 2 })
      }
    }

    entry.accessCount++

    logger.auth.info('SHL manifest accessed', {
      shlId: params.id,
      accessCount: entry.accessCount,
      recipient: body.recipient,
    })

    // Return spec-compliant SHL manifest
    // The JWE compact string goes directly in `embedded` (not wrapped in custom JSON)
    return {
      files: [{
        contentType: SMART_API_ACCESS as string,
        embedded: entry.jwe,
      }],
    }
  }, {
    params: t.Object({ key: t.String(), id: t.String() }),
    body: ManifestRequest,
    detail: {
      summary: 'Fetch SHL Manifest',
      description: 'Spec-compliant SHL manifest endpoint. Returns JWE-encrypted smart-api-access token.',
      tags: ['shl'],
    },
  })

  /**
   * FHIR Proxy for SHL viewers.
   * Validates the opaque session token, then proxies to the real FHIR server
   * using a Keycloak service account. No user tokens ever reach the viewer.
   *
   * Two routes: `/fhir` (for _getpages pagination) and `/fhir/*` (for resource paths).
   */
  .all('/fhir', shlFhirProxyHandler, {
    detail: {
      summary: 'SHL FHIR Proxy (base)',
      description: 'Handles _getpages pagination requests via the SHL FHIR proxy.',
      tags: ['shl'],
      hide: true,
    },
  })
  .all('/fhir/*', shlFhirProxyHandler, {
    detail: {
      summary: 'SHL FHIR Proxy',
      description: 'Proxies FHIR requests from SHL viewers using opaque session tokens. No real tokens leave the server.',
      tags: ['shl'],
      hide: true,
    },
  })

  // ── SHL DICOMweb proxy ──────────────────────────────────────────────────

  .all('/dicomweb/*', shlDicomwebProxyHandler, {
    detail: {
      summary: 'SHL DICOMweb Proxy',
      description: 'Proxies DICOMweb requests from SHL viewers using opaque session tokens.',
      tags: ['shl'],
      hide: true,
    },
  })
