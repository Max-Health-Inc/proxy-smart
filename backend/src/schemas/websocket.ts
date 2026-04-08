import { t, type Static } from 'elysia'

/**
 * OAuth WebSocket monitoring schemas
 */

// ==================== WebSocket Info Response ====================

export const WebSocketInfoResponse = t.Object({
  endpoint: t.String({ description: 'WebSocket endpoint URL path' }),
  protocol: t.String({ description: 'Protocol (ws or wss)' }),
  supportedMessages: t.Array(t.String(), { description: 'Supported message types' }),
  subscriptionTypes: t.Array(t.String(), { description: 'Available subscription types' })
}, { title: 'WebSocketInfoResponse' })

export type WebSocketInfoResponseType = Static<typeof WebSocketInfoResponse>

// ==================== WebSocket Client ====================

export const WebSocketClientFilters = t.Object({
  eventTypes: t.Optional(t.Array(t.String(), { description: 'Filter by event types' })),
  timeRange: t.Optional(t.Object({
    start: t.String({ description: 'Start time (ISO 8601)', format: 'date-time' }),
    end: t.String({ description: 'End time (ISO 8601)', format: 'date-time' })
  })),
  logLevel: t.Optional(t.Union([
    t.Literal('info'),
    t.Literal('warn'),
    t.Literal('error')
  ], { description: 'Log level filter' }))
}, { title: 'WebSocketClientFilters' })

export type WebSocketClientFiltersType = Static<typeof WebSocketClientFilters>

// Internal type for WebSocket client (not exported as schema since it's runtime state)
export interface WebSocketClient {
  id: string
  ws: {
    send: (message: string) => void
    readyState: number
  }
  authenticated: boolean
  subscriptions: Set<string>
  filters: {
    eventTypes?: string[]
    timeRange?: { start: Date; end: Date }
    logLevel?: 'info' | 'warn' | 'error'
  }
}

// ==================== WebSocket Messages ====================

export const WebSocketMessage = t.Object({
  type: t.Union([
    t.Literal('auth'),
    t.Literal('subscribe'),
    t.Literal('unsubscribe'),
    t.Literal('filter'),
    t.Literal('control'),
    t.Literal('ping')
  ], { description: 'Message type' }),
  data: t.Optional(t.Unknown({ description: 'Message payload' })),
  token: t.Optional(t.String({ description: 'Authentication token' })),
  clientId: t.Optional(t.String({ description: 'Client identifier' }))
}, { title: 'WebSocketMessage' })

export type WebSocketMessageType = Static<typeof WebSocketMessage>

export const ControlMessage = t.Object({
  action: t.Union([
    t.Literal('set_log_level'),
    t.Literal('clear_logs'),
    t.Literal('export_logs'),
    t.Literal('set_retention')
  ], { description: 'Control action to perform' }),
  parameters: t.Optional(t.Unknown({ description: 'Action parameters' }))
}, { title: 'ControlMessage' })

export type ControlMessageType = Static<typeof ControlMessage>

// ==================== WebSocket Response Messages ====================

export const WebSocketWelcomeMessage = t.Object({
  type: t.Literal('welcome'),
  data: t.Object({
    clientId: t.String({ description: 'Assigned client ID' }),
    timestamp: t.String({ description: 'Connection timestamp', format: 'date-time' })
  })
}, { title: 'WebSocketWelcomeMessage' })

export type WebSocketWelcomeMessageType = Static<typeof WebSocketWelcomeMessage>

export const WebSocketAuthResponse = t.Object({
  type: t.UnionEnum(['auth_success', 'auth_error']),
  data: t.Object({
    message: t.String({ description: 'Authentication result message' }),
    timestamp: t.Optional(t.String({ description: 'Response timestamp', format: 'date-time' }))
  })
}, { title: 'WebSocketAuthResponse' })

export type WebSocketAuthResponseType = Static<typeof WebSocketAuthResponse>

export const WebSocketSubscriptionResponse = t.Object({
  type: t.UnionEnum(['subscription_confirmed', 'unsubscription_confirmed']),
  data: t.Object({
    subscriptionType: t.String({ description: 'Type of subscription' }),
    timestamp: t.String({ description: 'Response timestamp', format: 'date-time' })
  })
}, { title: 'WebSocketSubscriptionResponse' })

export type WebSocketSubscriptionResponseType = Static<typeof WebSocketSubscriptionResponse>

export const WebSocketErrorMessage = t.Object({
  type: t.Literal('error'),
  data: t.Object({
    message: t.String({ description: 'Error description' })
  })
}, { title: 'WebSocketErrorMessage' })

export type WebSocketErrorMessageType = Static<typeof WebSocketErrorMessage>

export const WebSocketPongMessage = t.Object({
  type: t.Literal('pong'),
  data: t.Object({
    timestamp: t.String({ description: 'Response timestamp', format: 'date-time' }),
    clientId: t.String({ description: 'Client identifier' })
  })
}, { title: 'WebSocketPongMessage' })

export type WebSocketPongMessageType = Static<typeof WebSocketPongMessage>
