import { AppStoreConfigStore } from '@proxy-smart/app-store'
import type {
  AppStoreConfig,
  AppStoreConfigPersistence,
  PublishedApp,
} from '@proxy-smart/app-store'
import { logger } from './logger'
import { adminConfigStore } from './admin-config-store'

export type { AppStoreConfig, PublishedApp }

/** Storage key — also the filename stem (`app-store-config.json`) in file mode. */
const CONFIG_KEY = 'app-store'

const DEFAULTS: AppStoreConfig = {
  hiddenAppIds: [],
  publishedApps: [],
  updatedAt: new Date().toISOString(),
}

/** Merge a persisted (partial) value onto defaults into a fully-typed config. */
function mergeConfig(
  defaults: AppStoreConfig,
  raw: Record<string, unknown> | null,
): AppStoreConfig {
  if (!raw) return { ...defaults }
  return {
    hiddenAppIds: Array.isArray(raw.hiddenAppIds) ? (raw.hiddenAppIds as string[]) : [],
    publishedApps: Array.isArray(raw.publishedApps)
      ? (raw.publishedApps as PublishedApp[])
      : [],
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

/**
 * Persistence adapter backing the app-store config with the shared admin-config
 * store (Postgres when DATABASE_URL is set, else the existing
 * `DATA_DIR/app-store-config.json` file). The package's persistence contract is
 * synchronous; the shared store updates its cache synchronously on write and
 * persists durably in the background, so this stays sync while remaining
 * cluster-safe.
 */
const sharedStorePersistence: AppStoreConfigPersistence = {
  load(): AppStoreConfig {
    return adminConfigStore.get<AppStoreConfig>(CONFIG_KEY, DEFAULTS, mergeConfig)
  },
  save(config: AppStoreConfig): void {
    // Cache is updated synchronously inside set(); the durable write happens in
    // the background. We swallow rejection here (logged) so a transient DB error
    // never surfaces as an unhandled rejection — the in-memory state is already
    // current and the next mutation will retry persistence.
    void adminConfigStore.set(CONFIG_KEY, config).catch((error: unknown) => {
      logger.server.warn('Failed to persist app-store config', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  },
}

/** Singleton config store instance backed by the shared admin-config store */
const store = new AppStoreConfigStore({
  persistence: sharedStorePersistence,
  logger: { warn: (msg, meta) => logger.server.warn(msg, meta) },
})

/**
 * Re-hydrate the package store's in-process state from the shared store before
 * every read/mutation. The shared store's short-TTL cache is the convergence
 * mechanism: this keeps each operation working on fresh state (so a write from
 * another task is observed) and ensures mutations build on the latest config
 * rather than a stale in-process copy. Reads here are cheap and cache-backed.
 */
function syncedStore(): AppStoreConfigStore {
  store.reload()
  return store
}

export function getHiddenAppIds(): string[] {
  return syncedStore().getHiddenAppIds()
}

export function getAppStoreConfig(): AppStoreConfig {
  return syncedStore().getConfig()
}

export function setHiddenAppIds(ids: string[]): AppStoreConfig {
  return syncedStore().setHiddenAppIds(ids)
}

export function getPublishedApps(): PublishedApp[] {
  return syncedStore().getPublishedApps()
}

export function publishApp(app: PublishedApp): AppStoreConfig {
  return syncedStore().publishApp(app)
}

export function unpublishApp(clientId: string): AppStoreConfig {
  return syncedStore().unpublishApp(clientId)
}

export function hideApp(appId: string): AppStoreConfig {
  return syncedStore().hideApp(appId)
}

export function showApp(appId: string): AppStoreConfig {
  return syncedStore().showApp(appId)
}
