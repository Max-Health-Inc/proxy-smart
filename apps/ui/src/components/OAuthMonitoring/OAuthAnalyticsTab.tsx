import { Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@max-health-inc/shared-ui';
import { StatCard } from '../ui/stat-card';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Search,
  Shield,
  Timer,
  TrendingUp,
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
} from 'recharts';
import type { OAuthAnalyticsResponse, OAuthEvent, OAuthWeekdayInsight } from '../../lib/types/api';
import type { OAuthAnalyticsTopClient } from '../../lib/api-client/models/OAuthAnalyticsTopClient';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';

type PieClientDatum = OAuthAnalyticsTopClient & Record<string, unknown>;

interface OAuthAnalyticsTabProps {
  analytics: OAuthAnalyticsResponse | null;
  events: OAuthEvent[];
  filteredEvents: OAuthEvent[];
  filterType: string;
  setFilterType: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}

export function OAuthAnalyticsTab({
  analytics,
  events,
  filteredEvents,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  searchTerm,
  setSearchTerm,
}: OAuthAnalyticsTabProps) {
  const { t } = useTranslation();

  // ── derived data ──────────────────────────────────────────────────
  const clientDistributionData = useMemo<PieClientDatum[]>(() => {
    if (!analytics?.topClients?.length) return [];
    return analytics.topClients.map((client) => ({ ...client, name: client.clientName }));
  }, [analytics]);

  const hasClientDistribution = clientDistributionData.length > 0;
  const predictiveInsights = analytics?.predictiveInsights;
  const hasObservedTraffic = (analytics?.successfulRequests ?? 0) + (analytics?.failedRequests ?? 0) > 0;
  const hasPredictiveForecast = Boolean(
    predictiveInsights &&
      (hasObservedTraffic ||
        (analytics?.totalRequests ?? 0) > 0 ||
        (analytics?.activeTokens ?? 0) > 0 ||
        (analytics?.successRate ?? 0) > 0 ||
        predictiveInsights.nextHour.totalFlows > 0),
  );

  const weekdayHighlights = useMemo(() => {
    const insights = analytics?.weekdayInsights ?? [];
    if (!insights.length) return null;

    const summary = insights.reduce(
      (acc, insight) => {
        if (!acc.busiest || insight.projectedTotal > acc.busiest.projectedTotal)
          acc.busiest = insight;
        if (!acc.highestSuccess || insight.projectedSuccessRate > acc.highestSuccess.projectedSuccessRate)
          acc.highestSuccess = insight;
        if (!acc.attention || insight.projectedSuccessRate < acc.attention.projectedSuccessRate)
          acc.attention = insight;
        if (insight.lastObserved) {
          const observedTs = new Date(insight.lastObserved).getTime();
          if (!Number.isNaN(observedTs) && (!acc.latestObserved || observedTs > acc.latestObserved.ts))
            acc.latestObserved = { ts: observedTs, iso: insight.lastObserved };
        }
        return acc;
      },
      {
        busiest: undefined as OAuthWeekdayInsight | undefined,
        highestSuccess: undefined as OAuthWeekdayInsight | undefined,
        attention: undefined as OAuthWeekdayInsight | undefined,
        latestObserved: undefined as { ts: number; iso: string } | undefined,
      },
    );

    if (!summary.busiest || !summary.highestSuccess || !summary.attention) return null;

    return {
      busiest: summary.busiest,
      highestSuccess: summary.highestSuccess,
      attention: summary.attention,
      lastObserved: summary.latestObserved?.iso,
    };
  }, [analytics?.weekdayInsights]);

  const weekdayLastObservedLabel = useMemo(() => {
    if (!weekdayHighlights?.lastObserved) return null;
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <StatCard
          icon={BarChart3}
          label={t('Total Requests')}
          value={analytics?.totalRequests ? analytics.totalRequests.toLocaleString() : '0'}
          subtitle={t('Last 24 hours')}
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          label={t('Success Rate')}
          value={`${analytics?.successRate ? analytics.successRate.toFixed(1) : '0.0'}%`}
          subtitle={t('Current success rate')}
          color="green"
        />
        <StatCard
          icon={Timer}
          label={t('Avg Response Time')}
          value={`${analytics?.averageResponseTime ? analytics.averageResponseTime.toFixed(0) : '0'}ms`}
          subtitle={t('Average response time')}
          color="orange"
        />
        <StatCard
          icon={Shield}
          label={t('Active Tokens')}
          value={analytics?.activeTokens ?? 0}
          subtitle={t('Currently valid')}
          color="purple"
        />

        {/* Predictive Forecast Card */}
        {hasPredictiveForecast && predictiveInsights && (
          <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg overflow-hidden">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <TrendingUp className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-300 tracking-wide">
                {t('Predictive Forecast')}
              </h3>
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
                <p className="text-foreground font-semibold">
                  {predictiveInsights.nextHour.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground font-medium">{t('Trend')}</p>
                <p className="text-foreground font-semibold">{predictiveTrendLabel}</p>
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-sky-500/10 p-3">
              <Badge className={`${predictiveRiskBadgeClass} font-semibold shrink-0`}>
                {predictiveRiskLabel}
              </Badge>
              <p className="text-xs text-muted-foreground leading-snug text-right">
                {predictiveInsights.anomalyReasons[0]}
              </p>
            </div>
          </div>
        )}

        {/* Weekday Patterns Card */}
        {weekdayHighlights && (
          <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg overflow-hidden">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <CalendarDays className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 tracking-wide">
                {t('Weekday Patterns')}
              </h3>
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
                <p className="text-foreground font-semibold mt-1">
                  {weekdayHighlights.highestSuccess.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {weekdayHighlights.highestSuccess.projectedSuccessRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground font-medium">{t('Watchlist')}</p>
                <p className="text-foreground font-semibold mt-1">
                  {weekdayHighlights.attention.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {weekdayHighlights.attention.projectedErrorRate.toFixed(1)}%
                  {typeof weekdayHighlights.attention.deltaFromAverage === 'number' && (
                    <span
                      className={`ml-1 ${weekdayHighlights.attention.deltaFromAverage > 0 ? 'text-red-500' : 'text-green-600'}`}
                    >
                      ({weekdayHighlights.attention.deltaFromAverage > 0 ? '+' : ''}
                      {weekdayHighlights.attention.deltaFromAverage.toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <Badge
                variant="secondary"
                className="bg-white/40 dark:bg-black/30 text-foreground border border-white/40 dark:border-white/20"
              >
                {weekdayHighlights.busiest.sampleDays} {t('days sampled')}
              </Badge>
              {weekdayLastObservedLabel && (
                <span>
                  {t('Last observed')} · {weekdayLastObservedLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flow Activity (24h) */}
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">
                {t('Flow Activity (24h)')}
              </h4>
              <p className="text-muted-foreground font-medium">{t('OAuth flows over time')}</p>
            </div>
          </div>
          <div className="h-[300px]">
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
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--primary)' }}
                    activeDot={{ r: 5, fill: 'var(--primary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={BarChart3} title={t('No flow activity data available')} className="py-8" />
              </div>
            )}
          </div>
        </div>

        {/* Top Applications */}
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">
                {t('Top Applications')}
              </h4>
              <p className="text-muted-foreground font-medium">{t('Most active OAuth clients')}</p>
            </div>
          </div>
          <div className="space-y-4">
            {analytics?.topClients && analytics.topClients.length > 0 ? (
              analytics.topClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{client.clientName}</p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {client.count} {t('flows')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        client.successRate > 95
                          ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                      }
                    >
                      {client.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Shield} title={t('No client activity data available')} description={t('OAuth client statistics will appear here once data is collected')} />
            )}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div
        className={`grid grid-cols-1 ${predictiveInsights ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}
      >
        {/* Success vs Errors */}
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">
                {t('Success vs Errors')}
              </h4>
              <p className="text-muted-foreground font-medium">
                {t('OAuth flow success over time')}
              </p>
            </div>
          </div>
          <div className="h-[300px]">
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
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="success" fill="var(--primary)" />
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
              <h4 className="text-lg font-bold text-foreground tracking-tight">
                {t('Client Distribution')}
              </h4>
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
                    fill="var(--primary)"
                    dataKey="count"
                    label={({ payload }) => `${payload?.clientName}: ${payload?.count}`}
                  >
                    {clientDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${(index * 45) % 360}, 70%, 50%)`}
                      />
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
                <p className="text-muted-foreground">
                  {t('No client distribution data available')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Predictive Insights Panel */}
        {predictiveInsights && (
          <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground tracking-tight">
                  {t('Predictive Insights')}
                </h4>
                <p className="text-muted-foreground font-medium">
                  {t('Early warning indicators for OAuth reliability')}
                </p>
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
                <span className="text-foreground font-semibold">
                  {Math.round(predictiveInsights.trendConfidence * 100)}%
                </span>
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

      {/* Filter Controls */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <h4 className="text-lg font-bold text-foreground tracking-tight">
            {t('Filter OAuth Flows')}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">{t('Type:')}</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px]">
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
              <SelectTrigger className="w-full sm:w-[160px]">
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
              className="w-full sm:min-w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground tracking-tight">
              {t('Recent OAuth Events')}
            </h4>
            <p className="text-muted-foreground font-medium">
              {t('Showing {{count}} of {{total}} events', {
                count: filteredEvents.length,
                total: events.length,
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
                <p className="text-sm">
                  {t('Showing first 50 events of {{total}}', { total: filteredEvents.length })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={Activity} title={t('No events match your filters')} description={t('Try adjusting your filter criteria')} />
        )}
      </div>
    </div>
  );
}
