// OAuth WebSocket Service - Simplified version for real-time monitoring with SSE fallback
import type { OAuthEvent, OAuthAnalyticsResponse } from '@/lib/types/api';
import { useAuthStore } from '../stores/authStore';
import { oauthMonitoringService } from './oauth-monitoring-service';
import { config } from '@/config';
import { getItem } from '@/lib/storage';
import { ResponseError } from '@/lib/api-client/runtime';

export interface OAuthEventSimple {
  id: string;
  timestamp: string;
  type: 'authorization' | 'token' | 'refresh' | 'error' | 'revoke' | 'introspect';
  status: 'success' | 'error' | 'pending' | 'warning';
  clientId: string;
  clientName?: string;
  scopes: string[];
  grantType: string;
  responseTime: number;
  errorMessage?: string;
}

export interface PredictiveInsights {
  generatedAt: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendConfidence: number;
  nextHour: {
    totalFlows: number;
    successRate: number;
    errorRate: number;
  };
  anomalyRisk: 'low' | 'medium' | 'high';
  anomalyReasons: string[];
  notes?: string;
}

export interface WeekdayInsight {
  weekday: number;
  label: string;
  sampleDays: number;
  averageTotal: number;
  averageSuccessRate: number;
  averageErrorRate: number;
  projectedTotal: number;
  projectedSuccessRate: number;
  projectedErrorRate: number;
  latestTotal?: number;
  deltaFromAverage?: number;
  lastObserved?: string;
}

// Use the generated API client type for analytics and merge predictive insights
export type OAuthAnalytics = OAuthAnalyticsResponse & {
  predictiveInsights?: PredictiveInsights;
  weekdayInsights?: WeekdayInsight[];
};

export class OAuthWebSocketService {
  private ws: WebSocket | null = null;
  private authenticated = false;
  private eventHandlers: Record<string, ((data: unknown) => void)[]> = {};
  private baseUrl: string;
  private isConnecting = false;
  private clientId: string | null = null;
  private lastConnectionAttempt = 0;
  private connectionThrottleMs = 1000; // Minimum 1 second between connection attempts
  
  // SSE fallback properties
  private useSSE = false;
  private sseEventsUnsub?: () => void;
  private sseAnalyticsUnsub?: () => void;
  private eventsUpdateHandlers: ((event: OAuthEventSimple) => void)[] = [];
  private analyticsUpdateHandlers: ((analytics: OAuthAnalytics) => void)[] = [];
  
  constructor(baseUrl?: string) {
    // Convert HTTP/HTTPS base URL to WebSocket URL
    const apiBaseUrl = baseUrl || config.api.baseUrl;
    this.baseUrl = apiBaseUrl.replace(/^https?:/, apiBaseUrl.startsWith('https:') ? 'wss:' : 'ws:');
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.useSSE) {
      return;
    }

