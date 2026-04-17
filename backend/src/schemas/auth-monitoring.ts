import { t, type Static } from 'elysia'

// ─── Auth Event ──────────────────────────────────────────────────

export const AuthEvent = t.Object({
  id: t.String({ description: 'Unique event ID (from Keycloak or generated)' }),
  timestamp: t.String({ description: 'ISO 8601 timestamp' }),
  type: t.String({ description: 'Keycloak event type (LOGIN, LOGOUT, REGISTER, CODE_TO_TOKEN, …)' }),
  userId: t.Optional(t.String({ description: 'Keycloak user ID' })),
  clientId: t.Optional(t.String({ description: 'OAuth client that triggered the event' })),
  sessionId: t.Optional(t.String({ description: 'Keycloak session ID' })),
  ipAddress: t.Optional(t.String({ description: 'IP address of the request' })),
  error: t.Optional(t.String({ description: 'Error message if the event failed' })),
  success: t.Boolean({ description: 'Whether the auth action succeeded' }),
  details: t.Optional(t.Record(t.String(), t.String(), { description: 'Additional event details from Keycloak' })),
}, { title: 'AuthEvent' })

export type AuthEventType = Static<typeof AuthEvent>

// ─── Events list response ────────────────────────────────────────

export const AuthEventsResponse = t.Object({
  events: t.Array(AuthEvent, { description: 'Array of auth events' }),
  total: t.Number({ description: 'Total events returned' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'AuthEventsResponse' })

export type AuthEventsResponseType = Static<typeof AuthEventsResponse>

// ─── Top clients ─────────────────────────────────────────────────

export const AuthTopClient = t.Object({
  clientId: t.String({ description: 'OAuth client ID' }),
  count: t.Number({ description: 'Number of events for this client' }),
}, { title: 'AuthTopClient' })

// ─── Analytics response ──────────────────────────────────────────

export const AuthHourlyStats = t.Object({
  hour: t.String({ description: 'Hour bucket (ISO 8601)' }),
  success: t.Number({ description: 'Successful events' }),
  failure: t.Number({ description: 'Failed events' }),
  total: t.Number({ description: 'Total events' }),
}, { title: 'AuthHourlyStats' })

export const AuthAnalyticsResponse = t.Object({
  totalEvents: t.Number({ description: 'Total auth events in the last 24 h' }),
  successRate: t.Number({ description: 'Success rate (%)' }),
  eventsByType: t.Record(t.String(), t.Number(), { description: 'Events grouped by type' }),
  recentErrors: t.Array(AuthEvent, { description: 'Most recent failed events' }),
  hourlyStats: t.Array(AuthHourlyStats, { description: 'Hourly breakdown' }),
  topClients: t.Array(AuthTopClient, { description: 'Top 10 clients by event count' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'AuthAnalyticsResponse' })

export type AuthAnalyticsResponseType = Static<typeof AuthAnalyticsResponse>
