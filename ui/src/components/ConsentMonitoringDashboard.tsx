import { useState, useEffect, useCallback, useRef } from 'react';
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
  Play,
  Pause,
  Download,
  Search,
  ShieldCheck,
  ShieldX,
  Database,
  ChevronDown,
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
import { getItem } from '../lib/storage';
import { ConsentSettings } from './ConsentSettings';

// ─── Types (mirror backend) ─────────────────────────────────────────

interface ConsentDecisionEvent {
  id: string;
  timestamp: string;
  decision: 'permit' | 'deny';
  enforced: boolean;
  mode: 'enforce' | 'audit-only' | 'disabled';
  consentId: string | null;
  patientId: string | null;
  clientId: string;
  resourceType: string | null;
  resourcePath: string;
  serverName: string;
  method: string;
  reason: string;
  cached: boolean;
  checkDurationMs: number;
  ial?: {
    allowed: boolean;
    actualLevel: string | null;
    requiredLevel: string;
    isSensitiveResource: boolean;
  } | null;
}

interface ConsentAnalytics {
  totalDecisions: number;
  permitRate: number;
  denyRate: number;
  averageCheckDuration: number;
  cacheHitRate: number;
  decisionsByMode: Record<string, number>;
  decisionsByResourceType: Record<string, { permit: number; deny: number }>;
  topDeniedClients: Array<{ clientId: string; denyCount: number }>;
  topDeniedPatients: Array<{ patientId: string; denyCount: number }>;
  hourlyStats: Array<{ hour: string; permit: number; deny: number; total: number }>;
  timestamp?: string;
}

