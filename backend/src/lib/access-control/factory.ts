/**
 * Access Control Provider Factory
 * 
 * Reads config to determine which provider backend to use (Kisi or UniFi)
 * and returns the appropriate AccessControlProvider instance.
 * 
 * Selection logic:
 *   - KISI_API_KEY set          → Kisi provider
 *   - UNIFI_ACCESS_HOST set     → UniFi Access provider
 *   - Both set                  → Kisi takes precedence (override with ACCESS_CONTROL_PROVIDER)
 *   - Neither set               → throws ConfigurationError
 * 
 * The ACCESS_CONTROL_PROVIDER env var can force a specific provider: 'kisi' | 'unifi-access'
 */

import { config } from '../../config'
import { logger } from '../logger'
import { ConfigurationError } from '../admin-utils'
import { KisiClient } from '../kisi/client'
import { KisiAccessProvider } from './providers/kisi'
import { UnifiAccessProvider } from './providers/unifi-access'
import type { AccessControlProvider } from './types'

export type ProviderType = 'kisi' | 'unifi-access'

/** Determine which provider is configured. Returns null if none. */
export function detectProvider(): ProviderType | null {
  const forced = process.env.ACCESS_CONTROL_PROVIDER as ProviderType | undefined
  if (forced === 'kisi' || forced === 'unifi-access') return forced

  if (config.kisi.isConfigured) return 'kisi'
  if (config.unifiAccess.isConfigured) return 'unifi-access'

  return null
}

/** Create the appropriate provider from environment config. */
export function createProvider(type?: ProviderType): AccessControlProvider {
  const providerType = type ?? detectProvider()

  if (!providerType) {
    throw new ConfigurationError(
      'No access control provider configured. Set KISI_API_KEY or UNIFI_ACCESS_HOST.'
    )
  }

  logger.info('access-control', `Creating access control provider: ${providerType}`)

  switch (providerType) {
    case 'kisi': {
      if (!config.kisi.apiKey) {
        throw new ConfigurationError('Kisi provider selected but KISI_API_KEY is not set.')
      }
      const client = new KisiClient({
        apiKey: config.kisi.apiKey,
        baseUrl: config.kisi.baseUrl || undefined,
        timeout: config.kisi.timeout,
      })
      return new KisiAccessProvider(client)
    }

    case 'unifi-access': {
      if (!config.unifiAccess.host) {
        throw new ConfigurationError('UniFi Access provider selected but UNIFI_ACCESS_HOST is not set.')
      }
      return new UnifiAccessProvider({
        host: config.unifiAccess.host,
        username: config.unifiAccess.username!,
        password: config.unifiAccess.password!,
      })
    }

    default:
      throw new ConfigurationError(`Unknown access control provider: ${providerType}`)
  }
}
