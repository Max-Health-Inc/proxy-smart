/**
 * SHL Viewer client — decryption and resolution of SMART Health Links.
 *
 * Uses kill-the-clipboard for: SHL URI parsing, JWE decryption (alg:dir, enc:A256GCM).
 * We handle: application/smart-api-access content type (not yet in KTC).
 *
 * Flow: parse SHL URI → POST manifest endpoint → decrypt JWE → extract token
 * Then the caller creates a FhirClient with the decrypted token.
 *
 * This is the VIEWER side. For SHL CREATION, see shl-client.ts.
 */

import { SHL, decryptSHLFile } from "kill-the-clipboard"
import type { SHLPayloadV1 } from "kill-the-clipboard"
import { FhirClient } from "hl7.fhir.uv.ips-generated/fhir-client"

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

/** SHL manifest file descriptor */
interface ManifestFile {
  contentType: string
  embedded?: string
  location?: string
}

/** Resolved SHL — ready to hand off to FhirClient */
export interface ShlResult {
  access: SmartApiAccess
  label?: string
  expiresAt: Date
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a SHL from the URL hash.
 * Supports both: full shlink URI (shlink:/eyJ...) or raw base64url payload (eyJ...)
 */
export function parseShl(hash: string): { shl: SHL; payload: SHLPayloadV1 } {
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
 */
export async function resolveShl(shl: SHL, passcode?: string): Promise<ShlResult> {
  const resp = await fetch(shl.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: "patient-portal-shl-viewer",
      ...(passcode ? { passcode } : {}),
    }),
  })

  if (resp.status === 401) throw new Error("Passcode required or invalid")
  if (resp.status === 404) throw new Error("Share link not found")
  if (resp.status === 410) throw new Error("Share link has expired")
  if (!resp.ok) throw new Error(`Failed to fetch manifest (${resp.status})`)

  const manifest: { files: ManifestFile[] } = await resp.json()

  const file = manifest.files.find(
    (f) => f.contentType === "application/smart-api-access",
  )
  if (!file) throw new Error("No access credentials in manifest")

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

  const { content } = await decryptSHLFile({ jwe, key: shl.key })
  const access: SmartApiAccess = JSON.parse(content)

  return {
    access,
    label: shl.label,
    expiresAt: shl.expirationDate ?? new Date(Date.now() + 3600_000),
  }
}

/** Create a bearer-token authenticated FhirClient from SHL access credentials */
export function createShlFhirClient(access: SmartApiAccess): { client: FhirClient; fetchFn: typeof fetch } {
  const fetchFn = ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> || {}),
        Authorization: `Bearer ${access.access_token}`,
      },
    })) as typeof fetch

  const client = new FhirClient(access.aud, fetchFn)
  return { client, fetchFn }
}