// ─── API helpers ─────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    const tokens = await getItem<{ access_token: string }>('openid_tokens');
    return tokens?.access_token || null;
  } catch {
    return null;
  }
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

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
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isRealTimeActiveRef = useRef(isRealTimeActive);
  const eventSourceRef = useRef<EventSource | null>(null);
  const analyticsSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    isRealTimeActiveRef.current = isRealTimeActive;
  }, [isRealTimeActive]);

  // ─── Fetch initial data via REST ────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('No authentication token available. Please log in.');
        return;
      }

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

      setEvents(eventsData.events || []);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consent monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── SSE real-time connections ──────────────────────────────────

  const connectSSE = useCallback(async () => {
    // Close existing connections
    eventSourceRef.current?.close();
    analyticsSourceRef.current?.close();

    const token = await getToken();
    if (!token) return;

    // SSE for events
    const eventsUrl = `${config.api.baseUrl}/monitoring/consent/events/stream?token=${encodeURIComponent(token)}`;
    const evtSource = new EventSource(eventsUrl);

    evtSource.onmessage = (msg) => {
      if (!isRealTimeActiveRef.current) return;
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'connection' || data.type === 'keepalive') return;
        setEvents(prev => [data as ConsentDecisionEvent, ...prev.slice(0, 999)]);
      } catch { /* skip malformed */ }
    };

    evtSource.onerror = () => {
      // SSE will auto-reconnect; no action needed
    };

    eventSourceRef.current = evtSource;

    // SSE for analytics
    const analyticsUrl = `${config.api.baseUrl}/monitoring/consent/analytics/stream?token=${encodeURIComponent(token)}`;
    const anlSource = new EventSource(analyticsUrl);

    anlSource.onmessage = (msg) => {
      if (!isRealTimeActiveRef.current) return;
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'keepalive') return;
        if (data.totalDecisions !== undefined) setAnalytics(data as ConsentAnalytics);
      } catch { /* skip malformed */ }
    };

    analyticsSourceRef.current = anlSource;
  }, []);

  // ─── Lifecycle ─────────────────────────────────────────────────

  useEffect(() => {
    fetchData().then(() => connectSSE());
    return () => {
      eventSourceRef.current?.close();
      analyticsSourceRef.current?.close();
    };
  }, [fetchData, connectSSE]);

  // Pause / resume SSE
  useEffect(() => {
    if (!isRealTimeActive) {
      eventSourceRef.current?.close();
      analyticsSourceRef.current?.close();
      eventSourceRef.current = null;
      analyticsSourceRef.current = null;
    } else {
      connectSSE();
    }
  }, [isRealTimeActive, connectSSE]);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element).closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

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
      const token = await getToken();
      if (!token) { setError('Not authenticated'); return; }

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
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">{t('Loading consent monitoring data...')}</p>
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
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('Failed to Load Consent Monitoring')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Try Again')}
            </Button>
          </div>
        </div>
      </div>
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
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Refresh')}
            </Button>
            <div className="relative export-menu-container">
              <Button variant="outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download className="w-4 h-4 mr-2" />
                {t('Export')}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-background border border-border rounded-2xl shadow-xl z-50">
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      onClick={() => { exportAnalytics(); setShowExportMenu(false); }}
                      className="w-full text-left justify-start h-auto px-4 py-3 rounded-xl"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{t('Export Current Data')}</div>
                        <div className="text-sm text-muted-foreground">{t('Download current dashboard analytics')}</div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { exportServerEvents(); setShowExportMenu(false); }}
                      className="w-full text-left justify-start h-auto px-4 py-3 rounded-xl"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{t('Export Server Events')}</div>
                        <div className="text-sm text-muted-foreground">{t('Download events log from server (JSONL)')}</div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Real-time status banner — only shown in standalone mode */}
      {!embedded && (
      <div className={`bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 shadow-sm">
              {isRealTimeActive ? (
                <Activity className="h-5 w-5 text-green-600 animate-pulse" />
              ) : (
                <Pause className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-1 ${
                isRealTimeActive ? 'text-green-900 dark:text-green-300' : 'text-orange-900 dark:text-orange-300'
              }`}>
                {isRealTimeActive ? t('Real-time Monitoring Active') : t('Real-time Monitoring Paused')}
              </h3>
              <p className={`font-medium ${
                isRealTimeActive ? 'text-green-800 dark:text-green-400' : 'text-orange-800 dark:text-orange-400'
              }`}>
                {isRealTimeActive
                  ? t('Consent decisions are pushed in real time as they occur.')
                  : t('Real-time updates are paused. Click Resume to continue monitoring.')}
              </p>
            </div>
          </div>
          <Badge className={
            isRealTimeActive
              ? 'bg-green-500/20 text-green-800 dark:text-green-300 border-green-500/30 font-semibold'
              : 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold'
          }>
            {isRealTimeActive ? 'SSE Active' : 'Paused'}
          </Badge>
        </div>
      </div>
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
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-t-2xl">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Decisions')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="denied" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Denied Access')}</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Settings')}</TabsTrigger>
            </TabsList>

            {/* ─── Overview ──────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
                {/* Total Decisions */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-primary tracking-wide">{t('Total Decisions')}</h3>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {(analytics?.totalDecisions ?? 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{t('Last 24 hours')}</p>
                </div>

                {/* Permit Rate */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">{t('Permit Rate')}</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-300 mb-2">
                    {(analytics?.permitRate ?? 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">{t('Allowed access requests')}</p>
                </div>

                {/* Deny Rate */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <ShieldX className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 tracking-wide">{t('Deny Rate')}</h3>
                  </div>
                  <div className="text-3xl font-bold text-red-900 dark:text-red-300 mb-2">
                    {(analytics?.denyRate ?? 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{t('Blocked access requests')}</p>
                </div>

                {/* Avg Check Duration */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Timer className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">{t('Avg Check Time')}</h3>
                  </div>
                  <div className="text-3xl font-bold text-orange-900 dark:text-orange-300 mb-2">
                    {(analytics?.averageCheckDuration ?? 0).toFixed(0)}ms
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">{t('Average consent check')}</p>
                </div>

                {/* Cache Hit Rate */}
                <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                      <Database className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">{t('Cache Hit Rate')}</h3>
                  </div>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-2">
                    {(analytics?.cacheHitRate ?? 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">{t('Served from cache')}</p>
                </div>
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
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
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
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium">{t('No consent activity data available')}</p>
                        </div>
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
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="permit" name={t('Permit')} fill="#10b981" stackId="a" />
                          <Bar dataKey="deny" name={t('Deny')} fill="#ef4444" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium">{t('No resource type data available')}</p>
                        </div>
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
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">{t('Decision:')}</label>
                    <Select value={filterDecision} onValueChange={setFilterDecision}>
                      <SelectTrigger className="w-[140px]">
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
                      <SelectTrigger className="w-[160px]">
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
                                {event.cached && <span className="ml-1" title="Served from cache">⚡</span>}
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
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">{t('No events match your filters')}</p>
                    <p className="text-sm mt-2">{t('Try adjusting your filter criteria')}</p>
                  </div>
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
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="permit" name={t('Permit')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="deny" name={t('Deny')} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="total" name={t('Total')} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
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
                            fill="hsl(var(--primary))"
                            dataKey="value"
                            label={({ payload }) => `${payload?.name}: ${payload?.value}`}
                          >
                            {modeData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
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
                      <div className="text-center text-muted-foreground py-8">
                        <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="font-medium">{t('No denied client requests')}</p>
                        <p className="text-sm mt-2">{t('All clients are accessing resources within their consent scope')}</p>
                      </div>
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
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="font-medium">{t('No denied patient requests')}</p>
                        <p className="text-sm mt-2">{t('All patient data access has been within consent scope')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Settings ──────────────────────────────────── */}
            <TabsContent value="settings" className="space-y-6">
              <ConsentSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
