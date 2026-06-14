import { describe, expect, it } from 'bun:test'
import { flagBool, flagString, parseArgs } from '../src/args'
import { overridesFromFlags } from '../src/cli'

describe('parseArgs', () => {
  it('collects positionals in order', () => {
    expect(parseArgs(['smart-apps', 'get', 'my-client']).positionals).toEqual([
      'smart-apps',
      'get',
      'my-client',
    ])
  })

  it('parses --key value and --key=value', () => {
    const parsed = parseArgs(['--url', 'https://x', '--realm=app'])
    expect(parsed.flags.url).toBe('https://x')
    expect(parsed.flags.realm).toBe('app')
  })

  it('treats known boolean flags as booleans even with a following token', () => {
    const parsed = parseArgs(['smart-apps', 'list', '--json', 'extra'])
    expect(parsed.flags.json).toBe(true)
    expect(parsed.positionals).toEqual(['smart-apps', 'list', 'extra'])
  })

  it('expands short aliases', () => {
    expect(parseArgs(['-h']).flags.help).toBe(true)
    expect(parseArgs(['-v']).flags.version).toBe(true)
    expect(parseArgs(['-d', '{}']).flags.data).toBe('{}')
  })

  it('treats a trailing value-flag as boolean when no value follows', () => {
    expect(parseArgs(['--url']).flags.url).toBe(true)
  })

  it('passes everything after -- through as positionals', () => {
    const parsed = parseArgs(['request', 'GET', '--', '--not-a-flag'])
    expect(parsed.positionals).toEqual(['request', 'GET', '--not-a-flag'])
  })
})

describe('flag readers', () => {
  it('reads strings and ignores boolean flags', () => {
    const { flags } = parseArgs(['--url', 'https://x', '--json'])
    expect(flagString(flags, 'url')).toBe('https://x')
    expect(flagString(flags, 'json')).toBeUndefined()
  })

  it('reads booleans', () => {
    const { flags } = parseArgs(['--yes'])
    expect(flagBool(flags, 'yes')).toBe(true)
    expect(flagBool(flags, 'missing')).toBe(false)
  })
})

describe('overridesFromFlags', () => {
  it('maps kebab-case global flags onto config overrides', () => {
    const { flags } = parseArgs([
      '--url',
      'https://proxy',
      '--client-id',
      'cli',
      '--client-secret',
      'shh',
      '--realm',
      'app',
      '--keycloak-url',
      'https://kc',
      '--scope',
      'openid',
    ])
    expect(overridesFromFlags(flags)).toEqual({
      url: 'https://proxy',
      clientId: 'cli',
      clientSecret: 'shh',
      realm: 'app',
      keycloakUrl: 'https://kc',
      scope: 'openid',
    })
  })

  it('leaves absent flags undefined', () => {
    const { flags } = parseArgs(['--url', 'https://proxy'])
    const overrides = overridesFromFlags(flags)
    expect(overrides.url).toBe('https://proxy')
    expect(overrides.clientId).toBeUndefined()
    expect(overrides.clientSecret).toBeUndefined()
    // Absent escape hatch must stay undefined so env / file can decide.
    expect(overrides.directKeycloak).toBeUndefined()
  })

  it('forwards the direct-keycloak escape hatch only when explicitly passed', () => {
    const optIn = overridesFromFlags(parseArgs(['--direct-keycloak']).flags)
    expect(optIn.directKeycloak).toBe(true)
  })
})
