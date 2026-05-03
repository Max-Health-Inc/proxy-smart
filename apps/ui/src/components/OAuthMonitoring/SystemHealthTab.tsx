import { Badge, Button } from '@max-health-inc/shared-ui';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Shield,
  Timer,
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
} from 'recharts';
import type { SystemStatusResponse } from '../../lib/api-client/models/SystemStatusResponse';
import type { AccessHealthResponse } from '../../lib/api-client/models/AccessHealthResponse';
import type { AccessEvent } from '../../lib/api-client/models/AccessEvent';
import type { FhirUptimeSummary } from '../../lib/api-client/models/FhirUptimeSummary';
import type { OAuthAnalyticsResponse } from '../../lib/types/api';

interface SystemHealthTabProps {
  systemStatus: SystemStatusResponse | null;
  doorHealth: AccessHealthResponse | null;
  doorEvents: AccessEvent[];
  fhirUptime: FhirUptimeSummary[];
  analytics: OAuthAnalyticsResponse | null;
  fetchSystemStatus: () => void;
}

export function SystemHealthTab({
  systemStatus,
  doorHealth,
  doorEvents,
  fhirUptime,
  analytics,
  fetchSystemStatus,
}: SystemHealthTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* System Health Status Bar */}
      <div
        className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between ${
          systemStatus?.overall === 'healthy'
            ? 'bg-green-500/10 border-green-500/30'
            : systemStatus?.overall === 'degraded'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : systemStatus?.overall === 'unhealthy'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-card/70 border-border'
        }`}
      >
        <div className="flex items-center gap-3">
          {systemStatus?.overall === 'healthy' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {systemStatus?.overall === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
          {systemStatus?.overall === 'unhealthy' && <AlertCircle className="w-5 h-5 text-red-600" />}
          {!systemStatus && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
          <div>
            <p className="font-semibold text-foreground">
              {systemStatus
                ? t(systemStatus.overall.charAt(0).toUpperCase() + systemStatus.overall.slice(1))
                : t('Loading...')}
            </p>
            {systemStatus && (
              <p className="text-xs text-muted-foreground">
                v{systemStatus.version} · {t('Uptime')}: {Math.floor(systemStatus.uptime / 3600)}
                {t('h')} {Math.floor((systemStatus.uptime % 3600) / 60)}
                {t('m')}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSystemStatus}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KeycloakCard systemStatus={systemStatus} />
        <FhirServersCard systemStatus={systemStatus} />
        <MemoryCard systemStatus={systemStatus} activeTokens={analytics?.activeTokens ?? 0} />
        <DoorManagementCard doorHealth={doorHealth} doorEvents={doorEvents} />
      </div>

      {/* FHIR Server Uptime */}
      {fhirUptime.length > 0 && <FhirUptimePanel fhirUptime={fhirUptime} />}

      {/* Last Updated Footer */}
      {systemStatus && (
        <div className="bg-card/70 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-lg text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {t('Last updated')}:{' '}
            {(() => {
              try {
                return format(new Date(systemStatus.timestamp), 'MMM dd, HH:mm:ss');
              } catch {
                return systemStatus.timestamp;
              }
            })()}
          </span>
          <span>{t('Auto-refresh every 30s')}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-cards ─────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  const className =
    status === 'healthy'
      ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
      : status === 'degraded'
        ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
        : status
          ? 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
          : 'bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20';

  const Icon =
    status === 'healthy' ? CheckCircle : status === 'degraded' ? AlertTriangle : AlertCircle;

  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {status ? t(status.charAt(0).toUpperCase() + status.slice(1)) : t('Unknown')}
    </Badge>
  );
}

function KeycloakCard({ systemStatus }: { systemStatus: SystemStatusResponse | null }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Keycloak')}</h4>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Status')}</span>
          <StatusBadge status={systemStatus?.keycloak?.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Realm')}</span>
          <span className="font-bold text-foreground">{systemStatus?.keycloak?.realm ?? 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Accessible')}</span>
          <span className="font-bold text-foreground">
            {systemStatus?.keycloak?.accessible ? t('Yes') : t('No')}
          </span>
        </div>
        {systemStatus?.keycloak?.lastConnected && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">{t('Last Connected')}</span>
            <span className="text-xs text-muted-foreground">
              {(() => {
                try {
                  return format(new Date(systemStatus.keycloak.lastConnected), 'MMM dd, HH:mm');
                } catch {
                  return systemStatus.keycloak.lastConnected;
                }
              })()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FhirServersCard({ systemStatus }: { systemStatus: SystemStatusResponse | null }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
          <Server className="w-6 h-6 text-primary" />
        </div>
        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('FHIR Servers')}</h4>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Status')}</span>
          <StatusBadge status={systemStatus?.fhir?.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Servers')}</span>
          <span className="font-bold text-foreground">
            {systemStatus?.fhir
              ? `${systemStatus.fhir.healthyServers}/${systemStatus.fhir.totalServers} ${t('healthy')}`
              : 'N/A'}
          </span>
        </div>
        {systemStatus?.fhir?.servers?.map((server, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm border-t border-border pt-2"
          >
            <span className="text-muted-foreground truncate max-w-[60%]" title={server.url}>
              {server.name}
            </span>
            <Badge
              variant="secondary"
              className={
                server.status === 'healthy'
                  ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                  : server.status === 'degraded'
                    ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                    : 'bg-red-500/10 text-red-700 dark:text-red-300'
              }
            >
              {server.version ?? 'N/A'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryCard({
  systemStatus,
  activeTokens,
}: {
  systemStatus: SystemStatusResponse | null;
  activeTokens: number;
}) {
  const { t } = useTranslation();
  const usagePercent = systemStatus?.memory
    ? Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100)
    : 0;
  const usageRatio = systemStatus?.memory
    ? systemStatus.memory.used / systemStatus.memory.total
    : 0;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
          <Database className="w-6 h-6 text-purple-600" />
        </div>
        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Memory')}</h4>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Heap Used')}</span>
          <span className="font-bold text-foreground">
            {systemStatus?.memory ? `${systemStatus.memory.used} MB` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('RSS Total')}</span>
          <span className="font-bold text-foreground">
            {systemStatus?.memory ? `${systemStatus.memory.total} MB` : 'N/A'}
          </span>
        </div>
        {systemStatus?.memory && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('Usage')}</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usageRatio > 0.85
                    ? 'bg-red-500'
                    : usageRatio > 0.65
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Active Tokens')}</span>
          <span className="font-bold text-foreground">{activeTokens}</span>
        </div>
      </div>
    </div>
  );
}

function DoorManagementCard({
  doorHealth,
  doorEvents,
}: {
  doorHealth: AccessHealthResponse | null;
  doorEvents: AccessEvent[];
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
          <Shield className="w-6 h-6 text-orange-600" />
        </div>
        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Door Management')}</h4>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Provider')}</span>
          <span className="font-bold text-foreground">
            {doorHealth?.provider ?? t('Not configured')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('Status')}</span>
          <Badge
            className={
              doorHealth?.connected
                ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                : doorHealth?.configured
                  ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                  : 'bg-gray-500/10 text-gray-800 dark:text-gray-300 border-gray-500/20'
            }
          >
            {doorHealth?.connected && <CheckCircle className="w-3 h-3 mr-1" />}
            {doorHealth?.configured && !doorHealth.connected && (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {!doorHealth?.configured && <AlertCircle className="w-3 h-3 mr-1" />}
            {doorHealth?.connected
              ? t('Connected')
              : doorHealth?.configured
                ? t('Disconnected')
                : t('Not configured')}
          </Badge>
        </div>
        {doorEvents.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Recent Events')}</p>
            {doorEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between text-xs">
                <span
                  className="truncate max-w-[65%] text-foreground"
                  title={evt.message ?? evt.action}
                >
                  {evt.message ?? evt.action}
                </span>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {evt.createdAt
                    ? (() => {
                        try {
                          return format(new Date(evt.createdAt), 'HH:mm');
                        } catch {
                          return '';
                        }
                      })()
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FhirUptimePanel({ fhirUptime }: { fhirUptime: FhirUptimeSummary[] }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground tracking-tight">
            {t('FHIR Server Uptime')}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t('Background health checks every 30 seconds')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {fhirUptime.map((srv) => {
          const chartData = [...(srv.recentChecks ?? [])].reverse().map((c) => ({
            time: c.timestamp,
            ms: c.responseTimeMs,
            ok: c.status === 'healthy' ? 1 : 0,
          }));

          return (
            <div key={srv.serverUrl} className="border border-border/40 rounded-xl p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {srv.currentStatus === 'healthy' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {srv.currentStatus === 'degraded' && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  {srv.currentStatus === 'unhealthy' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-semibold text-foreground">{srv.serverName}</span>
                  <span className="text-xs text-muted-foreground font-mono">{srv.serverUrl}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Badge
                    className={
                      srv.uptimePercent >= 99
                        ? 'bg-green-500/10 text-green-800 dark:text-green-300 border-green-500/20'
                        : srv.uptimePercent >= 95
                          ? 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20'
                          : 'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                    }
                  >
                    {srv.uptimePercent.toFixed(2)}% {t('uptime')}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {srv.avgResponseTimeMs}
                    {t('ms avg')}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {srv.checksTotal} {t('checks')}
                  </span>
                </div>
              </div>

              {/* Response time chart */}
              {chartData.length > 1 && (
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" hide />
                      <YAxis
                        width={40}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => `${v}ms`}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        labelFormatter={(label) => {
                          try {
                            return format(new Date(String(label)), 'HH:mm:ss');
                          } catch {
                            return String(label);
                          }
                        }}
                        formatter={(value) => [`${value}ms`, t('Response')]}
                      />
                      <Line
                        type="monotone"
                        dataKey="ms"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Last error */}
              {srv.lastError && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/5 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{srv.lastError}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