    // Throttle connection attempts to prevent rapid reconnections
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
      console.warn('WebSocket connection failed, falling back to SSE');
      this.connectSSE();
      this.useSSE = true;
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectWebSocket(): Promise<void> {
    // If already connected, disconnect first
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.disconnect();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl}/oauth/monitoring/websocket`;
      this.ws = new WebSocket(wsUrl);

      // Set up welcome message handler to know when we can authenticate
      const welcomeHandler = (data: unknown) => {
        const message = data as { type: string; data?: { clientId?: string } };
        if (message.type === 'welcome') {
          // Store the client ID from the welcome message
          this.clientId = message.data?.clientId || null;
          this.removeEventHandler('welcome', welcomeHandler);
          resolve();
        }
      };

      this.ws.onopen = () => {
        this.addEventListener('welcome', welcomeHandler);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = () => {
        this.authenticated = false;
        this.clientId = null;
      };

      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }

  private connectSSE(): void {
    // Subscribe to SSE events and forward them through our interface
    this.sseEventsUnsub = oauthMonitoringService.subscribeToEvents((event: OAuthEvent) => {
      // Convert SSE event to our WebSocket event format
      const oauthEvent: OAuthEventSimple = {
        id: event.id || '',
        timestamp: event.timestamp || new Date().toISOString(),
        type: (event.type as OAuthEventSimple['type']) || 'authorization',
        status: (event.status as OAuthEventSimple['status']) || 'success',
        clientId: event.clientId || '',
        clientName: event.clientName,
        scopes: event.scopes || [],
        grantType: event.grantType || '',
        responseTime: event.responseTime || 0,
        errorMessage: event.errorMessage
      };
      
      // Trigger event handlers
      this.eventsUpdateHandlers.forEach(handler => handler(oauthEvent));
      this.triggerEventHandlers('events', oauthEvent);
    });

    this.sseAnalyticsUnsub = oauthMonitoringService.subscribeToAnalytics((analytics) => {
      // Forward analytics through our interface  
      const convertedAnalytics: OAuthAnalytics = {
        totalRequests: analytics.totalRequests || 0,
        successfulRequests: analytics.successfulRequests || 0,
        failedRequests: analytics.failedRequests || 0,
        successRate: analytics.successRate || 0,
        averageResponseTime: analytics.averageResponseTime || 0,
        activeTokens: analytics.activeTokens || 0,
        topClients: analytics.topClients || [],
        flowsByType: (analytics.flowsByType as Record<string, number>) || {},
        errorsByType: (analytics.errorsByType as Record<string, number>) || {},
        hourlyStats: analytics.hourlyStats || [],
        timestamp: analytics.timestamp || new Date().toISOString(),
        predictiveInsights: analytics.predictiveInsights,
        weekdayInsights: analytics.weekdayInsights
      };
      
      this.analyticsUpdateHandlers.forEach(handler => handler(convertedAnalytics));
      this.triggerEventHandlers('analytics', convertedAnalytics);
    });

    // Mark as authenticated for SSE
    this.authenticated = true;
    this.clientId = 'sse-client';
  }

  async connectWithMode(mode: 'websocket' | 'sse' | 'auto' = 'auto'): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN) || this.useSSE) {
      return;
    }

    this.isConnecting = true;
    
    try {
      if (mode === 'sse') {
        // Force SSE mode
        this.connectSSE();
        this.useSSE = true;
      } else if (mode === 'websocket') {
        // Force WebSocket mode (will throw if fails)
        await this.connectWebSocket();
        this.useSSE = false;
      } else {
        // Auto mode - try WebSocket first, fallback to SSE
        try {
          await this.connectWebSocket();
          this.useSSE = false;
        } catch {
          console.warn('WebSocket connection failed, falling back to SSE');
          this.connectSSE();
          this.useSSE = true;
        }
      }
    } finally {
      this.isConnecting = false;
    }
  }

  async authenticate(): Promise<void> {
    // If using SSE, authentication was handled in connectSSE
    if (this.useSSE) {
      return Promise.resolve();
    }
    
    // Ensure WebSocket is connected and client ID is received
    if (!this.isFullyReady) {
      throw new Error('WebSocket not fully ready. Connection or client ID missing.');
    }

    // Get token from auth store
    const getToken = async (): Promise<string | null> => {
      try {
        // Access the auth store directly (not using the hook since this is outside React)
        const authStore = useAuthStore.getState();
        
        if (authStore.isAuthenticated) {
          // Try to get token from encrypted storage using the same key as auth store
          const tokens = await getItem<{access_token: string}>('openid_tokens');
          if (tokens?.access_token) {
            return tokens.access_token;
          }
        }
        
        console.warn('No valid authentication token found. User may need to log in.');
        return null;
      } catch (error) {
        console.error('Error reading token from auth store:', error);
        return null;
      }
    };

    const token = await getToken();
    if (!token) {
      throw new ResponseError(
        new Response(null, { status: 401, statusText: 'Unauthorized' }),
        'No authentication token found. Please log in first.'
      );
    }

    return new Promise((resolve, reject) => {
      // Set up timeout for authentication
      const authTimeout = setTimeout(() => {
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        this.removeEventHandler('error', errorHandler);
        reject(new Error('Authentication timeout - no response from server'));
      }, 10000); // 10 second timeout

      // Listen for auth response
      const authHandler = (data: unknown) => {
        const message = data as { type: string; data?: { message?: string } };
        if (message.type === 'auth_success') {
          clearTimeout(authTimeout);
          this.authenticated = true;
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          this.removeEventHandler('error', errorHandler);
          resolve();
        } else if (message.type === 'auth_error') {
          clearTimeout(authTimeout);
          this.removeEventHandler('auth_success', authHandler);
          this.removeEventHandler('auth_error', authHandler);
          this.removeEventHandler('error', errorHandler);
          const errorMsg = message.data?.message || 'Authentication failed';
          console.error('WebSocket authentication failed:', errorMsg);
          reject(new ResponseError(
            new Response(null, { status: 401, statusText: 'Unauthorized' }),
            errorMsg
          ));
        }
      };

      // Listen for general errors during auth
      const errorHandler = (data: unknown) => {
        const message = data as { type: string; data?: { message?: string; error?: string } };
        console.error('WebSocket error during authentication:', message);
        
        clearTimeout(authTimeout);
        this.removeEventHandler('auth_success', authHandler);
        this.removeEventHandler('auth_error', authHandler);
        this.removeEventHandler('error', errorHandler);
        
        const errorMsg = message.data?.message || message.data?.error || 'Unknown authentication error';
        reject(new Error(`Authentication error: ${errorMsg}`));
      };

      this.addEventListener('auth_success', authHandler);
      this.addEventListener('auth_error', authHandler);
      this.addEventListener('error', errorHandler);

      // Send auth message
      const authMessage = { type: 'auth', token };
      this.sendMessage(authMessage);
    });
  }

  async subscribe(type: 'events' | 'analytics'): Promise<void> {
    // In SSE mode, subscriptions are automatically active
    if (this.useSSE) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.authenticated) {
        reject(new Error('Not authenticated'));
        return;
      }

      const confirmHandler = (data: unknown) => {
        const message = data as { type: string; data?: { subscriptionType?: string } };
        if (message.type === 'subscription_confirmed' && message.data?.subscriptionType === type) {
          this.removeEventHandler('subscription_confirmed', confirmHandler);
          resolve();
        }
      };

      this.addEventListener('subscription_confirmed', confirmHandler);
      this.sendMessage({ type: 'subscribe', data: { subscriptionType: type } });
    });
  }

  onEventsData(handler: (events: OAuthEventSimple[]) => void) {
    this.addEventListener('events_data', (data: unknown) => {
      const message = data as { data?: { events?: OAuthEventSimple[] } };
      handler(message.data?.events || []);
    });
  }

  onEventsUpdate(handler: (event: OAuthEventSimple) => void): () => void {
    const eventHandler = (data: unknown) => {
      const message = data as { data?: { event?: OAuthEventSimple } };
      if (message.data?.event) {
        handler(message.data.event);
      }
    };
    
    this.addEventListener('events_update', eventHandler);
    
    // Return unsubscribe function
    return () => {
      this.removeEventHandler('events_update', eventHandler);
    };
  }

  onAnalyticsData(handler: (analytics: OAuthAnalytics) => void) {
    this.addEventListener('analytics_data', (data: unknown) => {
      const message = data as { data?: OAuthAnalytics };
      if (message.data) {
        handler(message.data);
      }
    });
  }

  onAnalyticsUpdate(handler: (analytics: OAuthAnalytics) => void): () => void {
    const eventHandler = (data: unknown) => {
      const message = data as { data?: OAuthAnalytics };
      if (message.data) {
        handler(message.data);
      }
    };
    
    this.addEventListener('analytics_update', eventHandler);
    
    // Return unsubscribe function
    return () => {
      this.removeEventHandler('analytics_update', eventHandler);
    };
  }

  onError(handler: (error: string) => void) {
    this.addEventListener('error', (data: unknown) => {
      const message = data as { data?: { message?: string } };
      handler(message.data?.message || 'Unknown error');
    });
  }

  private addEventListener(type: string, handler: (data: unknown) => void) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(handler);
  }

  private removeEventHandler(type: string, handler: (data: unknown) => void) {
    if (this.eventHandlers[type]) {
      const index = this.eventHandlers[type].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[type].splice(index, 1);
      }
    }
  }

  private triggerEventHandlers(type: string, data: unknown) {
    const handlers = this.eventHandlers[type];
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private sendMessage(message: Record<string, unknown>) {
    if (this.useSSE) {
      console.warn('Cannot send messages in SSE mode - SSE is read-only');
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Include client ID in the message if available
      const messageWithClientId = this.clientId 
        ? { ...message, clientId: this.clientId }
        : message;
      const messageStr = JSON.stringify(messageWithClientId);
      this.ws.send(messageStr);
    } else {
      console.error('Cannot send message - WebSocket not connected. State:', 
        this.ws ? this.ws.readyState : 'null');
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      // Log error messages for debugging
      if (data.type === 'error') {
        console.error('WebSocket server error:', data.data);
      }
      
      const handlers = this.eventHandlers[data.type];
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
      } else {
        console.warn('No handlers registered for message type:', data.type, 'Data:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
    }
  }

  disconnect() {
    // Clean up WebSocket
    if (this.ws) {
      // Remove all event listeners before closing
      this.eventHandlers = {};
      
      // Close the connection if it's open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
    
    // Clean up SSE
    if (this.useSSE) {
      if (this.sseEventsUnsub) {
        this.sseEventsUnsub();
        this.sseEventsUnsub = undefined;
      }
      if (this.sseAnalyticsUnsub) {
        this.sseAnalyticsUnsub();
        this.sseAnalyticsUnsub = undefined;
      }
      this.eventsUpdateHandlers = [];
      this.analyticsUpdateHandlers = [];
      this.useSSE = false;
    }
    
    this.authenticated = false;
    this.isConnecting = false;
    this.clientId = null;
  }

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
}

// Create singleton instance
export const oauthWebSocketService = new OAuthWebSocketService();
