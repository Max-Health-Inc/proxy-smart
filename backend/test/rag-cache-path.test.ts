/**
 * The RAG cache must live under the configured data directory, not somewhere derived from where
 * the module happens to sit on disk.
 *
 * THE BUG. `CACHE_PATH` was `join(BACKEND_ROOT, 'logs', 'rag-cache.json')` with
 * `BACKEND_ROOT = join(__dirname, '../../..')`. That is three levels up from
 * `backend/src/lib/ai/`, which is `backend/` in the source tree — but the deployed bundle has a
 * different shape, so the same expression resolved to the filesystem ROOT and the tool tried to
 * `mkdir /logs`. Observed 2026-08-01 through the live claude.ai connector:
 *
 *   search_documentation -> "EACCES: permission denied, mkdir '/logs'"
 *
 * The same expression is why a stray `logs/` directory appears in a developer's repo root when
 * anything touches this module from an unexpected working directory.
 *
 * `DATA_DIR` already exists for writable runtime state and is honoured in Docker, so the fix is to
 * use it rather than to add another guess. Asserting the path is INSIDE DATA_DIR — rather than
 * equal to some literal — is what makes this independent of build layout, which was the whole
 * defect.
 */
import { describe, it, expect } from 'bun:test'
import { isAbsolute, resolve, sep } from 'path'
import { DATA_DIR, ragCachePath } from '../src/lib/paths'

describe('ragCachePath', () => {
  it('resolves inside DATA_DIR', () => {
    const cache = resolve(ragCachePath())
    const dataDir = resolve(DATA_DIR)
    expect(cache.startsWith(dataDir + sep)).toBe(true)
  })

  it('is absolute, so it does not depend on the working directory', () => {
    // A relative path is how `logs/` ended up in a repo root: correct-looking, but resolved
    // against whatever cwd the process happened to have.
    expect(isAbsolute(ragCachePath())).toBe(true)
  })

  it('never resolves to a filesystem-root directory', () => {
    // The exact failure in the container: /logs, unwritable.
    const cache = resolve(ragCachePath())
    expect(cache.startsWith(resolve('/logs'))).toBe(false)
    // Its parent must not be the root itself.
    const parent = cache.slice(0, cache.lastIndexOf(sep))
    expect(parent.length).toBeGreaterThan(resolve(sep).length)
  })

  it('is a json file, so a stale cache is inspectable rather than opaque', () => {
    expect(ragCachePath().endsWith('.json')).toBe(true)
  })
})
