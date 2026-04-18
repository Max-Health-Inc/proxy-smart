/**
 * SMART Health Links (SHL) API Routes
 * 
 * Implements SHL creation and manifest serving for QR-based patient data sharing.
 * Uses Keycloak token exchange (RFC 8693) to mint scoped, short-lived tokens.
 * Only encrypted auth metadata is stored — no patient data.
 * 
 * @see https://build.fhir.org/ig/HL7/smart-health-cards-and-links/
 */

import { Elysia, t } from 'elysia'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'
import * as crypto from 'crypto'

// ── In-memory SHL manifest store (TTL-based, no patient data) ──────────────

interface ShlEntry {
  /** AES-256-GCM encrypted manifest blob (contains Keycloak token response) */
  encryptedManifest: string
  /** AES-256-GCM IV used for encryption */
  iv: string
  /** AES-256-GCM auth tag */
  authTag: string
  /** Expiry timestamp */
  expiresAt: number
  /** Content type hint for the viewer */
  contentType: string
  /** Optional label shown to recipient */
  label?: string
  /** Whether verified-only filter is active */
  verifiedOnly: boolean
  /** Number of times this SHL has been accessed */
  accessCount: number
  /** Optional passcode (hashed) */
  passcodeHash?: string
}

const shlStore = new Map<string, ShlEntry>()

// Cleanup expired entries every 60 seconds
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of shlStore) {
    if (now > entry.expiresAt) {
      shlStore.delete(id)
    }
  }
}, 60_000)
cleanupInterval.unref()

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Exchange a user token for a scoped SHL token via Keycloak token exchange */
async function exchangeForShlToken(
  userAccessToken: string,
  ttlSeconds: number
): Promise<{ access_token: string; expires_in: number }> {
  const kcBase = config.keycloak.baseUrl
  const realm = config.keycloak.realm
  if (!kcBase || !realm) {
    throw new Error('Keycloak not configured')
  }

  const shlClientId = process.env.SHL_EXCHANGE_CLIENT_ID || 'shl-exchange'
  const shlClientSecret = process.env.SHL_EXCHANGE_CLIENT_SECRET
  if (!shlClientSecret) {
    throw new Error('SHL_EXCHANGE_CLIENT_SECRET not configured')
  }

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
    const err = await resp.json().catch(() => ({}))
    logger.auth.error('SHL token exchange failed', {
      status: resp.status,
      error: (err as any).error,
      description: (err as any).error_description,
    })
    throw new Error(`Token exchange failed: ${(err as any).error_description || resp.statusText}`)
  }

  return resp.json() as Promise<{ access_token: string; expires_in: number }>
}

/** Encrypt data with AES-256-GCM and return components */
function aesEncrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    ciphertext: encrypted.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
  }
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
  viewerUrl: t.String({ description: 'Full URL for QR code (opens in patient portal SHL viewer)' }),
  expiresAt: t.String({ description: 'ISO 8601 expiry timestamp' }),
})

const ManifestRequest = t.Object({
  recipient: t.Optional(t.String({ description: 'Recipient identifier (for audit)' })),
  passcode: t.Optional(t.String({ description: 'Passcode if SHL is passcode-protected' })),
})

const ManifestResponse = t.Object({
  files: t.Array(t.Object({
    contentType: t.String(),
    embedded: t.Optional(t.String({ description: 'Base64url-encoded encrypted content' })),
  })),
})

// ── Routes ──────────────────────────────────────────────────────────────────

