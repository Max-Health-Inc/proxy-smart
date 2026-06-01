/**
 * Scope Sets Store — file-backed persistence for reusable scope set collections.
 *
 * Persists to `scope-sets.json` in the data directory.
 * Admin API reads/writes through helpers exported here.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'
import { DATA_DIR } from './paths'
import type { ScopeSetType } from '@/schemas'

// ── File persistence ─────────────────────────────────────────────────────────

const STORE_PATH = join(DATA_DIR, 'scope-sets.json')

let cached: ScopeSetType[] | null = null

export function loadScopeSets(): ScopeSetType[] {
  if (cached) return cached
  try {
    if (!existsSync(STORE_PATH)) {
      cached = []
      return cached
    }
    const raw = readFileSync(STORE_PATH, 'utf-8')
    const data = JSON.parse(raw)
    cached = Array.isArray(data) ? data : []
    return cached
  } catch (error) {
    logger.server.warn('Failed to load scope-sets.json, using empty list', {
      error: error instanceof Error ? error.message : String(error),
    })
    cached = []
    return cached
  }
}

function persist(sets: ScopeSetType[]): void {
  cached = sets
  writeFileSync(STORE_PATH, JSON.stringify(sets, null, 2), 'utf-8')
}

export function getScopeSet(id: string): ScopeSetType | undefined {
  return loadScopeSets().find(s => s.id === id)
}

export function createScopeSet(data: { name: string; description?: string; scopes: string[] }): ScopeSetType {
  const sets = loadScopeSets()
  const now = new Date().toISOString()
  const newSet: ScopeSetType = {
    id: `scope-${crypto.randomUUID()}`,
    name: data.name,
    description: data.description,
    scopes: data.scopes,
    isTemplate: false,
    createdAt: now,
    updatedAt: now,
  }
  persist([...sets, newSet])
  return newSet
}

export function updateScopeSet(id: string, data: { name?: string; description?: string; scopes?: string[] }): ScopeSetType | null {
  const sets = loadScopeSets()
  const idx = sets.findIndex(s => s.id === id)
  if (idx === -1) return null

  const existing = sets[idx]
  if (existing.isTemplate) return null // Cannot edit built-in templates

  const updated: ScopeSetType = {
    ...existing,
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.scopes !== undefined && { scopes: data.scopes }),
    updatedAt: new Date().toISOString(),
  }
  sets[idx] = updated
  persist(sets)
  return updated
}

export function deleteScopeSet(id: string): boolean {
  const sets = loadScopeSets()
  const target = sets.find(s => s.id === id)
  if (!target || target.isTemplate) return false // Cannot delete templates

  const filtered = sets.filter(s => s.id !== id)
  persist(filtered)
  return true
}
