import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@proxy-smart/shared-ui';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui';
import { PageLoadingState } from './ui/page-loading-state';
import { PageErrorState } from './ui/page-error-state';
import { ExportMenu } from './ui/export-menu';
import { Activity, Play, Pause, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { oauthWebSocketService } from '../service/oauth-websocket-service';
import type { OAuthAnalyticsResponse, OAuthEvent } from '../lib/types/api';
import { oauthMonitoringService } from '../service/oauth-monitoring-service';
import { getItem } from '@/lib/storage';
import { config } from '@/config';
import type { SystemStatusResponse } from '../lib/api-client/models/SystemStatusResponse';
import type { AccessHealthResponse } from '../lib/api-client/models/AccessHealthResponse';
import type { AccessEvent } from '../lib/api-client/models/AccessEvent';
import type { FhirUptimeSummary } from '../lib/api-client/models/FhirUptimeSummary';
import { createServerApi, createAdminApi, createFhirMonitoringApi, handleApiError } from '@/lib/apiClient';
import { EventsPanel } from './DoorManagement/EventsPanel';
import { ConsentMonitoringDashboard } from './ConsentMonitoringDashboard';
import { AdminAuditDashboard } from './AdminAuditDashboard';
import { AuthMonitoringDashboard } from './AuthMonitoringDashboard';
import { EmailMonitoringDashboard } from './EmailMonitoringDashboard';
import { RealTimeStatusBanner } from './OAuthMonitoring/RealTimeStatusBanner';
import { SystemHealthTab } from './OAuthMonitoring/SystemHealthTab';
import { OAuthAnalyticsTab } from './OAuthMonitoring/OAuthAnalyticsTab';
import { FhirProxyTab } from './OAuthMonitoring/FhirProxyTab';

interface FhirProxyAnalytics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  rateLimitCount: number;
  successRate: number;
  avgResponseTimeMs: number;
  requestsByStatus: Record<number, number>;
  requestsByServer: Record<string, number>;
  requestsByResource: Record<string, number>;
  recentErrors: Array<{ id: string; timestamp: string; serverName: string; method: string; resourcePath: string; resourceType: string; statusCode: number; responseTimeMs: number; clientId?: string; error?: string }>;
  hourlyStats: Array<{ hour: string; total: number; success: number; errors: number; rateLimited: number; avgMs: number }>;
}

