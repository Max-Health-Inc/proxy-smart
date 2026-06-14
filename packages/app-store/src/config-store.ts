import { readFileSync, writeFileSync, existsSync } from 'fs'
import type {
  AppStoreConfig,
  AppStoreConfigPersistence,
  AppStoreConfigStoreOptions,
  PublishedApp,
} from './types'

const DEFAULT_CONFIG: AppStoreConfig = {
  hiddenAppIds: [],
  publishedApps: [],
  updatedAt: new Date().toISOString(),
}

/** Normalise an arbitrary persisted blob into a complete, typed config. */
function normalize(data: Partial<AppStoreConfig> | null): AppStoreConfig {
  if (!data) return { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() }
  return {
    hiddenAppIds: Array.isArray(data.hiddenAppIds) ? data.hiddenAppIds : [],
    publishedApps: Array.isArray(data.publishedApps) ? data.publishedApps : [],
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

/**
 * File-backed persistence (default). Reads/writes a JSON file at `configPath`.
 * Used directly for local dev and as the fallback when no external persistence
 * (e.g. the backend's shared Postgres store) is supplied.
 */
class FilePersistence implements AppStoreConfigPersistence {
  constructor(
    private readonly configPath: string,
    private readonly logger?: AppStoreConfigStoreOptions['logger'],
  ) {}

  load(): AppStoreConfig {
    try {
      if (!existsSync(this.configPath)) return normalize(null)
      const raw = readFileSync(this.configPath, 'utf-8')
      return normalize(JSON.parse(raw))
    } catch (error) {
      this.logger?.warn('Failed to load app-store-config.json', {
        error: error instanceof Error ? error.message : String(error),
      })
      return normalize(null)
    }
  }

  save(config: AppStoreConfig): void {
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
}

/**
 * Manages app-store visibility configuration.
 * Stores which discovered apps are hidden from the public /apps page,
 * and which registered (Keycloak) apps are published to the store.
 *
 * Persistence is pluggable: by default it writes a JSON file (`configPath`),
 * but a host (e.g. the backend) may inject a durable, cluster-safe
 * `persistence` (Postgres) instead. The visibility/publish mutation logic lives
 * here in one place regardless of backend, keeping it DRY.
 */
export class AppStoreConfigStore {
  private config: AppStoreConfig
  private readonly persistence: AppStoreConfigPersistence

  constructor(options: AppStoreConfigStoreOptions) {
    this.persistence =
      options.persistence ?? new FilePersistence(options.configPath ?? '', options.logger)
    this.config = normalize(this.persistence.load())
  }

  private save(): void {
    this.persistence.save(this.config)
  }

  /** Reload config from the persistence backend */
  reload(): void {
    this.config = normalize(this.persistence.load())
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
