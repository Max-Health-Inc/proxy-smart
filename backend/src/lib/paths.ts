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

/** Local dev fallback: deploy/dev/ at the repo root (when data-seed/ doesn't exist) */
const DEV_SEED_DIR = join(process.cwd(), '..', 'deploy', 'dev')

/** Ensure the data directory exists and seed missing config files from the image. */
export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true })

  // Determine seed source: Docker image has data-seed/, local dev uses deploy/dev/
  const seedDir = existsSync(SEED_DIR) ? SEED_DIR : existsSync(DEV_SEED_DIR) ? DEV_SEED_DIR : null

  if (seedDir) {
    for (const file of readdirSync(seedDir)) {
      const target = join(DATA_DIR, file)
      if (!existsSync(target)) {
        copyFileSync(join(seedDir, file), target)
      }
    }
  }
}

// Run immediately on import so seed files are in place before any store constructors fire.
// This is critical because module-level singletons (e.g. AppStoreConfigStore) read from
// DATA_DIR during import-time construction, which happens before index.ts body executes.
ensureDataDir()
