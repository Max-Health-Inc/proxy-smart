import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@max-health-inc/shared-ui';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '../ui/page-loading-state';
import { PageErrorState } from '../ui/page-error-state';
import { ExportMenu } from '../ui/export-menu';
import { RealTimeBanner } from '../ui/realtime-banner';
import { RefreshCw, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  adminAuditService,
  type AdminAuditEvent,
  type AdminAuditAnalytics,
} from '../../service/admin-audit-service';
import { OverviewTab } from './OverviewTab';
import { EventLogTab } from './EventLogTab';
import { AnalyticsTab } from './AnalyticsTab';
import { FailuresTab } from './FailuresTab';

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
  }, [analytics]);

  const actionPieData = useMemo(() => {
    if (!analytics?.actionsByType) return [];
    return Object.entries(analytics.actionsByType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

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
            <ResponsiveTabsList columns={4}>
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Overview')}</TabsTrigger>
              <TabsTrigger value="events" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Event Log')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Analytics')}</TabsTrigger>
              <TabsTrigger value="failures" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Failures')}</TabsTrigger>
            </ResponsiveTabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewTab analytics={analytics} />
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <EventLogTab
                events={events}
                filteredEvents={filteredEvents}
                uniqueResources={uniqueResources}
                filterAction={filterAction}
                setFilterAction={setFilterAction}
                filterResource={filterResource}
                setFilterResource={setFilterResource}
                filterSuccess={filterSuccess}
                setFilterSuccess={setFilterSuccess}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsTab
                analytics={analytics}
                actionPieData={actionPieData}
                resourcePieData={resourcePieData}
              />
            </TabsContent>

            <TabsContent value="failures" className="space-y-6">
              <FailuresTab analytics={analytics} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
