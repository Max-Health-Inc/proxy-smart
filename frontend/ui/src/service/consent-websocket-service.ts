/**
 * Consent WebSocket Service — real-time monitoring with SSE fallback.
 * Mirrors the OAuthWebSocketService pattern.
 */
import { useAuthStore } from '../stores/authStore';
import { config } from '@/config';
import { getItem } from '@/lib/storage';

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

// ─── Service ─────────────────────────────────────────────────────────

export class ConsentWebSocketService {
  private ws: WebSocket | null = null;
  private authenticated = false;
  private eventHandlers: Record<string, ((data: unknown) => void)[]> = {};
  private baseUrl: string;
  private isConnecting = false;
  private clientId: string | null = null;
  private lastConnectionAttempt = 0;
  private connectionThrottleMs = 1000;

  // SSE fallback
  private useSSE = false;
  private sseEventsSource: EventSource | null = null;
  private sseAnalyticsSource: EventSource | null = null;

  constructor(baseUrl?: string) {
    const apiBaseUrl = baseUrl || config.api.baseUrl;
    this.baseUrl = apiBaseUrl.replace(/^https?:/, apiBaseUrl.startsWith('https:') ? 'wss:' : 'ws:');
  }

  // ─── Connection ────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.useSSE) return;

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.connectionThrottleMs) {
      await new Promise(resolve => setTimeout(resolve, this.connectionThrottleMs - (now - this.lastConnectionAttempt)));
    }

    this.lastConnectionAttempt = Date.now();
    this.isConnecting = true;

    try {
      await this.connectWebSocket();
      this.useSSE = false;
    } catch {
      console.warn('Consent WebSocket connection failed, falling back to SSE');
      await this.connectSSE();
      this.useSSE = true;
    } finally {
      this.isConnecting = false;
    }
  }

  async connectWithMode(mode: 'websocket' | 'sse' | 'auto' = 'auto'): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.useSSE) return;

    this.isConnecting = true;
    try {
      if (mode === 'sse') {
        await this.connectSSE();
        this.useSSE = true;
      } else if (mode === 'websocket') {
        await this.connectWebSocket();
        this.useSSE = false;
      } else {
        try {
          await this.connectWebSocket();
          this.useSSE = false;
        } catch {
          console.warn('Consent WebSocket failed, falling back to SSE');
          await this.connectSSE();
          this.useSSE = true;
        }
      }
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl}/consent/monitoring/websocket`;
      this.ws = new WebSocket(wsUrl);

      const welcomeHandler = (data: unknown) => {
        const msg = data as { type: string; data?: { clientId?: string } };
        if (msg.type === 'welcome') {
          this.clientId = msg.data?.clientId || null;
          this.removeEventHandler('welcome', welcomeHandler);
          resolve();
        }
      };

      this.ws.onopen = () => { this.addEventListener('welcome', welcomeHandler); };
      this.ws.onmessage = (event) => { this.handleMessage(event); };
      this.ws.onclose = () => { this.authenticated = false; this.clientId = null; };
      this.ws.onerror = (error) => { reject(error); };
    });
  }

  private async connectSSE(): Promise<void> {
    const token = await this.getToken();
    if (!token) throw new Error('No authentication token');

    // Events SSE
    const eventsUrl = `${config.api.baseUrl}/monitoring/consent/events/stream?token=${encodeURIComponent(token)}`;
    this.sseEventsSource = new EventSource(eventsUrl);

    this.sseEventsSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'connection' || data.type === 'keepalive') return;
        this.triggerEventHandlers('events_update', { data: { event: data } });
      } catch { /* skip malformed */ }
    };

    // Analytics SSE
    const analyticsUrl = `${config.api.baseUrl}/monitoring/consent/analytics/stream?token=${encodeURIComponent(token)}`;
    this.sseAnalyticsSource = new EventSource(analyticsUrl);

    this.sseAnalyticsSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'keepalive') return;
        if (data.totalDecisions !== undefined) {
          this.triggerEventHandlers('analytics_update', { data });
        }
      } catch { /* skip malformed */ }
    };

    this.authenticated = true;
    this.clientId = 'sse-client';
  }

  // ─── Authentication ────────────────────────────────────────────

  async authenticate(): Promise<void> {
    if (this.useSSE) return;

    if (!this.isFullyReady) {
      throw new Error('WebSocket not fully ready');
    }

    const token = await this.getToken();
    if (!token) throw new Error('No authentication token found');

    return new Promise((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        reject(new Error('Authentication timeout'));
      }, 10000);

      const authHandler = (data: unknown) => {
        const msg = data as { type: string; data?: { message?: string } };
        if (msg.type === 'auth_success') {
          clearTimeout(authTimeout);
          this.authenticated = true;
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          resolve();
        } else if (msg.type === 'auth_error') {
          clearTimeout(authTimeout);
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          reject(new Error(msg.data?.message || 'Authentication failed'));
        }
      };

      this.addEventListener('auth_success', authHandler);
      this.addEventListener('auth_error', authHandler);
      this.sendMessage({ type: 'auth', token });
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────

  async subscribe(type: 'events' | 'analytics'): Promise<void> {
    if (this.useSSE) return;

    return new Promise((resolve, reject) => {
      if (!this.authenticated) { reject(new Error('Not authenticated')); return; }

      const confirmHandler = (data: unknown) => {
        const msg = data as { type: string; data?: { subscriptionType?: string } };
        if (msg.type === 'subscription_confirmed' && msg.data?.subscriptionType === type) {
          this.removeEventHandler('subscription_confirmed', confirmHandler);
          resolve();
        }
      };

      this.addEventListener('subscription_confirmed', confirmHandler);
      this.sendMessage({ type: 'subscribe', data: { subscriptionType: type } });
    });
  }

  // ─── Data handlers ─────────────────────────────────────────────

  onEventsData(handler: (events: ConsentDecisionEvent[]) => void) {
    this.addEventListener('events_data', (data: unknown) => {
      const msg = data as { data?: { events?: ConsentDecisionEvent[] } };
      handler(msg.data?.events || []);
    });
  }

  onEventsUpdate(handler: (event: ConsentDecisionEvent) => void): () => void {
    const eventHandler = (data: unknown) => {
      const msg = data as { data?: { event?: ConsentDecisionEvent } };
      if (msg.data?.event) handler(msg.data.event);
    };
    this.addEventListener('events_update', eventHandler);
    return () => { this.removeEventHandler('events_update', eventHandler); };
  }

  onAnalyticsData(handler: (analytics: ConsentAnalytics) => void) {
    this.addEventListener('analytics_data', (data: unknown) => {
      const msg = data as { data?: ConsentAnalytics };
      if (msg.data) handler(msg.data);
    });
  }

  onAnalyticsUpdate(handler: (analytics: ConsentAnalytics) => void): () => void {
    const eventHandler = (data: unknown) => {
      const msg = data as { data?: ConsentAnalytics };
      if (msg.data) handler(msg.data);
    };
    this.addEventListener('analytics_update', eventHandler);
    return () => { this.removeEventHandler('analytics_update', eventHandler); };
  }

  onError(handler: (error: string) => void) {
    this.addEventListener('error', (data: unknown) => {
      const msg = data as { data?: { message?: string } };
      handler(msg.data?.message || 'Unknown error');
    });
  }

  // ─── Disconnect ────────────────────────────────────────────────

  disconnect() {
    if (this.ws) {
      this.eventHandlers = {};
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.sseEventsSource?.close();
    this.sseEventsSource = null;
    this.sseAnalyticsSource?.close();
    this.sseAnalyticsSource = null;

    this.useSSE = false;
    this.authenticated = false;
    this.isConnecting = false;
    this.clientId = null;
  }

  // ─── Getters ───────────────────────────────────────────────────

  get isConnected(): boolean {
    return (this.ws !== null && this.ws.readyState === WebSocket.OPEN) || this.useSSE;
  }

  get isFullyReady(): boolean {
    return this.isConnected && this.clientId !== null;
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  get connectionMode(): 'websocket' | 'sse' | 'disconnected' {
    if (!this.isConnected) return 'disconnected';
    return this.useSSE ? 'sse' : 'websocket';
  }

  get isUsingSSE(): boolean {
    return this.useSSE;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private async getToken(): Promise<string | null> {
    try {
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated) {
        const tokens = await getItem<{ access_token: string }>('openid_tokens');
        if (tokens?.access_token) return tokens.access_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  private addEventListener(type: string, handler: (data: unknown) => void) {
    if (!this.eventHandlers[type]) this.eventHandlers[type] = [];
    this.eventHandlers[type].push(handler);
  }

  private removeEventHandler(type: string, handler: (data: unknown) => void) {
    if (this.eventHandlers[type]) {
      const idx = this.eventHandlers[type].indexOf(handler);
      if (idx > -1) this.eventHandlers[type].splice(idx, 1);
    }
  }

  private triggerEventHandlers(type: string, data: unknown) {
    this.eventHandlers[type]?.forEach(handler => {
      try { handler(data); } catch (e) { console.error('Error in consent event handler:', e); }
    });
  }

  private sendMessage(message: Record<string, unknown>) {
    if (this.useSSE) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = this.clientId ? { ...message, clientId: this.clientId } : message;
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      this.eventHandlers[data.type]?.forEach(handler => {
        try { handler(data); } catch (e) { console.error('Error in consent event handler:', e); }
      });
    } catch (e) {
      console.error('Error parsing consent WebSocket message:', e);
    }
  }
}

// Singleton
export const consentWebSocketService = new ConsentWebSocketService();
