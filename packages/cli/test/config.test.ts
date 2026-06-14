import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  DEFAULT_CLIENT_ID,
  DEFAULT_PROXY_URL,
  DEFAULT_SCOPE,
  ENV,
  clearTokenCache,
  configPath,
  envFlag,
  normalizeUrl,
  readPersistedConfig,
  resolveConfig,
  resolveHomeDir,
  tokenCachePath,
  writePersistedConfig,
} from '../src/config'

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'proxy-smart-cli-'))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

/** Minimal env stub: only the CLI-relevant vars, pinned home dir. */
function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { [ENV.home]: home, ...extra }
}

describe('normalizeUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeUrl('https://x/')).toBe('https://x')
    expect(normalizeUrl('https://x///')).toBe('https://x')
    expect(normalizeUrl('https://x')).toBe('https://x')
  })
})

describe('path helpers', () => {
  it('resolves home dir from the env override', () => {
    expect(resolveHomeDir(env())).toBe(home)
  })

  it('derives config + token cache paths under the home dir', () => {
    expect(configPath(home)).toBe(join(home, 'config.json'))
    expect(tokenCachePath(home)).toBe(join(home, 'token.json'))
  })
})

describe('persisted config round-trip', () => {
  it('returns an empty object when no config file exists', () => {
    expect(readPersistedConfig(home)).toEqual({})
  })

  it('writes and reads back a config file', () => {
    writePersistedConfig(home, { url: 'https://proxy', realm: 'app' })
    expect(readPersistedConfig(home)).toEqual({ url: 'https://proxy', realm: 'app' })
  })

  it('tolerates a corrupt config file', () => {
    writePersistedConfig(home, { url: 'https://proxy' })
    // Overwrite with garbage.
    writeFileSync(configPath(home), 'not json')
    expect(readPersistedConfig(home)).toEqual({})
  })
})

describe('resolveConfig precedence', () => {
  it('falls back to built-in defaults', () => {
    const config = resolveConfig({}, env())
    expect(config.url).toBe(DEFAULT_PROXY_URL)
    expect(config.clientId).toBe(DEFAULT_CLIENT_ID)
    expect(config.scope).toBe(DEFAULT_SCOPE)
    expect(config.clientSecret).toBeUndefined()
  })

  it('prefers env over the config file', () => {
    writePersistedConfig(home, { url: 'https://from-file', clientId: 'file-client' })
    const config = resolveConfig({}, env({ [ENV.url]: 'https://from-env' }))
    expect(config.url).toBe('https://from-env')
    // clientId still comes from the file since env did not set it.
    expect(config.clientId).toBe('file-client')
  })

  it('prefers explicit flags over env and file', () => {
    writePersistedConfig(home, { url: 'https://from-file' })
    const config = resolveConfig(
      { url: 'https://from-flag/', clientSecret: 'flag-secret' },
      env({ [ENV.url]: 'https://from-env' }),
    )
    expect(config.url).toBe('https://from-flag')
    expect(config.clientSecret).toBe('flag-secret')
  })

  it('normalizes the keycloak URL when provided', () => {
    const config = resolveConfig({ keycloakUrl: 'https://kc/' }, env())
    expect(config.keycloakUrl).toBe('https://kc')
  })

  it('defaults directKeycloak off so the proxy is the authorization server', () => {
    expect(resolveConfig({}, env()).directKeycloak).toBe(false)
  })

  it('opts into directKeycloak via the env flag', () => {
    expect(resolveConfig({}, env({ [ENV.directKeycloak]: '1' })).directKeycloak).toBe(true)
    expect(resolveConfig({}, env({ [ENV.directKeycloak]: 'true' })).directKeycloak).toBe(true)
    expect(resolveConfig({}, env({ [ENV.directKeycloak]: '0' })).directKeycloak).toBe(false)
  })

  it('lets an explicit override win over the env flag', () => {
    const config = resolveConfig({ directKeycloak: true }, env({ [ENV.directKeycloak]: '0' }))
    expect(config.directKeycloak).toBe(true)
  })

  it('reads directKeycloak from the persisted config file when env is unset', () => {
    writePersistedConfig(home, { directKeycloak: true })
    expect(resolveConfig({}, env()).directKeycloak).toBe(true)
    // An explicit env=0 still overrides the file.
    expect(resolveConfig({}, env({ [ENV.directKeycloak]: '0' })).directKeycloak).toBe(false)
  })
})

describe('envFlag', () => {
  it('treats common truthy strings as true', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'on', ' on ']) {
      expect(envFlag(v)).toBe(true)
    }
  })

  it('treats everything else (and undefined) as false', () => {
    for (const v of ['0', 'false', 'no', 'off', '', 'maybe']) {
      expect(envFlag(v)).toBe(false)
    }
    expect(envFlag(undefined)).toBe(false)
  })
})

describe('clearTokenCache', () => {
  it('removes the cached token file and is a no-op when absent', () => {
    const file = tokenCachePath(home)
    writeFileSync(file, '{}')
    expect(existsSync(file)).toBe(true)
    clearTokenCache(home)
    expect(existsSync(file)).toBe(false)
    // Second call must not throw.
    clearTokenCache(home)
  })
})
