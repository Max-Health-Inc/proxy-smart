/**
 * Generic SSE-based monitoring service factory.
 *
 * All monitoring dashboards (auth, email, admin-audit, oauth) share the same
 * connect / disconnect / subscribe / fetch pattern.  This factory removes the
 * duplication and produces a type-safe singleton per monitoring domain.
 */
import { config } from '@/config';
import { getStoredToken } from '@/lib/apiClient';

// ─── Public contract consumed by MonitoringDashboard ─────────────────────────

export interface MonitoringServiceInstance<
  TEvent = unknown,
  TAnalytics = unknown,
> {
  readonly isConnected: boolean;

  /** Open both SSE streams. */
  connect(): Promise<void>;
  /** Close both SSE streams. */
  disconnect(): void;

  /** Subscribe to individual events; returns an unsubscribe function. */
  onEvent(cb: (event: TEvent) => void): () => void;
  /** Subscribe to analytics snapshots; returns an unsubscribe function. */
  onAnalytics(cb: (analytics: TAnalytics) => void): () => void;

  /** REST: fetch a page of events. */
  fetchEvents(options?: Record<string, string | number | undefined>): Promise<{ events: TEvent[]; total: number }>;
  /** REST: fetch current analytics. */
  fetchAnalytics(): Promise<TAnalytics>;
}

// ─── Config for the factory ──────────────────────────────────────────────────

export interface MonitoringServiceConfig<TAnalytics = unknown> {
  /** URL path segment, e.g. "auth" → /monitoring/auth/… */
  domain: string;

  /**
   * Guard that decides whether a parsed SSE message is an analytics payload
   * (as opposed to a keepalive / connection message).
   * Defaults to checking for `totalEvents` property.
   */
  isAnalyticsPayload?: (data: unknown) => data is TAnalytics;

  /**
   * Optional extra REST methods keyed by name.
   * Each receives the authenticated token and must return a Promise.
   */
  extras?: Record<string, (token: string) => Promise<unknown>>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMonitoringService<
  TEvent = unknown,
  TAnalytics = unknown,
>(
  cfg: MonitoringServiceConfig<TAnalytics>,
): MonitoringServiceInstance<TEvent, TAnalytics> & Record<string, unknown> {
  let sseEvents: EventSource | null = null;
  let sseAnalytics: EventSource | null = null;
  let connected = false;

  const eventCbs = new Set<(e: TEvent) => void>();
  const analyticsCbs = new Set<(a: TAnalytics) => void>();

  const base = () => `${config.api.baseUrl}/monitoring/${cfg.domain}`;

  const isAnalytics: (d: unknown) => d is TAnalytics =
    cfg.isAnalyticsPayload ??
    ((d): d is TAnalytics => typeof d === 'object' && d !== null && 'totalEvents' in d);

  // ── helpers ──────────────────────────────────────────────────────────────

  async function requireToken(): Promise<string> {
    const token = await getStoredToken();
    if (!token) throw new Error('No authentication token');
    return token;
  }

  function isSkippable(data: Record<string, unknown>): boolean {
    return data.type === 'connection' || data.type === 'keepalive';
  }

  // ── SSE ──────────────────────────────────────────────────────────────────

  async function connect(): Promise<void> {
    if (connected) return;
    const token = await requireToken();

    sseEvents = new EventSource(
      `${base()}/events/stream?token=${encodeURIComponent(token)}`,
    );
    sseEvents.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (isSkippable(data)) return;
        for (const cb of eventCbs) {
          try { cb(data as TEvent); } catch { /* listener error */ }
        }
      } catch { /* malformed JSON */ }
    };
    sseEvents.onerror = () => {
      // EventSource handles auto-reconnect
    };

    sseAnalytics = new EventSource(
      `${base()}/analytics/stream?token=${encodeURIComponent(token)}`,
    );
    sseAnalytics.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'keepalive') return;
        if (isAnalytics(data)) {
          for (const cb of analyticsCbs) {
            try { cb(data); } catch { /* listener error */ }
          }
        }
      } catch { /* malformed JSON */ }
    };

    connected = true;
  }

  function disconnect(): void {
    sseEvents?.close();
    sseEvents = null;
    sseAnalytics?.close();
    sseAnalytics = null;
    connected = false;
  }

  // ── subscriptions ────────────────────────────────────────────────────────

  function onEvent(cb: (e: TEvent) => void): () => void {
    eventCbs.add(cb);
    return () => { eventCbs.delete(cb); };
  }

  function onAnalytics(cb: (a: TAnalytics) => void): () => void {
    analyticsCbs.add(cb);
    return () => { analyticsCbs.delete(cb); };
  }

  // ── REST ─────────────────────────────────────────────────────────────────

  async function fetchEvents(
    options?: Record<string, string | number | undefined>,
  ): Promise<{ events: TEvent[]; total: number }> {
    const token = await requireToken();
    const params = new URLSearchParams();
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        if (v !== undefined && v !== '' && v !== 'all') params.set(k, String(v));
      }
    }
    const res = await fetch(`${base()}/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${cfg.domain} events`);
    return res.json();
  }

  async function fetchAnalytics(): Promise<TAnalytics> {
    const token = await requireToken();
    const res = await fetch(`${base()}/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${cfg.domain} analytics`);
    return res.json();
  }

  // ── extras ───────────────────────────────────────────────────────────────

  const extraMethods: Record<string, (...args: unknown[]) => unknown> = {};
  if (cfg.extras) {
    for (const [name, fn] of Object.entries(cfg.extras)) {
      extraMethods[name] = async () => {
        const token = await requireToken();
        return fn(token);
      };
    }
  }

  return {
    get isConnected() { return connected; },
    connect,
    disconnect,
    onEvent,
    onAnalytics,
    fetchEvents,
    fetchAnalytics,
    ...extraMethods,
  };
}
