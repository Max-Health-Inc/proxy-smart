/**
 * Shared admin-config store — durable, cluster-safe persistence for
 * runtime-mutable admin configuration (MCP endpoint settings, app-store
 * visibility, etc.).
 *
 * Backends, selected at construction time by the presence of DATABASE_URL:
 *
 *  - PostgreSQL (production / clustered): a single `admin_config` table keyed
 *    by `config_key`. All tasks share one database, so a write from any task
 *    is observed by every other task — no per-task divergence under scale-out,
 *    and no data loss on redeploy/restart. Mirrors the pattern in
 *    `mtls-store.ts` (lazy `CREATE TABLE IF NOT EXISTS`, shared `pg` Pool).
 *
 *  - File (local dev / no DATABASE_URL): read/write the existing
 *    `DATA_DIR/<key>.json` files. Keeps current behaviour unchanged so local
 *    dev and the current beta deployment work exactly as before.
 *
 * Resilience: when DATABASE_URL IS set the Postgres backend is wrapped in a
 * {@link ResilientAdminConfigBackend} that transparently falls back to the file
 * backend if Postgres is unreachable or its database does not exist yet (e.g.
 * the `proxy_smart` DB was never created on an existing data volume). This
 * guarantees admin writes never 500 and reads never crash even when the
 * database is temporarily unavailable; once Postgres recovers the next write
 * persists durably again. The fallback is logged once to avoid log-spam.
 *
 * Read model: the public read API is SYNCHRONOUS so existing sync consumers
 * (`config.mcp.enabled` getter, `isToolExposed` in tight registration loops,
 * the app-store route handlers) do not have to change. Reads are served from a
 * SHORT-TTL in-memory cache. When the cache is stale a background refresh is
 * kicked off (fire-and-forget) but the current cached value is returned
 * immediately. This guarantees every task converges on writes from other tasks
 * within `CACHE_TTL_MS` — replacing the old indefinite cache that never
 * re-read. Writes update the cache synchronously and then persist (awaitable),
 * so unawaited callers still read the new value immediately while awaiting
 * callers can confirm durability.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'
import { DATA_DIR } from './paths'
import { getSharedPool, hasDatabaseUrl } from './pg-pool'

/**
 * Short TTL for the read cache. Kept deliberately small so that, under
 * scale-out, a write performed by one task is observed by all other tasks
 * within this window. Must NOT be an indefinite cache (the bug this fixes).
 */
const CACHE_TTL_MS = 5_000

/** A JSON-serialisable admin config value. */
export type AdminConfigValue = Record<string, unknown>

/**
 * Storage backend interface for admin config values.
 * Implemented by both the Postgres and file backends.
 *
 * Exported as a dependency seam: tests construct an {@link AdminConfigStore}
 * with a custom backend (e.g. a failing primary) to exercise the resilient
 * fallback path without a real database.
 */
export interface AdminConfigBackend {
  /** Load the raw value for a key, or null if it has never been written. */
  load(key: string): Promise<AdminConfigValue | null>
  /** Persist the value for a key. */
  store(key: string, value: AdminConfigValue): Promise<void>
}

// ── File backend (local dev / no DATABASE_URL) ────────────────────────────────

/**
 * Reads/writes `DATA_DIR/<key>.json`. Preserves the exact on-disk format and
 * location used before this store existed, so existing seed files and the
 * current beta volume keep working unchanged.
 */
class FileAdminConfigBackend implements AdminConfigBackend {
  private pathFor(key: string): string {
    return join(DATA_DIR, `${key}.json`)
  }