export const shlRoutes = new Elysia({ prefix: '/shl', tags: ['shl'] })

  /**
   * Create a new SMART Health Link
   * Takes the user's Bearer token, exchanges it for a scoped short-lived token,
   * encrypts it, stores the blob, and returns the SHL URI.
   */
  .post('/', async ({ body, headers, set }) => {
    try {
      const userToken = extractBearerToken(headers)
      if (!userToken) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      // Validate the user's token (throws on invalid)
      const tokenPayload = await validateToken(userToken)

      const expiresInMinutes = Math.min(body.expiresInMinutes ?? 60, 1440) // Max 24h
      const ttlSeconds = expiresInMinutes * 60

      // Exchange user token → scoped SHL token via Keycloak
      const shlToken = await exchangeForShlToken(userToken, ttlSeconds)

      // Build the manifest content (token response the viewer will use)
      const manifestContent = JSON.stringify({
        access_token: shlToken.access_token,
        token_type: 'Bearer',
        expires_in: shlToken.expires_in,
        scope: 'patient/*.read',
        patient: tokenPayload.smart_patient || tokenPayload.patient,
        fhirBaseUrl: `${config.baseUrl}/proxy-smart-backend/hapi-fhir-server/R4`,
      })

      // Generate encryption key and encrypt the manifest
      const encryptionKey = crypto.randomBytes(32)
      const { ciphertext, iv, authTag } = aesEncrypt(manifestContent, encryptionKey)

      // Store encrypted manifest
      const shlId = crypto.randomUUID()
      const expiresAt = Date.now() + ttlSeconds * 1000
      const passcodeHash = body.passcode
        ? crypto.createHash('sha256').update(body.passcode).digest('hex')
        : undefined

      shlStore.set(shlId, {
        encryptedManifest: ciphertext,
        iv,
        authTag,
        expiresAt,
        contentType: 'application/smart-api-access',
        label: body.label,
        verifiedOnly: body.verifiedOnly ?? false,
        accessCount: 0,
        passcodeHash,
      })

      // Build the SHL payload (base64url JSON)
      const manifestUrl = `${config.baseUrl}/api/shl/${shlId}`
      const shlPayload: Record<string, unknown> = {
        url: manifestUrl,
        key: encryptionKey.toString('base64url'),
        exp: Math.floor(expiresAt / 1000),
        flag: passcodeHash ? 'P' : '',
      }
      if (body.label) shlPayload.label = body.label
      if (body.verifiedOnly !== undefined) shlPayload.v = body.verifiedOnly ? 1 : 0

      const shlinkPayload = Buffer.from(JSON.stringify(shlPayload)).toString('base64url')
      const viewerUrl = `${config.baseUrl}/apps/patient-portal/#/shl/${shlinkPayload}`

      logger.auth.info('SHL created', {
        shlId,
        patientId: tokenPayload.smart_patient || tokenPayload.patient,
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
      description: 'Create an SHL for QR-based patient data sharing. Exchanges user token for a scoped, short-lived token.',
      tags: ['shl'],
      security: [{ BearerAuth: [] }],
    },
  })

  /**
   * Fetch SHL manifest (recipient endpoint)
   * Called by the SHL viewer after scanning the QR code.
   * Returns the encrypted manifest (token response).
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

    // Check passcode if required
    if (entry.passcodeHash) {
      if (!body.passcode) {
        set.status = 401
        return { error: 'Passcode required' }
      }
      const hash = crypto.createHash('sha256').update(body.passcode).digest('hex')
      if (hash !== entry.passcodeHash) {
        set.status = 401
        return { error: 'Invalid passcode' }
      }
    }

    entry.accessCount++

    logger.auth.info('SHL manifest accessed', {
      shlId: params.id,
      accessCount: entry.accessCount,
      recipient: body.recipient,
    })

    // Return SHL manifest format per spec
    return {
      files: [{
        contentType: entry.contentType,
        embedded: JSON.stringify({
          ciphertext: entry.encryptedManifest,
          iv: entry.iv,
          authTag: entry.authTag,
          verifiedOnly: entry.verifiedOnly,
        }),
      }],
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: ManifestRequest,
    response: { 200: ManifestResponse, 401: ErrorResponse, 404: ErrorResponse, 410: ErrorResponse },
    detail: {
      summary: 'Fetch SHL Manifest',
      description: 'Recipient endpoint — returns encrypted manifest containing scoped access token.',
      tags: ['shl'],
    },
  })
