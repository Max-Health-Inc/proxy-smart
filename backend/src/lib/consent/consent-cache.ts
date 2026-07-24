// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Consent Cache
 * 
 * In-memory cache for FHIR Consent resources to reduce upstream queries.
 * Uses TTL-based expiration for balance between performance and freshness.
 */

import type { FhirConsent, ConsentCacheKey, ConsentCacheEntry } from './types'
import { logger } from '../logger'

/**
 * Generate cache key from components
 */
function generateCacheKey(key: ConsentCacheKey): string {
  return `${key.serverName}:${key.patientId}:${key.clientId}`
}

/**
 * Consent cache with TTL-based expiration
 */
class ConsentCache {
  private cache = new Map<string, ConsentCacheEntry>()
  private defaultTtl: number

  constructor(defaultTtlMs: number = 60000) {
    this.defaultTtl = defaultTtlMs
  }

  /**
   * Get cached consents for a patient/client/server combination
   */
  get(key: ConsentCacheKey): FhirConsent[] | null {
    const cacheKey = generateCacheKey(key)
    const entry = this.cache.get(cacheKey)

    if (!entry) {
      logger.debug('consent', 'Cache miss', { key: cacheKey })
      return null
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      logger.debug('consent', 'Cache entry expired', { 
        key: cacheKey, 
        expiredAt: new Date(entry.expiresAt).toISOString() 
      })
      this.cache.delete(cacheKey)
      return null
    }

    logger.debug('consent', 'Cache hit', { 
      key: cacheKey, 
      consentCount: entry.consents.length,
      expiresIn: Math.round((entry.expiresAt - Date.now()) / 1000) + 's'
    })
    return entry.consents
  }

  /**
   * Store consents in cache
   */
  set(key: ConsentCacheKey, consents: FhirConsent[], ttlMs?: number): void {
    const cacheKey = generateCacheKey(key)
    const ttl = ttlMs ?? this.defaultTtl
    const now = Date.now()

    const entry: ConsentCacheEntry = {
      consents,
      fetchedAt: now,
      expiresAt: now + ttl
    }

    this.cache.set(cacheKey, entry)
    logger.debug('consent', 'Cached consents', { 
      key: cacheKey, 
      consentCount: consents.length,
      ttlMs: ttl
    })
  }

  /**
   * Invalidate cache for a specific patient/client/server combination
   */
  invalidate(key: ConsentCacheKey): boolean {
    const cacheKey = generateCacheKey(key)
    const existed = this.cache.has(cacheKey)
    this.cache.delete(cacheKey)
    
    if (existed) {
      logger.debug('consent', 'Cache entry invalidated', { key: cacheKey })
    }
    return existed
  }

  /**
   * Invalidate all cache entries for a specific patient
   */
  invalidatePatient(patientId: string, serverName?: string): number {
    let invalidated = 0
    const prefix = serverName ? `${serverName}:${patientId}:` : `:${patientId}:`
    
    for (const key of this.cache.keys()) {
      if (key.includes(prefix) || key.startsWith(`${patientId}:`)) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    if (invalidated > 0) {
      logger.debug('consent', 'Invalidated patient cache entries', { 
        patientId, 
        serverName, 
        count: invalidated 
      })
    }
    return invalidated
  }

  /**
   * Invalidate all cache entries for a specific server
   */
  invalidateServer(serverName: string): number {
    let invalidated = 0
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${serverName}:`)) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    if (invalidated > 0) {
      logger.debug('consent', 'Invalidated server cache entries', { 
        serverName, 
        count: invalidated 
      })
    }
    return invalidated
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.debug('consent', 'Cache cleared', { entriesCleared: size })
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; consentCount: number; expiresIn: number }> } {
    const now = Date.now()
    const entries: Array<{ key: string; consentCount: number; expiresIn: number }> = []
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        consentCount: entry.consents.length,
        expiresIn: Math.max(0, Math.round((entry.expiresAt - now) / 1000))
      })
    }
    
    return {
      size: this.cache.size,
      entries
    }
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      logger.debug('consent', 'Cache cleanup completed', { entriesCleaned: cleaned })
    }
    return cleaned
  }

  /**
   * Update default TTL
   */
  setDefaultTtl(ttlMs: number): void {
    this.defaultTtl = ttlMs
    logger.debug('consent', 'Cache TTL updated', { ttlMs })
  }
}

// Export singleton instance
export const consentCache = new ConsentCache()

// Export class for testing
export { ConsentCache }
