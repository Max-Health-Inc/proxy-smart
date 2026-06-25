/**
 * App Store Config — Unit Tests (file-fallback path)
 *
 * Verifies the backend's app-store config wrapper persists visibility/publish
 * state through the shared admin-config store. Without DATABASE_URL this writes
 * `DATA_DIR/app-store.json`, replacing the previous indefinitely-cached,
 * per-task `app-store-config.json` behaviour.
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import {
  getAppStoreConfig,
  getHiddenAppIds,
  getPublishedApps,
  hideApp,
  showApp,
  publishApp,
  unpublishApp,
} from '../src/lib/app-store-config'
import { adminConfigStore } from '../src/lib/admin-config-store'
import { DATA_DIR } from '../src/lib/paths'

const FILE = join(DATA_DIR, 'app-store.json')

afterEach(() => {
  // Reset to a clean state for the next test.
  for (const id of [...getHiddenAppIds()]) showApp(id)
  for (const app of [...getPublishedApps()]) unpublishApp(app.clientId)
  adminConfigStore.invalidate('app-store')
  if (existsSync(FILE)) unlinkSync(FILE)
})

describe('App Store Config — file fallback', () => {
  it('hides and shows apps, persisting the hidden list', () => {
    hideApp('app-a')
    hideApp('app-b')
    expect(getHiddenAppIds().sort()).toEqual(['app-a', 'app-b'])

    showApp('app-a')
    expect(getHiddenAppIds()).toEqual(['app-b'])
  })

  it('hideApp is idempotent', () => {
    hideApp('dup')
    hideApp('dup')
    expect(getHiddenAppIds()).toEqual(['dup'])
  })

  it('publishes and unpublishes registered apps (upsert by clientId)', () => {
    publishApp({
      clientId: 'c1',
      name: 'One',
      description: 'first',
      launchUrl: 'https://example/one',
      category: 'clinical',
    })
    publishApp({
      clientId: 'c1',
      name: 'One Updated',
      description: 'first again',
      launchUrl: 'https://example/one',
      category: 'clinical',
    })
    const published = getPublishedApps()
    expect(published).toHaveLength(1)
    expect(published[0].name).toBe('One Updated')

    unpublishApp('c1')
    expect(getPublishedApps()).toHaveLength(0)
  })

  it('persists the config to DATA_DIR/app-store.json', async () => {
    hideApp('persist-me')
    // Allow the background durable write kicked off by save() to flush.
    await adminConfigStore.set('app-store', getAppStoreConfig())
    expect(existsSync(FILE)).toBe(true)
    const onDisk = JSON.parse(readFileSync(FILE, 'utf-8'))
    expect(onDisk.hiddenAppIds).toContain('persist-me')
  })

  it('survives a simulated restart by reloading from disk', async () => {
    hideApp('survivor')
    await adminConfigStore.set('app-store', getAppStoreConfig())

    // Simulate a fresh task: drop the cache so the next read loads from file.
    adminConfigStore.invalidate('app-store')
    expect(getHiddenAppIds()).toContain('survivor')
  })
})
