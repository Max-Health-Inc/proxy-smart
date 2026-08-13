// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

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
import type { Context } from 'elysia'
import { SHL, encryptSHLFile } from 'kill-the-clipboard'
import type { SHLFileContentType } from 'kill-the-clipboard'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'
import { getServiceAccountToken, getDefaultFhirServerUrl } from '@/lib/shl-service-account'
import { emitShareConsent, isShareConsentRevoked } from '@/lib/consent/shl-consent'
import { recordShlOpen } from '@/lib/consent/shl-audit'
import { getDefaultDicomServer } from '@/lib/runtime-config'
import { shortenUrl } from '@/lib/url-shortener'
import { getPublishedApps } from '@/lib/app-store-config'
import { resolveClientLaunchUrl } from '@/lib/client-launch-url'
import { shlSessionStore, type ShareScope, type ShlSession } from '@/lib/shl-session-store'
import {
  isDicomPathAllowed,
  scopeFhirRequest,
  isCompleteShare,
  isSelectiveScopeActive,
  preScreenSelectiveRequest,
  applySelectiveFilter,
  emptySearchBundle,
  type SelectiveScope,
} from '@/lib/shl-scope'
import * as crypto from 'crypto'

// KTC doesn't support smart-api-access yet (in their Future Work).
// The JWE format is identical — just a different cty header string.
const SMART_API_ACCESS = 'application/smart-api-access' as SHLFileContentType

// ── SHL Session Store (SQLite-persisted, survives restarts) ─────────────────
// See @/lib/shl-session-store for implementation.
// The store handles TTL cleanup and provides both ID and token-based lookups.
// Service-account token + default FHIR server URL live in @/lib/shl-service-account
// so the SHL proxy and the SHL→Consent mirror share one token cache.

// ── Route schemas ───────────────────────────────────────────────────────────

const ErrorResponse = t.Object({ error: t.String() })

