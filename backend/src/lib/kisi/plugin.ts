/**
 * Kisi Elysia Plugin
 * 
 * Provides a `getKisi` decorator that lazily creates the KisiService
 * from environment configuration. Follows the same pattern as keycloakPlugin.
 */

import { Elysia } from 'elysia'
import { KisiClient } from './client'
import { KisiService } from './service'
import { config } from '../../config'
import { logger } from '../logger'
import { ConfigurationError } from '../admin-utils'

let cachedService: KisiService | null = null

export const kisiPlugin = new Elysia({ name: 'kisi-plugin' })
  .decorate('getKisi', (): KisiService => {
    // Return cached instance if available
    if (cachedService) return cachedService

    if (!config.kisi.isConfigured) {
      throw new ConfigurationError(
        'Kisi is not configured. Set KISI_API_KEY in environment variables.'
      )
    }

    logger.info('kisi', 'Initializing Kisi client', {
      baseUrl: config.kisi.baseUrl,
    })

    const client = new KisiClient({
      apiKey: config.kisi.apiKey!,
      baseUrl: config.kisi.baseUrl || undefined,
      timeout: config.kisi.timeout,
    })

    cachedService = new KisiService(client)
    return cachedService
  })
