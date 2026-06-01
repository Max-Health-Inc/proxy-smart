/**
 * OAuth WebSocket Monitoring
 *
 * Real-time WebSocket endpoint for OAuth flow monitoring.
 * Uses the shared createMonitoringWebSocket factory.
 */

import { oauthMetricsLogger, type OAuthFlowEvent } from '../lib/oauth-metrics-logger'
import type { OAuthAnalytics } from '../lib/oauth-metrics-logger'
import { logger } from '../lib/logger'
import { createMonitoringWebSocket, type MonitoringLogger } from './websocket-factory'
import type { WebSocketClient } from '../schemas/websocket'
import type { ControlMessageType } from '../schemas/websocket'

function applyEventFilters(events: OAuthFlowEvent[], filters: WebSocketClient['filters']): OAuthFlowEvent[] {
  let filtered = events

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    filtered = filtered.filter(event => filters.eventTypes!.includes(event.type))
  }

  if (filters.timeRange) {
    filtered = filtered.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= filters.timeRange!.start && eventTime <= filters.timeRange!.end
    })
  }

  return filtered
}

async function executeControlAction(
  control: ControlMessageType,
  metricsLogger: MonitoringLogger<OAuthFlowEvent, OAuthAnalytics>,
): Promise<Record<string, unknown>> {
  switch (control.action) {
    case 'clear_logs':
      logger.ws.info('Log clear requested via WebSocket control')
      return { cleared: true, timestamp: new Date().toISOString() }

    case 'export_logs': {
      const events = metricsLogger.getRecentEvents({ limit: 1000 })
      const analytics = metricsLogger.getAnalytics()
      return { events, analytics, exportedAt: new Date().toISOString() }
    }

    case 'set_log_level': {
      const level = (control.parameters as Record<string, unknown>)?.level
      if (level) {
        logger.ws.info('Log level changed via WebSocket control', { newLevel: level })
        return { level, changed: true }
      }
      throw new Error('Log level parameter required')
    }

    case 'set_retention': {
      const retentionDays = (control.parameters as Record<string, unknown>)?.retentionDays
      if (retentionDays) {
        return { retentionDays, updated: true }
      }
      throw new Error('Retention days parameter required')
    }

    default:
      throw new Error(`Unknown control action: ${control.action}`)
  }
}

function setupLogSubscription(client: WebSocketClient) {
  client.ws.send(JSON.stringify({
    type: 'logs_data',
    data: {
      message: 'Log subscription active',
      level: client.filters.logLevel || 'info',
    },
  }))
}

const { plugin, broadcast } = createMonitoringWebSocket<OAuthFlowEvent, OAuthAnalytics>({
  prefix: '/oauth/monitoring',
  channel: 'OAuth',
  tag: 'oauth-monitoring',
  metricsLogger: oauthMetricsLogger,
  subscriptionTypes: ['events', 'analytics', 'logs'],
  applyEventFilters,
  executeControlAction,
  setupLogSubscription,
})

export const oauthWebSocket = plugin
export const broadcastToOAuthClients = broadcast
