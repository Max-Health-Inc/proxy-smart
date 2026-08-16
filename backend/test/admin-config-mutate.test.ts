// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Changing admin config while another task is changing it too.
 *
 * THE DATA LOSS THIS FIXES, measured on production 2026-08-16: publishing three apps to the store
 * left two, and each publish silently unpublished the one before it.
 *
 *   publish dicom-viewer   -> [dicom-viewer]
 *   publish consent-app    -> [dicom-viewer, consent-app]
 *   publish patient-portal -> [dicom-viewer, patient-portal]   <- consent-app gone
 *
 * `set` is last-writer-wins over a whole JSON document, and reads come from a 5-second cache. A task
 * that had never seen `consent-app` rewrote the document without it. Nothing errored; the entry
 * simply ceased to exist.
 */
import { describe, it, expect, beforeEach } from 'bun:test'
import { AdminConfigStore, type AdminConfigBackend, type AdminConfigValue, type VersionedAdminConfigValue } from '../src/lib/admin-config-store'

interface Doc extends Record<string, unknown> {
  items: string[]
}

const DEFAULTS: Doc = { items: [] }
const merge = (defaults: Doc, raw: AdminConfigValue | null): Doc =>
  raw && typeof raw === 'object' ? { ...defaults, ...(raw as Doc) } : { ...defaults }

/** A backend that compares and sets, like Postgres with its version column. */
class VersionedBackend implements AdminConfigBackend {
  value: AdminConfigValue | null = null
  version = 0
  /** Lets a test interleave a competing write between another caller's read and write. */
  onBeforeStore?: () => Promise<void>

  async load(key: string): Promise<AdminConfigValue | null> {
    void key
    return this.value
  }

  async store(key: string, value: AdminConfigValue): Promise<void> {
    void key
    this.value = value
    this.version++
  }

  async loadVersioned(key: string): Promise<VersionedAdminConfigValue> {
    void key
    return { value: this.value, version: this.version }
  }

  async storeIfVersion(key: string, value: AdminConfigValue, expectedVersion: number): Promise<boolean> {
    void key
    await this.onBeforeStore?.()
    if (this.version !== expectedVersion) return false
    this.value = value
    this.version++
    return true
  }
}

/** A backend with no compare-and-set, like the single-task file fallback. */
class PlainBackend implements AdminConfigBackend {
  value: AdminConfigValue | null = null
  async load(): Promise<AdminConfigValue | null> {
    return this.value
  }
  async store(_key: string, value: AdminConfigValue): Promise<void> {
    this.value = value
  }
}

const append = (item: string) => (current: Doc): Doc => ({ ...current, items: [...current.items, item] })

describe('AdminConfigStore.mutate', () => {
  let backend: VersionedBackend
  let store: AdminConfigStore

  beforeEach(() => {
    backend = new VersionedBackend()
    store = new AdminConfigStore(backend)
  })

  it('applies an update to the stored value', async () => {
    const result = await store.mutate<Doc>('k', DEFAULTS, merge, append('a'))

    expect(result.items).toEqual(['a'])
  })

  it('keeps an entry written by another task between our read and our write', async () => {
    /*
     * THE PRODUCTION BUG, reproduced: a competing write lands after this caller has read. The old
     * path would overwrite it; the compare-and-set must re-read and reapply on top.
     */
    await store.mutate<Doc>('k', DEFAULTS, merge, append('first'))

    let interfered = false
    backend.onBeforeStore = async () => {
      if (interfered) return
      interfered = true
      // Another task publishes something we have never seen.
      backend.value = { items: ['first', 'from-another-task'] }
      backend.version++
    }

    const result = await store.mutate<Doc>('k', DEFAULTS, merge, append('ours'))

    expect(result.items).toEqual(['first', 'from-another-task', 'ours'])
  })

  it('serialises concurrent mutations in this task rather than racing them', async () => {
    // Three publishes at once used to leave one; all three must survive.
    await Promise.all([
      store.mutate<Doc>('k', DEFAULTS, merge, append('a')),
      store.mutate<Doc>('k', DEFAULTS, merge, append('b')),
      store.mutate<Doc>('k', DEFAULTS, merge, append('c')),
    ])

    const stored = (backend.value as Doc).items
    expect(stored.sort()).toEqual(['a', 'b', 'c'])
  })

  it('gives up rather than looping forever against constant contention', async () => {
    // Every attempt is beaten, so the caller gets an error instead of a silent no-op.
    backend.onBeforeStore = async () => {
      backend.version++
    }

    await expect(store.mutate<Doc>('k', DEFAULTS, merge, append('x'))).rejects.toThrow(/concurrent writers/)
  })

  it('still works on a backend without compare-and-set', async () => {
    // The file fallback is single-task, so a plain read-modify-write is correct there.
    const plain = new PlainBackend()
    const plainStore = new AdminConfigStore(plain)

    await plainStore.mutate<Doc>('k', DEFAULTS, merge, append('a'))
    await plainStore.mutate<Doc>('k', DEFAULTS, merge, append('b'))

    expect((plain.value as Doc).items).toEqual(['a', 'b'])
  })

  it('leaves the cache holding what was actually written', async () => {
    await store.mutate<Doc>('k', DEFAULTS, merge, append('a'))

    // A read straight after a mutation must not serve the pre-mutation document.
    expect(store.get<Doc>('k', DEFAULTS, merge).items).toEqual(['a'])
  })
})
