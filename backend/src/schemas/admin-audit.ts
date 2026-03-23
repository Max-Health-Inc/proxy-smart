import { t, type Static } from 'elysia'

// ─── Admin Audit Event ───────────────────────────────────────────────

export const AdminAuditActor = t.Object({
  sub: t.String({ description: 'JWT subject (Keycloak user ID)' }),
  username: t.Optional(t.String({ description: 'Preferred username' })),
  email: t.Optional(t.String({ description: 'Actor email address' })),
}, { title: 'AdminAuditActor' })

export type AdminAuditActorType = Static<typeof AdminAuditActor>

export const AdminAuditEvent = t.Object({
  id: t.String({ description: 'Unique event ID' }),
  timestamp: t.String({ description: 'ISO 8601 timestamp' }),
  actor: AdminAuditActor,
  method: t.String({ description: 'HTTP method (POST, PUT, DELETE, …)' }),
  path: t.String({ description: 'Request path' }),
  action: t.Union([
    t.Literal('create'),
    t.Literal('update'),
    t.Literal('delete'),
    t.Literal('action'),
    t.Literal('read'),
  ], { description: 'Action category' }),
  resource: t.String({ description: 'Resource domain (smart-apps, healthcare-users, …)' }),
  resourceId: t.Optional(t.String({ description: 'Target resource identifier' })),
  statusCode: t.Number({ description: 'HTTP response status code' }),
  success: t.Boolean({ description: 'Whether the request succeeded (2xx)' }),
  durationMs: t.Number({ description: 'Request duration in milliseconds' }),
  ipAddress: t.Optional(t.String({ description: 'Client IP address' })),
  detail: t.Optional(t.String({ description: 'Human-readable summary of the action' })),
}, { title: 'AdminAuditEvent' })

export type AdminAuditEventType = Static<typeof AdminAuditEvent>

// ─── Events list response ────────────────────────────────────────────

export const AdminAuditEventsResponse = t.Object({
  events: t.Array(AdminAuditEvent, { description: 'Array of audit events' }),
  total: t.Number({ description: 'Total events returned' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'AdminAuditEventsResponse' })

export type AdminAuditEventsResponseType = Static<typeof AdminAuditEventsResponse>

// ─── Analytics response ──────────────────────────────────────────────

export const AdminAuditHourlyStats = t.Object({
  hour: t.String({ description: 'Hour bucket (ISO 8601)' }),
  success: t.Number({ description: 'Successful actions' }),
  failure: t.Number({ description: 'Failed actions' }),
  total: t.Number({ description: 'Total actions' }),
}, { title: 'AdminAuditHourlyStats' })

export const AdminAuditAnalyticsResponse = t.Object({
  totalActions: t.Number({ description: 'Total admin actions in the last 24 h' }),
  successRate: t.Number({ description: 'Success rate (%)' }),
  actionsByType: t.Record(t.String(), t.Number(), { description: 'Actions grouped by type' }),
  actionsByResource: t.Record(t.String(), t.Number(), { description: 'Actions grouped by resource' }),
  topActors: t.Array(t.Object({
    username: t.String(),
    count: t.Number(),
  }), { description: 'Top actors by action count' }),
  hourlyStats: t.Array(AdminAuditHourlyStats, { description: 'Hourly breakdown' }),
  recentFailures: t.Array(AdminAuditEvent, { description: 'Most recent failed actions' }),
  timestamp: t.String({ description: 'Response timestamp' }),
}, { title: 'AdminAuditAnalyticsResponse' })

export type AdminAuditAnalyticsResponseType = Static<typeof AdminAuditAnalyticsResponse>