const CreateShlBody = t.Object({
  label: t.Optional(t.String({ description: 'Label shown to recipient' })),
  passcode: t.Optional(t.String({ description: 'Optional passcode to protect the SHL' })),
  expiresInMinutes: t.Optional(t.Number({ description: 'Expiry in minutes (default 60, max 4320 = 72h)', default: 60, minimum: 1 })),
  verifiedOnly: t.Optional(t.Boolean({ description: 'Whether to include only verified resources', default: false })),
  shareScope: t.Optional(t.Object({
    excludedTypes: t.Optional(t.Array(t.String(), { description: 'FHIR resource types fully hidden from the recipient (a whole category was deselected)' })),
    excludedIds: t.Optional(t.Array(t.String(), { description: 'Individually hidden resources as "ResourceType/id"' })),
    excludedObservationCategories: t.Optional(t.Array(t.String(), { description: 'Observation category codes fully hidden (e.g. vital-signs, laboratory)' })),
  }, { description: 'Selective sharing: the patient de-selected some records/categories. Omit (or leave empty) to share everything.' })),
  studyInstanceUID: t.Optional(t.String({ description: 'DICOM Study Instance UID — scope the SHL to a single imaging study' })),
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

/** True for FHIR/JSON responses we can safely parse and filter. */
function isJsonContentType(contentType: string | null): boolean {
  return !!contentType && /json/i.test(contentType)
}

/** Build the pure SelectiveScope from a session's persisted shareScope (all-empty when absent). */
function sessionSelectiveScope(session: { shareScope?: ShareScope }): SelectiveScope {
  return {
    excludedTypes: session.shareScope?.excludedTypes ?? [],
    excludedIds: session.shareScope?.excludedIds ?? [],
    excludedObservationCategories: session.shareScope?.excludedObservationCategories ?? [],
  }
}

/**
 * Resolve + authorize an SHL bearer token for the proxy handlers: validates the
 * session token, checks expiry, and confirms the backing consent has not been
 * revoked in the consent portal. On failure sets the response status and returns
 * `{ error }`; on success returns the session. Shared by the FHIR + DICOMweb
 * proxy handlers so the checks (esp. revocation) live in exactly one place.
 */
async function authorizeShlBearer(
  headers: Record<string, string | undefined>,
  set: Context['set'],
): Promise<{ shlId: string; session: ShlSession } | { error: string }> {
  const bearerToken = extractBearerToken(headers)
  if (!bearerToken) {
    set.status = 401
    return { error: 'Bearer token required' }
  }
  const lookup = shlSessionStore.getByToken(bearerToken)
  if (!lookup) {
    set.status = 401
    return { error: 'Invalid or expired session token' }
  }
  const { id: shlId, session } = lookup
  if (Date.now() > session.expiresAt) {
    shlSessionStore.delete(shlId)
    set.status = 410
    return { error: 'Share link has expired' }
  }
  if (await isShareConsentRevoked(shlId, session.fhirServerUrl)) {
    shlSessionStore.delete(shlId) // revoked in the consent portal: purge the now-inert session
    set.status = 410
    return { error: 'Share link has been revoked' }
  }
  return { shlId, session }
}

/**
 * What the SHL proxy handlers read off Elysia's context.
 *
 * Both routes are wildcards, so the tail arrives as `params['*']`. Typing this
 * removed an inner `params as Record<string, string>` in each handler that only
 * existed because the parameter itself was `any`.
 */
interface ShlProxyContext {
  request: Request
  params: Record<string, string>
  headers: Record<string, string | undefined>
  set: Context['set']
}

async function shlFhirProxyHandler({ request, params, headers, set }: ShlProxyContext) {
  try {
    const auth = await authorizeShlBearer(headers, set)
    if ('error' in auth) return auth
    const { shlId, session } = auth

    // Extract the FHIR path after /fhir/ (empty string for base /fhir route)
    const fhirPath = params['*'] || ''

    const url = new URL(request.url)
    // Query string sent upstream. Study-scoped requests may rewrite this to force the scope filter.
    let queryString = url.search

    if (session.studyInstanceUID) {
      // Study-scoped share: default-deny whitelist (Patient self, ImagingStudy search, metadata).
      const decision = scopeFhirRequest(fhirPath, url.search, {
        patientId: session.patientId,
        studyInstanceUID: session.studyInstanceUID,
      })
      if (!decision.allowed) {
        set.status = 403
        return { error: 'Access denied: outside shared study scope' }
      }
      if (decision.rewrittenSearch !== undefined) queryString = decision.rewrittenSearch
    } else {
      // Whole-patient share: unchanged legacy patient-scope enforcement.
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
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      set.status = 405
      return { error: 'Only read operations are allowed on shared links' }
    }

    // Selective sharing (record/category de-selection) — whole-patient shares only.
    // Study-scoped shares have their own stricter whitelist above.
    const selective = sessionSelectiveScope(session)
    const selectiveActive = !session.studyInstanceUID && isSelectiveScopeActive(selective)
    if (selectiveActive) {
      const pre = preScreenSelectiveRequest(fhirPath, url.search, selective)
      if (pre.action === 'deny') {
        set.status = 404
        set.headers['access-control-allow-origin'] = '*'
        return { error: 'Resource not found or not shared' }
      }
      if (pre.action === 'empty-bundle') {
        set.status = 200
        set.headers['content-type'] = 'application/fhir+json'
        set.headers['access-control-allow-origin'] = '*'
        set.headers['access-control-allow-headers'] = 'Authorization, Content-Type'
        return JSON.stringify(emptySearchBundle())
      }
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

    // Post-filter for selective shares: drop de-selected entries from search
    // Bundles, and 404 a single de-selected read. Defense-in-depth on top of the
    // pre-screen, and the only line of defense for searches that mix kept + hidden
    // items (e.g. an Observation search spanning several categories).
    if (selectiveActive && resp.ok && isJsonContentType(contentType)) {
      try {
        const parsed: unknown = JSON.parse(text)
        const filtered = applySelectiveFilter(parsed, selective)
        if (filtered.denied) {
          set.status = 404
          return { error: 'Resource not found or not shared' }
        }
        return JSON.stringify(filtered.body).replaceAll(session.fhirServerUrl, proxyBase)
      } catch {
        // Not JSON (or malformed) — fall through to the raw passthrough below.
      }
    }

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

async function shlDicomwebProxyHandler({ request, params, headers, set }: ShlProxyContext) {
  try {
    const auth = await authorizeShlBearer(headers, set)
    if ('error' in auth) return auth
    const { shlId, session } = auth

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

    const dicomPath = params['*'] || ''
    const url = new URL(request.url)

    // Study-scope enforcement: default-deny anything outside the shared study.
    const decision = isDicomPathAllowed(dicomPath, url.search, session.studyInstanceUID)
    if (!decision.allowed) {
      set.status = 403
      return { error: 'Access denied: outside shared study scope' }
    }
    const queryString = decision.rewrittenSearch !== undefined ? decision.rewrittenSearch : url.search
    const targetUrl = `${dicomServer.baseUrl.replace(/\/+$/, '')}/${dicomPath}${queryString}`

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

      const expiresInMinutes = Math.max(1, Math.min(body.expiresInMinutes ?? 60, 4320)) // min 1m, max 72h
      const ttlSeconds = expiresInMinutes * 60
      const expiresAt = Date.now() + ttlSeconds * 1000

      // Resolve patient ID from token claims:
      // 1. Explicit patient claim (clinician with patient context)
      // 2. Fallback: derive from fhirUser if it's a Patient reference (patient portal user IS the patient)
      let patientId = tokenPayload.patient
      if (!patientId && tokenPayload.fhirUser) {
        const match = String(tokenPayload.fhirUser).match(/Patient\/([^/]+)$/)
        if (match) patientId = match[1]
      }
      if (!patientId) {
        set.status = 400
        return { error: 'No patient context in token (patient or fhirUser Patient reference required)' }
      }

      // Generate opaque session token (256-bit, base64url-encoded)
      const sessionToken = crypto.randomBytes(32).toString('base64url')

      // Resolve the upstream FHIR server URL
      const fhirServerUrl = await getDefaultFhirServerUrl()

      // Normalize the selective-sharing scope. Persist it only when it actually
      // narrows the share; an omitted or all-empty scope stays undefined so the
      // proxy takes the untouched "share everything" path.
      const excludedTypes = body.shareScope?.excludedTypes ?? []
      const excludedIds = body.shareScope?.excludedIds ?? []
      const excludedObservationCategories = body.shareScope?.excludedObservationCategories ?? []
      const shareScope: ShareScope | undefined =
        excludedTypes.length + excludedIds.length + excludedObservationCategories.length > 0
          ? { excludedTypes, excludedIds, excludedObservationCategories }
          : undefined

      // Build the SMART API Access token response (per SHL spec)
      // aud points to our FHIR proxy — the viewer never talks to the real FHIR server.
      // `complete` is a non-standard hint for our own viewer: false when the patient
      // de-selected records, so the recipient can be told the summary is partial
      // (qualitative only — no counts leak). Only the key holder can read it (JWE).
      const smartApiAccess = JSON.stringify({
        access_token: sessionToken,
        token_type: 'Bearer',
        expires_in: ttlSeconds,
        scope: 'patient/*.read',
        patient: patientId,
        aud: `${config.baseUrl}/api/shl/fhir`,
        complete: isCompleteShare({ selectiveScope: shareScope, studyInstanceUID: body.studyInstanceUID }),
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
      const session = {
        shl: shl.payload,
        jwe,
        sessionToken,
        patientId,
        studyInstanceUID: body.studyInstanceUID,
        fhirServerUrl,
        expiresAt,
        verifiedOnly: body.verifiedOnly ?? false,
        shareScope,
        accessCount: 0,
        passcodeHash,
      }
      shlSessionStore.set(shlId, session)

      // Mirror the share into a FHIR Consent so active SHLs surface in the
      // consent portal alongside every other grant. Best-effort: never blocks
      // SHL creation (see @/lib/consent/shl-consent).
      await emitShareConsent(shlId, session)

      // Build the SHL URI and viewer URL.
      // Open the recipient in the SMART app that MINTED the share, at that app's
      // registered launch URL — so a per-study share minted by the DICOM viewer
      // opens in the viewer itself instead of an almost-empty patient portal.
      // The launch URL lives on the app's Keycloak client (`launch_url`, set via
      // Smart Apps); prefer that, then a published app-store entry, then the
      // patient portal. No per-env config or manual publish needed.
      const shlinkURI = shl.toURI()
      const shlinkPayload = shlinkURI.replace('shlink:/', '')
      const creatingClient = String(tokenPayload.azp ?? tokenPayload.client_id ?? '')
      const launchUrl =
        (await resolveClientLaunchUrl(creatingClient)) ??
        (creatingClient
          ? getPublishedApps().find((a) => a.clientId === creatingClient)?.launchUrl
          : undefined)
      let viewerBase = config.brand.portalUrl || `${config.baseUrl}/apps/patient-portal/`
      if (launchUrl) {
        try {
          // Keep the app's path (its SPA base, e.g. /apps/patient-portal/) — using
          // only `.origin` drops it and the SHL fragment lands on the host root.
          // A root-only launch URL carries no app path, so keep the portal fallback.
          const u = new URL(launchUrl)
          if (u.pathname && u.pathname !== '/') viewerBase = `${u.origin}${u.pathname}`
        } catch {
          // malformed launch URL — keep the portal fallback
        }
      }
      const viewerUrl = `${viewerBase.replace(/\/$/, '')}/#${shlinkURI}`

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
  .post('/:key/:id', async ({ params, body, set, request }) => {
    const entry = shlSessionStore.get(params.id)
    if (!entry) {
      set.status = 404
      return { error: 'SHL not found or expired' }
    }

    // Check expiry. SHL spec: a no-longer-active link SHALL return 404.
    if (Date.now() > entry.expiresAt) {
      shlSessionStore.delete(params.id)
      set.status = 404
      return { error: 'SHL not found or expired' }
    }

    // Revoked in the consent portal? Deny (spec: 404 for a no-longer-active link).
    if (await isShareConsentRevoked(params.id, entry.fhirServerUrl)) {
      shlSessionStore.delete(params.id) // purge the now-inert session
      set.status = 404
      return { error: 'SHL not found or expired' }
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

    // Count this open, track the (fingerprinted) recipient/device for the
    // distinct-devices metric, and record a FHIR access AuditEvent (best-effort).
    shlSessionStore.incrementAccessCount(params.id)
    const ipAddress = (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '').trim()
    await recordShlOpen(params.id, entry, { recipient: body.recipient, ipAddress: ipAddress || undefined, userAgent: request.headers.get('user-agent') || undefined })

    logger.auth.info('SHL manifest accessed', {
      shlId: params.id,
      accessCount: entry.accessCount + 1,
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
