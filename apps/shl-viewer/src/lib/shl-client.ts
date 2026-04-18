/**
 * SMART Health Link client — parses SHL payloads, fetches manifests, and decrypts them.
 * Uses Web Crypto API for AES-256-GCM decryption (browser-native, no dependencies).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShlPayload {
  url: string
  key: string
  exp: number
  flag?: string
  label?: string
  /** 1 = verified only, 0 = all */
  v?: number
}

export interface ShlManifestFile {
  contentType: string
  embedded?: string
}

export interface DecryptedAccess {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  patient: string
  fhirBaseUrl: string
}

export interface ShlResult {
  access: DecryptedAccess
  label?: string
  verifiedOnly: boolean
  expiresAt: Date
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Decode base64url to Uint8Array */
function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, "="))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** AES-256-GCM decrypt using Web Crypto */
async function aesDecrypt(
  ciphertext: string,
  iv: string,
  authTag: string,
  keyBase64url: string,
): Promise<string> {
  const keyBytes = b64urlDecode(keyBase64url)
  const ivBytes = b64urlDecode(iv)
  const ctBytes = b64urlDecode(ciphertext)
  const tagBytes = b64urlDecode(authTag)

  // GCM expects ciphertext + tag concatenated
  const combined = new Uint8Array(ctBytes.length + tagBytes.length)
  combined.set(ctBytes, 0)
  combined.set(tagBytes, ctBytes.length)

  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, { name: "AES-GCM" }, false, ["decrypt"])
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer }, cryptoKey, combined.buffer as ArrayBuffer)
  return new TextDecoder().decode(decrypted)
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Parse a base64url-encoded SHL payload string */
export function parseShlPayload(encoded: string): ShlPayload {
  const json = new TextDecoder().decode(b64urlDecode(encoded))
  return JSON.parse(json) as ShlPayload
}

/** Check if an SHL payload has expired */
export function isShlExpired(payload: ShlPayload): boolean {
  return Date.now() > payload.exp * 1000
}

/**
 * Fetch the manifest from the SHL server and decrypt it.
 * Returns the FHIR access credentials and metadata.
 */
export async function resolveShl(
  payload: ShlPayload,
  passcode?: string,
): Promise<ShlResult> {
  // Fetch manifest
  const resp = await fetch(payload.url, {
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

  const manifest: { files: ShlManifestFile[] } = await resp.json()
  const file = manifest.files.find(f => f.contentType === "application/smart-api-access")
  if (!file?.embedded) throw new Error("No access credentials in manifest")

  // The embedded field is a JSON string containing { ciphertext, iv, authTag, verifiedOnly }
  const encrypted = JSON.parse(file.embedded) as {
    ciphertext: string
    iv: string
    authTag: string
    verifiedOnly: boolean
  }

  // Decrypt the access credentials
  const decrypted = await aesDecrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag, payload.key)
  const access: DecryptedAccess = JSON.parse(decrypted)

  return {
    access,
    label: payload.label,
    verifiedOnly: encrypted.verifiedOnly,
    expiresAt: new Date(payload.exp * 1000),
  }
}
