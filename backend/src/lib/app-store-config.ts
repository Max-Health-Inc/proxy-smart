import { join } from 'path'
import { AppStoreConfigStore } from '@proxy-smart/app-store'
import type { AppStoreConfig, PublishedApp } from '@proxy-smart/app-store'
import { logger } from './logger'
import { DATA_DIR } from './paths'

export type { AppStoreConfig, PublishedApp }

const CONFIG_PATH = join(DATA_DIR, 'app-store-config.json')

/** Singleton config store instance */
const store = new AppStoreConfigStore({
  configPath: CONFIG_PATH,
  logger: { warn: (msg, meta) => logger.server.warn(msg, meta) },
})

export function getHiddenAppIds(): string[] {
  return store.getHiddenAppIds()
}

export function getAppStoreConfig(): AppStoreConfig {
  return store.getConfig()
}

export function setHiddenAppIds(ids: string[]): AppStoreConfig {
  return store.setHiddenAppIds(ids)
}

export function getPublishedApps(): PublishedApp[] {
  return store.getPublishedApps()
}

export function publishApp(app: PublishedApp): AppStoreConfig {
  return store.publishApp(app)
}

export function unpublishApp(clientId: string): AppStoreConfig {
  return store.unpublishApp(clientId)
}

export function hideApp(appId: string): AppStoreConfig {
  return store.hideApp(appId)
}

export function showApp(appId: string): AppStoreConfig {
  return store.showApp(appId)
}
