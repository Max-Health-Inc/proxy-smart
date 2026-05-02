import { Elysia, t } from 'elysia';
import { oauthMetricsLogger } from '../lib/oauth-metrics-logger';
import { logger } from '../lib/logger';
import { validateToken } from '../lib/auth';
import { CommonErrorResponses } from '../schemas';
import { 
  StreamResponse, 
  MonitoringHealthResponse, 
  ExportResponse, 
  OAuthEventsResponse, 
  OAuthAnalyticsResponse,
  type MonitoringHealthResponseType,
  type ExportResponseType,
  type OAuthEventsResponseType,
  type OAuthAnalyticsResponseType
} from '../schemas/monitoring';

/**
 * OAuth monitoring routes - provides real-time monitoring and analytics
 */
export const oauthMonitoringRoutes = new Elysia({ prefix: '/monitoring/oauth', tags: ['oauth-monitoring'] })
  
  // Server-Sent Events endpoint for real-time OAuth events
  .get('/events/stream', async ({ set, headers, query }) => {
    // Validate authentication (support both header and query token for SSE)
    let token: string | undefined;
    
    if (headers.authorization) {
      token = headers.authorization.replace('Bearer ', '');
    } else if (query.token) {
      token = query.token;
    }
    
    if (!token) {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      await validateToken(token);
    } catch {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    // Set SSE headers
    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';
    set.headers['Connection'] = 'keep-alive';

    const stream = new ReadableStream({
      start(controller) {
        logger.sse.info('OAuth events SSE stream started');
        let isStreamActive = true;

        // Send initial connection event
        const initialData = `data: ${JSON.stringify({ 
          type: 'connection', 
          message: 'Connected to OAuth events stream',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialData));

        // Subscribe to OAuth events
        const unsubscribe = oauthMetricsLogger.subscribeToEvents((event) => {
          if (!isStreamActive) return;
          
          // Check if controller is still open before trying to enqueue
          try {
            if (controller.desiredSize === null) {
              logger.sse.debug('OAuth events stream controller closed during event send, stopping stream');
              isStreamActive = false;
              return;
            }
            
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorName = error instanceof Error ? error.name : 'Error';
            logger.sse.error('Failed to send OAuth event to SSE events stream - client disconnected', { 
              error: errorMessage,
              errorType: errorName,
              eventType: event.type,
              streamActive: isStreamActive,
              action: 'Marking stream as inactive'
            });
            isStreamActive = false;
          }
        });

        // Send keepalive every 30 seconds
        const keepAliveInterval = setInterval(() => {
          if (!isStreamActive) {
            clearInterval(keepAliveInterval);
            return;
          }
          
          try {
            // Check if controller is still open - desiredSize is null when closed
            if (controller.desiredSize === null) {
              logger.sse.info('OAuth events stream controller closed, stopping keepalive');
              isStreamActive = false;
              clearInterval(keepAliveInterval);
              unsubscribe();
              return;
            }
            
            const keepAlive = `data: ${JSON.stringify({ 
              type: 'keepalive', 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorName = error instanceof Error ? error.name : 'Error';
            logger.sse.debug('SSE events stream keepalive failed - client disconnected, cleaning up', { 
              error: errorMessage,
              errorType: errorName,
              streamActive: isStreamActive
            });
            isStreamActive = false;
            clearInterval(keepAliveInterval);
            unsubscribe();
            try {
              controller.close();
            } catch {
              // Controller might already be closed, ignore
            }
          }
        }, 30000);

        // Handle stream closure
        return () => {
          logger.sse.info('OAuth events SSE stream closed');
          isStreamActive = false;
          clearInterval(keepAliveInterval);
          unsubscribe();
        };
      }
    });

    return new Response(stream);
  }, {
    query: t.Object({
      token: t.Optional(t.String({ description: 'Bearer token for authentication (since EventSource cannot send custom headers)' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: {
      200: StreamResponse,
      400: CommonErrorResponses[400],
      401: CommonErrorResponses[401],
      500: CommonErrorResponses[500]
    },
    detail: {
      summary: 'OAuth Events Stream',
      description: 'Server-sent events stream for real-time OAuth flow monitoring. Token can be passed as query parameter or Authorization header.',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Server-Sent Events endpoint for real-time analytics
  .get('/analytics/stream', async ({ set, headers, query }) => {
    // Validate authentication (support both header and query token for SSE)
    let token: string | undefined;
    
    if (headers.authorization) {
      token = headers.authorization.replace('Bearer ', '');
    } else if (query.token) {
      token = query.token;
    }
    
    if (!token) {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      await validateToken(token);
    } catch {
      set.status = 401;
      return new Response('Unauthorized', { status: 401 });
    }

    // Set SSE headers
    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';
    set.headers['Connection'] = 'keep-alive';

    const stream = new ReadableStream({
      start(controller) {
        logger.sse.info('OAuth analytics SSE stream started');
        let isStreamActive = true;

        // Send initial analytics
        const currentAnalytics = oauthMetricsLogger.getAnalytics();
        if (currentAnalytics) {
          const initialData = `data: ${JSON.stringify(currentAnalytics)}\n\n`;
          controller.enqueue(new TextEncoder().encode(initialData));
        }

        // Subscribe to analytics updates
        const unsubscribe = oauthMetricsLogger.subscribeToAnalytics((analytics) => {
          if (!isStreamActive) return;
          
          try {
            if (controller.desiredSize === null) {
              logger.sse.debug('OAuth analytics stream controller closed during analytics send, stopping stream');
              isStreamActive = false;
              return;
            }
            
            const data = `data: ${JSON.stringify(analytics)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorName = error instanceof Error ? error.name : 'Error';
            logger.sse.error('Failed to send OAuth analytics to SSE analytics stream - client disconnected', { 
              error: errorMessage,
              errorType: errorName,
              analyticsData: analytics ? 'present' : 'null',
              streamActive: isStreamActive,
              action: 'Marking stream as inactive'
            });
            isStreamActive = false;
          }
        });

        // Send keepalive every 30 seconds
        const keepAliveInterval = setInterval(() => {
          if (!isStreamActive) {
            clearInterval(keepAliveInterval);
            return;
          }
          
          try {
            // Check if controller is still open - desiredSize is null when closed
            if (controller.desiredSize === null) {
              logger.sse.info('OAuth analytics stream controller closed, stopping keepalive');
              isStreamActive = false;
              clearInterval(keepAliveInterval);
              unsubscribe();
              return;
            }
            
            const keepAlive = `data: ${JSON.stringify({ 
              type: 'keepalive', 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorName = error instanceof Error ? error.name : 'Error';
            logger.sse.debug('SSE analytics stream keepalive failed - client disconnected, cleaning up', { 
              error: errorMessage,
              errorType: errorName,
              streamActive: isStreamActive
            });
            isStreamActive = false;
            clearInterval(keepAliveInterval);
            unsubscribe();
            try {
              controller.close();
            } catch {
              // Controller might already be closed, ignore
            }
          }
        }, 30000);

        // Handle stream closure
        return () => {
          logger.sse.info('OAuth analytics SSE stream closed');
          isStreamActive = false;
          clearInterval(keepAliveInterval);
          unsubscribe();
        };
      }
    });

    return new Response(stream);
  }, {
    query: t.Object({
      token: t.Optional(t.String({ description: 'Bearer token for authentication (since EventSource cannot send custom headers)' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: {
      200: StreamResponse,
      400: CommonErrorResponses[400],
      401: CommonErrorResponses[401],
      500: CommonErrorResponses[500]
    },
    detail: {
      summary: 'OAuth Analytics Stream',
      description: 'Server-sent events stream for real-time OAuth analytics updates. Token can be passed as query parameter or Authorization header.',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get recent OAuth events with filtering
  .get('/events', async ({ query, headers, set }): Promise<OAuthEventsResponseType> => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const options = {
      limit: query.limit ? parseInt(query.limit) : 100,
      type: query.type !== 'all' ? query.type : undefined,
      status: query.status !== 'all' ? query.status : undefined,
      clientId: query.clientId,
      since: query.since ? new Date(query.since) : undefined
    };

    const events = oauthMetricsLogger.getRecentEvents(options);
    
    return {
      events,
      total: events.length,
      timestamp: new Date().toISOString()
    };
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ description: 'Maximum number of events to return' })),
      type: t.Optional(t.String({ description: 'Filter by event type' })),
      status: t.Optional(t.String({ description: 'Filter by event status' })),
      clientId: t.Optional(t.String({ description: 'Filter by client ID' })),
      since: t.Optional(t.String({ description: 'Filter events since this timestamp' }))
    }),
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: {
      200: OAuthEventsResponse,
      400: CommonErrorResponses[400],
      401: CommonErrorResponses[401],
      500: CommonErrorResponses[500]
    },
    detail: {
      summary: 'Get OAuth Events',
      description: 'Retrieve recent OAuth events with optional filtering',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get current OAuth analytics
  .get('/analytics', async ({ headers, set }): Promise<OAuthAnalyticsResponseType> => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const analytics = oauthMetricsLogger.getAnalytics();
    
    if (!analytics) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        activeTokens: 0,
        topClients: [],
        flowsByType: {},
        errorsByType: {},
        hourlyStats: [],
        timestamp: new Date().toISOString(),
        predictiveInsights: undefined,
        weekdayInsights: undefined
      };
    }

    const totalRequests = analytics.totalFlows || 0;
    const successfulRequests = Math.round(totalRequests * ((analytics.successRate || 0) / 100));
    const failedRequests = totalRequests - successfulRequests;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: analytics.successRate || 0,
      averageResponseTime: analytics.averageResponseTime || 0,
      activeTokens: analytics.activeTokens || 0,
      topClients: analytics.topClients || [],
      flowsByType: analytics.flowsByType || {},
      errorsByType: analytics.errorsByType || {},
      hourlyStats: analytics.hourlyStats || [],
      timestamp: new Date().toISOString(),
      predictiveInsights: analytics.predictiveInsights ?? undefined,
      weekdayInsights: analytics.weekdayInsights ?? undefined
    };
  }, {
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: {
      200: OAuthAnalyticsResponse,
      400: CommonErrorResponses[400],
      401: CommonErrorResponses[401],
      500: CommonErrorResponses[500]
    },
    detail: {
      summary: 'Get OAuth Analytics',
      description: 'Get current OAuth analytics and metrics',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Get system health metrics
  .get('/health', async ({ headers, set }): Promise<MonitoringHealthResponseType> => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const analytics = oauthMetricsLogger.getAnalytics();
    const storagePercent = Math.round(
      (oauthMetricsLogger.getEventCount() / oauthMetricsLogger.getEventCapacity()) * 100
    );
    const throughput = oauthMetricsLogger.getThroughputPerMinute();
    
    const alerts: Array<{ type: string; message: string }> = [];

    if (analytics && analytics.averageResponseTime > 500) {
      alerts.push({
        type: 'warning',
        message: `High response time detected on authorization endpoint (avg ${analytics.averageResponseTime.toFixed(0)}ms)`,
      });
    }

    if (storagePercent >= 70) {
      alerts.push({
        type: 'info',
        message: `Token storage is at ${storagePercent}% capacity. Consider cleanup or expansion.`,
      });
    }

    return {
      oauthServer: {
        status: 'healthy',
        uptime: process.uptime(),
        responseTime: analytics?.averageResponseTime || 0,
      },
      tokenStore: {
        status: 'healthy',
        activeTokens: analytics?.activeTokens || 0,
        storageUsed: storagePercent,
      },
      network: {
        status: 'healthy',
        throughput,
        errorRate: analytics ? (100 - analytics.successRate) : 0,
      },
      alerts,
      timestamp: new Date().toISOString()
    };
  }, {
    headers: t.Object({
      authorization: t.Optional(t.String({ description: 'Bearer token' }))
    }),
    response: {
      200: MonitoringHealthResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get System Health',
      description: 'Get OAuth system health metrics and alerts',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Export analytics data as downloadable file
  .get('/analytics/export', async ({ set, headers }): Promise<ExportResponseType> => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      // Get current analytics from the metrics logger
      const analytics = oauthMetricsLogger.getAnalytics();
      
      if (!analytics) {
        set.status = 404;
        throw new Error('No analytics data available');
      }

      // Set headers for file download
      set.headers['Content-Type'] = 'application/json';
      set.headers['Content-Disposition'] = `attachment; filename="oauth-analytics-${new Date().toISOString().split('T')[0]}.json"`;

      // Return the analytics data
      return {
        format: 'json',
        data: analytics
      };
    } catch (error) {
      logger.auth.error('Failed to export OAuth analytics', { error });
      set.status = 500;
      throw new Error('Failed to export analytics data', { cause: error });
    }
  }, {
    headers: t.Object({
      authorization: t.String({ description: 'Bearer token' })
    }),
    response: {
      200: ExportResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Export Analytics Data',
      description: 'Download current OAuth analytics data as JSON file',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  })

  // Export events data as downloadable file
  .get('/events/export', async ({ set, headers }): Promise<string> => {
    // Validate authentication
    if (!headers.authorization) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const token = headers.authorization.replace('Bearer ', '');
      await validateToken(token);
    } catch {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Path to the events log file
      const eventsLogPath = path.join(process.cwd(), 'logs', 'oauth-metrics', 'oauth-events.jsonl');
      
      try {
        // Check if file exists and read it
        await fs.access(eventsLogPath);
        const eventsData = await fs.readFile(eventsLogPath, 'utf-8');
        
        // Set headers for file download
        set.headers['Content-Type'] = 'application/x-jsonlines';
        set.headers['Content-Disposition'] = `attachment; filename="oauth-events-${new Date().toISOString().split('T')[0]}.jsonl"`;

        // Return the raw JSONL data
        return eventsData;
      } catch {
        // If file doesn't exist, return empty response
        set.headers['Content-Type'] = 'application/x-jsonlines';
        set.headers['Content-Disposition'] = `attachment; filename="oauth-events-${new Date().toISOString().split('T')[0]}.jsonl"`;
        
        return '';
      }
    } catch (error) {
      logger.auth.error('Failed to export OAuth events', { error });
      set.status = 500;
      throw new Error('Failed to export events data', { cause: error });
    }
  }, {
    headers: t.Object({
      authorization: t.String({ description: 'Bearer token' })
    }),
    response: {
      200: t.String(),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Export Events Data',
      description: 'Download OAuth events log as JSONL file',
      tags: ['oauth-monitoring'],
      security: [{ BearerAuth: [] }]
    }
  });
