/**
 * Access Control Factory Tests
 * 
 * Tests provider detection and factory creation logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { detectProvider, createProvider } from '../src/lib/access-control/factory'

describe('detectProvider', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Restore environment
    delete process.env.ACCESS_CONTROL_PROVIDER
    delete process.env.KISI_API_KEY
    delete process.env.UNIFI_ACCESS_HOST
    delete process.env.UNIFI_ACCESS_USERNAME
    delete process.env.UNIFI_ACCESS_PASSWORD
  })

  it('returns null when nothing is configured', () => {
    delete process.env.KISI_API_KEY
    delete process.env.UNIFI_ACCESS_HOST
    expect(detectProvider()).toBeNull()
  })

  it('detects kisi when KISI_API_KEY is set', () => {
    process.env.KISI_API_KEY = 'test-key'
    expect(detectProvider()).toBe('kisi')
  })

  it('detects unifi-access when UNIFI_ACCESS_HOST is set', () => {
    delete process.env.KISI_API_KEY
    process.env.UNIFI_ACCESS_HOST = '192.168.1.100'
    process.env.UNIFI_ACCESS_USERNAME = 'admin'
    process.env.UNIFI_ACCESS_PASSWORD = 'pass'
    expect(detectProvider()).toBe('unifi-access')
  })

  it('prefers kisi when both are configured', () => {
    process.env.KISI_API_KEY = 'test-key'
    process.env.UNIFI_ACCESS_HOST = '192.168.1.100'
    process.env.UNIFI_ACCESS_USERNAME = 'admin'
    process.env.UNIFI_ACCESS_PASSWORD = 'pass'
    expect(detectProvider()).toBe('kisi')
  })

  it('respects ACCESS_CONTROL_PROVIDER override', () => {
    process.env.KISI_API_KEY = 'test-key'
    process.env.UNIFI_ACCESS_HOST = '192.168.1.100'
    process.env.UNIFI_ACCESS_USERNAME = 'admin'
    process.env.UNIFI_ACCESS_PASSWORD = 'pass'
    process.env.ACCESS_CONTROL_PROVIDER = 'unifi-access'
    expect(detectProvider()).toBe('unifi-access')
  })
})

describe('createProvider', () => {
  afterEach(() => {
    delete process.env.KISI_API_KEY
    delete process.env.UNIFI_ACCESS_HOST
    delete process.env.UNIFI_ACCESS_USERNAME
    delete process.env.UNIFI_ACCESS_PASSWORD
  })

  it('creates Kisi provider', () => {
    process.env.KISI_API_KEY = 'test-key-123'
    const provider = createProvider('kisi')
    expect(provider.name).toBe('kisi')
    expect(provider.displayName).toBe('Kisi')
  })

  it('creates UniFi Access provider', () => {
    process.env.UNIFI_ACCESS_HOST = '192.168.1.100'
    process.env.UNIFI_ACCESS_USERNAME = 'admin'
    process.env.UNIFI_ACCESS_PASSWORD = 'pass'
    const provider = createProvider('unifi-access')
    expect(provider.name).toBe('unifi-access')
    expect(provider.displayName).toBe('UniFi Access')
  })

  it('throws when no provider configured', () => {
    expect(() => createProvider()).toThrow('No access control provider configured')
  })

  it('throws for kisi without API key', () => {
    delete process.env.KISI_API_KEY
    expect(() => createProvider('kisi')).toThrow('KISI_API_KEY is not set')
  })

  it('throws for unifi without host', () => {
    delete process.env.UNIFI_ACCESS_HOST
    expect(() => createProvider('unifi-access')).toThrow('UNIFI_ACCESS_HOST is not set')
  })
})
