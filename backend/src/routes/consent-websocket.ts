import { Elysia } from 'elysia'
import { consentMetricsLogger, type ConsentDecisionEvent } from '../lib/consent-metrics-logger'
import { validateToken } from '../lib/auth'
import { logger } from '../lib/logger'
import {
  WebSocketInfoResponse,
  type WebSocketClient,
  type WebSocketMessageType,
  type ControlMessageType,
} from '../schemas/websocket'

const clients = new Map<string, WebSocketClient>()

export const consentWebSocket = new Elysia({ prefix: '/consent/monitoring' })
  .ws('/websocket', {
    perMessageDeflate: true,

    open(ws) {
      const clientId = generateClientId()
      const client: WebSocketClient = {
        id: clientId,
        ws,
        authenticated: false,
        subscriptions: new Set(),
        filters: {},
      }

      clients.set(clientId, client)
      logger.ws.info('Consent monitoring WebSocket connection opened', { clientId })

      ws.send(JSON.stringify({
        type: 'welcome',
        data: { clientId, timestamp: new Date().toISOString() },
      }))
    },

    message(ws, message) {
      let parsedMessage: WebSocketMessageType
      try {
        parsedMessage = typeof message === 'string'
          ? JSON.parse(message)
          : message
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.ws.error('Failed to parse consent WebSocket message', {
          error: errorMessage,
          messageSnippet: typeof message === 'string' ? message.substring(0, 100) : 'non-string message',
        })
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid message format' } }))
        return
      }

      let client = parsedMessage.clientId ? clients.get(parsedMessage.clientId) : null
      if (!client) client = findClientByWs(ws)

      if (!client) {
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Client not found' } }))
        return
      }

      handleWebSocketMessage(client, parsedMessage)
    },

    close(ws) {
      const client = findClientByWs(ws)
      if (client) {
        logger.ws.info('Consent monitoring WebSocket connection closed', { clientId: client.id })
        clients.delete(client.id)
      }
    },
  })

  .get('/websocket/info', () => ({
    endpoint: '/consent/monitoring/websocket',
    protocol: 'ws',
    supportedMessages: ['auth', 'subscribe', 'unsubscribe', 'filter', 'control', 'ping'],
    subscriptionTypes: ['events', 'analytics'],
  }), {
    response: { 200: WebSocketInfoResponse },
    detail: {
      summary: 'Consent WebSocket Connection Info',
      description: 'Get information about consent monitoring WebSocket endpoint',
      tags: ['consent-monitoring'],
    },
  })

// ─── Helpers ─────────────────────────────────────────────────────────

function generateClientId(): string {
  return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function findClientByWs(ws: unknown): WebSocketClient | undefined {
  for (const client of clients.values()) {
    if (client.ws === ws) return client
  }
  return undefined
}

async function handleWebSocketMessage(client: WebSocketClient, message: WebSocketMessageType) {
  try {
    switch (message.type) {
      case 'auth':
        await handleAuth(client, message)
        break
      case 'subscribe':
        handleSubscribe(client, message)
        break
      case 'unsubscribe':
        handleUnsubscribe(client, message)
        break
      case 'filter':
        handleFilter(client, message)
        break
      case 'control':
        await handleControl(client, message)
        break
      case 'ping':
        handlePing(client)
        break
      default:
        client.ws.send(JSON.stringify({ type: 'error', data: { message: `Unknown message type: ${message.type}` } }))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.ws.error('Failed to handle consent WebSocket message', {
      error: errorMessage,
      clientId: client.id,
      messageType: message.type,
    })
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Internal server error' } }))
  }
}

async function handleAuth(client: WebSocketClient, message: WebSocketMessageType) {
  if (!message.token) {
    client.ws.send(JSON.stringify({ type: 'auth_error', data: { message: 'Token required' } }))
    return
  }

  try {
    await validateToken(message.token)
    client.authenticated = true
    logger.ws.info('Consent monitoring WebSocket client authenticated', { clientId: client.id })
    client.ws.send(JSON.stringify({
      type: 'auth_success',
      data: { message: 'Authentication successful', timestamp: new Date().toISOString() },
    }))
  } catch {
    logger.ws.warn('Consent monitoring WebSocket authentication failed', { clientId: client.id })
    client.ws.send(JSON.stringify({ type: 'auth_error', data: { message: 'Invalid token' } }))
  }
}

function handleSubscribe(client: WebSocketClient, message: WebSocketMessageType) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication required' } }))
    return
  }

  const subscriptionType = (message.data as Record<string, unknown>)?.subscriptionType as string
  if (!subscriptionType) {
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Subscription type required' } }))
    return
  }

  client.subscriptions.add(subscriptionType)

  switch (subscriptionType) {
    case 'events':
      setupEventSubscription(client)
      break
    case 'analytics':
      setupAnalyticsSubscription(client)
      break
  }

  client.ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    data: { subscriptionType, timestamp: new Date().toISOString() },
  }))

  logger.ws.info('Consent monitoring WebSocket subscription added', { clientId: client.id, subscriptionType })
}

