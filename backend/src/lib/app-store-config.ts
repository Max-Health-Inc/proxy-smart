import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'

/**
 * App-store visibility configuration.
 * Stores which discovered apps are hidden from the public /apps page.
 * Persisted in app-store-config.json at the project root.
 */

interface AppStoreConfig {
  /** App IDs (directory names) that are hidden from the public app store */
  hiddenAppIds: string[]
  updatedAt: string
}

const CONFIG_PATH = join(process.cwd(), 'app-store-config.json')

function loadConfig(): AppStoreConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return { hiddenAppIds: [], updatedAt: new Date().toISOString() }
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return {
      hiddenAppIds: Array.isArray(data.hiddenAppIds) ? data.hiddenAppIds : [],
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    }
  } catch (error) {
    logger.server.warn('Failed to load app-store-config.json', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { hiddenAppIds: [], updatedAt: new Date().toISOString() }
  }
}

function saveConfig(cfg: AppStoreConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
}

// Load once at module init
let config = loadConfig()

export function getHiddenAppIds(): string[] {
  return config.hiddenAppIds
}

export function getAppStoreConfig(): AppStoreConfig {
  return config
}

export function setHiddenAppIds(ids: string[]): AppStoreConfig {
  config = { hiddenAppIds: ids, updatedAt: new Date().toISOString() }
  saveConfig(config)
  return config
}

export function hideApp(appId: string): AppStoreConfig {
  if (!config.hiddenAppIds.includes(appId)) {
    config.hiddenAppIds.push(appId)
    config.updatedAt = new Date().toISOString()
    saveConfig(config)
  }
  return config
}

export function showApp(appId: string): AppStoreConfig {
  config.hiddenAppIds = config.hiddenAppIds.filter(id => id !== appId)
  config.updatedAt = new Date().toISOString()
  saveConfig(config)
  return config
}
