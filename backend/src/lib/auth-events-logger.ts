/**
 * Auth Events Logger
 *
 * Polls Keycloak for authentication-related events (LOGIN, LOGOUT, REGISTER,
 * CODE_TO_TOKEN, etc.) using the shared BaseEventsLogger infrastructure.
 */

import { BaseEventsLogger, type KeycloakEvent } from './base-events-logger'

// ─── Types ───────────────────────────────────────────────────────

export interface AuthEvent {
  id: string
  timestamp: string
  type: string
  userId?: string
  clientId?: string
  sessionId?: string
  ipAddress?: string
  error?: string
  success: boolean
  details?: Record<string, string>
}

export interface AuthAnalytics {
  totalEvents: number
  successRate: number
  eventsByType: Record<string, number>
  recentErrors: AuthEvent[]
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>
  topClients: Array<{ clientId: string; count: number }>
  timestamp: string
}

// ─── Event types ─────────────────────────────────────────────────

const AUTH_EVENT_TYPES = [
  'LOGIN', 'LOGIN_ERROR',
  'LOGOUT', 'LOGOUT_ERROR',
  'REGISTER', 'REGISTER_ERROR',
  'CODE_TO_TOKEN', 'CODE_TO_TOKEN_ERROR',
  'REFRESH_TOKEN', 'REFRESH_TOKEN_ERROR',
  'CLIENT_LOGIN', 'CLIENT_LOGIN_ERROR',
  'INTROSPECT_TOKEN', 'INTROSPECT_TOKEN_ERROR',
  'GRANT_CONSENT', 'GRANT_CONSENT_ERROR',
  'UPDATE_CONSENT', 'UPDATE_CONSENT_ERROR',
  'REVOKE_GRANT', 'REVOKE_GRANT_ERROR',
]

// ─── Implementation ──────────────────────────────────────────────

class AuthEventsLogger extends BaseEventsLogger<AuthEvent, AuthAnalytics> {
  constructor() {
    super({
      logSubdir: 'auth-events',
      logFilename: 'auth-events.jsonl',
      eventTypes: AUTH_EVENT_TYPES,
      logChannel: 'auth',
      idPrefix: 'auth',
      mapEvent: (kc: KeycloakEvent): AuthEvent => {
        const isError = kc.type?.endsWith('_ERROR') ?? false
        return {
          id: kc.id ?? `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: kc.time ? new Date(kc.time).toISOString() : new Date().toISOString(),
          type: kc.type ?? 'UNKNOWN',
          userId: kc.userId,
          clientId: kc.clientId,
          sessionId: kc.sessionId,
          ipAddress: kc.ipAddress,
          error: kc.error,
          success: !isError && !kc.error,
          details: kc.details,
        }
      },
    })
  }

  /** Additional filter options specific to auth events */
  getRecentEvents(opts?: {
    limit?: number
    type?: string
    success?: boolean
    since?: Date
    clientId?: string
    userId?: string
  }): AuthEvent[] {
    let result = super.getRecentEvents(opts)
    if (opts?.clientId) result = result.filter(e => e.clientId === opts.clientId)
    if (opts?.userId) result = result.filter(e => e.userId === opts.userId)
    return result
  }

  protected computeAnalytics(recent: AuthEvent[]): AuthAnalytics {
    const base = this.computeBaseAnalytics(recent)

    // Top clients
    const clientCounts = new Map<string, number>()
    for (const e of recent) {
      if (e.clientId) {
        clientCounts.set(e.clientId, (clientCounts.get(e.clientId) ?? 0) + 1)
      }
    }
    const topClients = Array.from(clientCounts.entries())
      .map(([clientId, count]) => ({ clientId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const recentErrors = recent.filter(e => !e.success).slice(0, 20)

    return {
      ...base,
      recentErrors,
      topClients,
    }
  }
}

// ─── Singleton export ───────────────────────────────────────────

export const authEventsLogger = new AuthEventsLogger()
