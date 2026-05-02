/**
 * Persistent SHL Session Store — SQLite-backed via bun:sqlite
 *
 * Survives server restarts. Uses WAL mode for concurrent read/write performance.
 * Expired entries are cleaned up lazily on read and periodically via interval.
 *
 * Drop-in replacement for the previous in-memory Map<string, ShlSession>.
 */
import { Database } from 'bun:sqlite'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { logger } from './logger'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShlSession {
  /** SHL payload from kill-the-clipboard (for manifest serving) */
  shl: { url: string; key: string; exp?: number; flag?: string; label?: string }
  /** JWE compact string (spec-compliant, encrypted with SHL key) */
  jwe: string
  /** Opaque session token (256-bit, base64url) — used as Bearer token by viewer */
  sessionToken: string
  /** Patient ID to scope FHIR requests */
  patientId: string
  /** Upstream FHIR server base URL */
  fhirServerUrl: string
  /** Expiry timestamp (ms) */
  expiresAt: number
  /** Whether verified-only filter is active */
  verifiedOnly: boolean
  /** Number of manifest accesses */
  accessCount: number
  /** Optional passcode (hashed) */
  passcodeHash?: string
}

/** Row shape in SQLite (flat, JSON-serialized where needed) */
interface ShlRow {
  id: string
  session_token: string
  shl_payload: string // JSON
  jwe: string
  patient_id: string
  fhir_server_url: string
  expires_at: number
  verified_only: number // 0 or 1
  access_count: number
  passcode_hash: string | null
  created_at: number
}

// ── Database setup ───────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = process.env.SHL_DB_PATH || join(DATA_DIR, 'shl-sessions.sqlite')

function createDatabase(): Database {
  mkdirSync(DATA_DIR, { recursive: true })

  const db = new Database(DB_PATH)

  // WAL mode for better concurrent performance
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA synchronous = NORMAL')

  db.run(`
    CREATE TABLE IF NOT EXISTS shl_sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL UNIQUE,
      shl_payload TEXT NOT NULL,
      jwe TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      fhir_server_url TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      verified_only INTEGER NOT NULL DEFAULT 0,
      access_count INTEGER NOT NULL DEFAULT 0,
      passcode_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `)

  // Index for token lookups (FHIR proxy uses this path)
  db.run('CREATE INDEX IF NOT EXISTS idx_shl_session_token ON shl_sessions(session_token)')
  // Index for expiry cleanup
  db.run('CREATE INDEX IF NOT EXISTS idx_shl_expires_at ON shl_sessions(expires_at)')

  return db
}

// ── Store class ──────────────────────────────────────────────────────────────

class ShlSessionStore {
  private db: Database
  private cleanupTimer: ReturnType<typeof setInterval>

  constructor() {
    this.db = createDatabase()

    // Cleanup expired entries every 60s
    this.cleanupTimer = setInterval(() => this.purgeExpired(), 60_000)
    this.cleanupTimer.unref()

    // Initial cleanup on startup
    this.purgeExpired()
  }

  /** Store a new SHL session */
  set(id: string, session: ShlSession): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shl_sessions
        (id, session_token, shl_payload, jwe, patient_id, fhir_server_url, expires_at, verified_only, access_count, passcode_hash, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      session.sessionToken,
      JSON.stringify(session.shl),
      session.jwe,
      session.patientId,
      session.fhirServerUrl,
      session.expiresAt,
      session.verifiedOnly ? 1 : 0,
      session.accessCount,
      session.passcodeHash ?? null,
      Date.now(),
    )
  }

  /** Get a session by SHL ID (returns undefined if not found or expired) */
  get(id: string): ShlSession | undefined {
    const row = this.db.prepare('SELECT * FROM shl_sessions WHERE id = ?').get(id) as ShlRow | null
    if (!row) return undefined
    return this.rowToSession(row)
  }

  /** Get a session by session token (reverse lookup for FHIR proxy) */
  getByToken(token: string): { id: string; session: ShlSession } | undefined {
    const row = this.db.prepare('SELECT * FROM shl_sessions WHERE session_token = ?').get(token) as ShlRow | null
    if (!row) return undefined
    return { id: row.id, session: this.rowToSession(row) }
  }

  /** Delete a session by ID */
  delete(id: string): void {
    this.db.prepare('DELETE FROM shl_sessions WHERE id = ?').run(id)
  }

  /** Delete a session by token */
  deleteByToken(token: string): void {
    this.db.prepare('DELETE FROM shl_sessions WHERE session_token = ?').run(token)
  }

  /** Increment access count for a session */
  incrementAccessCount(id: string): void {
    this.db.prepare('UPDATE shl_sessions SET access_count = access_count + 1 WHERE id = ?').run(id)
  }

  /** Remove all expired entries */
  private purgeExpired(): void {
    const result = this.db.prepare('DELETE FROM shl_sessions WHERE expires_at < ?').run(Date.now())
    if (result.changes > 0) {
      logger.auth.debug('SHL store: purged expired sessions', { count: result.changes })
    }
  }

  /** Get total active session count (for monitoring) */
  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM shl_sessions WHERE expires_at >= ?').get(Date.now()) as { cnt: number }
    return row.cnt
  }

  /** Close the database (for graceful shutdown) */
  close(): void {
    clearInterval(this.cleanupTimer)
    this.db.close()
  }

  private rowToSession(row: ShlRow): ShlSession {
    return {
      shl: JSON.parse(row.shl_payload),
      jwe: row.jwe,
      sessionToken: row.session_token,
      patientId: row.patient_id,
      fhirServerUrl: row.fhir_server_url,
      expiresAt: row.expires_at,
      verifiedOnly: row.verified_only === 1,
      accessCount: row.access_count,
      passcodeHash: row.passcode_hash ?? undefined,
    }
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const shlSessionStore = new ShlSessionStore()
