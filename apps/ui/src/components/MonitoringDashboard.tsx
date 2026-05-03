import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { Badge, Button, CHART_COLORS, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLoadingState } from './ui/page-loading-state';
import { PageErrorState } from './ui/page-error-state';
import { RealTimeBanner } from './ui/realtime-banner';
import { StatCard } from './ui/stat-card';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Monitor,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────

export interface MonitoringEvent {
  id: string;
  timestamp: string;
  type: string;
  userId?: string;
  clientId?: string;
  ipAddress?: string;
  error?: string;
  success: boolean;
  details?: Record<string, string>;
}

export interface MonitoringAnalytics {
  totalEvents: number;
  successRate: number;
  eventsByType: Record<string, number>;
  recentErrors: MonitoringEvent[];
  hourlyStats: { hour: string; success: number; failure: number; total: number }[];
  topClients?: { clientId: string; count: number }[];
}

export interface MonitoringService {
  connect(): Promise<void>;
  disconnect(): void;
  onEvent(cb: (event: MonitoringEvent) => void): () => void;
  onAnalytics(cb: (analytics: MonitoringAnalytics) => void): () => void;
  fetchEvents(options?: { limit?: number }): Promise<{ events: MonitoringEvent[]; total: number }>;
  fetchAnalytics(): Promise<MonitoringAnalytics>;
}

export interface MonitoringStatCard {
  icon: LucideIcon;
  label: string;
  getValue: (analytics: MonitoringAnalytics | null) => string;
  subtitle: string;
  color: 'primary' | 'green' | 'blue' | 'red' | 'purple' | 'orange';
}

export interface MonitoringDashboardConfig {
  service: MonitoringService;
  eventTypeLabels: Record<string, string>;
  eventTypeIcon: (type: string) => ReactNode;
  headerIcon: LucideIcon;
  headerTitle: string;
  headerDescription: string;
  loadingMessage: string;
  bannerActiveTitle: string;
  bannerPausedTitle: string;
  bannerActiveDescription: string;
  statCards: MonitoringStatCard[];
  activityChartTitle: string;
  pieChartIcon: LucideIcon;
  pieChartTitle: string;
  pieChartSubtitle: string;
  emptyEventsMessage: string;
  failuresTitle: string;
  failuresDescription: string;
  emptyFailuresMessage: string;
  showTopClients?: boolean;
  extraSearchFilter?: (event: MonitoringEvent, query: string) => boolean;
}

