import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@proxy-smart/shared-ui';
import { StatCard } from '../ui/stat-card';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Database,
  Server,
  Timer,
  TrendingUp,
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
} from 'recharts';

interface FhirProxyEvent {
  id: string;
  timestamp: string;
  serverName: string;
  method: string;
  resourcePath: string;
  resourceType: string;
  statusCode: number;
  responseTimeMs: number;
  clientId?: string;
  error?: string;
}

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
  recentErrors: FhirProxyEvent[];
  hourlyStats: Array<{
    hour: string;
    total: number;
    success: number;
    errors: number;
    rateLimited: number;
    avgMs: number;
  }>;
}

interface FhirProxyTabProps {
  fhirProxyAnalytics: FhirProxyAnalytics | null;
}

export function FhirProxyTab({ fhirProxyAnalytics }: FhirProxyTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={BarChart3}
          label={t('Total Requests')}
          value={fhirProxyAnalytics?.totalRequests?.toLocaleString() ?? '0'}
          subtitle={t('Last 24 hours')}
          color="primary"
        />
        <StatCard
          icon={TrendingUp}
          label={t('Success Rate')}
          value={`${fhirProxyAnalytics?.successRate?.toFixed(1) ?? '0.0'}%`}
          subtitle={t('2xx/3xx responses')}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('Top Error')}
          value={(() => {
            const statuses = fhirProxyAnalytics?.requestsByStatus;
            if (!statuses) return t('None');
            const errorEntries = Object.entries(statuses)
              .filter(([code]) => Number(code) >= 400)
              .sort(([, a], [, b]) => b - a);
            if (!errorEntries.length) return t('None');
            const [code, count] = errorEntries[0];
            return `${code} (${count})`;
          })()}
          subtitle={(() => {
            const statuses = fhirProxyAnalytics?.requestsByStatus;
            if (!statuses) return t('No errors');
            const errorEntries = Object.entries(statuses)
              .filter(([code]) => Number(code) >= 400)
              .sort(([, a], [, b]) => b - a);
            if (!errorEntries.length) return t('No errors');
            const code = Number(errorEntries[0][0]);
            const labels: Record<number, string> = {
              400: 'Bad Request',
              401: 'Unauthorized',
              403: 'Forbidden',
              404: 'Not Found',
              408: 'Timeout',
              410: 'Gone',
              412: 'Precondition Failed',
              429: 'Too Many Requests',
              500: 'Internal Server Error',
              502: 'Bad Gateway',
              503: 'Service Unavailable',
            };
            return labels[code] ?? `HTTP ${code}`;
          })()}
          color="orange"
        />
        <StatCard
          icon={Timer}
          label={t('Avg Response')}
          value={`${fhirProxyAnalytics?.avgResponseTimeMs ?? 0}ms`}
          subtitle={t('Average latency')}
          color="purple"
        />
      </div>

      {/* Hourly Request Volume Chart */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground tracking-tight">
              {t('Request Volume')}
            </h4>
            <p className="text-muted-foreground font-medium">
              {t('Hourly request breakdown over last 24 hours')}
            </p>
          </div>
        </div>
        <div className="h-[300px]">
          {fhirProxyAnalytics?.hourlyStats && fhirProxyAnalytics.hourlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fhirProxyAnalytics.hourlyStats.map((h) => ({
                  ...h,
                  hour: (() => {
                    try {
                      return format(new Date(h.hour), 'HH:mm');
                    } catch {
                      return h.hour;
                    }
                  })(),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar
                  dataKey="success"
                  stackId="a"
                  fill="var(--color-green-500, #22c55e)"
                  name={t('Success')}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="errors"
                  stackId="a"
                  fill="var(--color-red-500, #ef4444)"
                  name={t('Errors')}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="rateLimited"
                  stackId="a"
                  fill="var(--color-orange-500, #f97316)"
                  name={t('429s')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>{t('No FHIR proxy request data available')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Resource Type */}
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-lg font-bold text-foreground tracking-tight">
              {t('By Resource Type')}
            </h4>
          </div>
          {fhirProxyAnalytics?.requestsByResource &&
          Object.keys(fhirProxyAnalytics.requestsByResource).length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {Object.entries(fhirProxyAnalytics.requestsByResource)
                .sort(([, a], [, b]) => b - a)
                .map(([resource, count]) => (
                  <div
                    key={resource}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-foreground">{resource}</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      {count.toLocaleString()}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('No resource data available')}</p>
          )}
        </div>

        {/* Status Code Breakdown */}
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-lg font-bold text-foreground tracking-tight">
              {t('Status Codes')}
            </h4>
          </div>
          {fhirProxyAnalytics?.requestsByStatus &&
          Object.keys(fhirProxyAnalytics.requestsByStatus).length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {Object.entries(fhirProxyAnalytics.requestsByStatus)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([code, count]) => {
                  const status = Number(code);
                  const badgeClass =
                    status < 300
                      ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                      : status < 400
                        ? 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20'
                        : status === 429
                          ? 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/20'
                          : 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20';
                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium text-foreground">HTTP {code}</span>
                      <Badge className={badgeClass}>{count.toLocaleString()}</Badge>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('No status code data available')}</p>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      {fhirProxyAnalytics?.recentErrors && fhirProxyAnalytics.recentErrors.length > 0 && (
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">
                {t('Recent Errors')}
              </h4>
              <p className="text-muted-foreground text-sm">
                {t('Last 20 failed FHIR proxy requests')}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Time')}</TableHead>
                  <TableHead>{t('Server')}</TableHead>
                  <TableHead>{t('Method')}</TableHead>
                  <TableHead>{t('Path')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Latency')}</TableHead>
                  <TableHead>{t('Client')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fhirProxyAnalytics.recentErrors.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {(() => {
                        try {
                          return format(new Date(evt.timestamp), 'HH:mm:ss');
                        } catch {
                          return evt.timestamp;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{evt.serverName}</TableCell>
                    <TableCell>
                      <Badge className="text-xs">{evt.method}</Badge>
                    </TableCell>
                    <TableCell
                      className="text-xs font-mono max-w-[200px] truncate"
                      title={evt.resourcePath}
                    >
                      {evt.resourcePath}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          evt.statusCode === 429
                            ? 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/20'
                            : 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                        }
                      >
                        {evt.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{evt.responseTimeMs}ms</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {evt.clientId ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
