/**
 * Consent WebSocket Monitoring
 *
 * Real-time WebSocket endpoint for consent decision monitoring.
 * Uses the shared createMonitoringWebSocket factory.
 */

import { consentMetricsLogger, type ConsentDecisionEvent } from '../lib/consent-metrics-logger'
import type { ConsentAnalytics } from '../lib/consent-metrics-logger'
import { logger } from '../lib/logger'
import { createMonitoringWebSocket, type MonitoringLogger } from './websocket-factory'
import type { WebSocketClient } from '../schemas/websocket'
import type { ControlMessageType } from '../schemas/websocket'

function applyEventFilters(events: ConsentDecisionEvent[], filters: WebSocketClient['filters']): ConsentDecisionEvent[] {
  let filtered = events

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    filtered = filtered.filter(e => filters.eventTypes!.includes(e.decision))
  }

  if (filters.timeRange) {
    filtered = filtered.filter(e => {
      const eventTime = new Date(e.timestamp)
      return eventTime >= filters.timeRange!.start && eventTime <= filters.timeRange!.end
    })
  }

  return filtered
}

async function executeControlAction(
  control: ControlMessageType,
  metricsLogger: MonitoringLogger<ConsentDecisionEvent, ConsentAnalytics>,
): Promise<Record<string, unknown>> {
  switch (control.action) {
    case 'clear_logs':
      logger.ws.info('Consent log clear requested via WebSocket control')
      return { cleared: true, timestamp: new Date().toISOString() }

    case 'export_logs': {
      const events = metricsLogger.getRecentEvents({ limit: 1000 })
      const analytics = metricsLogger.getAnalytics()
      return { events, analytics, exportedAt: new Date().toISOString() }
    }

    default:
      throw new Error(`Unknown control action: ${control.action}`)
  }
}

const { plugin, broadcast } = createMonitoringWebSocket<ConsentDecisionEvent, ConsentAnalytics>({
  prefix: '/consent/monitoring',
  channel: 'Consent',
  tag: 'consent-monitoring',
  metricsLogger: consentMetricsLogger,
  subscriptionTypes: ['events', 'analytics'],
  applyEventFilters,
  executeControlAction,
})

export const consentWebSocket = plugin
export const broadcastToConsentClients = broadcast
