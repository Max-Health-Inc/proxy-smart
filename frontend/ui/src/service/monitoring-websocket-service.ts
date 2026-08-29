/**
 * Generic monitoring WebSocket service with SSE fallback.
 *
 * The OAuth and consent dashboards both open a monitoring socket, wait for a
 * welcome frame carrying a client id, authenticate with a bearer token,
 * subscribe to events and analytics, and fall back to SSE when the socket will
 * not open. Only the socket path, the fallback wiring and the payload types
 * differ, so the machinery lives here once.
 */
import { useAuthStore } from '../stores/authStore';
import { config } from '@/config';
import { getItem } from '@/lib/storage';

const AUTH_TIMEOUT_MS = 10_000;
const CONNECT_THROTTLE_MS = 1000;

export type ConnectionMode = 'websocket' | 'sse' | 'disconnected';

/** Emitters the SSE fallback pushes into, so it reaches the same handlers as the socket. */
export interface SseFallbackSink<TEvent, TAnalytics> {
  emitEvent(event: TEvent): void;
  emitAnalytics(analytics: TAnalytics): void;
}

export interface MonitoringSocketConfig<TEvent, TAnalytics> {
  /** Socket path under the API base, e.g. '/oauth/monitoring/websocket' */
  wsPath: string;
  /** Name used in console messages */
  label: string;
  /**
   * Open the SSE fallback, pushing into the sink. Returns a teardown function.
   * Called when the socket cannot be opened, or when SSE mode is forced.
   */
  connectSse(sink: SseFallbackSink<TEvent, TAnalytics>): (() => void) | Promise<() => void>;
  /** Build the error thrown when no token is available */
  missingTokenError?(): Error;
  /** Build the error thrown when the server rejects the token */
  authRejectedError?(message: string): Error;
}

