import { join } from 'path'
import { mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs'

/**
 * Centralized data directory for all file-backed persistence.
 * In Docker, mount a named volume at this path for durability across redeploys.
 * Override with DATA_DIR env var if needed.
 */
export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')

/** Directory containing seed files baked into the Docker image */
const SEED_DIR = join(process.cwd(), 'data-seed')

/** Ensure the data directory exists and seed missing config files from the image. */
export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true })

  // Seed any missing files from data-seed/ (first-run initialization)
  if (existsSync(SEED_DIR)) {
    for (const file of readdirSync(SEED_DIR)) {
      const target = join(DATA_DIR, file)
      if (!existsSync(target)) {
        copyFileSync(join(SEED_DIR, file), target)
      }
    }
  }
}
