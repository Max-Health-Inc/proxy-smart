/** A registered app published to the public store */
export interface PublishedApp {
  /** Keycloak client ID */
  clientId: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Launch URL (external) */
  launchUrl: string
  /** Category for grouping */
  category: string
  /** Logo URI */
  logoUri?: string
}

/** Persisted app-store configuration */
export interface AppStoreConfig {
  /** App IDs (directory names) that are hidden from the public app store */
  hiddenAppIds: string[]
  /** Registered apps manually published to the store */
  publishedApps: PublishedApp[]
  updatedAt: string
}

/**
 * Pluggable persistence backend for the app-store config.
 * The default is file-backed JSON; a host may supply a durable, cluster-safe
 * implementation (e.g. Postgres) instead.
 */
export interface AppStoreConfigPersistence {
  /** Load the persisted config (or a default when nothing is stored yet). */
  load(): AppStoreConfig
  /** Persist the full config. */
  save(config: AppStoreConfig): void
}

/** Options for creating an AppStoreConfigStore */
export interface AppStoreConfigStoreOptions {
  /**
   * Absolute path to the config JSON file. Required when no `persistence` is
   * supplied (the default file backend writes here).
   */
  configPath?: string
  /**
   * Custom persistence backend. When provided it fully replaces file I/O,
   * letting a host back the store with a shared/durable store instead.
   */
  persistence?: AppStoreConfigPersistence
  /** Optional logger — receives warnings on load failures */
  logger?: { warn: (msg: string, meta?: Record<string, unknown>) => void }
}
