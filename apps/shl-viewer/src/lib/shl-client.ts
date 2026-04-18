/**
 * SMART Health Link client — thin wrapper around kill-the-clipboard.
 *
 * KTC handles: SHL URI parsing, JWE decryption (alg:dir, enc:A256GCM).
 * We handle:  application/smart-api-access content type (not yet in KTC).
 *
 * The flow: parse SHL URI → POST manifest endpoint → decrypt JWE → extract token
 * Then the caller passes the token to the BabelFHIR-TS FhirClient.
 */

import { SHL, decryptSHLFile } from "kill-the-clipboard"
import type { SHLPayloadV1 } from "kill-the-clipboard"

// ── Types ────────────────────────────────────────────────────────────────────

/** Decrypted SMART API Access token response (per SHL spec §3.2) */
export interface SmartApiAccess {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  patient: string
  /** FHIR base URL to use with the token */
  aud: string
}

/** SHL manifest file descriptor (embedded or location) */
interface ManifestFile {
  contentType: string
  embedded?: string
  location?: string
}

/** SHL manifest response from the server */
interface SHLManifest {
  files: ManifestFile[]
}

/** Resolved SHL — ready to hand off to FhirClient */
export interface ShlResult {
  access: SmartApiAccess
  label?: string
  verifiedOnly: boolean
  expiresAt: Date
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a SHL from the URL hash.
 * Supports both formats:
 *   - Full shlink URI: shlink:/eyJ...
 *   - Raw base64url payload: eyJ...
 */
export function parseShl(hash: string): { shl: SHL; payload: SHLPayloadV1 } {
  // If it's a full shlink URI, parse directly
  const uri = hash.startsWith("shlink:/") ? hash : `shlink:/${hash}`
  const shl = SHL.parse(uri)
  return { shl, payload: shl.payload }
}

/** Check if an SHL has expired */
export function isShlExpired(shl: SHL): boolean {
  if (!shl.expirationDate) return false
  return Date.now() > shl.expirationDate.getTime()
}

/**
 * Resolve an SHL: fetch manifest, decrypt JWE, return token credentials.
 *
 * We do the manifest fetch ourselves (rather than using SHLViewer.resolveSHL)
 * because SHLViewer doesn't support application/smart-api-access yet.
 */
export async function resolveShl(
  shl: SHL,
  passcode?: string,
): Promise<ShlResult> {
  // POST to manifest URL per SHL spec
  const resp = await fetch(shl.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: "shl-viewer",
      ...(passcode ? { passcode } : {}),
    }),
  })

  if (resp.status === 401) throw new Error("Passcode required or invalid")
  if (resp.status === 404) throw new Error("Share link not found")
  if (resp.status === 410) throw new Error("Share link has expired")
  if (!resp.ok) throw new Error(`Failed to fetch manifest (${resp.status})`)

  const manifest: SHLManifest = await resp.json()

  // Find the smart-api-access file descriptor
  const file = manifest.files.find(
    (f) => f.contentType === "application/smart-api-access",
  )
  if (!file) throw new Error("No access credentials in manifest")

  // Get the JWE string (embedded directly, or fetch from location)
  let jwe: string
  if (file.embedded) {
    jwe = file.embedded
  } else if (file.location) {
    const fileResp = await fetch(file.location)
    if (!fileResp.ok) throw new Error("Failed to fetch encrypted file")
    jwe = await fileResp.text()
  } else {
    throw new Error("Manifest file has neither embedded nor location")
  }

  // Decrypt the JWE using kill-the-clipboard (spec-compliant A256GCM)
  const { content } = await decryptSHLFile({ jwe, key: shl.key })
  const access: SmartApiAccess = JSON.parse(content)

  return {
    access,
    label: shl.label,
    // verifiedOnly is an app-level concern, not part of the SHL spec
    verifiedOnly: false,
    expiresAt: shl.expirationDate ?? new Date(Date.now() + 3600_000),
  }
}
