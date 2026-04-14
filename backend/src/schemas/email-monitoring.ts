import { t, type Static } from 'elysia'

// ─── Email Event ─────────────────────────────────────────────────

export const EmailEvent = t.Object({
  id: t.String({ description: 'Unique event ID (from Keycloak or generated)' }),
  timestamp: t.String({ description: 'ISO 8601 timestamp' }),
  type: t.String({ description: 'Keycloak event type (SEND_RESET_PASSWORD, SEND_VERIFY_EMAIL, …)' }),
  userId: t.Optional(t.String({ description: 'Keycloak user ID' })),
  clientId: t.Optional(t.String({ description: 'OAuth client that triggered the event' })),
  ipAddress: t.Optional(t.String({ description: 'IP address of the request' })),
  error: t.Optional(t.String({ description: 'Error message if the event failed' })),
  success: t.Boolean({ description: 'Whether the email action succeeded' }),
  details: t.Optional(t.Record(t.String(), t.String(), { description: 'Additional event details from Keycloak' })),
}, { title: 'EmailEvent' })

export type EmailEventType = Static<typeof EmailEvent>

// ─── Events list response ────────────────────────────────────────

export const EmailEventsResponse = t.Object({
  events: t.Array(EmailEvent, { description: 'Array of email events' }),
  total: t.Number({ description: 'Total events returned' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'EmailEventsResponse' })

export type EmailEventsResponseType = Static<typeof EmailEventsResponse>

// ─── Analytics response ──────────────────────────────────────────

export const EmailHourlyStats = t.Object({
  hour: t.String({ description: 'Hour bucket (ISO 8601)' }),
  success: t.Number({ description: 'Successful events' }),
  failure: t.Number({ description: 'Failed events' }),
  total: t.Number({ description: 'Total events' }),
}, { title: 'EmailHourlyStats' })

export const EmailAnalyticsResponse = t.Object({
  totalEvents: t.Number({ description: 'Total email events in the last 24 h' }),
  successRate: t.Number({ description: 'Success rate (%)' }),
  eventsByType: t.Record(t.String(), t.Number(), { description: 'Events grouped by type' }),
  recentErrors: t.Array(EmailEvent, { description: 'Most recent failed events' }),
  hourlyStats: t.Array(EmailHourlyStats, { description: 'Hourly breakdown' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'EmailAnalyticsResponse' })

export type EmailAnalyticsResponseType = Static<typeof EmailAnalyticsResponse>