function handleUnsubscribe(client: WebSocketClient, message: WebSocketMessageType) {
  const subscriptionType = (message.data as Record<string, unknown>)?.subscriptionType as string
  if (subscriptionType) {
    client.subscriptions.delete(subscriptionType)
    client.ws.send(JSON.stringify({
      type: 'unsubscription_confirmed',
      data: { subscriptionType, timestamp: new Date().toISOString() },
    }))
  }
}

function handleFilter(client: WebSocketClient, message: WebSocketMessageType) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication required' } }))
    return
  }

  const filters = (message.data as Record<string, unknown>)?.filters
  if (filters) {
    client.filters = { ...client.filters, ...filters }
    client.ws.send(JSON.stringify({
      type: 'filter_updated',
      data: { filters: client.filters, timestamp: new Date().toISOString() },
    }))
  }
}

async function handleControl(client: WebSocketClient, message: WebSocketMessageType) {
  if (!client.authenticated) {
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication required' } }))
    return
  }

  const control = message.data as unknown as ControlMessageType
  if (!control?.action) {
    client.ws.send(JSON.stringify({ type: 'error', data: { message: 'Control data required' } }))
    return
  }

  try {
    const result = await executeControlAction(control)
    client.ws.send(JSON.stringify({
      type: 'control_result',
      data: { action: control.action, result, timestamp: new Date().toISOString() },
    }))
  } catch {
    client.ws.send(JSON.stringify({
      type: 'control_error',
      data: { action: control.action, message: 'Control action failed' },
    }))
  }
}

function handlePing(client: WebSocketClient) {
  client.ws.send(JSON.stringify({
    type: 'pong',
    data: { timestamp: new Date().toISOString(), clientId: client.id },
  }))
}

// ─── Subscription setup ──────────────────────────────────────────────

function setupEventSubscription(client: WebSocketClient) {
  const recentEvents = consentMetricsLogger.getRecentEvents({ limit: 50 })
  const filteredEvents = applyEventFilters(recentEvents, client.filters)

  client.ws.send(JSON.stringify({ type: 'events_data', data: { events: filteredEvents } }))

  consentMetricsLogger.subscribeToEvents((event) => {
    if (client.subscriptions.has('events') && client.authenticated) {
      const filtered = applyEventFilters([event], client.filters)
      if (filtered.length > 0) {
        client.ws.send(JSON.stringify({ type: 'events_update', data: { event: filtered[0] } }))
      }
    }
  })
}

function setupAnalyticsSubscription(client: WebSocketClient) {
  const analytics = consentMetricsLogger.getAnalytics()
  client.ws.send(JSON.stringify({ type: 'analytics_data', data: analytics }))

  consentMetricsLogger.subscribeToAnalytics((analytics) => {
    if (client.subscriptions.has('analytics') && client.authenticated) {
      client.ws.send(JSON.stringify({ type: 'analytics_update', data: analytics }))
    }
  })
}

// ─── Filter helpers ──────────────────────────────────────────────────

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

async function executeControlAction(control: ControlMessageType): Promise<Record<string, unknown>> {
  switch (control.action) {
    case 'clear_logs':
      logger.ws.info('Consent log clear requested via WebSocket control')
      return { cleared: true, timestamp: new Date().toISOString() }

    case 'export_logs': {
      const events = consentMetricsLogger.getRecentEvents({ limit: 1000 })
      const analytics = consentMetricsLogger.getAnalytics()
      return { events, analytics, exportedAt: new Date().toISOString() }
    }

    default:
      throw new Error(`Unknown control action: ${control.action}`)
  }
}

export function broadcastToConsentClients(type: string, data: Record<string, unknown>) {
  const message = JSON.stringify({ type, data })

  for (const client of clients.values()) {
    if (client.authenticated && client.ws.readyState === 1) {
      try {
        client.ws.send(message)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.ws.error('Failed to broadcast to consent WebSocket client', {
          error: errorMessage,
          clientId: client.id,
        })
      }
    }
  }
}
