import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge, Button, Input, CHART_COLORS } from '@proxy-smart/shared-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { StatCard } from './ui/stat-card';
import { PageLoadingState } from './ui/page-loading-state';
import { PageErrorState } from './ui/page-error-state';
import { ExportMenu } from './ui/export-menu';
import { RealTimeBanner } from './ui/realtime-banner';
import {
  Activity,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Shield,
  Search,
  AlertTriangle,
  XCircle,
  UserCheck,
  FileEdit,
  Trash2,
  Plus,
  Zap,
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
import {
  adminAuditService,
  type AdminAuditEvent,
  type AdminAuditAnalytics,
} from '../service/admin-audit-service';

// ─── Helpers ─────────────────────────────────────────────────────────



const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  action: Zap,
  read: Search,
};

function actionColor(action: string): string {
  switch (action) {
    case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'action': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

function statusColor(success: boolean): string {
  return success
    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
}

// ─── Component ───────────────────────────────────────────────────────

interface AdminAuditDashboardProps {
  embedded?: boolean;
  isRealTimeActive?: boolean;
}

export function AdminAuditDashboard({ embedded, isRealTimeActive: parentRealTime }: AdminAuditDashboardProps = {}) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<AdminAuditAnalytics | null>(null);
  const [localRealTime, setLocalRealTime] = useState(true);
  const isRealTimeActive = embedded && parentRealTime !== undefined ? parentRealTime : localRealTime;
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRealTimeActiveRef = useRef(isRealTimeActive);

  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  // ─── REST initial load ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, analyticsData] = await Promise.all([
        adminAuditService.fetchEvents({ limit: 200 }),
        adminAuditService.fetchAnalytics(),
      ]);
      setEvents(eventsData.events || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin audit data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── SSE real-time connection ─────────────────────────────────

  useEffect(() => {
    let eventUnsub: (() => void) | undefined;
    let analyticsUnsub: (() => void) | undefined;

    const init = async () => {
      await fetchData();

      try {
        await adminAuditService.connect();

        eventUnsub = adminAuditService.onEvent((event) => {
          if (isRealTimeActiveRef.current) {
            setEvents(prev => [event, ...prev.slice(0, 999)]);
          }
        });

        analyticsUnsub = adminAuditService.onAnalytics((a) => {
          if (isRealTimeActiveRef.current) {
            setAnalytics(a);
          }
        });
      } catch (err) {
        console.error('Admin audit SSE connection failed:', err);
      }
    };

    init();

    return () => {
      eventUnsub?.();
      analyticsUnsub?.();
      adminAuditService.disconnect();
    };
  }, [fetchData]);

  // ─── Derived data ──────────────────────────────────────────────

  const uniqueResources = useMemo(() => {
    const set = new Set(events.map(e => e.resource).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (filterAction !== 'all') list = list.filter(e => e.action === filterAction);
    if (filterResource !== 'all') list = list.filter(e => e.resource === filterResource);
    if (filterSuccess !== 'all') list = list.filter(e => String(e.success) === filterSuccess);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        (e.actor.username?.toLowerCase().includes(q)) ||
        e.actor.sub.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        (e.resourceId?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [events, filterAction, filterResource, filterSuccess, searchTerm]);

  const resourcePieData = useMemo(() => {
    if (!analytics?.actionsByResource) return [];
    return Object.entries(analytics.actionsByResource)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [analytics?.actionsByResource]);

  const actionPieData = useMemo(() => {
    if (!analytics?.actionsByType) return [];
    return Object.entries(analytics.actionsByType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analytics?.actionsByType]);

  // ─── Export handlers ──────────────────────────────────────────

  const exportItems = [
    {
      label: t('Export JSONL'),
      description: t('Download full audit log as newline-delimited JSON'),
      onClick: () => adminAuditService.exportJsonl(),
    },
    {
      label: t('Export CSV'),
      description: t('Download filtered events as CSV'),
      onClick: () => {
        const header = 'timestamp,actor,action,resource,resourceId,method,path,statusCode,success,durationMs\n';
        const rows = filteredEvents.map(e =>
          `${e.timestamp},${e.actor.username ?? e.actor.sub},${e.action},${e.resource},${e.resourceId ?? ''},${e.method},${e.path},${e.statusCode},${e.success},${e.durationMs}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────────

  if (isLoading) return <PageLoadingState message={t('Loading admin audit data...')} />;
  if (error) return <PageErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Real-time banner (standalone mode only) */}
      {!embedded && (
        <RealTimeBanner
          isActive={isRealTimeActive}
          activeTitle={t('Real-time Audit Monitoring Active')}
          pausedTitle={t('Real-time Audit Monitoring Paused')}
          activeDescription={t('Admin audit events are pushed in real time as they occur.')}
          pausedDescription={t('Real-time updates are paused. Click Resume to continue monitoring.')}
          badgeText={isRealTimeActive ? 'SSE Active' : 'Paused'}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalRealTime(!localRealTime)}
          >
            {isRealTimeActive ? t('Pause') : t('Resume')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('Refresh')}
          </Button>
          <ExportMenu items={exportItems} />
        </RealTimeBanner>
      )}

      {/* Main dashboard */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Admin Audit Dashboard')}</h3>
              <p className="text-muted-foreground font-medium">{t('Track admin mutations, actor activity, and security events')}</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-t-2xl">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Event Log')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="failures" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Failures')}</TabsTrigger>
            </TabsList>

            {/* ─── Overview ──────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard icon={BarChart3} label={t('Total Actions')} value={(analytics?.totalActions ?? 0).toLocaleString()} subtitle={t('Last 24 hours')} color="primary" />
                <StatCard icon={CheckCircle} label={t('Success Rate')} value={`${(analytics?.successRate ?? 0).toFixed(1)}%`} subtitle={t('Successful operations')} color="green" />
                <StatCard icon={UserCheck} label={t('Active Admins')} value={(analytics?.topActors?.length ?? 0).toString()} subtitle={t('Distinct actors (24h)')} color="purple" />
                <StatCard icon={AlertTriangle} label={t('Failures')} value={(analytics?.recentFailures?.length ?? 0).toString()} subtitle={t('Recent failed actions')} color="red" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly activity */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Admin Activity (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Success vs failure over time')}</p>
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
                          <Bar dataKey="success" name={t('Success')} fill="#10b981" stackId="a" />
                          <Bar dataKey="failure" name={t('Failure')} fill="#ef4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium">{t('No activity data available')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top actors */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <UserCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Top Actors')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Most active admin users')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analytics?.topActors && analytics.topActors.length > 0 ? (
                      analytics.topActors.slice(0, 5).map((actor, index) => (
                        <div key={actor.username} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{actor.username}</p>
                              <p className="text-sm text-muted-foreground font-medium">{actor.count} {t('actions')}</p>
                            </div>
                          </div>
                          <Badge className="bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20">
                            {actor.count}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium">{t('No actor data available')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Event Log (full feed) ─────────────────────── */}
            <TabsContent value="events" className="space-y-6">
              {/* Filters */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Filter Audit Events')}</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Action:')}</label>
                    <Select value={filterAction} onValueChange={setFilterAction}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All')}</SelectItem>
                        <SelectItem value="create">{t('Create')}</SelectItem>
                        <SelectItem value="update">{t('Update')}</SelectItem>
                        <SelectItem value="delete">{t('Delete')}</SelectItem>
                        <SelectItem value="action">{t('Action')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Resource:')}</label>
                    <Select value={filterResource} onValueChange={setFilterResource}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Resources')}</SelectItem>
                        {uniqueResources.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Status:')}</label>
                    <Select value={filterSuccess} onValueChange={setFilterSuccess}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All')}</SelectItem>
                        <SelectItem value="true">{t('Success')}</SelectItem>
                        <SelectItem value="false">{t('Failure')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('Search by actor, path, resource...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="min-w-[220px]"
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
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Audit Event Log')}</h4>
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
                          <TableHead>{t('Actor')}</TableHead>
                          <TableHead>{t('Action')}</TableHead>
                          <TableHead>{t('Resource')}</TableHead>
                          <TableHead>{t('Resource ID')}</TableHead>
                          <TableHead>{t('Method')}</TableHead>
                          <TableHead>{t('Status')}</TableHead>
                          <TableHead>{t('Duration')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.slice(0, 100).map((event) => {
                          const ActionIcon = ACTION_ICONS[event.action] ?? Zap;
                          return (
                            <TableRow key={event.id}>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                              </TableCell>
                              <TableCell className="font-medium text-foreground max-w-[140px] truncate" title={`${event.actor.username ?? event.actor.sub}\n${event.actor.email ?? ''}`}>
                                {event.actor.username ?? event.actor.sub}
                              </TableCell>
                              <TableCell>
                                <Badge className={actionColor(event.action)}>
                                  <ActionIcon className="w-3 h-3 mr-1" />
                                  {event.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">{event.resource}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-[120px] truncate" title={event.resourceId ?? ''}>
                                {event.resourceId || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs font-mono">{event.method}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColor(event.success)}>
                                  {event.success ? (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  )}
                                  {event.statusCode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{event.durationMs}ms</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredEvents.length > 100 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">{t('Showing first 100 events of {{total}}', { total: filteredEvents.length })}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">{t('No audit events match your filters')}</p>
                    <p className="text-sm mt-2">{t('Try adjusting your filter criteria')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── Analytics ────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly trend line chart */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Activity Trend (24h)')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Admin actions over time')}</p>
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
                          <Line type="monotone" dataKey="success" name={t('Success')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="failure" name={t('Failure')} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
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

                {/* Action type distribution */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Actions by Type')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Create, Update, Delete distribution')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {actionPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={actionPieData} cx="50%" cy="50%" outerRadius={100} fill="var(--primary)" dataKey="value" label={({ payload }) => `${payload?.name}: ${payload?.value}`}>
                            {actionPieData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No action distribution data')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resource distribution */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg lg:col-span-2">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Actions by Resource')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Which admin resources are most modified')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {resourcePieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resourcePieData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" allowDecimals={false} className="text-muted-foreground" />
                          <YAxis dataKey="name" type="category" width={140} className="text-muted-foreground" />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Bar dataKey="value" name={t('Actions')} fill="var(--primary)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">{t('No resource data available')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Failures ──────────────────────────────────── */}
            <TabsContent value="failures" className="space-y-6">
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Recent Failures')}</h4>
                    <p className="text-muted-foreground font-medium">{t('Admin actions that returned error status codes')}</p>
                  </div>
                </div>

                {analytics?.recentFailures && analytics.recentFailures.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>{t('Time')}</TableHead>
                          <TableHead>{t('Actor')}</TableHead>
                          <TableHead>{t('Action')}</TableHead>
                          <TableHead>{t('Resource')}</TableHead>
                          <TableHead>{t('Path')}</TableHead>
                          <TableHead>{t('Status Code')}</TableHead>
                          <TableHead>{t('Duration')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.recentFailures.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {event.actor.username ?? event.actor.sub}
                            </TableCell>
                            <TableCell>
                              <Badge className={actionColor(event.action)}>{event.action}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">{event.resource}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate font-mono text-xs" title={event.path}>
                              {event.path}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                <XCircle className="w-3 h-3 mr-1" />{event.statusCode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{event.durationMs}ms</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium">{t('No recent failures')}</p>
                    <p className="text-sm mt-2">{t('All admin actions completed successfully')}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
