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

/** Options for creating an AppStoreConfigStore */
export interface AppStoreConfigStoreOptions {
  /** Absolute path to the config JSON file */
  configPath: string
  /** Optional logger — receives warnings on load failures */
  logger?: { warn: (msg: string, meta?: Record<string, unknown>) => void }
}