  async load(key: string): Promise<AdminConfigValue | null> {
    const path = this.pathFor(key)
    if (!existsSync(path)) return null
    try {
      const raw = readFileSync(path, 'utf-8')
      return JSON.parse(raw) as AdminConfigValue
    } catch (error) {
      logger.server.warn(`Failed to read ${key}.json, treating as unset`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  async store(key: string, value: AdminConfigValue): Promise<void> {
    writeFileSync(this.pathFor(key), JSON.stringify(value, null, 2), 'utf-8')
  }
}

// ── Postgres backend (production / clustered) ─────────────────────────────────

/**
 * Stores values in a single shared `admin_config` table. Lazily creates the
 * table on first use, exactly like `mtls-store.ts` initialises its table.
 */
class PostgresAdminConfigBackend implements AdminConfigBackend {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    await getSharedPool().query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        config_key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    this.initialized = true
    logger.info('security', 'PostgreSQL admin_config table initialized')
  }

  async load(key: string): Promise<AdminConfigValue | null> {
    await this.initialize()
    const result = await getSharedPool().query(
      'SELECT value FROM admin_config WHERE config_key = $1',
      [key],
    )
    if (result.rows.length === 0) return null
    // pg returns jsonb columns already parsed into JS objects.
    return result.rows[0].value as AdminConfigValue
  }

  async store(key: string, value: AdminConfigValue): Promise<void> {
    await this.initialize()
    await getSharedPool().query(
      `
      INSERT INTO admin_config (config_key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (config_key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
      `,
      [key, JSON.stringify(value)],
    )
  }
}

// ── Resilient backend (Postgres primary, file fallback) ──────────────────────

/**
 * Wraps a primary (Postgres) backend with a file fallback. Every operation is
 * attempted against the primary first; if it throws — connection refused, the
 * database does not exist yet, an init/query error — the call transparently
 * delegates to the file backend instead of propagating the error. This keeps
 * admin writes from 500ing and reads from crashing while Postgres is
 * unavailable, while leaving the happy path (Postgres reachable) unchanged.
 *
 * Writes that fall back are persisted to disk, so a subsequent read returns the
 * value that was written rather than stale defaults. When Postgres later
 * recovers, the next successful write persists durably again.
 *
 * The fallback condition is logged only once (one-shot flag) to avoid emitting
 * a warning on every call while the database stays down.
 */
export class ResilientAdminConfigBackend implements AdminConfigBackend {
  private fellBackOnce = false

  constructor(
    private readonly primary: AdminConfigBackend,
    private readonly fallback: AdminConfigBackend,
  ) {}

  /** True once the primary backend has failed at least once. */
  get usingFallback(): boolean {
    return this.fellBackOnce
  }

  async load(key: string): Promise<AdminConfigValue | null> {
    try {
      return await this.primary.load(key)
    } catch (error) {
      this.noteFallback('load', key, error)
      return this.fallback.load(key)
    }
  }

  async store(key: string, value: AdminConfigValue): Promise<void> {
    try {
      await this.primary.store(key, value)
    } catch (error) {
      this.noteFallback('store', key, error)
      await this.fallback.store(key, value)
    }
  }

  private noteFallback(op: 'load' | 'store', key: string, error: unknown): void {
    if (this.fellBackOnce) return
    this.fellBackOnce = true
    logger.warn(
      'security',
      'Postgres admin config backend unavailable — falling back to file backend. ' +
        'Admin config will persist to disk until the database is reachable again.',
      {
        operation: op,
        key,
        error: error instanceof Error ? error.message : String(error),
      },
    )
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

/** Cache entry: the last known value plus the time it was loaded. */
interface CacheEntry {
  value: AdminConfigValue
  loadedAt: number
  /** Guards against overlapping background refreshes for the same key. */
  refreshing: boolean
}

/**
 * Generic key → JSON admin-config store. One shared instance backs every
 * admin config (MCP endpoint, app-store, …) so there is a single source of
 * truth and a single backend selection.
 */
export class AdminConfigStore {
  private readonly backend: AdminConfigBackend
  private readonly cache = new Map<string, CacheEntry>()
  /** True when persistence is durable across tasks/restarts (Postgres). */
  readonly durable: boolean

  /**
   * @param backend Optional explicit backend, a dependency seam for tests that
   *   need to exercise a specific backend (e.g. a resilient backend with a
   *   failing primary) without depending on DATABASE_URL at import time.
   *   When omitted, the backend is selected from the environment: a
   *   file-fallback-wrapped Postgres backend when a database is configured,
   *   otherwise the plain file backend.
   */
  constructor(backend?: AdminConfigBackend) {
    if (backend) {
      this.backend = backend
      this.durable = backend instanceof PostgresAdminConfigBackend
      return
    }

    if (hasDatabaseUrl()) {
      // Postgres is the durable primary, but wrap it so a missing/unreachable
      // database transparently degrades to the file backend instead of 500ing
      // admin writes (the proxy_smart DB may not exist on an existing volume).
      this.backend = new ResilientAdminConfigBackend(
        new PostgresAdminConfigBackend(),
        new FileAdminConfigBackend(),
      )
      this.durable = true
      logger.info(
        'security',
        'Admin config store initialized with PostgreSQL backend (file fallback enabled)',
      )
    } else {
      this.backend = new FileAdminConfigBackend()
      this.durable = false
      logger.warn(
        'security',
        'No DATABASE_URL configured, using file-backed admin config store (not shared across tasks)',
      )
    }
  }

  /**
   * Construct a store for tests with an explicit primary + file fallback,
   * exercising the resilient path without a real database. The file fallback
   * uses the same on-disk format and {@link DATA_DIR} as production.
   */
  static withResilientBackend(primary: AdminConfigBackend): AdminConfigStore {
    return new AdminConfigStore(
      new ResilientAdminConfigBackend(primary, new FileAdminConfigBackend()),
    )
  }

  /**
   * Read a config value synchronously, applying `defaults` for any missing or
   * mis-typed keys via `merge`. Served from the short-TTL cache; a stale entry
   * triggers a background refresh but still returns immediately.
   *
   * @param key      Storage key (also the filename stem in file mode).
   * @param defaults Default value used before the first load completes and as
   *                 the base for merging persisted partials.
   * @param merge    Combines `defaults` with the raw persisted value into a
   *                 fully-typed result. Receives null before the first
   *                 successful load.
   */
  get<T extends object>(
    key: string,
    defaults: T,
    merge: (defaults: T, raw: AdminConfigValue | null) => T,
  ): T {
    const entry = this.cache.get(key)

    if (!entry) {
      // First access: prime synchronously in file mode (the read is cheap and
      // synchronous on disk), and kick off an async load for the DB path.
      const primed = this.primeSync(key, defaults, merge)
      return primed
    }

    if (Date.now() - entry.loadedAt > CACHE_TTL_MS) {
      this.refreshInBackground(key, defaults, merge)
    }
    return merge(defaults, entry.value)
  }

  /**
   * Persist a config value. Updates the cache synchronously so subsequent
   * sync reads (even before this promise resolves) observe the new value, then
   * writes through to the backend.
   */
  async set<T extends object>(key: string, value: T): Promise<void> {
    // Any plain object is JSON-serialisable; the backend persists it as JSON.
    const serialisable = value as AdminConfigValue
    this.cache.set(key, { value: serialisable, loadedAt: Date.now(), refreshing: false })
    await this.backend.store(key, serialisable)
  }

  /**
   * Force a synchronous-from-the-caller's-view refresh of a key. Used by tests
   * and by callers that need to guarantee they read the latest persisted state.
   */
  async reload<T extends object>(
    key: string,
    defaults: T,
    merge: (defaults: T, raw: AdminConfigValue | null) => T,
  ): Promise<T> {
    const raw = await this.backend.load(key)
    this.cache.set(key, {
      value: raw ?? {},
      loadedAt: Date.now(),
      refreshing: false,
    })
    return merge(defaults, raw)
  }

  /** Drop the cached entry for a key (test helper). */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  private primeSync<T extends object>(
    key: string,
    defaults: T,
    merge: (defaults: T, raw: AdminConfigValue | null) => T,
  ): T {
    if (this.backend instanceof FileAdminConfigBackend) {
      // File reads are synchronous; populate the cache immediately so the
      // first read already reflects persisted state.
      const path = join(DATA_DIR, `${key}.json`)
      let raw: AdminConfigValue | null = null
      if (existsSync(path)) {
        try {
          raw = JSON.parse(readFileSync(path, 'utf-8')) as AdminConfigValue
        } catch (error) {
          logger.server.warn(`Failed to read ${key}.json, using defaults`, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      this.cache.set(key, { value: raw ?? {}, loadedAt: Date.now(), refreshing: false })
      return merge(defaults, raw)
    }

    // DB mode: we cannot block synchronously on the async load. Seed the cache
    // with defaults, return defaults for this first call, and load in the
    // background so the very next read (within the same TTL window) is correct.
    this.cache.set(key, { value: {}, loadedAt: 0, refreshing: false })
    this.refreshInBackground(key, defaults, merge)
    return merge(defaults, null)
  }

  private refreshInBackground<T extends object>(
    key: string,
    _defaults: T,
    _merge: (defaults: T, raw: AdminConfigValue | null) => T,
  ): void {
    const entry = this.cache.get(key)
    if (entry?.refreshing) return
    if (entry) entry.refreshing = true

    void this.backend
      .load(key)
      .then((raw) => {
        this.cache.set(key, {
          value: raw ?? {},
          loadedAt: Date.now(),
          refreshing: false,
        })
      })
      .catch((error: unknown) => {
        // Keep serving the last known value; clear the in-flight flag so a
        // later read can retry.
        const current = this.cache.get(key)
        if (current) current.refreshing = false
        logger.server.warn(`Background refresh of admin config "${key}" failed`, {
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }
}

/** Shared singleton — single source of truth for all admin config. */
export const adminConfigStore = new AdminConfigStore()
