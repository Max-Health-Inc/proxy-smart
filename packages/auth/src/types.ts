/**
 * @proxy-smart/auth — Core Types
 *
 * All shared types for the SMART on FHIR authorization proxy.
 * Framework-agnostic. No runtime dependencies.
 */

// ─── Launch Session ─────────────────────────────────────────────────────────

/** Launch context resolved during the authorize flow, stored until token exchange */
export interface LaunchSession {
  /** Original redirect_uri from the client app (we replace it with our callback) */
  clientRedirectUri: string
  /** Original state param from the client */
  clientState: string
  /** Client ID from the authorize request */
  clientId: string
  /** Requested scopes (space-separated) */
  scope: string
  /** PKCE code_challenge (passthrough — we don't consume it) */
  codeChallenge?: string
  /** PKCE code_challenge_method */
  codeChallengeMethod?: string
  /** Resolved patient ID (set by EHR launch code or patient picker) */
  patient?: string
  /** Resolved encounter ID */
  encounter?: string
  /** FHIR user reference (e.g., "Practitioner/123") */
  fhirUser?: string
  /** Intent string */
  intent?: string
  /** SMART style URL */
  smartStyleUrl?: string
  /** Tenant identifier */
  tenant?: string
  /** Whether patient banner is needed */
  needPatientBanner?: boolean
  /** fhirContext array (JSON string) */
  fhirContext?: string
  /** Whether patient picker is required (standalone launch without pre-set context) */
  needsPatientPicker?: boolean
  /** IdP user subject (populated after IdP callback) */
  userSub?: string
  /** Timestamp when this session was created */
  createdAt: number
}

// ─── Launch Code ────────────────────────────────────────────────────────────

/** Payload embedded in the launch code JWT */
export interface LaunchCodePayload {
  /** IdP user ID this launch context was prepared for */
  userId?: string
  /** Patient ID in context (FHIR resource ID, e.g., "Patient/123" or just "123") */
  patient?: string
  /** Encounter ID in context */
  encounter?: string
  /** FHIR user reference (e.g., "Practitioner/456") */
  fhirUser?: string
  /** Intent string (e.g., "order-review", "reconcile-medications") */
  intent?: string
  /** SMART style URL */
  smartStyleUrl?: string
  /** Tenant identifier */
  tenant?: string
  /** Whether patient banner is needed */
  needPatientBanner?: boolean
  /** fhirContext array (serialized as JSON string) */
  fhirContext?: string
  /** Target client_id this launch code is intended for (optional audience restriction) */
  clientId?: string
}

/** Result of verifying a launch code */
export interface LaunchCodeContext {
  payload: LaunchCodePayload
  /** Seconds until expiry */
  remainingTtl: number
}

// ─── Proxy Results ──────────────────────────────────────────────────────────

/** Result of a proxy handler — framework-agnostic response representation */
export type SmartProxyResult =
  | { type: 'redirect'; url: string }
  | { type: 'response'; status: number; body: unknown; headers?: Record<string, string> }
  | { type: 'error'; status: number; error: string; error_description: string }

// ─── Authorize Request ──────────────────────────────────────────────────────

/** Parsed query parameters from an /authorize request */
export interface AuthorizeParams {
  response_type?: string
  client_id?: string
  redirect_uri?: string
  scope?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
  aud?: string
  resource?: string
  launch?: string
  [key: string]: string | undefined
}

// ─── Token Request / Response ───────────────────────────────────────────────

/** Parsed body from a /token request */
export interface TokenRequestParams {
  grant_type?: string
  code?: string
  redirect_uri?: string
  client_id?: string
  client_secret?: string
  code_verifier?: string
  refresh_token?: string
  scope?: string
  [key: string]: string | undefined
}

/** Decoded access token payload (minimal claims we inspect) */
export interface TokenPayload {
  sub?: string
  fhirUser?: string
  smart_scope?: string
  [key: string]: unknown
}

/** Token response enrichment data returned by the token enricher */
export interface TokenEnrichment {
  patient?: string
  encounter?: string
  fhirUser?: string
  intent?: string
  smart_style_url?: string
  tenant?: string
  need_patient_banner?: boolean
  fhirContext?: unknown
  scope?: string
}

// ─── Configuration ──────────────────────────────────────────────────────────

/** Configuration required by the SMART proxy */
export interface SmartProxyConfig {
  /** Base URL of this proxy (e.g., "https://auth.example.com") */
  baseUrl: string
  /** Path segment for the SMART callback (default: "/auth/smart-callback") */
  callbackPath?: string
  /** Secret for signing launch codes (HMAC-SHA256) */
  launchCodeSecret: string
  /** Launch code TTL in seconds (default: 300) */
  launchCodeTtlSeconds?: number
}

// ─── Logger ─────────────────────────────────────────────────────────────────

/** Minimal logger interface — consumers inject their own */
export interface SmartProxyLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/** No-op logger for when consumers don't need logging */
export const noopLogger: SmartProxyLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}
