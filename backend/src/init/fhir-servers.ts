// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * FHIR server bootstrap. Never fatal: the proxy starts with its fallback
 * configuration and its admin UI so the servers can be fixed from there.
 */

import { config } from '../config'
import { logger } from '../lib/logger'
import { ensureServersInitialized, getAllServers } from '../lib/fhir-server-store'

/**
 * Initialize FHIR server connections
 */
export async function initializeFhirServers(): Promise<void> {
  logger.fhir.info('Initializing FHIR server connections...')

  try {
    await ensureServersInitialized()
    const serverInfos = await getAllServers()

    if (serverInfos.length === 0) {
      logger.fhir.info('No FHIR servers available, but proxy server will continue with fallback configuration')
      return
    }

    serverInfos.forEach((serverInfo, index) => {
      logger.fhir.info(`FHIR server ${index + 1} detected: ${serverInfo.metadata.serverName} (${serverInfo.metadata.fhirVersion}) at ${serverInfo.url}`)
    })
  } catch (error) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : String(error)

    logger.fhir.warn('❌ Failed to initialize FHIR server connections', {
      error: errorDetails,
      configuredServers: config.fhir.serverBases,
      timestamp: new Date().toISOString(),
    })

    logger.fhir.info('🔍 FHIR server troubleshooting:')
    config.fhir.serverBases.forEach((serverBase, index) => {
      logger.fhir.info(`   ${index + 1}. Check if FHIR server is accessible: ${serverBase}`)
      logger.fhir.info(`      Test metadata endpoint: ${serverBase}/metadata`)
    })

    logger.fhir.info('📋 Proxy Server will continue with fallback configuration')
  }
}

/**
 * Display server endpoints after successful startup
 */
export async function displayServerEndpoints(): Promise<void> {
  logger.server.info(`Proxy Smart available at ${config.baseUrl}`)
  logger.server.info(`Health check available at ${config.baseUrl}/health`)
  logger.server.info(`API Documentation available at ${config.baseUrl}/swagger`)
  logger.server.info(`Server Discovery available at ${config.baseUrl}/fhir-servers`)

  if (config.mcp.enabled) {
    logger.server.info(`MCP Streamable HTTP endpoint available at ${config.baseUrl}${config.mcp.path}`)
  }

  try {
    const serverInfos = await getAllServers()
    if (serverInfos.length > 0) {
      logger.server.info('SMART Protected FHIR Servers available:')
      serverInfos.forEach((serverInfo) => {
        logger.server.info(`${serverInfo.identifier}: ${config.baseUrl}/${config.name}/${serverInfo.identifier}/${serverInfo.metadata.fhirVersion}`)
      })
    }
  } catch (error) {
    logger.server.warn('Could not display server endpoints', { error })
  }
}