export function OAuthMonitoringDashboard() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<OAuthEvent[]>([]);
  const [analytics, setAnalytics] = useState<OAuthAnalyticsResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [doorHealth, setDoorHealth] = useState<AccessHealthResponse | null>(null);
  const [doorEvents, setDoorEvents] = useState<AccessEvent[]>([]);
  const [fhirUptime, setFhirUptime] = useState<FhirUptimeSummary[]>([]);
  const [fhirProxyAnalytics, setFhirProxyAnalytics] = useState<FhirProxyAnalytics | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'sse'>('websocket');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const isRealTimeActiveRef = useRef(isRealTimeActive);

  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  // ── Data loading ──────────────────────────────────────────────────

  const loadInitialData = useCallback(async (forceMode?: 'websocket' | 'sse') => {
    try {
      if (oauthWebSocketService.isConnected) {
        oauthWebSocketService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const targetMode = forceMode || connectionMode;
      await oauthWebSocketService.connectWithMode(targetMode === 'websocket' ? 'websocket' : 'sse');
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        await oauthWebSocketService.authenticate();

        if (oauthWebSocketService.isUsingSSE) {
          console.info('Using SSE mode for OAuth monitoring');
          try {
            const initialEventsResponse = await oauthMonitoringService.getEvents({ limit: 100 });
            const initialAnalyticsResponse = await oauthMonitoringService.getAnalytics();
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(initialEventsResponse.events || []);
              setAnalytics(initialAnalyticsResponse);
            }
          } catch (apiError) {
            console.warn('Failed to fetch initial data via API for SSE mode:', apiError);
          }
        } else {
          oauthWebSocketService.onEventsData((eventList) => {
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setEvents(eventList);
            }
          });
          oauthWebSocketService.onAnalyticsData((analyticsData) => {
            if (isInitialLoadRef.current || isRealTimeActiveRef.current) {
              setAnalytics(analyticsData);
            }
          });
        }

        oauthWebSocketService.onError((errorMsg) => {
          setError(errorMsg);
        });

        await oauthWebSocketService.subscribe('events');
        await oauthWebSocketService.subscribe('analytics');
        isInitialLoadRef.current = false;
      } catch (authErr) {
        await handleApiError(authErr);
        setError('Connected but not authenticated. Please log in to view OAuth monitoring data.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to monitoring service');
    } finally {
      setIsLoading(false);
    }
  }, [connectionMode]);

  // ── Real-time subscriptions ───────────────────────────────────────

  useEffect(() => {
    let eventsUnsubscribe: (() => void) | undefined;
    let analyticsUnsubscribe: (() => void) | undefined;

    if (isRealTimeActive) {
      eventsUnsubscribe = oauthWebSocketService.onEventsUpdate((event: OAuthEvent) => {
        setEvents(prev => [event, ...prev.slice(0, 999)]);
      });
      analyticsUnsubscribe = oauthWebSocketService.onAnalyticsUpdate((newAnalytics: OAuthAnalyticsResponse) => {
        setAnalytics(newAnalytics);
      });
    } else {
      console.info('Real-time updates are PAUSED');
    }

    return () => {
      eventsUnsubscribe?.();
      analyticsUnsubscribe?.();
    };
  }, [isRealTimeActive]);

  useEffect(() => {
    let isMounted = true;
    const initializeConnection = async () => {
      if (isMounted) await loadInitialData();
    };
    initializeConnection();
    return () => { isMounted = false; };
  }, [loadInitialData]);

  useEffect(() => {
    return () => {
      if (oauthWebSocketService.isConnected) oauthWebSocketService.disconnect();
    };
  }, []);

  // ── System status polling ─────────────────────────────────────────

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
    Promise.resolve().then(fetchSystemStatus);
    const interval = setInterval(fetchSystemStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

  // ── SSE streams ───────────────────────────────────────────────────

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
        setTimeout(() => connect(), 10_000);
      };
    };
    connect();
    return () => { es?.close(); };
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    const connect = async () => {
      const token = (await getItem<{access_token: string}>('openid_tokens'))?.access_token;
      if (!token) return;
      const baseUrl = config.api.baseUrl;
      es = new EventSource(`${baseUrl}/monitoring/fhir-proxy/analytics/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'keepalive' || data.type === 'connection') return;
          if (data.totalRequests !== undefined) setFhirProxyAnalytics(data);
        } catch { /* ignore parse errors */ }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        setTimeout(() => connect(), 10_000);
      };
    };
    connect();
    return () => { es?.close(); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    isInitialLoadRef.current = true;
    await loadInitialData();
  };

  const toggleRealTime = () => setIsRealTimeActive(!isRealTimeActive);

  const switchConnectionMode = async (newMode: 'websocket' | 'sse') => {
    if (newMode === connectionMode) return;
    setIsLoading(true);
    setError(null);
    setConnectionMode(newMode);
    isInitialLoadRef.current = true;
    await loadInitialData(newMode);
  };

  const exportAnalytics = async () => {
    try {
      if (!analytics) {
        setError('No analytics data available to export');
        return;
      }
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportType: 'oauth-analytics',
        source: 'dashboard-current-state',
        data: analytics,
        metadata: {
          totalEvents: events.length,
          connectionMode: oauthWebSocketService.connectionMode,
          realTimeActive: isRealTimeActive,
        },
      };
      const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `oauth-analytics-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics data');
    }
  };

  const exportServerEvents = async () => {
    try {
      const tokenData = await getItem<{access_token: string}>('openid_tokens');
      const accessToken = tokenData?.access_token ?? '';
      if (!accessToken) {
        setError('No authentication token available for server export. Please log in.');
        return;
      }

      const response = await fetch(`${config.api.baseUrl}/monitoring/oauth/events/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/x-jsonlines',
        },
      });
      if (!response.ok) throw new Error(`Events export failed: ${response.statusText}`);

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `oauth-events-${new Date().toISOString().split('T')[0]}.jsonl`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

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

  // ── Derived data ──────────────────────────────────────────────────

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      event.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return <PageLoadingState message={t('Loading OAuth monitoring data...')} />;
  }

  if (error) {
    return (
      <PageErrorState
        title={t('Failed to Load OAuth Monitoring Data')}
        message={error}
        onRetry={refreshData}
        retryLabel={t('Try Again')}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={isRealTimeActive ? 'default' : 'outline'} onClick={toggleRealTime}>
              {isRealTimeActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRealTimeActive ? t('Pause') : t('Resume')} {t('Real-time')}
            </Button>
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Refresh')}
            </Button>
            <ExportMenu
              label={t('Export')}
              items={[
                { label: t('Export Current Data'), description: t('Download current dashboard analytics'), onClick: exportAnalytics },
                { label: t('Export Server Events'), description: t('Download events log from server'), onClick: exportServerEvents },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Real-time Status Banner */}
      <RealTimeStatusBanner
        isActive={isRealTimeActive}
        connectionMode={connectionMode}
        onToggle={toggleRealTime}
        onSwitchMode={switchConnectionMode}
      />

      {/* Tab Navigation */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs defaultValue="overview" className="w-full">
          <ResponsiveTabsList columns={8}>
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Dashboard')}</TabsTrigger>
            <TabsTrigger value="fhir-proxy" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('FHIR Proxy')}</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('OAuth')}</TabsTrigger>
            <TabsTrigger value="auth-events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Auth')}</TabsTrigger>
            <TabsTrigger value="email-events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Email')}</TabsTrigger>
            <TabsTrigger value="door-access" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Door Access')}</TabsTrigger>
            <TabsTrigger value="consent" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Consent')}</TabsTrigger>
            <TabsTrigger value="audit-log" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Audit Log')}</TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
            <SystemHealthTab
              systemStatus={systemStatus}
              doorHealth={doorHealth}
              doorEvents={doorEvents}
              fhirUptime={fhirUptime}
              analytics={analytics}
              fetchSystemStatus={fetchSystemStatus}
            />
          </TabsContent>

          <TabsContent value="analytics" className="p-6 space-y-6">
            <OAuthAnalyticsTab
              analytics={analytics}
              events={events}
              filteredEvents={filteredEvents}
              filterType={filterType}
              setFilterType={setFilterType}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </TabsContent>

          <TabsContent value="fhir-proxy" className="p-6 space-y-6">
            <FhirProxyTab fhirProxyAnalytics={fhirProxyAnalytics} />
          </TabsContent>

          <TabsContent value="auth-events" className="p-6 space-y-6">
            <AuthMonitoringDashboard embedded isRealTimeActive={isRealTimeActive} />
          </TabsContent>

          <TabsContent value="email-events" className="p-6 space-y-6">
            <EmailMonitoringDashboard embedded isRealTimeActive={isRealTimeActive} />
          </TabsContent>

          <TabsContent value="door-access" className="p-6 space-y-6">
            <EventsPanel />
          </TabsContent>

          <TabsContent value="consent" className="p-6 space-y-6">
            <ConsentMonitoringDashboard embedded isRealTimeActive={isRealTimeActive} />
          </TabsContent>

          <TabsContent value="audit-log" className="p-6 space-y-6">
            <AdminAuditDashboard embedded isRealTimeActive={isRealTimeActive} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
