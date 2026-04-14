import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge, Button, Input, CHART_COLORS } from '@proxy-smart/shared-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageLoadingState } from './ui/page-loading-state';
import { PageErrorState } from './ui/page-error-state';
import { RealTimeBanner } from './ui/realtime-banner';
import { StatCard } from './ui/stat-card';
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Mail,
  KeyRound,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';
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
import {
  emailMonitoringService,
  type EmailEvent,
  type EmailAnalytics,
} from '../service/email-monitoring-service';

// ─── Helpers ─────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  SEND_RESET_PASSWORD: 'Password Reset',
  SEND_RESET_PASSWORD_ERROR: 'Password Reset Error',
  SEND_VERIFY_EMAIL: 'Verify Email',
  SEND_VERIFY_EMAIL_ERROR: 'Verify Email Error',
  SEND_IDENTITY_PROVIDER_LINK: 'IDP Link',
  SEND_IDENTITY_PROVIDER_LINK_ERROR: 'IDP Link Error',
  EXECUTE_ACTIONS: 'Execute Actions',
  EXECUTE_ACTIONS_ERROR: 'Execute Actions Error',
  EXECUTE_ACTION_TOKEN: 'Action Token',
  EXECUTE_ACTION_TOKEN_ERROR: 'Action Token Error',
  CUSTOM_REQUIRED_ACTION: 'Required Action',
  CUSTOM_REQUIRED_ACTION_ERROR: 'Required Action Error',
};

function eventTypeIcon(type: string) {
  if (type.includes('RESET_PASSWORD')) return <KeyRound className="w-4 h-4" />;
  if (type.includes('VERIFY_EMAIL')) return <Mail className="w-4 h-4" />;
  if (type.includes('IDENTITY_PROVIDER')) return <ShieldCheck className="w-4 h-4" />;
  return <Send className="w-4 h-4" />;
}

// ─── Component ───────────────────────────────────────────────────────

interface EmailMonitoringDashboardProps {
  embedded?: boolean;
  isRealTimeActive?: boolean;
}

export function EmailMonitoringDashboard({ embedded, isRealTimeActive: parentRealTime }: EmailMonitoringDashboardProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
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
        emailMonitoringService.fetchEvents({ limit: 200 }),
        emailMonitoringService.fetchAnalytics(),
      ]);
      setEvents(eventsData.events || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email events data');
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
        await emailMonitoringService.connect();
        eventUnsub = emailMonitoringService.onEvent((event) => {
          if (isRealTimeActiveRef.current) {
            setEvents(prev => [event, ...prev.slice(0, 999)]);
          }
        });
        analyticsUnsub = emailMonitoringService.onAnalytics((a) => {
          if (isRealTimeActiveRef.current) {
            setAnalytics(a);
          }
        });
      } catch (err) {
        console.error('Email monitoring SSE connection failed:', err);
      }
    };

    init();
    return () => {
      eventUnsub?.();
      analyticsUnsub?.();
      emailMonitoringService.disconnect();
    };
  }, [fetchData]);

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
        (e.details?.email?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [events, filterType, filterSuccess, searchTerm]);

  const typePieData = useMemo(() => {
    if (!analytics?.eventsByType) return [];
    return Object.entries(analytics.eventsByType)
      .map(([name, value]) => ({ name: EVENT_TYPE_LABELS[name] || name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [analytics?.eventsByType]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(events.map(e => e.type));
    return Array.from(set).sort();
  }, [events]);

  // ─── Render ────────────────────────────────────────────────────

  if (isLoading) return <PageLoadingState message={t('Loading email events data...')} />;
  if (error) return <PageErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Real-time banner (standalone mode only) */}
      {!embedded && (
        <RealTimeBanner
          isActive={isRealTimeActive}
          activeTitle={t('Real-time Email Monitoring Active')}
          pausedTitle={t('Real-time Email Monitoring Paused')}
          activeDescription={t('Email events are pushed in real time as they occur.')}
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

      {/* Main dashboard */}
      <div className={embedded ? 'space-y-6' : 'bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden'}>
        <div className={embedded ? '' : 'p-8 pb-6'}>
          {!embedded && (
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Email Events Dashboard')}</h3>
                <p className="text-muted-foreground font-medium">{t('Track password resets, email verifications, and action tokens')}</p>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-t-2xl">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Event Log')}</TabsTrigger>
              <TabsTrigger value="failures" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Failures')}</TabsTrigger>
            </TabsList>

            {/* ─── Overview ─────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard icon={BarChart3} label={t('Total Events')} value={(analytics?.totalEvents ?? 0).toLocaleString()} subtitle={t('Last 24 hours')} color="primary" />
                <StatCard icon={CheckCircle} label={t('Success Rate')} value={`${(analytics?.successRate ?? 0).toFixed(1)}%`} subtitle={t('Delivered successfully')} color="green" />
                <StatCard icon={KeyRound} label={t('Password Resets')} value={((analytics?.eventsByType?.['SEND_RESET_PASSWORD'] ?? 0) + (analytics?.eventsByType?.['SEND_RESET_PASSWORD_ERROR'] ?? 0)).toLocaleString()} subtitle={t('Reset emails sent')} color="blue" />
                <StatCard icon={AlertTriangle} label={t('Failures')} value={(analytics?.recentErrors?.length ?? 0).toString()} subtitle={t('Recent failed events')} color="red" />
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
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Email Activity (24h)')}</h4>
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
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                          <p className="font-medium">{t('No activity data available')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event type breakdown */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Email Types')}</h4>
                      <p className="text-muted-foreground font-medium">{t('Distribution by email type')}</p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    {typePieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {typePieData.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Mail className="h-12 w-12 mx-auto mb-4" />
                          <p className="font-medium">{t('No email data available')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Event Log ────────────────────────────────────────── */}
            <TabsContent value="events" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('Search events...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('Email Type')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Types')}</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{EVENT_TYPE_LABELS[type] || type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSuccess} onValueChange={setFilterSuccess}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('Status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All')}</SelectItem>
                    <SelectItem value="true">{t('Success')}</SelectItem>
                    <SelectItem value="false">{t('Failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Events table */}
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
                            {t('No email events found')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.slice(0, 100).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono text-xs">{format(new Date(event.timestamp), 'MMM dd HH:mm:ss')}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {eventTypeIcon(event.type)}
                                <span className="text-sm font-medium">{EVENT_TYPE_LABELS[event.type] || event.type}</span>
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
                      <h4 className="text-lg font-bold text-foreground">{t('Recent Email Failures')}</h4>
                      <p className="text-muted-foreground text-sm">{t('Failed password resets, verification emails, and action tokens')}</p>
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
                            <p>{t('No recent email failures')}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.recentErrors.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono text-xs">{format(new Date(event.timestamp), 'MMM dd HH:mm:ss')}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {eventTypeIcon(event.type)}
                                <Badge variant="destructive">{EVENT_TYPE_LABELS[event.type] || event.type}</Badge>
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