interface MonitoringDashboardProps {
  config: MonitoringDashboardConfig;
  embedded?: boolean;
  isRealTimeActive?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export function MonitoringDashboard({ config, embedded, isRealTimeActive: parentRealTime }: MonitoringDashboardProps) {
  const { t } = useTranslation();
  const { service, eventTypeLabels, eventTypeIcon } = config;

  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [analytics, setAnalytics] = useState<MonitoringAnalytics | null>(null);
  const [localRealTime, setLocalRealTime] = useState(true);
  const isRealTimeActive = embedded && parentRealTime !== undefined ? parentRealTime : localRealTime;
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRealTimeActiveRef = useRef(isRealTimeActive);
  useEffect(() => { isRealTimeActiveRef.current = isRealTimeActive; }, [isRealTimeActive]);

  // ─── REST initial load ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, analyticsData] = await Promise.all([
        service.fetchEvents({ limit: 200 }),
        service.fetchAnalytics(),
      ]);
      setEvents(eventsData.events || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(config.loadingMessage));
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // ─── SSE real-time connection ─────────────────────────────────

  useEffect(() => {
    let eventUnsub: (() => void) | undefined;
    let analyticsUnsub: (() => void) | undefined;

    const init = async () => {
      await fetchData();
      try {
        await service.connect();
        eventUnsub = service.onEvent((event) => {
          if (isRealTimeActiveRef.current) {
            setEvents(prev => [event, ...prev.slice(0, 999)]);
          }
        });
        analyticsUnsub = service.onAnalytics((a) => {
          if (isRealTimeActiveRef.current) {
            setAnalytics(a);
          }
        });
      } catch (err) {
        console.error('Monitoring SSE connection failed:', err);
      }
    };

    init();
    return () => {
      eventUnsub?.();
      analyticsUnsub?.();
      service.disconnect();
    };
  }, [fetchData, service]);

  // ─── Derived data ──────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (filterType !== 'all') list = list.filter(e => e.type === filterType);
    if (filterSuccess !== 'all') list = list.filter(e => String(e.success) === filterSuccess);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.type.toLowerCase().includes(q) ||
        (e.clientId?.toLowerCase().includes(q)) ||
        (e.userId?.toLowerCase().includes(q)) ||
        (e.ipAddress?.toLowerCase().includes(q)) ||
        (e.error?.toLowerCase().includes(q)) ||
        (config.extraSearchFilter?.(e, q))
      );
    }
    return list;
  }, [events, filterType, filterSuccess, searchTerm, config.extraSearchFilter]);

  const typePieData = useMemo(() => {
    if (!analytics?.eventsByType) return [];
    return Object.entries(analytics.eventsByType)
      .map(([name, value]) => ({ name: t(eventTypeLabels[name] || name), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [analytics, eventTypeLabels, t]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(events.map(e => e.type));
    return Array.from(set).sort();
  }, [events]);

  // ─── Render ────────────────────────────────────────────────────

  if (isLoading) return <PageLoadingState message={t(config.loadingMessage)} />;
  if (error) return <PageErrorState message={error} onRetry={fetchData} />;

  const HeaderIcon = config.headerIcon;
  const PieIcon = config.pieChartIcon;

  return (
    <div className="space-y-6">
      {!embedded && (
        <RealTimeBanner
          isActive={isRealTimeActive}
          activeTitle={t(config.bannerActiveTitle)}
          pausedTitle={t(config.bannerPausedTitle)}
          activeDescription={t(config.bannerActiveDescription)}
          pausedDescription={t('Real-time updates are paused. Click Resume to continue monitoring.')}
          badgeText={isRealTimeActive ? 'SSE Active' : 'Paused'}
        >
          <Button variant="outline" size="sm" onClick={() => setLocalRealTime(!localRealTime)}>
            {isRealTimeActive ? t('Pause') : t('Resume')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('Refresh')}
          </Button>
        </RealTimeBanner>
      )}

      <div className={embedded ? 'space-y-6' : 'bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden'}>
        <div className={embedded ? '' : 'p-8 pb-6'}>
          {!embedded && (
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <HeaderIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t(config.headerTitle)}</h3>
                <p className="text-muted-foreground font-medium">{t(config.headerDescription)}</p>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <ResponsiveTabsList columns={3}>
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Event Log')}</TabsTrigger>
              <TabsTrigger value="failures" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Failures')}</TabsTrigger>
            </ResponsiveTabsList>

            {/* ─── Overview ─────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {config.statCards.map((card) => (
                  <StatCard key={card.label} icon={card.icon} label={t(card.label)} value={card.getValue(analytics)} subtitle={t(card.subtitle)} color={card.color} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly activity */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t(config.activityChartTitle)}</h4>
                      <p className="text-muted-foreground font-medium">{t('Success vs failure over time')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {analytics?.hourlyStats && analytics.hourlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.hourlyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="hour" tickFormatter={(h) => { try { return format(new Date(h), 'HH:mm'); } catch { return h; } }} minTickGap={20} className="text-muted-foreground" />
                          <YAxis allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip labelFormatter={(h) => { try { return format(new Date(h), 'PPpp'); } catch { return h; } }} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="success" name={t('Success')} fill="#10b981" stackId="a" />
                          <Bar dataKey="failure" name={t('Failure')} fill="#ef4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState icon={BarChart3} title={t('No activity data available')} className="py-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Event type breakdown */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <PieIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t(config.pieChartTitle)}</h4>
                      <p className="text-muted-foreground font-medium">{t(config.pieChartSubtitle)}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {typePieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                            {typePieData.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState icon={PieIcon} title={t('No event data available')} className="py-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top clients (opt-in) */}
              {config.showTopClients && analytics?.topClients && analytics.topClients.length > 0 && (
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">{t('Top Clients')}</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {analytics.topClients.map((c, i) => (
                      <div key={c.clientId} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
                          <span className="text-sm font-medium truncate max-w-[120px]">{c.clientId}</span>
                        </div>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ─── Event Log ────────────────────────────────────────── */}
            <TabsContent value="events" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3">
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={t('Search events...')} className="w-full sm:min-w-[200px] sm:max-w-none" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder={t('Event Type')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Types')}</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{t(eventTypeLabels[type] || type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSuccess} onValueChange={setFilterSuccess}>
                  <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder={t('Status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All')}</SelectItem>
                    <SelectItem value="true">{t('Success')}</SelectItem>
                    <SelectItem value="false">{t('Failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">{t('Timestamp')}</TableHead>
                        <TableHead>{t('Type')}</TableHead>
                        <TableHead>{t('Client')}</TableHead>
                        <TableHead>{t('User')}</TableHead>
                        <TableHead>{t('IP Address')}</TableHead>
                        <TableHead className="w-[90px]">{t('Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {t(config.emptyEventsMessage)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.slice(0, 100).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono text-xs">{format(new Date(event.timestamp), 'MMM dd HH:mm:ss')}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {eventTypeIcon(event.type)}
                                <span className="text-sm font-medium">{t(eventTypeLabels[event.type] || event.type)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-mono truncate max-w-[150px]">{event.clientId || '—'}</TableCell>
                            <TableCell className="text-sm font-mono truncate max-w-[150px]">{event.userId?.slice(0, 8) || '—'}</TableCell>
                            <TableCell className="text-sm font-mono">{event.ipAddress || '—'}</TableCell>
                            <TableCell>
                              {event.success
                                ? <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />{t('OK')}</Badge>
                                : <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />{t('Fail')}</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredEvents.length > 0 && (
                  <div className="px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
                    {t('Showing {{count}} of {{total}} events', { count: Math.min(filteredEvents.length, 100), total: filteredEvents.length })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Failures ─────────────────────────────────────────── */}
            <TabsContent value="failures" className="space-y-6">
              <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{t(config.failuresTitle)}</h4>
                      <p className="text-muted-foreground text-sm">{t(config.failuresDescription)}</p>
                    </div>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">{t('Timestamp')}</TableHead>
                        <TableHead>{t('Type')}</TableHead>
                        <TableHead>{t('Client')}</TableHead>
                        <TableHead>{t('User')}</TableHead>
                        <TableHead>{t('Error')}</TableHead>
                        <TableHead>{t('IP Address')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!analytics?.recentErrors || analytics.recentErrors.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>{t(config.emptyFailuresMessage)}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.recentErrors.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono text-xs">{format(new Date(event.timestamp), 'MMM dd HH:mm:ss')}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {eventTypeIcon(event.type)}
                                <Badge variant="destructive">{t(eventTypeLabels[event.type] || event.type)}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-mono truncate max-w-[120px]">{event.clientId || '—'}</TableCell>
                            <TableCell className="text-sm font-mono truncate max-w-[120px]">{event.userId?.slice(0, 8) || '—'}</TableCell>
                            <TableCell className="text-sm text-destructive font-mono truncate max-w-[180px]">{event.error || '—'}</TableCell>
                            <TableCell className="text-sm font-mono">{event.ipAddress || '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
