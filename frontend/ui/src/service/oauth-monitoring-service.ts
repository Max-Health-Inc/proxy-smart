import { config } from '@/config';
import { getStoredToken, createOauthMonitoringApi } from '@/lib/apiClient';
import type { 
  OAuthEvent,
  OAuthEventsListResponse,
  OAuthAnalyticsResponse,
  MonitoringHealthResponse
} from '../lib/types/api';

// Re-export for backward compatibility
export type SystemHealth = MonitoringHealthResponse;

class OAuthMonitoringService {
  private eventsEventSource: EventSource | null = null;
  private analyticsEventSource: EventSource | null = null;
  private eventListeners = new Set<(event: OAuthEvent) => void>();
  private analyticsListeners = new Set<(analytics: OAuthAnalyticsResponse) => void>();
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Subscribe to real-time OAuth events
   */
  subscribeToEvents(callback: (event: OAuthEvent) => void): () => void {
    this.eventListeners.add(callback);
    
    if (!this.eventsEventSource) {
      this.connectToEventsStream().catch(error => {
        console.error('Failed to connect to events stream:', error);
      });
    }

    return () => {
      this.eventListeners.delete(callback);
      if (this.eventListeners.size === 0) {
        this.disconnectFromEventsStream();
      }
    };
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalytics(callback: (analytics: OAuthAnalyticsResponse) => void): () => void {
    this.analyticsListeners.add(callback);
    
    if (!this.analyticsEventSource) {
      this.connectToAnalyticsStream().catch(error => {
        console.error('Failed to connect to analytics stream:', error);
      });
    }

    return () => {
      this.analyticsListeners.delete(callback);
      if (this.analyticsListeners.size === 0) {
        this.disconnectFromAnalyticsStream();
      }
    };
  }

  /**
   * Get recent OAuth events with filtering
   */
  async getEvents(options?: {
    limit?: number;
    type?: string;
    status?: string;
    clientId?: string;
    since?: string;
  }): Promise<OAuthEventsListResponse> {
    const token = await getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      return await api.getMonitoringOauthEvents({
        limit: options?.limit?.toString(),
        type: options?.type,
        status: options?.status,
        clientId: options?.clientId,
        since: options?.since
      });
    } catch (error) {
      console.error('Failed to fetch OAuth events:', error);
      throw error;
    }
  }

  /**
   * Get current OAuth analytics
   */
  async getAnalytics(): Promise<OAuthAnalyticsResponse> {
    const token = await getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      return await api.getMonitoringOauthAnalytics({});
    } catch (error) {
      console.error('Failed to fetch OAuth analytics:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<MonitoringHealthResponse> {
    const token = await getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const api = createOauthMonitoringApi(token);
    
    try {
      return await api.getMonitoringOauthHealth({});
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw error;
    }
  }

  /**
   * Connect to OAuth events SSE stream
   */
  private async connectToEventsStream(): Promise<void> {
    // Don't create a new connection if one already exists
    if (this.eventsEventSource && this.eventsEventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      console.error('No token available for OAuth events stream');
      return;
    }

    try {
      // Close existing connection first
      if (this.eventsEventSource) {
        this.eventsEventSource.close();
      }

      // Note: EventSource doesn't support custom headers, so we'll use a different approach
      // We'll need to modify the backend to accept token via query parameter for SSE
      const url = `${this.baseUrl}/monitoring/oauth/events/stream?token=${encodeURIComponent(token)}`;
      this.eventsEventSource = new EventSource(url, {
        withCredentials: true
      });

      this.eventsEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip keepalive and connection messages
          if (data.type === 'keepalive' || data.type === 'connection') {
            return;
          }

          // Notify all listeners
          this.eventListeners.forEach(callback => {
            try {
              callback(data as OAuthEvent);
            } catch (error) {
              console.error('Error in OAuth event listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing OAuth event:', error);
        }
      };

      this.eventsEventSource.onerror = (error) => {
        console.error('OAuth events stream error:', error);
        this.disconnectFromEventsStream();
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.eventListeners.size > 0) {
            this.connectToEventsStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to OAuth events stream:', error);
    }
  }

  /**
   * Connect to OAuth analytics SSE stream
   */
  private async connectToAnalyticsStream(): Promise<void> {
    // Don't create a new connection if one already exists
    if (this.analyticsEventSource && this.analyticsEventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      console.error('No token available for OAuth analytics stream');
      return;
    }

    try {
      // Close existing connection first
      if (this.analyticsEventSource) {
        this.analyticsEventSource.close();
      }

      // Note: EventSource doesn't support custom headers, so we'll use a different approach
      const url = `${this.baseUrl}/monitoring/oauth/analytics/stream?token=${encodeURIComponent(token)}`;
      this.analyticsEventSource = new EventSource(url, {
        withCredentials: true
      });

      this.analyticsEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip keepalive messages
          if (data.type === 'keepalive') {
            return;
          }

          // Notify all listeners
          this.analyticsListeners.forEach(callback => {
            try {
              callback(data as OAuthAnalyticsResponse);
            } catch (error) {
              console.error('Error in OAuth analytics listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing OAuth analytics:', error);
        }
      };

      this.analyticsEventSource.onerror = (error) => {
        console.error('OAuth analytics stream error:', error);
        this.disconnectFromAnalyticsStream();
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.analyticsListeners.size > 0) {
            this.connectToAnalyticsStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect to OAuth analytics stream:', error);
    }
  }

  /**
   * Disconnect from OAuth events stream
   */
  private disconnectFromEventsStream(): void {
    if (this.eventsEventSource) {
      this.eventsEventSource.close();
      this.eventsEventSource = null;
    }
  }

  /**
   * Disconnect from OAuth analytics stream
   */
  private disconnectFromAnalyticsStream(): void {
    if (this.analyticsEventSource) {
      this.analyticsEventSource.close();
      this.analyticsEventSource = null;
    }
  }

  /**
   * Cleanup all connections
   */
  disconnect(): void {
    this.disconnectFromEventsStream();
    this.disconnectFromAnalyticsStream();
    this.eventListeners.clear();
    this.analyticsListeners.clear();
  }
}

// Export singleton instance
export const oauthMonitoringService = new OAuthMonitoringService();
