/**
 * SMART Health Links (SHL) API Routes
 *
 * Spec-compliant SHL creation and manifest serving for QR-based patient data sharing.
 * Uses kill-the-clipboard for JWE encryption (alg:dir, enc:A256GCM) and SHL URI generation.
 * Uses Keycloak token exchange (RFC 8693) to mint scoped, short-lived tokens.
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
import * as crypto from 'crypto'

// KTC doesn't support smart-api-access yet (in their Future Work).
// The JWE format is identical — just a different cty header string.
const SMART_API_ACCESS = 'application/smart-api-access' as SHLFileContentType

// ── In-memory SHL store (TTL-based, no patient data stored) ─────────────────

interface ShlEntry {
  /** The SHL object from kill-the-clipboard */
  shl: { url: string; key: string; exp?: number; flag?: string; label?: string }
  /** JWE compact string (spec-compliant, encrypted with SHL key) */
  jwe: string
  /** Expiry timestamp (ms) */
  expiresAt: number
  /** Whether verified-only filter is active */
  verifiedOnly: boolean
  /** Number of times this SHL has been accessed */
  accessCount: number
  /** Optional passcode (hashed) */
  passcodeHash?: string
}

const shlStore = new Map<string, ShlEntry>()

// Cleanup expired entries every 60s
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of shlStore) {
    if (now > entry.expiresAt) shlStore.delete(id)
  }
}, 60_000)
cleanupInterval.unref()

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Exchange a user token for a scoped SHL token via Keycloak token exchange */
async function exchangeForShlToken(
  userAccessToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const kcBase = config.keycloak.baseUrl
  const realm = config.keycloak.realm
  if (!kcBase || !realm) throw new Error('Keycloak not configured')

  const shlClientId = process.env.SHL_EXCHANGE_CLIENT_ID || 'shl-exchange'
  const shlClientSecret = process.env.SHL_EXCHANGE_CLIENT_SECRET
  if (!shlClientSecret) throw new Error('SHL_EXCHANGE_CLIENT_SECRET not configured')

  const tokenUrl = `${kcBase}/realms/${realm}/protocol/openid-connect/token`
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: shlClientId,
    client_secret: shlClientSecret,
    subject_token: userAccessToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    scope: 'openid patient/*.read',
  })

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>
    logger.auth.error('SHL token exchange failed', {
      status: resp.status,
      error: err.error,
      description: err.error_description,
    })
    throw new Error(`Token exchange failed: ${err.error_description || resp.statusText}`)
  }

  return resp.json() as Promise<{ access_token: string; expires_in: number }>
}

// ── Route schemas ───────────────────────────────────────────────────────────

const ErrorResponse = t.Object({ error: t.String() })

const CreateShlBody = t.Object({
  label: t.Optional(t.String({ description: 'Label shown to recipient' })),
  passcode: t.Optional(t.String({ description: 'Optional passcode to protect the SHL' })),
  expiresInMinutes: t.Optional(t.Number({ description: 'Expiry in minutes (default 60, max 1440)', default: 60 })),
  verifiedOnly: t.Optional(t.Boolean({ description: 'Whether to include only verified resources', default: false })),
})

const ShlResponse = t.Object({
  shlinkPayload: t.String({ description: 'Base64url-encoded SHL payload for QR encoding' }),
  viewerUrl: t.String({ description: 'Full URL for QR code (viewer app with SHL in hash)' }),
  expiresAt: t.String({ description: 'ISO 8601 expiry timestamp' }),
})

const ManifestRequest = t.Object({
  recipient: t.Optional(t.String({ description: 'Recipient identifier (for audit)' })),
  passcode: t.Optional(t.String({ description: 'Passcode if SHL is passcode-protected' })),
  embeddedLengthMax: t.Optional(t.Number({ description: 'Max embedded payload size in bytes' })),
})

// ── Routes ──────────────────────────────────────────────────────────────────

export const shlRoutes = new Elysia({ prefix: '/shl', tags: ['shl'] })

  /**
   * Create a new SMART Health Link.
   * Exchanges user token → scoped SHL token, JWE-encrypts it, returns SHL URI.
   */
  .post('/', async ({ body, headers, set }) => {
    try {
      const userToken = extractBearerToken(headers)
      if (!userToken) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const tokenPayload = await validateToken(userToken)

      const expiresInMinutes = Math.min(body.expiresInMinutes ?? 60, 1440)
      const ttlSeconds = expiresInMinutes * 60
      const expiresAt = Date.now() + ttlSeconds * 1000

      // Exchange user token → scoped SHL token via Keycloak
      const shlToken = await exchangeForShlToken(userToken)

      // Build the SMART API Access token response (per SHL spec)
      const patientId = tokenPayload.smart_patient || tokenPayload.patient
      const smartApiAccess = JSON.stringify({
        access_token: shlToken.access_token,
        token_type: 'Bearer',
        expires_in: shlToken.expires_in,
        scope: 'patient/*.read',
        patient: patientId,
        // "aud" is required per SHL spec for smart-api-access
        aud: `${config.baseUrl}/proxy-smart-backend/hapi-fhir-server/R4`,
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

      // Store the JWE
      const passcodeHash = body.passcode
        ? crypto.createHash('sha256').update(body.passcode).digest('hex')
        : undefined

      shlStore.set(shlId, {
        shl: shl.payload,
        jwe,
        expiresAt,
        verifiedOnly: body.verifiedOnly ?? false,
        accessCount: 0,
        passcodeHash,
      })

      // Build the SHL URI and viewer URL
      const shlinkURI = shl.toURI()
      // Strip the "shlink:/" prefix to get just the base64url payload
      const shlinkPayload = shlinkURI.replace('shlink:/', '')
      const viewerUrl = `${config.baseUrl}/apps/shl-viewer/#${shlinkURI}`

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
   */
  .post('/:id', async ({ params, body, set }) => {
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
    params: t.Object({ id: t.String() }),
    body: ManifestRequest,
    detail: {
      summary: 'Fetch SHL Manifest',
      description: 'Spec-compliant SHL manifest endpoint. Returns JWE-encrypted smart-api-access token.',
      tags: ['shl'],
    },
  })
