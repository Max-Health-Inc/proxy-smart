/**
 * Email Events Logger
 *
 * Polls Keycloak for email-related events (SEND_RESET_PASSWORD, SEND_VERIFY_EMAIL,
 * EXECUTE_ACTIONS, etc.) using the shared BaseEventsLogger infrastructure.
 */

import { BaseEventsLogger, type KeycloakEvent } from './base-events-logger'

// ─── Types ───────────────────────────────────────────────────────

export interface EmailEvent {
  id: string
  timestamp: string
  type: string
  userId?: string
  clientId?: string
  ipAddress?: string
  error?: string
  success: boolean
  details?: Record<string, string>
}

export interface EmailAnalytics {
  totalEvents: number
  successRate: number
  eventsByType: Record<string, number>
  recentErrors: EmailEvent[]
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>
  timestamp: string
}

// ─── Event types ─────────────────────────────────────────────────

const EMAIL_EVENT_TYPES = [
  'SEND_RESET_PASSWORD', 'SEND_RESET_PASSWORD_ERROR',
  'SEND_VERIFY_EMAIL', 'SEND_VERIFY_EMAIL_ERROR',
  'SEND_IDENTITY_PROVIDER_LINK', 'SEND_IDENTITY_PROVIDER_LINK_ERROR',
  'EXECUTE_ACTIONS', 'EXECUTE_ACTIONS_ERROR',
  'EXECUTE_ACTION_TOKEN', 'EXECUTE_ACTION_TOKEN_ERROR',
  'CUSTOM_REQUIRED_ACTION', 'CUSTOM_REQUIRED_ACTION_ERROR',
]

// ─── Implementation ──────────────────────────────────────────────

class EmailEventsLogger extends BaseEventsLogger<EmailEvent, EmailAnalytics> {
  constructor() {
    super({
      logSubdir: 'email-events',
      logFilename: 'email-events.jsonl',
      eventTypes: EMAIL_EVENT_TYPES,
      logChannel: 'email',
      idPrefix: 'email',
      mapEvent: (kc: KeycloakEvent): EmailEvent => {
        const isError = kc.type?.endsWith('_ERROR') ?? false
        return {
          id: kc.id ?? `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: kc.time ? new Date(kc.time).toISOString() : new Date().toISOString(),
          type: kc.type ?? 'UNKNOWN',
          userId: kc.userId,
          clientId: kc.clientId,
          ipAddress: kc.ipAddress,
          error: kc.error,
          success: !isError && !kc.error,
          details: kc.details,
        }
      },
    })
  }

  protected computeAnalytics(recent: EmailEvent[]): EmailAnalytics {
    const base = this.computeBaseAnalytics(recent)
    const recentErrors = recent.filter(e => !e.success).slice(0, 20)

    return {
      ...base,
      recentErrors,
    }
  }
}

// ─── Singleton export ───────────────────────────────────────────

export const emailEventsLogger = new EmailEventsLogger()
