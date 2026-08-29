/**
 * OAuth WebSocket Service — real-time monitoring with SSE fallback.
 *
 * The connection machinery lives in MonitoringWebSocketService; this file is the
 * OAuth payload types and the SSE fallback wiring.
 */
import type { OAuthEvent, OAuthAnalyticsResponse, OAuthPredictiveInsights, OAuthWeekdayInsight } from '@/lib/types/api';
import { oauthMonitoringService } from './oauth-monitoring-service';
import { MonitoringWebSocketService } from './monitoring-websocket-service';
import { ResponseError } from '@/lib/api-client/runtime';

// Re-export generated types under legacy names for backward compatibility
export type OAuthEventSimple = OAuthEvent;
export type PredictiveInsights = OAuthPredictiveInsights;
export type WeekdayInsight = OAuthWeekdayInsight;
export type OAuthAnalytics = OAuthAnalyticsResponse;

const unauthorized = (message: string) =>
  new ResponseError(new Response(null, { status: 401, statusText: 'Unauthorized' }), message);

export class OAuthWebSocketService extends MonitoringWebSocketService<OAuthEventSimple, OAuthAnalytics> {
  constructor(baseUrl?: string) {
    super({
      wsPath: '/oauth/monitoring/websocket',
      label: 'OAuth',
      connectSse: (sink) => {
        const unsubEvents = oauthMonitoringService.subscribeToEvents(sink.emitEvent);
        const unsubAnalytics = oauthMonitoringService.subscribeToAnalytics(sink.emitAnalytics);
        return () => { unsubEvents(); unsubAnalytics(); };
      },
      missingTokenError: () => unauthorized('No authentication token found. Please log in first.'),
      authRejectedError: (message) => unauthorized(message),
    }, baseUrl);
  }
}

export const oauthWebSocketService = new OAuthWebSocketService();
