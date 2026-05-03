import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Button, Input, CHART_COLORS, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@max-health-inc/shared-ui';
import { StatCard } from './ui/stat-card';
import { PageLoadingState } from './ui/page-loading-state';
import { PageErrorState } from './ui/page-error-state';
import { ExportMenu } from './ui/export-menu';
import { RealTimeBanner } from './ui/realtime-banner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Activity,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Shield,
  Timer,
  Play,
  Pause,
  Search,
  ShieldCheck,
  ShieldX,
  Database,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { config } from '@/config';
import { getAdminToken } from '@/lib/admin-api';

import {
  consentWebSocketService,
  type ConsentDecisionEvent,
  type ConsentAnalytics,
} from '../service/consent-websocket-service';

// ─── Component ───────────────────────────────────────────────────────

interface ConsentMonitoringDashboardProps {
  /** When true, hides the standalone header/banner (used inside OAuthMonitoringDashboard) */
  embedded?: boolean;
  /** Parent's real-time state — controls SSE pause/resume when embedded */
  isRealTimeActive?: boolean;
}

export function ConsentMonitoringDashboard({ embedded, isRealTimeActive: parentRealTime }: ConsentMonitoringDashboardProps = {}) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<ConsentDecisionEvent[]>([]);
  const [analytics, setAnalytics] = useState<ConsentAnalytics | null>(null);
  const [localRealTime, setLocalRealTime] = useState(true);
  const isRealTimeActive = embedded && parentRealTime !== undefined ? parentRealTime : localRealTime;
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'sse'>('websocket');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRealTimeActiveRef = useRef(isRealTimeActive);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  // ─── Fetch initial data via REST ────────────────────────────────

  const fetchConsentData = useCallback(async () => {
    const token = await getAdminToken();
    if (!token) throw new Error('No authentication token available. Please log in.');

    const headers = { Authorization: `Bearer ${token}` };
    const [eventsRes, analyticsRes] = await Promise.all([
      fetch(`${config.api.baseUrl}/monitoring/consent/events?limit=200`, { headers }),
      fetch(`${config.api.baseUrl}/monitoring/consent/analytics`, { headers }),
    ]);

    if (!eventsRes.ok || !analyticsRes.ok) {
      throw new Error('Failed to fetch consent monitoring data');
    }

    const eventsData = await eventsRes.json();
    const analyticsData = await analyticsRes.json();
    return { events: eventsData.events || [], analytics: analyticsData };
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchConsentData();
      setEvents(data.events as ConsentDecisionEvent[]);
      setAnalytics(data.analytics as ConsentAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consent monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchConsentData]);

  // ─── WebSocket / SSE real-time connection ────────────────────────

  const performRealTimeConnect = useCallback(async () => {
    const targetMode = connectionMode;

    if (consentWebSocketService.isConnected) {
      consentWebSocketService.disconnect();
    }

    await consentWebSocketService.connectWithMode(targetMode === 'websocket' ? 'websocket' : 'sse');

    if (!consentWebSocketService.isUsingSSE) {
      await consentWebSocketService.authenticate();
    }

    // Set up initial data handlers (only on first connect)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;

      consentWebSocketService.onEventsData((eventList) => {
        if (isRealTimeActiveRef.current) {
          setEvents(eventList);
        }
      });

      consentWebSocketService.onAnalyticsData((analyticsData) => {
        if (isRealTimeActiveRef.current) {
          setAnalytics(analyticsData);
        }
      });
    }

    consentWebSocketService.onError((errorMsg) => {
      console.error('Consent WebSocket error:', errorMsg);
    });

    await consentWebSocketService.subscribe('events');
    await consentWebSocketService.subscribe('analytics');

    return consentWebSocketService.isUsingSSE;
  }, [connectionMode]);

  // ─── Lifecycle ─────────────────────────────────────────────────

  useEffect(() => {
    let eventsUnsubscribe: (() => void) | undefined;
    let analyticsUnsubscribe: (() => void) | undefined;

    fetchConsentData()
      .then(data => {
        setEvents(data.events as ConsentDecisionEvent[]);
        setAnalytics(data.analytics as ConsentAnalytics);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load consent monitoring data'))
      .finally(() => setIsLoading(false))
      .then(() => performRealTimeConnect())
      .then(isSSE => {
        if (isSSE) setConnectionMode('sse');

        eventsUnsubscribe = consentWebSocketService.onEventsUpdate((event: ConsentDecisionEvent) => {
          if (isRealTimeActiveRef.current) {
            setEvents(prev => [event, ...prev.slice(0, 999)]);
          }
        });
        analyticsUnsubscribe = consentWebSocketService.onAnalyticsUpdate((newAnalytics: ConsentAnalytics) => {
          if (isRealTimeActiveRef.current) {
            setAnalytics(newAnalytics);
          }
        });
      })
      .catch(err => console.error('Failed to connect consent real-time:', err));

    return () => {
      eventsUnsubscribe?.();
      analyticsUnsubscribe?.();
      consentWebSocketService.disconnect();
    };
  }, [fetchConsentData, performRealTimeConnect]);

  // Pause / resume real-time
  useEffect(() => {
    if (!isRealTimeActive) {
      consentWebSocketService.disconnect();
    } else {
      performRealTimeConnect()
        .then(isSSE => { if (isSSE) setConnectionMode('sse'); })
        .catch(err => console.error('Failed to reconnect consent real-time:', err));
    }
  }, [isRealTimeActive, performRealTimeConnect]);

  // ─── Export helpers ────────────────────────────────────────────

  const exportAnalytics = () => {
    if (!analytics) return;
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), type: 'consent-analytics', data: analytics }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consent-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportServerEvents = async () => {
    try {
      const token = await getAdminToken();

      const res = await fetch(`${config.api.baseUrl}/monitoring/consent/events/export`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/x-jsonlines' },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

      const disposition = res.headers.get('Content-Disposition');
      let filename = `consent-events-${new Date().toISOString().split('T')[0]}.jsonl`;
      if (disposition) {
        const m = disposition.match(/filename="(.+)"/);
        if (m) filename = m[1];
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export events');
    }
  };

  // ─── Derived data ─────────────────────────────────────────────

  const filteredEvents = events.filter(event => {
    const matchesDecision = filterDecision === 'all' || event.decision === filterDecision;
    const matchesResource = filterResourceType === 'all' || event.resourceType === filterResourceType;
    const matchesSearch =
      searchTerm === '' ||
      event.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.resourcePath.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDecision && matchesResource && matchesSearch;
  });

  const resourceTypeData = analytics
    ? Object.entries(analytics.decisionsByResourceType).map(([type, counts]) => ({
        name: type,
        permit: counts.permit,
        deny: counts.deny,
        total: counts.permit + counts.deny,
      }))
    : [];

  const modeData = analytics
    ? Object.entries(analytics.decisionsByMode).map(([mode, count]) => ({
        name: mode,
        value: count,
      }))
    : [];

  const uniqueResourceTypes = [...new Set(events.map(e => e.resourceType).filter(Boolean))] as string[];

  // ─── Loading / error states ───────────────────────────────────

  if (isLoading) {
    return <PageLoadingState message={t('Loading consent monitoring data...')} />;
  }

  if (error) {
    return (
      <PageErrorState
        title={t('Failed to Load Consent Monitoring')}
        message={error}
        onRetry={refreshData}
        retryLabel={t('Try Again')}
      />
    );
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-6 space-y-6 bg-background min-h-full'}>
      {/* Header — only shown in standalone mode */}
      {!embedded && (
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('Consent Monitoring')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              {t('Real-time consent decision monitoring and analytics')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={isRealTimeActive ? 'default' : 'outline'} onClick={() => setLocalRealTime(p => !p)}>
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
                { label: t('Export Server Events'), description: t('Download events log from server (JSONL)'), onClick: exportServerEvents },
              ]}
            />
          </div>
        </div>
      </div>
      )}

      {/* Real-time status banner — only shown in standalone mode */}
      {!embedded && (
      <RealTimeBanner
        isActive={isRealTimeActive}
        activeTitle={t('Real-time Monitoring Active')}
        pausedTitle={t('Real-time Monitoring Paused')}
        activeDescription={t('Consent decisions are pushed in real time as they occur.')}
        pausedDescription={t('Real-time updates are paused. Click Resume to continue monitoring.')}
        badgeText={isRealTimeActive ? 'SSE Active' : 'Paused'}
      />
      )}

      {/* Main dashboard area */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Consent Analytics Dashboard')}</h3>
              <p className="text-muted-foreground font-medium">{t('Monitor consent decisions, denial patterns, and performance')}</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <ResponsiveTabsList columns={4}>
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Decisions')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="denied" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Denied Access')}</TabsTrigger>
            </ResponsiveTabsList>

            {/* ─── Overview ──────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
                <StatCard icon={BarChart3} label={t('Total Decisions')} value={(analytics?.totalDecisions ?? 0).toLocaleString()} subtitle={t('Last 24 hours')} color="primary" />
                <StatCard icon={ShieldCheck} label={t('Permit Rate')} value={`${(analytics?.permitRate ?? 0).toFixed(1)}%`} subtitle={t('Allowed access requests')} color="green" />
                <StatCard icon={ShieldX} label={t('Deny Rate')} value={`${(analytics?.denyRate ?? 0).toFixed(1)}%`} subtitle={t('Blocked access requests')} color="red" />
                <StatCard icon={Timer} label={t('Avg Check Time')} value={`${(analytics?.averageCheckDuration ?? 0).toFixed(0)}ms`} subtitle={t('Average consent check')} color="orange" />
                <StatCard icon={Database} label={t('Cache Hit Rate')} value={`${(analytics?.cacheHitRate ?? 0).toFixed(1)}%`} subtitle={t('Served from cache')} color="purple" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly activity */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Consent Activity (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Permit vs Deny over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.hourlyStats && analytics.hourlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.hourlyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(h) => { try { return format(new Date(h), 'HH:mm'); } catch { return h; } }}
                            minTickGap={20}
                            className="text-muted-foreground"
                          />
                          <YAxis allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(h) => { try { return format(new Date(h), 'PPpp'); } catch { return h; } }}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="permit" name={t('Permit')} fill="#10b981" stackId="a" />
                          <Bar dataKey="deny" name={t('Deny')} fill="#ef4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState icon={BarChart3} title={t('No consent activity data available')} className="py-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Resource type breakdown */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Decisions by Resource Type')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Permit / Deny per FHIR resource')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {resourceTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resourceTypeData.sort((a, b) => b.total - a.total).slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" allowDecimals={false} className="text-muted-foreground" />
                          <YAxis dataKey="name" type="category" width={120} className="text-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="permit" name={t('Permit')} fill="#10b981" stackId="a" />
                          <Bar dataKey="deny" name={t('Deny')} fill="#ef4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState icon={Shield} title={t('No resource type data available')} className="py-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Decisions (event feed) ────────────────────── */}
            <TabsContent value="decisions" className="space-y-6">
              {/* Filters */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Filter Consent Decisions')}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Decision:')}</label>
                    <Select value={filterDecision} onValueChange={setFilterDecision}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All')}</SelectItem>
                        <SelectItem value="permit">{t('Permit')}</SelectItem>
                        <SelectItem value="deny">{t('Deny')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Resource:')}</label>
                    <Select value={filterResourceType} onValueChange={setFilterResourceType}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Types')}</SelectItem>
                        {uniqueResourceTypes.map(rt => (
                          <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('Search by client, patient, path...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:min-w-[220px]"
                    />
                  </div>
                </div>
              </div>

              {/* Events table */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Recent Consent Decisions')}</h4>
                    <p className="text-muted-foreground font-medium">
                      {t('Showing {{count}} of {{total}} events', { count: filteredEvents.length, total: events.length })}
                    </p>
                  </div>
                </div>

                {filteredEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>{t('Time')}</TableHead>
                          <TableHead>{t('Decision')}</TableHead>
                          <TableHead>{t('Client')}</TableHead>
                          <TableHead>{t('Patient')}</TableHead>
                          <TableHead>{t('Resource')}</TableHead>
                          <TableHead>{t('Method')}</TableHead>
                          <TableHead>{t('Mode')}</TableHead>
                          <TableHead>{t('Duration')}</TableHead>
                          <TableHead>{t('Reason')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.slice(0, 100).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                event.decision === 'permit'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                              }>
                                {event.decision === 'permit' ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <ShieldX className="w-3 h-3 mr-1" />
                                )}
                                {event.decision}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground max-w-[120px] truncate" title={event.clientId}>
                              {event.clientId}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[100px] truncate" title={event.patientId ?? ''}>
                              {event.patientId || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {event.resourceType || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{event.method}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {event.mode}
                                {event.cached && <span className="ml-1" title={t('Served from cache')}>⚡</span>}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{event.checkDurationMs}ms</TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate" title={event.reason}>
                              {event.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredEvents.length > 100 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">{t('Showing first 100 events of {{total}}', { total: filteredEvents.length })}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState icon={Activity} title={t('No events match your filters')} description={t('Try adjusting your filter criteria')} />
                )}
              </div>
            </TabsContent>

            {/* ─── Analytics ────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly line chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Decision Trend (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Consent decisions over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.hourlyStats && analytics.hourlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.hourlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(h) => { try { return format(new Date(h), 'HH:mm'); } catch { return h; } }}
                            minTickGap={20}
                            className="text-muted-foreground"
                          />
                          <YAxis allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip
                            labelFormatter={(h) => { try { return format(new Date(h), 'PPpp'); } catch { return h; } }}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="permit" name={t('Permit')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="deny" name={t('Deny')} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="total" name={t('Total')} stroke="var(--primary)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No trend data available')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mode distribution pie */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Decisions by Mode')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Enforce vs Audit-only vs Disabled')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {modeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modeData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="var(--primary)"
                            dataKey="value"
                            label={({ payload }) => `${payload?.name}: ${payload?.value}`}
                          >
                            {modeData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No mode distribution data available')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Denied Access ─────────────────────────────── */}
            <TabsContent value="denied" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top denied clients */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <ShieldX className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Top Denied Clients')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Clients with the most denied requests')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analytics?.topDeniedClients && analytics.topDeniedClients.length > 0 ? (
                      analytics.topDeniedClients.map((client, index) => (
                        <div key={client.clientId} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-600 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{client.clientId}</p>
                              <p className="text-sm text-muted-foreground font-medium">
                                {client.denyCount} {t('denied requests')}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20">
                            {client.denyCount}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyState icon={ShieldCheck} title={t('No denied client requests')} description={t('All clients are accessing resources within their consent scope')} />
                    )}
                  </div>
                </div>

                {/* Top denied patients */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Top Denied Patients')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Patients whose data was most frequently denied')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analytics?.topDeniedPatients && analytics.topDeniedPatients.length > 0 ? (
                      analytics.topDeniedPatients.map((patient, index) => (
                        <div key={patient.patientId} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{patient.patientId}</p>
                              <p className="text-sm text-muted-foreground font-medium">
                                {patient.denyCount} {t('denied requests')}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20">
                            {patient.denyCount}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyState icon={CheckCircle} title={t('No denied patient requests')} description={t('All patient data access has been within consent scope')} />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>


          </Tabs>
        </div>
      </div>
    </div>
  );
}
