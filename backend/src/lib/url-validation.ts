/**
 * URL validation utilities to prevent SSRF attacks.
 * Blocks requests to internal/private IP ranges and metadata endpoints.
 */

// Private/reserved IPv4 ranges (RFC 1918 + link-local + loopback + metadata)
const BLOCKED_IPV4_RANGES = [
  { prefix: '10.', description: 'RFC 1918 Class A' },
  { prefix: '172.16.', description: 'RFC 1918 Class B' },
  { prefix: '172.17.', description: 'RFC 1918 Class B' },
  { prefix: '172.18.', description: 'RFC 1918 Class B' },
  { prefix: '172.19.', description: 'RFC 1918 Class B' },
  { prefix: '172.20.', description: 'RFC 1918 Class B' },
  { prefix: '172.21.', description: 'RFC 1918 Class B' },
  { prefix: '172.22.', description: 'RFC 1918 Class B' },
  { prefix: '172.23.', description: 'RFC 1918 Class B' },
  { prefix: '172.24.', description: 'RFC 1918 Class B' },
  { prefix: '172.25.', description: 'RFC 1918 Class B' },
  { prefix: '172.26.', description: 'RFC 1918 Class B' },
  { prefix: '172.27.', description: 'RFC 1918 Class B' },
  { prefix: '172.28.', description: 'RFC 1918 Class B' },
  { prefix: '172.29.', description: 'RFC 1918 Class B' },
  { prefix: '172.30.', description: 'RFC 1918 Class B' },
  { prefix: '172.31.', description: 'RFC 1918 Class B' },
  { prefix: '192.168.', description: 'RFC 1918 Class C' },
  { prefix: '169.254.', description: 'Link-local / AWS metadata' },
  { prefix: '127.', description: 'Loopback' },
  { prefix: '0.', description: 'Current network' },
]

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254', // AWS/GCP metadata
  '[::1]',           // IPv6 loopback
  '[fd00::',         // IPv6 ULA
  '[fe80::',         // IPv6 link-local
  '[fc00::',         // IPv6 ULA
]

/**
 * Validates that a URL does not point to internal/private networks.
 * Prevents SSRF attacks by blocking private IPs, loopback, and cloud metadata endpoints.
 *
 * @param url The URL string to validate
 * @param allowInternal If true, skip SSRF checks (for dev/docker internal networking)
 * @returns { valid: true } or { valid: false, reason: string }
 */
export function validateExternalUrl(url: string, allowInternal = false): { valid: true } | { valid: false; reason: string } {
  if (allowInternal) {
    return { valid: true }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: `Protocol '${parsed.protocol}' is not allowed. Use http: or https:` }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Check blocked hostnames
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (hostname === blocked || hostname.startsWith(blocked)) {
      return { valid: false, reason: `Hostname '${hostname}' resolves to a private/internal address` }
    }
  }

  // Check if hostname is an IP address matching blocked ranges
  for (const range of BLOCKED_IPV4_RANGES) {
    if (hostname.startsWith(range.prefix)) {
      return { valid: false, reason: `IP address '${hostname}' is in a private range (${range.description})` }
    }
  }

  // Block IPv6 private addresses (brackets stripped by URL parser)
  if (hostname.startsWith('::1') || hostname.startsWith('fd') || hostname.startsWith('fe80') || hostname.startsWith('fc')) {
    return { valid: false, reason: `IPv6 address '${hostname}' is in a private range` }
  }

  return { valid: true }
}
