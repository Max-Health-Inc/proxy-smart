import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { AppStoreConfig, AppStoreConfigStoreOptions, PublishedApp } from './types'

const DEFAULT_CONFIG: AppStoreConfig = {
  hiddenAppIds: [],
  publishedApps: [],
  updatedAt: new Date().toISOString(),
}

/**
 * Manages app-store visibility configuration.
 * Stores which discovered apps are hidden from the public /apps page,
 * and which registered (Keycloak) apps are published to the store.
 * Persisted to a JSON file for volume-backed durability.
 */
export class AppStoreConfigStore {
  private config: AppStoreConfig
  private readonly configPath: string
  private readonly logger?: AppStoreConfigStoreOptions['logger']

  constructor(options: AppStoreConfigStoreOptions) {
    this.configPath = options.configPath
    this.logger = options.logger
    this.config = this.load()
  }

  private load(): AppStoreConfig {
    try {
      if (!existsSync(this.configPath)) return { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() }
      const raw = readFileSync(this.configPath, 'utf-8')
      const data = JSON.parse(raw)
      return {
        hiddenAppIds: Array.isArray(data.hiddenAppIds) ? data.hiddenAppIds : [],
        publishedApps: Array.isArray(data.publishedApps) ? data.publishedApps : [],
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      }
    } catch (error) {
      this.logger?.warn('Failed to load app-store-config.json', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() }
    }
  }

  private save(): void {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
  }

  /** Reload config from disk */
  reload(): void {
    this.config = this.load()
  }

  /** Get the full store configuration */
  getConfig(): AppStoreConfig {
    return this.config
  }

  /** Get list of hidden app IDs */
  getHiddenAppIds(): string[] {
    return this.config.hiddenAppIds
  }

  /** Replace all hidden app IDs */
  setHiddenAppIds(ids: string[]): AppStoreConfig {
    this.config = { ...this.config, hiddenAppIds: ids, updatedAt: new Date().toISOString() }
    this.save()
    return this.config
  }

  /** Get published registered apps */
  getPublishedApps(): PublishedApp[] {
    return this.config.publishedApps
  }

  /** Publish a registered app (upserts by clientId) */
  publishApp(app: PublishedApp): AppStoreConfig {
    this.config.publishedApps = this.config.publishedApps.filter(a => a.clientId !== app.clientId)
    this.config.publishedApps.push(app)
    this.config.updatedAt = new Date().toISOString()
    this.save()
    return this.config
  }

  /** Remove a registered app from the store */
  unpublishApp(clientId: string): AppStoreConfig {
    this.config.publishedApps = this.config.publishedApps.filter(a => a.clientId !== clientId)
    this.config.updatedAt = new Date().toISOString()
    this.save()
    return this.config
  }

  /** Hide an app from the public store */
  hideApp(appId: string): AppStoreConfig {
    if (!this.config.hiddenAppIds.includes(appId)) {
      this.config.hiddenAppIds.push(appId)
      this.config.updatedAt = new Date().toISOString()
      this.save()
    }
    return this.config
  }

  /** Show a previously hidden app */
  showApp(appId: string): AppStoreConfig {
    this.config.hiddenAppIds = this.config.hiddenAppIds.filter(id => id !== appId)
    this.config.updatedAt = new Date().toISOString()
    this.save()
    return this.config
  }
}
