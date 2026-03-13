import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Timer, 
  AlertTriangle, 
  Play, 
  Pause, 
  Download, 
  Search,
  Server,
  Database,
  CalendarDays,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { oauthWebSocketService, type OAuthAnalytics, type OAuthEventSimple, type WeekdayInsight } from '../service/oauth-websocket-service';
import { oauthMonitoringService } from '../service/oauth-monitoring-service';
import { getItem } from '../lib/storage';
import { config } from '@/config';
import type { OAuthAnalyticsTopClient } from '../lib/api-client/models/OAuthAnalyticsTopClient';
import type { SystemStatusResponse } from '../lib/api-client/models/SystemStatusResponse';
import type { AccessHealthResponse } from '../lib/api-client/models/AccessHealthResponse';
import type { AccessEvent } from '../lib/api-client/models/AccessEvent';
import type { FhirUptimeSummary } from '../lib/api-client/models/FhirUptimeSummary';
import { createServerApi, createAdminApi, createFhirMonitoringApi } from '../lib/apiClient';
import { EventsPanel } from './DoorManagement/EventsPanel';

type PieClientDatum = OAuthAnalyticsTopClient & Record<string, unknown>;

export function OAuthMonitoringDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<OAuthEventSimple[]>([]);
  const [analytics, setAnalytics] = useState<OAuthAnalytics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [doorHealth, setDoorHealth] = useState<AccessHealthResponse | null>(null);
  const [doorEvents, setDoorEvents] = useState<AccessEvent[]>([]);
  const [fhirUptime, setFhirUptime] = useState<FhirUptimeSummary[]>([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'sse'>('websocket');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Track whether this is the initial data load
  const isInitialLoadRef = useRef(true);
  // Track the current real-time state so handlers can access the latest value
  const isRealTimeActiveRef = useRef(isRealTimeActive);

  // Update ref whenever the state changes
  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  const clientDistributionData = useMemo<PieClientDatum[]>(() => {
    if (!analytics?.topClients?.length) {
      return [];
    }

    return analytics.topClients.map((client) => ({
      ...client,
      name: client.clientName
    }));
  }, [analytics?.topClients]);
  const hasClientDistribution = clientDistributionData.length > 0;
  const predictiveInsights = analytics?.predictiveInsights;
  const hasObservedTraffic = (analytics?.successfulRequests ?? 0) + (analytics?.failedRequests ?? 0) > 0;
  const hasPredictiveForecast = Boolean(
    predictiveInsights &&
    (
      hasObservedTraffic ||
      (analytics?.totalRequests ?? 0) > 0 ||
      (analytics?.activeTokens ?? 0) > 0 ||
      (analytics?.successRate ?? 0) > 0 ||
      predictiveInsights.nextHour.totalFlows > 0
    )
  );
  const weekdayHighlights = useMemo(() => {
    const insights = analytics?.weekdayInsights ?? [];

    if (!insights.length) {
      return null;
    }

    const summary = insights.reduce((acc, insight) => {
      if (!acc.busiest || insight.projectedTotal > acc.busiest.projectedTotal) {
        acc.busiest = insight;
      }
      if (!acc.highestSuccess || insight.projectedSuccessRate > acc.highestSuccess.projectedSuccessRate) {
        acc.highestSuccess = insight;
      }
      if (!acc.attention || insight.projectedSuccessRate < acc.attention.projectedSuccessRate) {
        acc.attention = insight;
      }
      if (insight.lastObserved) {
        const observedTs = new Date(insight.lastObserved).getTime();
        if (!Number.isNaN(observedTs) && (!acc.latestObserved || observedTs > acc.latestObserved.ts)) {
          acc.latestObserved = { ts: observedTs, iso: insight.lastObserved };
        }
      }
      return acc;
    }, {
      busiest: undefined as WeekdayInsight | undefined,
      highestSuccess: undefined as WeekdayInsight | undefined,
      attention: undefined as WeekdayInsight | undefined,
      latestObserved: undefined as { ts: number; iso: string } | undefined
    });

    if (!summary.busiest || !summary.highestSuccess || !summary.attention) {
      return null;
    }

    return {
      busiest: summary.busiest,
      highestSuccess: summary.highestSuccess,
      attention: summary.attention,
      lastObserved: summary.latestObserved?.iso
    };
  }, [analytics?.weekdayInsights]);
  const weekdayLastObservedLabel = useMemo(() => {
    if (!weekdayHighlights?.lastObserved) {
      return null;
    }

    try {
      return format(new Date(weekdayHighlights.lastObserved), 'MMM dd, HH:mm');
    } catch {
      return weekdayHighlights.lastObserved;
    }
  }, [weekdayHighlights]);
  const predictiveRiskBadgeClass = useMemo(() => {
    switch (predictiveInsights?.anomalyRisk) {
      case 'high':
        return 'bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-green-500/15 text-green-800 dark:text-green-300 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }, [predictiveInsights?.anomalyRisk]);
  const predictiveTrendLabel = useMemo(() => {
    switch (predictiveInsights?.trendDirection) {
      case 'increasing':
        return t('Increasing');
      case 'decreasing':
        return t('Decreasing');
      case 'stable':
      default:
        return t('Stable');
    }
  }, [predictiveInsights?.trendDirection, t]);
  const predictiveRiskLabel = useMemo(() => {
    switch (predictiveInsights?.anomalyRisk) {
      case 'high':
        return t('Risk: High');
      case 'medium':
        return t('Risk: Medium');
      case 'low':
        return t('Risk: Low');
      default:
        return t('Risk: Unknown');
    }
  }, [predictiveInsights?.anomalyRisk, t]);

  // Load initial data
  const loadInitialData = useCallback(async (forceMode?: 'websocket' | 'sse') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Always disconnect first to ensure clean state
      if (oauthWebSocketService.isConnected) {
        oauthWebSocketService.disconnect();
        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Connect using the specified or preferred mode
      const targetMode = forceMode || connectionMode;
      await oauthWebSocketService.connectWithMode(targetMode === 'websocket' ? 'websocket' : 'sse');
      
      // Wait a bit to ensure connection is fully stable
      await new Promise(resolve => setTimeout(resolve, 100));
     
      try {
        await oauthWebSocketService.authenticate();
        
        // Set up event handlers BEFORE subscribing
        if (oauthWebSocketService.isUsingSSE) {
          // For SSE mode, data comes through update handlers, not initial data handlers
          console.info('Using SSE mode for OAuth monitoring');
          
          // In SSE mode, we need to fetch initial data via API and then use update handlers
          try {
            const initialEventsResponse = await oauthMonitoringService.getEvents({ limit: 100 });
            const initialAnalyticsResponse = await oauthMonitoringService.getAnalytics();
            
            // Convert API response types to WebSocket service types
            const convertedEvents: OAuthEventSimple[] = (initialEventsResponse.events || []).map(event => ({
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
            }));
            
            const convertedAnalytics: OAuthAnalytics = {
              totalRequests: initialAnalyticsResponse.totalRequests || 0,
              successfulRequests: initialAnalyticsResponse.successfulRequests || 0,
              failedRequests: initialAnalyticsResponse.failedRequests || 0,
              successRate: initialAnalyticsResponse.successRate || 0,
              averageResponseTime: initialAnalyticsResponse.averageResponseTime || 0,
              activeTokens: initialAnalyticsResponse.activeTokens || 0,
              topClients: initialAnalyticsResponse.topClients || [],
              flowsByType: (initialAnalyticsResponse.flowsByType as Record<string, number>) || {},
              errorsByType: (initialAnalyticsResponse.errorsByType as Record<string, number>) || {},
              hourlyStats: initialAnalyticsResponse.hourlyStats || [],
              timestamp: initialAnalyticsResponse.timestamp || new Date().toISOString(),
              predictiveInsights: (initialAnalyticsResponse as OAuthAnalytics).predictiveInsights,
              weekdayInsights: (initialAnalyticsResponse as OAuthAnalytics).weekdayInsights
            };
            
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(convertedEvents);
              setAnalytics(convertedAnalytics);
            }
          } catch (apiError) {
            console.warn('Failed to fetch initial data via API for SSE mode:', apiError);
            // Continue anyway, real-time updates will start flowing
          }
        } else {
          // For WebSocket mode, use the initial data handlers
          oauthWebSocketService.onEventsData((eventList) => {
            // Only update state if this is the initial load OR if real-time is active
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(eventList);
            }
          });

          oauthWebSocketService.onAnalyticsData((analyticsData) => {
            // Only update state if this is the initial load OR if real-time is active
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setAnalytics(analyticsData);
            }
          });
        }

        oauthWebSocketService.onError((errorMsg) => {
          setError(errorMsg);
        });

        // Subscribe to real-time data
        await oauthWebSocketService.subscribe('events');
        await oauthWebSocketService.subscribe('analytics');

        // Mark that initial load is complete
        isInitialLoadRef.current = false;

      } catch {
        setError('Connected but not authenticated. Please log in to view OAuth monitoring data.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to monitoring service');
    } finally {
      setIsLoading(false);
    }
  }, [connectionMode]);

  // Setup real-time subscriptions
  useEffect(() => {
    let eventsUnsubscribe: (() => void) | undefined;
    let analyticsUnsubscribe: (() => void) | undefined;

    if (isRealTimeActive) {
      // Subscribe to real-time events via WebSocket
      eventsUnsubscribe = oauthWebSocketService.onEventsUpdate((event: OAuthEventSimple) => {
        setEvents(prev => [event, ...prev.slice(0, 999)]); // Keep last 1000 events
      });

      // Subscribe to analytics updates via WebSocket
      analyticsUnsubscribe = oauthWebSocketService.onAnalyticsUpdate((newAnalytics: OAuthAnalytics) => {
        setAnalytics(newAnalytics);
      });
    } else {
      console.info('Real-time updates are PAUSED');
    }

    // Cleanup function
    return () => {
      if (eventsUnsubscribe) {
        eventsUnsubscribe();
      }
      if (analyticsUnsubscribe) {
        analyticsUnsubscribe();
      }
    };
  }, [isRealTimeActive]);

  // Load initial data on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeConnection = async () => {
      if (isMounted) {
        await loadInitialData();
      }
    };
    
    initializeConnection();
    
    return () => {
      isMounted = false;
    };
  }, [loadInitialData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oauthWebSocketService.isConnected) {
        oauthWebSocketService.disconnect();
      }
    };
  }, []);

  // Fetch system status for System Health tab
  const fetchSystemStatus = useCallback(async () => {
    try {
      const token = (await getItem<{access_token: string}>('openid_tokens'))?.access_token;
      const serverApi = createServerApi(token ?? undefined);
      const adminApi = createAdminApi(token ?? undefined);
      const fhirMonApi = createFhirMonitoringApi(token ?? undefined);
      const [status, acHealth, acEvents, fhirSummaries] = await Promise.allSettled([
        serverApi.getStatus(),
        adminApi.getAdminAccessControlHealth(),
        adminApi.getAdminAccessControlEvents({ limit: 5 }),
        fhirMonApi.getMonitoringFhirSummaries(),
      ]);
      if (status.status === 'fulfilled') setSystemStatus(status.value);
      if (acHealth.status === 'fulfilled') setDoorHealth(acHealth.value);
      if (acEvents.status === 'fulfilled') setDoorEvents(acEvents.value.data ?? []);
      if (fhirSummaries.status === 'fulfilled') setFhirUptime(fhirSummaries.value.servers ?? []);
    } catch (err) {
      console.warn('Failed to fetch system status:', err);
    }
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

  // SSE subscription for real-time FHIR uptime summaries
  useEffect(() => {
    let es: EventSource | null = null;
    const connect = async () => {
      const token = (await getItem<{access_token: string}>('openid_tokens'))?.access_token;
      if (!token) return;
      const baseUrl = config.api.baseUrl;
      es = new EventSource(`${baseUrl}/monitoring/fhir/summaries/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'keepalive' || data.type === 'connection') return;
          if (Array.isArray(data)) setFhirUptime(data);
        } catch { /* ignore parse errors */ }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        // Reconnect after 10s
        setTimeout(() => connect(), 10_000);
      };
    };
    connect();
    return () => { es?.close(); };
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const refreshData = async () => {
    // Reset the initial load flag when manually refreshing
    isInitialLoadRef.current = true;
    await loadInitialData();
  };

  const toggleRealTime = () => {
    setIsRealTimeActive(!isRealTimeActive);
  };

  const switchConnectionMode = async (newMode: 'websocket' | 'sse') => {
    if (newMode === connectionMode) return;
    
    setConnectionMode(newMode);
    // Reset the initial load flag when switching connection modes
    isInitialLoadRef.current = true;
    // Reconnect with the new mode
    await loadInitialData(newMode);
  };

  const exportAnalytics = async () => {
    try {
      // Get the current analytics data
      const currentAnalytics = analytics;
      
      if (!currentAnalytics) {
        setError('No analytics data available to export');
        return;
      }

      // Create export data with timestamp
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportType: 'oauth-analytics',
        source: 'dashboard-current-state',
        data: currentAnalytics,
        metadata: {
          totalEvents: events.length,
          connectionMode: oauthWebSocketService.connectionMode,
          realTimeActive: isRealTimeActive
        }
      };

      // Create and download the file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oauth-analytics-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics data');
    }
  };

  const exportServerEvents = async () => {
    try {
      // Get token from encrypted storage
      const tokenData = await getItem<{access_token: string}>('openid_tokens');
      let accessToken = '';
      
      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
      }
      
      if (!accessToken) {
        setError('No authentication token available for server export. Please log in.');
        return;
      }

      // NOTE: Using fetch for now - will switch to API client once events export endpoint is regenerated
      const response = await fetch(`${config.api.baseUrl}/monitoring/oauth/events/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/x-jsonlines'
        }
      });

      if (!response.ok) {
        throw new Error(`Events export failed: ${response.statusText}`);
      }

      // Get the filename from response headers or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `oauth-events-${new Date().toISOString().split('T')[0]}.jsonl`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export server events data');
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
                         event.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('Loading OAuth monitoring data...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('Failed to Load OAuth Monitoring Data')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Try Again')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Enhanced Header Section */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('OAuth Flow Monitoring')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              {t('Real-time monitoring and analytics for OAuth 2.0 flows')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isRealTimeActive ? "default" : "outline"}
              onClick={toggleRealTime}
            >
              {isRealTimeActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRealTimeActive ? t('Pause') : t('Resume')} {t('Real-time')}
            </Button>
            <Button
              variant="outline"
              onClick={refreshData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Refresh')}
            </Button>
            <div className="relative export-menu-container">
              <Button
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('Export')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-background border border-border rounded-2xl shadow-xl z-50">
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        exportAnalytics();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left justify-start h-auto px-4 py-3 rounded-xl"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{t('Export Current Data')}</div>
                        <div className="text-sm text-muted-foreground">{t('Download current dashboard analytics')}</div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        exportServerEvents();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left justify-start h-auto px-4 py-3 rounded-xl"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{t('Export Server Events')}</div>
                        <div className="text-sm text-muted-foreground">{t('Download events log from server')}</div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      {isRealTimeActive ? (
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                <Activity className="h-5 w-5 text-green-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-1">
                  {t('Real-time Monitoring Active')}
                </h3>
                <p className="text-green-800 dark:text-green-400 font-medium">
                  {t('OAuth events are pushed in real time as they occur.')}
                </p>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <div className="text-sm text-green-700 dark:text-green-400 mb-2">Connection Mode</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={connectionMode === 'websocket' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('websocket')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'websocket' 
                        ? 'bg-green-500/30 hover:bg-green-500/40 text-green-900 dark:text-green-100 border-green-500/50 font-semibold shadow-sm' 
                        : 'bg-green-500/10 hover:bg-green-500/15 text-green-700/70 dark:text-green-400/70 border-green-500/20 font-medium'
                    }`}
                  >
                    WebSocket
                  </Button>
                  <Button
                    variant={connectionMode === 'sse' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('sse')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'sse' 
                        ? 'bg-green-500/30 hover:bg-green-500/40 text-green-900 dark:text-green-100 border-green-500/50 font-semibold shadow-sm' 
                        : 'bg-green-500/10 hover:bg-green-500/15 text-green-700/70 dark:text-green-400/70 border-green-500/20 font-medium'
                    }`}
                  >
                    SSE
                  </Button>
                </div>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fallback to SSE (WebSocket failed)
                  </div>
                )}
              </div>
              <div>
                <Badge className="bg-green-500/20 text-green-800 dark:text-green-300 border-green-500/30 font-semibold">
                  {oauthWebSocketService.connectionMode === 'websocket' ? 'WebSocket Active' : 
                   oauthWebSocketService.connectionMode === 'sse' ? 'SSE Active' : 
                   'Disconnected'}
                </Badge>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold mt-1">
                    Auto-fallback
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                <Pause className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-1">
                  {t('Real-time Monitoring Paused')}
                </h3>
                <p className="text-orange-800 dark:text-orange-400 font-medium">
                  {t('Real-time updates are paused. Click Resume to continue monitoring.')}
                </p>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div>
                <div className="text-sm text-orange-700 dark:text-orange-400 mb-2">Connection Mode</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={connectionMode === 'websocket' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('websocket')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'websocket' 
                        ? 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-900 dark:text-orange-100 border-orange-500/50 font-semibold shadow-sm' 
                        : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-700/70 dark:text-orange-400/70 border-orange-500/20 font-medium'
                    }`}
                  >
                    WebSocket
                  </Button>
                  <Button
                    variant={connectionMode === 'sse' ? "default" : "ghost"}
                    onClick={() => switchConnectionMode('sse')}
                    size="sm"
                    className={`text-xs px-3 py-1 h-8 border transition-all ${
                      connectionMode === 'sse' 
                        ? 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-900 dark:text-orange-100 border-orange-500/50 font-semibold shadow-sm' 
                        : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-700/70 dark:text-orange-400/70 border-orange-500/20 font-medium'
                    }`}
                  >
                    SSE
                  </Button>
                </div>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fallback to SSE (WebSocket failed)
                  </div>
                )}
              </div>
              <div>
                <Badge className="bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold">
                  Paused ({oauthWebSocketService.connectionMode === 'websocket' ? 'WebSocket' : 
                          oauthWebSocketService.connectionMode === 'sse' ? 'SSE' : 'Disconnected'})
                </Badge>
                {oauthWebSocketService.isUsingSSE && connectionMode === 'websocket' && (
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold mt-1">
                    Auto-fallback
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('OAuth Analytics Dashboard')}</h3>
              <p className="text-muted-foreground font-medium">{t('Monitor OAuth flows, tokens, and system performance')}</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-t-2xl">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('OAuth Flows')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="door-access" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Door Access')}</TabsTrigger>
              <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('System Health')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <BarChart3 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-primary tracking-wide">{t('Total Requests')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-2">{analytics?.totalRequests ? analytics.totalRequests.toLocaleString() : '0'}</div>
                      <p className="text-sm text-muted-foreground font-medium">{t('Last 24 hours')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">{t('Success Rate')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-300 mb-2">
                        {analytics?.successRate ? analytics.successRate.toFixed(1) : '0.0'}%
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        {t('Current success rate')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <Timer className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">{t('Avg Response Time')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-orange-900 dark:text-orange-300 mb-2">
                        {analytics?.averageResponseTime ? analytics.averageResponseTime.toFixed(0) : '0'}ms
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                        {t('Average response time')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">{t('Active Tokens')}</h3>
                      </div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-2">{analytics?.activeTokens ?? 0}</div>
                      <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">{t('Currently valid')}</p>
                    </div>
                  </div>
                </div>

                {hasPredictiveForecast && predictiveInsights && (
                  <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                        <TrendingUp className="w-6 h-6 text-sky-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-300 tracking-wide">{t('Predictive Forecast')}</h3>
                    </div>
                    <div className="text-3xl font-bold text-sky-900 dark:text-sky-200 mb-1">
                      {predictiveInsights.nextHour.totalFlows.toLocaleString()}
                    </div>
                    <p className="text-sm text-sky-700 dark:text-sky-300 font-medium mb-4">
                      {t('Projected OAuth flows in the next hour')}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground font-medium">{t('Success rate')}</p>
                        <p className="text-foreground font-semibold">{predictiveInsights.nextHour.successRate.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground font-medium">{t('Trend')}</p>
                        <p className="text-foreground font-semibold">{predictiveTrendLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-sky-500/10 p-3">
                      <Badge className={`${predictiveRiskBadgeClass} font-semibold shrink-0`}>{predictiveRiskLabel}</Badge>
                      <p className="text-xs text-muted-foreground leading-snug text-right">
                        {predictiveInsights.anomalyReasons[0]}
                      </p>
                    </div>
                  </div>
                )}

                {weekdayHighlights && (
                  <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                        <CalendarDays className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 tracking-wide">{t('Weekday Patterns')}</h3>
                    </div>
                    <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-1">
                      {weekdayHighlights.busiest.label}
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-4">
                      {t('Projected busiest day for OAuth volume')}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground font-medium">{t('Highest success')}</p>
                        <p className="text-foreground font-semibold mt-1">{weekdayHighlights.highestSuccess.label}</p>
                        <p className="text-muted-foreground text-xs">{weekdayHighlights.highestSuccess.projectedSuccessRate.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground font-medium">{t('Watchlist')}</p>
                        <p className="text-foreground font-semibold mt-1">{weekdayHighlights.attention.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {weekdayHighlights.attention.projectedErrorRate.toFixed(1)}%
                          {typeof weekdayHighlights.attention.deltaFromAverage === 'number' && (
                            <span className={`ml-1 ${weekdayHighlights.attention.deltaFromAverage > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              ({weekdayHighlights.attention.deltaFromAverage > 0 ? '+' : ''}{weekdayHighlights.attention.deltaFromAverage.toFixed(1)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="secondary" className="bg-white/40 dark:bg-black/30 text-foreground border border-white/40 dark:border-white/20">
                        {weekdayHighlights.busiest.sampleDays} {t('days sampled')}
                      </Badge>
                      {weekdayLastObservedLabel && (
                        <span>{t('Last observed')} · {weekdayLastObservedLabel}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Flow Activity (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth flows over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {/* TODO: hourlyStats not available in current API response */}
                    {analytics?.hourlyStats && analytics.hourlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.hourlyStats}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => format(new Date(hour), 'HH:mm')}
                            minTickGap={20}
                            className="text-muted-foreground"
                          />
                          <YAxis allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(hour) => format(new Date(hour), 'PPpp')}
                            formatter={(value) => [value ?? 0, t('flows')]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                            activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium">{t('No flow activity data available')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Top Applications')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Most active OAuth clients')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {analytics?.topClients && analytics.topClients.length > 0 ? (
                      analytics.topClients.map((client, index) => (
                        <div key={client.clientId} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{client.clientName}</p>
                              <p className="text-sm text-muted-foreground font-medium">{client.count} {t('flows')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={client.successRate > 95 ? "bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20" : "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20"}>
                              {client.successRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p>{t('No client activity data available')}</p>
                        <p className="text-sm mt-2">{t('OAuth client statistics will appear here once data is collected')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flows" className="space-y-6">
              {/* Filters */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Filter OAuth Flows')}</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Type:')}</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Types')}</SelectItem>
                        <SelectItem value="authorization">{t('Authorization')}</SelectItem>
                        <SelectItem value="token">{t('Token')}</SelectItem>
                        <SelectItem value="refresh">{t('Refresh')}</SelectItem>
                        <SelectItem value="error">{t('Error')}</SelectItem>
                        <SelectItem value="revoke">{t('Revoke')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Status:')}</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                        <SelectItem value="success">{t('Success')}</SelectItem>
                        <SelectItem value="error">{t('Error')}</SelectItem>
                        <SelectItem value="warning">{t('Warning')}</SelectItem>
                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('Search by client or user...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="min-w-[200px]"
                    />
                  </div>
                </div>
              </div>

              {/* Events List - Simplified for brevity */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Recent OAuth Events')}</h4>
                    <p className="text-muted-foreground font-medium">
                      {t('Showing {{count}} of {{total}} events', { 
                        count: filteredEvents.length, 
                        total: events.length 
                      })}
                    </p>
                  </div>
                </div>
                {filteredEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>{t('Time')}</TableHead>
                          <TableHead>{t('Type')}</TableHead>
                          <TableHead>{t('Client')}</TableHead>
                          <TableHead>{t('Status')}</TableHead>
                          <TableHead>{t('Details')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.slice(0, 50).map((event, index) => (
                          <TableRow key={event.id || index}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {event.type || t('Unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {event.clientName || event.clientId || t('Unknown')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  event.status === 'success'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                    : event.status === 'error'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                }
                              >
                                {event.status || t('Unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {event.errorMessage || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredEvents.length > 50 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">{t('Showing first 50 events of {{total}}', { total: filteredEvents.length })}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">{t('No events match your filters')}</p>
                    <p className="text-sm mt-2">{t('Try adjusting your filter criteria')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className={`grid grid-cols-1 ${predictiveInsights ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                {/* Success Rate Chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Success Rate')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth flow success over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {/* TODO: hourlyStats not available in current API response */}
                    {analytics?.hourlyStats && analytics.hourlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.hourlyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(hour) => format(new Date(hour), 'HH:mm')}
                            className="text-muted-foreground"
                          />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(hour) => format(new Date(hour), 'PPpp')}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="success" fill="hsl(var(--primary))" />
                          <Bar dataKey="error" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No success rate data available')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Distribution Pie Chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Client Distribution')}</h4>
                      <p className="text-muted-foreground font-medium">{t('OAuth clients by usage')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {hasClientDistribution ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clientDistributionData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="hsl(var(--primary))"
                            dataKey="count"
                            label={({ payload }) => `${payload?.clientName}: ${payload?.count}`}
                          >
                            {clientDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No client distribution data available')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {predictiveInsights && (
                  <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                        <Activity className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Predictive Insights')}</h4>
                        <p className="text-muted-foreground font-medium">{t('Early warning indicators for OAuth reliability')}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">{t('Forecast generated')}</span>
                        <span className="text-foreground font-semibold">
                          {format(new Date(predictiveInsights.generatedAt), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">{t('Confidence')}</span>
                        <span className="text-foreground font-semibold">{Math.round(predictiveInsights.trendConfidence * 100)}%</span>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-2">{t('Key signals')}</p>
                        <ul className="space-y-2 text-sm">
                          {predictiveInsights.anomalyReasons.slice(0, 3).map((reason, idx) => (
                            <li key={`insight-reason-${idx}`} className="flex items-start gap-2">
                              <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden />
                              <span className="text-foreground leading-relaxed">{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {predictiveInsights.notes && (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-900 dark:text-sky-200">
                          <p className="font-semibold mb-1">{t('Recommended action')}</p>
                          <p className="leading-relaxed">{predictiveInsights.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="door-access" className="space-y-6">
              <EventsPanel />
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              {/* Overall status banner */}
              <div className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between ${
                systemStatus?.overall === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
                systemStatus?.overall === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
                systemStatus?.overall === 'unhealthy' ? 'bg-red-500/10 border-red-500/30' :
                'bg-card/70 border-border'
              }`}>
                <div className="flex items-center gap-3">
                  {systemStatus?.overall === 'healthy' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {systemStatus?.overall === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  {systemStatus?.overall === 'unhealthy' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {!systemStatus && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold text-foreground">
                      {systemStatus ? t(systemStatus.overall.charAt(0).toUpperCase() + systemStatus.overall.slice(1)) : t('Loading...')}
                    </p>
                    {systemStatus && (
                      <p className="text-xs text-muted-foreground">
                        v{systemStatus.version} · {t('Uptime')}: {Math.floor(systemStatus.uptime / 3600)}{t('h')} {Math.floor((systemStatus.uptime % 3600) / 60)}{t('m')}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchSystemStatus}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Keycloak */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Keycloak')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={
                        systemStatus?.keycloak?.status === 'healthy'
                          ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                          : systemStatus?.keycloak?.status === 'degraded'
                          ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                          : systemStatus?.keycloak
                          ? 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                          : 'bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20'
                      }>
                        {systemStatus?.keycloak?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {systemStatus?.keycloak?.status === 'degraded' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {systemStatus?.keycloak?.status === 'unhealthy' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {!systemStatus?.keycloak && <AlertCircle className="w-3 h-3 mr-1" />}
                        {systemStatus?.keycloak?.status
                          ? t(systemStatus.keycloak.status.charAt(0).toUpperCase() + systemStatus.keycloak.status.slice(1))
                          : t('Unknown')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Realm')}</span>
                      <span className="font-bold text-foreground">{systemStatus?.keycloak?.realm ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Accessible')}</span>
                      <span className="font-bold text-foreground">{systemStatus?.keycloak?.accessible ? t('Yes') : t('No')}</span>
                    </div>
                    {systemStatus?.keycloak?.lastConnected && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">{t('Last Connected')}</span>
                        <span className="text-xs text-muted-foreground">
                          {(() => { try { return format(new Date(systemStatus.keycloak.lastConnected), 'MMM dd, HH:mm'); } catch { return systemStatus.keycloak.lastConnected; } })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* FHIR Servers */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Server className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('FHIR Servers')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={
                        systemStatus?.fhir?.status === 'healthy'
                          ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                          : systemStatus?.fhir?.status === 'degraded'
                          ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                          : systemStatus?.fhir
                          ? 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                          : 'bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20'
                      }>
                        {systemStatus?.fhir?.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {systemStatus?.fhir?.status === 'degraded' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {systemStatus?.fhir?.status === 'unhealthy' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {!systemStatus?.fhir && <AlertCircle className="w-3 h-3 mr-1" />}
                        {systemStatus?.fhir?.status
                          ? t(systemStatus.fhir.status.charAt(0).toUpperCase() + systemStatus.fhir.status.slice(1))
                          : t('Unknown')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Servers')}</span>
                      <span className="font-bold text-foreground">
                        {systemStatus?.fhir ? `${systemStatus.fhir.healthyServers}/${systemStatus.fhir.totalServers} ${t('healthy')}` : 'N/A'}
                      </span>
                    </div>
                    {systemStatus?.fhir?.servers?.map((server, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground truncate max-w-[60%]" title={server.url}>{server.name}</span>
                        <Badge variant="secondary" className={
                          server.status === 'healthy' ? 'bg-green-500/10 text-green-700 dark:text-green-300' :
                          server.status === 'degraded' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' :
                          'bg-red-500/10 text-red-700 dark:text-red-300'
                        }>
                          {server.version ?? 'N/A'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Memory */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Database className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Memory')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Heap Used')}</span>
                      <span className="font-bold text-foreground">
                        {systemStatus?.memory ? `${systemStatus.memory.used} MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Heap Total')}</span>
                      <span className="font-bold text-foreground">
                        {systemStatus?.memory ? `${systemStatus.memory.total} MB` : 'N/A'}
                      </span>
                    </div>
                    {systemStatus?.memory && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t('Usage')}</span>
                          <span>{Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (systemStatus.memory.used / systemStatus.memory.total) > 0.85 ? 'bg-red-500' :
                              (systemStatus.memory.used / systemStatus.memory.total) > 0.65 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Active Tokens')}</span>
                      <span className="font-bold text-foreground">{analytics?.activeTokens ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Door Management */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-orange-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Door Management')}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Provider')}</span>
                      <span className="font-bold text-foreground">{doorHealth?.provider ?? t('Not configured')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t('Status')}</span>
                      <Badge className={
                        doorHealth?.connected
                          ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                          : doorHealth?.configured
                          ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                          : 'bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20'
                      }>
                        {doorHealth?.connected && <CheckCircle className="w-3 h-3 mr-1" />}
                        {doorHealth?.configured && !doorHealth.connected && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {!doorHealth?.configured && <AlertCircle className="w-3 h-3 mr-1" />}
                        {doorHealth?.connected ? t('Connected') : doorHealth?.configured ? t('Disconnected') : t('Not configured')}
                      </Badge>
                    </div>
                    {doorEvents.length > 0 && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('Recent Events')}</p>
                        {doorEvents.slice(0, 4).map((evt) => (
                          <div key={evt.id} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[65%] text-foreground" title={evt.message ?? evt.action}>
                              {evt.message ?? evt.action}
                            </span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {evt.createdAt ? (() => { try { return format(new Date(evt.createdAt), 'HH:mm'); } catch { return ''; } })() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FHIR Server Uptime */}
              {fhirUptime.length > 0 && (
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('FHIR Server Uptime')}</h4>
                      <p className="text-xs text-muted-foreground">{t('Background health checks every 30 seconds')}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {fhirUptime.map((srv) => {
                      const chartData = [...(srv.recentChecks ?? [])].reverse().map(c => ({
                        time: c.timestamp,
                        ms: c.responseTimeMs,
                        ok: c.status === 'healthy' ? 1 : 0,
                      }));

                      return (
                        <div key={srv.serverUrl} className="border border-border/40 rounded-xl p-4 space-y-3">
                          {/* Header row */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              {srv.currentStatus === 'healthy' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {srv.currentStatus === 'degraded' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                              {srv.currentStatus === 'unhealthy' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              <span className="font-semibold text-foreground">{srv.serverName}</span>
                              <span className="text-xs text-muted-foreground font-mono">{srv.serverUrl}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge className={
                                srv.uptimePercent >= 99 ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                                : srv.uptimePercent >= 95 ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                                : 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                              }>
                                {srv.uptimePercent.toFixed(2)}% {t('uptime')}
                              </Badge>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {srv.avgResponseTimeMs}{t('ms avg')}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {srv.checksTotal} {t('checks')}
                              </span>
                            </div>
                          </div>

                          {/* Response time chart */}
                          {chartData.length > 1 && (
                            <div className="h-24">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis dataKey="time" hide />
                                  <YAxis width={40} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}ms`} />
                                  <Tooltip
                                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                    labelFormatter={(label) => { try { return format(new Date(String(label)), 'HH:mm:ss'); } catch { return String(label); } }}
                                    formatter={(value) => [`${value}ms`, t('Response')]}
                                  />
                                  <Line type="monotone" dataKey="ms" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Last error */}
                          {srv.lastError && (
                            <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/5 p-2 rounded-lg">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{srv.lastError}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {systemStatus && (
                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-lg text-xs text-muted-foreground flex items-center justify-between">
                  <span>{t('Last updated')}: {(() => { try { return format(new Date(systemStatus.timestamp), 'MMM dd, HH:mm:ss'); } catch { return systemStatus.timestamp; } })()}</span>
                  <span>{t('Auto-refresh every 30s')}</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
