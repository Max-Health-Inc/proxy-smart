/**
 * Access Control Elysia Plugin
 * 
 * Provides a `getAccessControl` decorator that lazily creates the
 * appropriate AccessControlProvider from environment configuration.
 * Replaces the Kisi-specific plugin with a vendor-agnostic one.
 */

import { Elysia } from 'elysia'
import { config } from '../../config'
import { logger } from '../logger'
import { ConfigurationError } from '../admin-utils'
import { createProvider, detectProvider } from './factory'
import type { AccessControlProvider } from './types'

let cachedProvider: AccessControlProvider | null = null

/**
 * Standalone factory for getting the access control provider instance.
 * Shared by both the Elysia plugin (decorator) and the MCP tool executor.
 */
export function getAccessControlInstance(): AccessControlProvider {
  if (cachedProvider) return cachedProvider

  const providerType = detectProvider()
  if (!providerType) {
    throw new ConfigurationError(
      'No access control provider configured. Set KISI_API_KEY or UNIFI_ACCESS_HOST.'
    )
  }

  logger.info('access-control', `Initializing ${providerType} provider`)

  cachedProvider = createProvider(providerType)
  return cachedProvider
}

export const accessControlPlugin = new Elysia({ name: 'access-control-plugin' })
  .decorate('getAccessControl', getAccessControlInstance)

/** Reset cached provider (for testing) */
export function resetAccessControlPlugin(): void {
  cachedProvider = null
}
