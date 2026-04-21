import { Badge } from '@proxy-smart/shared-ui';
import { StatCard } from '../ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BarChart3,
  CheckCircle,
  TrendingUp,
  UserCheck,
  AlertTriangle,
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
} from 'recharts';
import type { AdminAuditAnalytics } from '../../service/admin-audit-service';

interface OverviewTabProps {
  analytics: AdminAuditAnalytics | null;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
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
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={BarChart3} title={t('No activity data available')} className="py-8" />
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
              <EmptyState icon={UserCheck} title={t('No actor data available')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
