/**
 * Admin Audit Service — SSE-based real-time monitoring for admin actions.
 * Mirrors the ConsentWebSocketService pattern but SSE-only (no WebSocket).
 */
import { config } from '@/config';
import { getItem } from '@/lib/storage';
import type { AdminAuditEvent, AdminAuditAnalyticsResponse as AdminAuditAnalytics } from '@/lib/types/api';
export type { AdminAuditEvent, AdminAuditAnalytics };

// ─── Service ─────────────────────────────────────────────────────────

class AdminAuditService {
  private sseEventsSource: EventSource | null = null;
  private sseAnalyticsSource: EventSource | null = null;
  private eventCallbacks = new Set<(event: AdminAuditEvent) => void>();
  private analyticsCallbacks = new Set<(analytics: AdminAuditAnalytics) => void>();
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
    const eventsUrl = `${config.api.baseUrl}/monitoring/admin-audit/events/stream?token=${encodeURIComponent(token)}`;
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
    const analyticsUrl = `${config.api.baseUrl}/monitoring/admin-audit/analytics/stream?token=${encodeURIComponent(token)}`;
    this.sseAnalyticsSource = new EventSource(analyticsUrl);

    this.sseAnalyticsSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'keepalive') return;
        if (data.totalActions !== undefined) {
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

  onEvent(cb: (event: AdminAuditEvent) => void): () => void {
    this.eventCallbacks.add(cb);
    return () => this.eventCallbacks.delete(cb);
  }

  onAnalytics(cb: (analytics: AdminAuditAnalytics) => void): () => void {
    this.analyticsCallbacks.add(cb);
    return () => this.analyticsCallbacks.delete(cb);
  }

  // ─── REST helpers ──────────────────────────────────────────────

  async fetchEvents(options?: {
    limit?: number;
    action?: string;
    resource?: string;
    actor?: string;
    success?: string;
  }): Promise<{ events: AdminAuditEvent[]; total: number }> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.action && options.action !== 'all') params.set('action', options.action);
    if (options?.resource && options.resource !== 'all') params.set('resource', options.resource);
    if (options?.actor) params.set('actor', options.actor);
    if (options?.success !== undefined) params.set('success', options.success);

    const res = await fetch(`${config.api.baseUrl}/monitoring/admin-audit/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch audit events');
    return res.json();
  }

  async fetchAnalytics(): Promise<AdminAuditAnalytics> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    const res = await fetch(`${config.api.baseUrl}/monitoring/admin-audit/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch audit analytics');
    return res.json();
  }

  async exportJsonl(): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    const res = await fetch(`${config.api.baseUrl}/monitoring/admin-audit/events/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to export audit log');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const adminAuditService = new AdminAuditService();
