/**
 * Auth Events Monitoring Service — SSE-based real-time monitoring for
 * Keycloak authentication events (LOGIN, LOGOUT, REGISTER, etc.).
 * Mirrors the AdminAuditService pattern.
 */
import { config } from '@/config';
import { getItem } from '@/lib/storage';

// ─── Types (mirror backend AuthEvent / AuthAnalytics) ────────────────

export interface AuthEvent {
  id: string;
  timestamp: string;
  type: string;
  userId?: string;
  clientId?: string;
  sessionId?: string;
  ipAddress?: string;
  error?: string;
  success: boolean;
  details?: Record<string, string>;
}

export interface AuthAnalytics {
  totalEvents: number;
  successRate: number;
  eventsByType: Record<string, number>;
  recentErrors: AuthEvent[];
  hourlyStats: Array<{ hour: string; success: number; failure: number; total: number }>;
  topClients: Array<{ clientId: string; count: number }>;
  timestamp?: string;
}

// ─── Service ─────────────────────────────────────────────────────────

class AuthMonitoringService {
  private sseEventsSource: EventSource | null = null;
  private sseAnalyticsSource: EventSource | null = null;
  private eventCallbacks = new Set<(event: AuthEvent) => void>();
  private analyticsCallbacks = new Set<(analytics: AuthAnalytics) => void>();
  private connected = false;

  get isConnected(): boolean {
    return this.connected;
  }

  private async getToken(): Promise<string | null> {
    try {
      const tokens = await getItem<{ access_token: string }>('openid_tokens');
      return tokens?.access_token || null;
    } catch {
      return null;
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    // Events SSE
    const eventsUrl = `${config.api.baseUrl}/monitoring/auth/events/stream?token=${encodeURIComponent(token)}`;
    this.sseEventsSource = new EventSource(eventsUrl);

    this.sseEventsSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'connection' || data.type === 'keepalive') return;
        for (const cb of this.eventCallbacks) {
          try { cb(data); } catch { /* ignore */ }
        }
      } catch { /* skip malformed */ }
    };

    this.sseEventsSource.onerror = () => {
      // Auto-reconnect is handled by EventSource
    };

    // Analytics SSE
    const analyticsUrl = `${config.api.baseUrl}/monitoring/auth/analytics/stream?token=${encodeURIComponent(token)}`;
    this.sseAnalyticsSource = new EventSource(analyticsUrl);

    this.sseAnalyticsSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'keepalive') return;
        if (data.totalEvents !== undefined) {
          for (const cb of this.analyticsCallbacks) {
            try { cb(data); } catch { /* ignore */ }
          }
        }
      } catch { /* skip malformed */ }
    };

    this.connected = true;
  }

  disconnect(): void {
    if (this.sseEventsSource) {
      this.sseEventsSource.close();
      this.sseEventsSource = null;
    }
    if (this.sseAnalyticsSource) {
      this.sseAnalyticsSource.close();
      this.sseAnalyticsSource = null;
    }
    this.connected = false;
  }

  onEvent(cb: (event: AuthEvent) => void): () => void {
    this.eventCallbacks.add(cb);
    return () => this.eventCallbacks.delete(cb);
  }

  onAnalytics(cb: (analytics: AuthAnalytics) => void): () => void {
    this.analyticsCallbacks.add(cb);
    return () => this.analyticsCallbacks.delete(cb);
  }

  // ─── REST helpers ──────────────────────────────────────────────

  async fetchEvents(options?: {
    limit?: number;
    type?: string;
    success?: string;
    clientId?: string;
    userId?: string;
  }): Promise<{ events: AuthEvent[]; total: number }> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.type && options.type !== 'all') params.set('type', options.type);
    if (options?.success !== undefined) params.set('success', options.success);
    if (options?.clientId) params.set('clientId', options.clientId);
    if (options?.userId) params.set('userId', options.userId);

    const res = await fetch(`${config.api.baseUrl}/monitoring/auth/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch auth events');
    return res.json();
  }

  async fetchAnalytics(): Promise<AuthAnalytics> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    const res = await fetch(`${config.api.baseUrl}/monitoring/auth/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch auth analytics');
    return res.json();
  }
}

export const authMonitoringService = new AuthMonitoringService();
