import { logger } from './logger'

/**
 * Token Context Store
 *
 * Maps token JTI → SMART launch context that was issued with the token.
 * This is the production-correct way to ensure introspection returns the same
 * launch context that was in the original token response (SMART STU 2.2 §5.2).
 *
 * The session-based approach (LaunchContextStore) stores context BEFORE token issuance
 * and is consumed at token exchange time. This store captures the FINAL enriched context
 * AFTER token exchange and makes it available for introspection for the token's lifetime.
 *
 * Why not rely on Keycloak user attributes (smart_patient)?
 * - User attributes are per-user, not per-session → concurrent sessions race
 * - Protocol mappers are unreliable in KC 26+ introspection responses
 * - The SMART spec says "patient" is a per-token launch context, not an identity claim
 *
 * Single-node in-memory implementation. For HA, swap with Redis-backed store.
 */

/** Launch context associated with an issued token */
export interface TokenContext {
  /** Patient ID (FHIR resource ID, not full reference) */
  patient?: string
  /** Encounter ID */
  encounter?: string
  /** Absolute or relative fhirUser reference */
  fhirUser?: string
  /** Intent string */
  intent?: string
  /** SMART style URL */
  smart_style_url?: string
  /** Tenant identifier */
  tenant?: string
  /** Whether patient banner is needed */
  need_patient_banner?: boolean
  /** Client ID the token was issued to */
  clientId?: string
  /** Token expiration timestamp (epoch seconds) */
  exp?: number
}

export interface TokenContextStoreOptions {
  /** Max entries before forced eviction of oldest (default: 50,000) */
  maxEntries?: number
  /** Cleanup interval in ms (default: 5 minutes) */
  cleanupIntervalMs?: number
}

export interface ITokenContextStore {
  /** Store context for a token identified by its JTI. TTL derived from exp. */
  set(jti: string, context: TokenContext): void
  /** Retrieve context by JTI. Returns null if not found or expired. */
  get(jti: string): TokenContext | null
  /** Number of stored entries (monitoring). */
  size(): number
  /** Shutdown (cleanup timers). */
  dispose(): void
}

/**
 * In-memory token context store with expiration-based TTL.
 * Entries expire when the token's `exp` timestamp passes.
 */
export class TokenContextStore implements ITokenContextStore {
  private store = new Map<string, { context: TokenContext; expiresAt: number }>()
  private maxEntries: number
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: TokenContextStoreOptions = {}) {
    this.maxEntries = options.maxEntries ?? 50_000
    const cleanupInterval = options.cleanupIntervalMs ?? 5 * 60 * 1000

    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval)
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  set(jti: string, context: TokenContext): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }

    // Use token's exp or default to 1 hour
    const expiresAt = context.exp
      ? context.exp * 1000 // exp is epoch seconds → ms
      : Date.now() + 3600_000

    this.store.set(jti, { context, expiresAt })
    logger.auth.debug('Token context stored', {
      jti: jti.slice(0, 8) + '...',
      patient: context.patient,
      clientId: context.clientId,
    })
  }

  get(jti: string): TokenContext | null {
    const entry = this.store.get(jti)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(jti)
      return null
    }
    return entry.context
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
      logger.auth.debug('Token context cleanup', { removed: cleaned, remaining: this.store.size })
    }
  }
}

/** Singleton instance */
export const tokenContextStore = new TokenContextStore()
