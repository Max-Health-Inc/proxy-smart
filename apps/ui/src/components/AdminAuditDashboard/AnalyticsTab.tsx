import { CHART_COLORS } from '@proxy-smart/shared-ui';
import {
  TrendingUp,
  Zap,
  Shield,
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
import type { AdminAuditAnalytics } from '../../service/admin-audit-service';

interface AnalyticsTabProps {
  analytics: AdminAuditAnalytics | null;
  actionPieData: { name: string; value: number }[];
  resourcePieData: { name: string; value: number }[];
}

export function AnalyticsTab({ analytics, actionPieData, resourcePieData }: AnalyticsTabProps) {
  const { t } = useTranslation();

  return (
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
  );
}
