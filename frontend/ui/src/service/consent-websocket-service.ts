/**
 * Consent WebSocket Service — real-time monitoring with SSE fallback.
 *
 * The connection machinery lives in MonitoringWebSocketService; this file is the
 * consent payload types and the SSE fallback wiring.
 */
import { createMonitoringService } from './create-monitoring-service';
import { MonitoringWebSocketService } from './monitoring-websocket-service';

// ─── Types (mirror backend) ─────────────────────────────────────────

export interface ConsentDecisionEvent {
  id: string;
  timestamp: string;
  decision: 'permit' | 'deny';
  enforced: boolean;
  mode: 'enforce' | 'audit-only' | 'disabled';
  consentId: string | null;
  patientId: string | null;
  clientId: string;
  resourceType: string | null;
  resourcePath: string;
  serverName: string;
  method: string;
  reason: string;
  cached: boolean;
  checkDurationMs: number;
  ial?: {
    allowed: boolean;
    actualLevel: string | null;
    requiredLevel: string;
    isSensitiveResource: boolean;
  } | null;
}

export interface ConsentAnalytics {
  totalDecisions: number;
  permitRate: number;
  denyRate: number;
  averageCheckDuration: number;
  cacheHitRate: number;
  decisionsByMode: Record<string, number>;
  decisionsByResourceType: Record<string, { permit: number; deny: number }>;
  topDeniedClients: Array<{ clientId: string; denyCount: number }>;
  topDeniedPatients: Array<{ patientId: string; denyCount: number }>;
  hourlyStats: Array<{ hour: string; permit: number; deny: number; total: number }>;
  timestamp?: string;
}

// ─── SSE fallback ───────────────────────────────────────────────────

/** Consent analytics are the payload carrying a decision total. */
const isConsentAnalytics = (d: unknown): d is ConsentAnalytics =>
  typeof d === 'object' && d !== null && 'totalDecisions' in d;

const consentSse = createMonitoringService<ConsentDecisionEvent, ConsentAnalytics>({
  domain: 'consent',
  isAnalyticsPayload: isConsentAnalytics,
});

// ─── Service ─────────────────────────────────────────────────────────

export class ConsentWebSocketService extends MonitoringWebSocketService<ConsentDecisionEvent, ConsentAnalytics> {
  constructor(baseUrl?: string) {
    super({
      wsPath: '/consent/monitoring/websocket',
      label: 'Consent',
      connectSse: async (sink) => {
        const unsubEvents = consentSse.onEvent(sink.emitEvent);
        const unsubAnalytics = consentSse.onAnalytics(sink.emitAnalytics);
        await consentSse.connect();
        return () => {
          unsubEvents();
          unsubAnalytics();
          consentSse.disconnect();
        };
      },
    }, baseUrl);
  }
}

// Singleton
export const consentWebSocketService = new ConsentWebSocketService();
