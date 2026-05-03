import { logger } from './logger'

/**
 * SMART Launch Context Session Store
 *
 * Per-session state management for the SMART on FHIR authorization flow.
 * The proxy intercepts the OAuth callback to inject launch context (patient picker,
 * EHR launch resolution) before redirecting to the client app.
 *
 * Architecture:
 *   App → /authorize → KC /auth → /auth/smart-callback → [picker?] → App with code
 *   App → /token → proxy reads session context + KC token → enriched response
 *
 * The store maps a session key (derived from OAuth `state` param) to the pending
 * launch context. Entries auto-expire after a configurable TTL to prevent memory leaks.
 *
 * This is an in-memory Map implementation suitable for single-node deployments.
 * For multi-node: swap with a Redis-backed implementation behind the same interface.
 */

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
  /** FHIR server base URL from the aud/resource parameter (e.g., "https://proxy.example.com/proxy-smart-backend/hapi-fhir-server/R4") */
  aud?: string
  /** Keycloak user sub (populated after KC callback) */
  userSub?: string
  /** Timestamp when this session was created */
  createdAt: number
}

export interface LaunchContextStoreOptions {
  /** TTL in milliseconds (default: 10 minutes — generous for patient picker interaction) */
  ttlMs?: number
  /** Interval for expired entry cleanup in ms (default: 60 seconds) */
  cleanupIntervalMs?: number
}

export interface ILaunchContextStore {
  /** Store a new session. Returns the session key. */
  set(key: string, session: LaunchSession): void
  /** Retrieve a session by key. Returns null if not found or expired. */
  get(key: string): LaunchSession | null
  /** Update an existing session (e.g., after patient picker selection). */
  update(key: string, partial: Partial<LaunchSession>): boolean
  /** Delete a session (consumed after token exchange). */
  delete(key: string): boolean
  /** Find a session matching a predicate. Returns [key, session] or null. */
  find(predicate: (session: LaunchSession) => boolean): [string, LaunchSession] | null
  /** Number of active sessions (for monitoring). */
  size(): number
  /** Shutdown the store (cleanup timers). */
  dispose(): void
}

/**
 * In-memory launch context store with TTL-based expiration.
 * Single-node only. For HA deployments, implement ILaunchContextStore with Redis.
 */
export class LaunchContextStore implements ILaunchContextStore {
  private store = new Map<string, { session: LaunchSession; expiresAt: number }>()
  private ttlMs: number
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: LaunchContextStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000 // 10 minutes
    const cleanupInterval = options.cleanupIntervalMs ?? 60_000

    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval)
    // Don't block process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  set(key: string, session: LaunchSession): void {
    this.store.set(key, {
      session,
      expiresAt: Date.now() + this.ttlMs,
    })
    logger.auth.debug('Launch session stored', { key: key.slice(0, 8) + '...', clientId: session.clientId })
  }

  get(key: string): LaunchSession | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      logger.auth.debug('Launch session expired', { key: key.slice(0, 8) + '...' })
      return null
    }
    return entry.session
  }

  update(key: string, partial: Partial<LaunchSession>): boolean {
    const entry = this.store.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key)
      return false
    }
    entry.session = { ...entry.session, ...partial }
    return true
  }

  delete(key: string): boolean {
    return this.store.delete(key)
  }

  find(predicate: (session: LaunchSession) => boolean): [string, LaunchSession] | null {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) continue
      if (predicate(entry.session)) {
        return [key, entry.session]
      }
    }
    return null
  }

  size(): number {
    return this.store.size
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }
    if (cleaned > 0) {
      logger.auth.debug('Launch session cleanup', { removed: cleaned, remaining: this.store.size })
    }
  }
}

/** Singleton instance — imported by oauth routes */
export const launchContextStore = new LaunchContextStore()
