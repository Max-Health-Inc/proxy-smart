import { join } from 'path'
import { mkdirSync } from 'fs'

/**
 * Centralized data directory for all file-backed persistence.
 * In Docker, mount a named volume at this path for durability across redeploys.
 * Override with DATA_DIR env var if needed.
 */
export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')

/** Ensure the data directory exists (idempotent). Called once at startup. */
export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true })
}
