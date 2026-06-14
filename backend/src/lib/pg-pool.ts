/**
 * Shared PostgreSQL connection pool and connection-string resolution.
 *
 * A single process-wide `pg.Pool`, so every store that needs Postgres
 * (admin-config store today; mtls-store can adopt it later) shares one pool
 * instead of each opening its own. This avoids exhausting the RDS connection
 * budget under scale-out.
 *
 * Connection string resolution (single source of truth for all stores):
 *  1. `DATABASE_URL` if set (used by local dev and the beta docker-compose).
 *  2. Otherwise assembled from discrete `PG*` parts (`PGHOST`, `PGUSER`,
 *     `PGPASSWORD`, `PGDATABASE`, `PGPORT`). This mirrors how the Keycloak ECS
 *     task injects DB credentials as separate Secrets Manager secrets rather
 *     than embedding the password into a single concatenated string — so the
 *     password never appears in a plain task-definition env var.
 *
 * Lazily constructed on first use so importing this module has no side effects
 * when no database is configured.
 */

import { Pool } from 'pg'

let pool: Pool | null = null

/**
 * Resolve the PostgreSQL connection string from the environment, or null when
 * no database is configured (callers then use the file/in-memory fallback).
 */
export function resolveDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const host = process.env.PGHOST
  const user = process.env.PGUSER
  const password = process.env.PGPASSWORD
  const database = process.env.PGDATABASE
  if (!host || !user || !password || !database) return null

  const port = process.env.PGPORT || '5432'
  const enc = encodeURIComponent
  return `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${enc(database)}`
}

/** Whether a Postgres backend is available (DATABASE_URL or PG* parts). */
export function hasDatabaseUrl(): boolean {
  return resolveDatabaseUrl() !== null
}

/**
 * Get the shared connection pool. Throws if no database is configured — callers
 * gate on {@link hasDatabaseUrl} first (the file backend is used otherwise).
 */
export function getSharedPool(): Pool {
  if (pool) return pool
  const connectionString = resolveDatabaseUrl()
  if (!connectionString) {
    throw new Error('getSharedPool() called without a database configured')
  }
  pool = new Pool({ connectionString })
  return pool
}
