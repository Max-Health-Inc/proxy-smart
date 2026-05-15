/**
 * @proxy-smart/auth — Launch Context Store Interface
 *
 * Defines the contract for session stores. Ship with MemoryStore;
 * consumers can implement RedisStore/PostgresStore behind the same interface.
 */

import type { LaunchSession } from '../types'

export interface LaunchContextStoreOptions {
  /** TTL in milliseconds (default: 600_000 = 10 minutes) */
  ttlMs?: number
  /** Interval for expired entry cleanup in ms (default: 60_000) */
  cleanupIntervalMs?: number
}

export interface ILaunchContextStore {
  /** Store a new session. */
  set(key: string, session: LaunchSession): void
  /** Retrieve a session by key. Returns null if not found or expired. */
  get(key: string): LaunchSession | null
  /** Update an existing session (partial merge). */
  update(key: string, partial: Partial<LaunchSession>): boolean
  /** Delete a session (consumed after token exchange). */
  delete(key: string): boolean
  /** Find a session matching a predicate. Returns [key, session] or null. */
  find(predicate: (session: LaunchSession) => boolean): [string, LaunchSession] | null
  /** Number of active sessions (for monitoring). */
  size(): number
  /** Shutdown the store (cleanup timers, close connections). */
  dispose(): void
}