/** Read the access token the same way every monitoring socket does. */
export async function getMonitoringToken(): Promise<string | null> {
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

export class MonitoringWebSocketService<TEvent, TAnalytics> {
  private ws: WebSocket | null = null;
  private authenticated = false;
  private eventHandlers: Record<string, ((data: unknown) => void)[]> = {};
  private readonly baseUrl: string;
  private isConnecting = false;
  private connectPromise: Promise<void> | null = null;
  private clientId: string | null = null;
  private lastConnectionAttempt = 0;

  private useSSE = false;
  private sseTeardown: (() => void) | null = null;

  constructor(
    private readonly cfg: MonitoringSocketConfig<TEvent, TAnalytics>,
    baseUrl?: string,
  ) {
    const apiBaseUrl = baseUrl || config.api.baseUrl;
    this.baseUrl = apiBaseUrl.replace(/^https?:/, apiBaseUrl.startsWith('https:') ? 'wss:' : 'ws:');
  }

  // ─── Connection ────────────────────────────────────────────────

  async connect(): Promise<void> {
    return this.connectWithMode('auto');
  }

  async connectWithMode(mode: 'websocket' | 'sse' | 'auto' = 'auto'): Promise<void> {
    if (!this.isConnecting) {
      const socketOpen = this.ws?.readyState === WebSocket.OPEN;
      if ((socketOpen && mode !== 'sse') || (this.useSSE && mode !== 'websocket')) return;
    }

    // A second caller waits for the in-flight attempt rather than opening a rival socket.
    if (this.isConnecting && this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.isConnecting = true;
    this.connectPromise = (async () => {
      try {
        await this.throttle();

        if (mode === 'sse') {
          await this.openSse();
        } else if (mode === 'websocket') {
          await this.connectWebSocket();
          this.useSSE = false;
        } else {
          try {
            await this.connectWebSocket();
            this.useSSE = false;
          } catch {
            console.warn(`${this.cfg.label} WebSocket connection failed, falling back to SSE`);
            await this.openSse();
          }
        }
      } finally {
        this.isConnecting = false;
        this.connectPromise = null;
      }
    })();

    await this.connectPromise;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastConnectionAttempt;
    if (elapsed < CONNECT_THROTTLE_MS) {
      await new Promise(resolve => setTimeout(resolve, CONNECT_THROTTLE_MS - elapsed));
    }
    this.lastConnectionAttempt = Date.now();
  }

  private async openSse(): Promise<void> {
    this.sseTeardown = await this.cfg.connectSse({
      emitEvent: (event) => this.triggerEventHandlers('events_update', { data: { event } }),
      emitAnalytics: (analytics) => this.triggerEventHandlers('analytics_update', { data: analytics }),
    });
    this.useSSE = true;
    this.authenticated = true;
    this.clientId = 'sse-client';
  }

  private async connectWebSocket(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.baseUrl}${this.cfg.wsPath}`);

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

  // ─── Authentication ────────────────────────────────────────────

  async authenticate(): Promise<void> {
    if (this.useSSE) return;

    if (!this.isFullyReady) {
      throw new Error('WebSocket not fully ready. Connection or client ID missing.');
    }

    const token = await getMonitoringToken();
    if (!token) {
      throw this.cfg.missingTokenError?.() ?? new Error('No authentication token found');
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(authTimeout);
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        this.removeEventHandler('error', errorHandler);
      };

      const authTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Authentication timeout - no response from server'));
      }, AUTH_TIMEOUT_MS);

      const authHandler = (data: unknown) => {
        const msg = data as { type: string; data?: { message?: string } };
        if (msg.type === 'auth_success') {
          cleanup();
          this.authenticated = true;
          resolve();
        } else if (msg.type === 'auth_error') {
          cleanup();
          const errorMsg = msg.data?.message || 'Authentication failed';
          console.error(`${this.cfg.label} WebSocket authentication failed:`, errorMsg);
          reject(this.cfg.authRejectedError?.(errorMsg) ?? new Error(errorMsg));
        }
      };

      const errorHandler = (data: unknown) => {
        const msg = data as { type: string; data?: { message?: string; error?: string } };
        console.error(`${this.cfg.label} WebSocket error during authentication:`, msg);
        cleanup();
        const errorMsg = msg.data?.message || msg.data?.error || 'Unknown authentication error';
        reject(new Error(`Authentication error: ${errorMsg}`));
      };

      this.addEventListener('auth_success', authHandler);
      this.addEventListener('auth_error', authHandler);
      this.addEventListener('error', errorHandler);

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

  onEventsData(handler: (events: TEvent[]) => void): void {
    this.addEventListener('events_data', (data: unknown) => {
      const msg = data as { data?: { events?: TEvent[] } };
      handler(msg.data?.events || []);
    });
  }

  onEventsUpdate(handler: (event: TEvent) => void): () => void {
    const eventHandler = (data: unknown) => {
      const msg = data as { data?: { event?: TEvent } };
      if (msg.data?.event) handler(msg.data.event);
    };
    this.addEventListener('events_update', eventHandler);
    return () => { this.removeEventHandler('events_update', eventHandler); };
  }

  onAnalyticsData(handler: (analytics: TAnalytics) => void): void {
    this.addEventListener('analytics_data', (data: unknown) => {
      const msg = data as { data?: TAnalytics };
      if (msg.data) handler(msg.data);
    });
  }

  onAnalyticsUpdate(handler: (analytics: TAnalytics) => void): () => void {
    const eventHandler = (data: unknown) => {
      const msg = data as { data?: TAnalytics };
      if (msg.data) handler(msg.data);
    };
    this.addEventListener('analytics_update', eventHandler);
    return () => { this.removeEventHandler('analytics_update', eventHandler); };
  }

  onError(handler: (error: string) => void): void {
    this.addEventListener('error', (data: unknown) => {
      const msg = data as { data?: { message?: string } };
      handler(msg.data?.message || 'Unknown error');
    });
  }

  // ─── Disconnect ────────────────────────────────────────────────

  disconnect(): void {
    if (this.ws) {
      this.eventHandlers = {};
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.sseTeardown?.();
    this.sseTeardown = null;

    this.useSSE = false;
    this.authenticated = false;
    this.isConnecting = false;
    this.connectPromise = null;
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

  get connectionMode(): ConnectionMode {
    if (!this.isConnected) return 'disconnected';
    return this.useSSE ? 'sse' : 'websocket';
  }

  get isUsingSSE(): boolean {
    return this.useSSE;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private addEventListener(type: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers[type]) this.eventHandlers[type] = [];
    this.eventHandlers[type].push(handler);
  }

  private removeEventHandler(type: string, handler: (data: unknown) => void): void {
    const handlers = this.eventHandlers[type];
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
  }

  private triggerEventHandlers(type: string, data: unknown): void {
    this.eventHandlers[type]?.forEach(handler => {
      try { handler(data); } catch (e) { console.error(`Error in ${this.cfg.label} event handler:`, e); }
    });
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.useSSE) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(this.clientId ? { ...message, clientId: this.clientId } : message));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.triggerEventHandlers(data.type, data);
    } catch (e) {
      console.error(`Error parsing ${this.cfg.label} WebSocket message:`, e);
    }
  }
}
