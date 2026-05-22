import {
  LogIn,
  LogOut,
  UserPlus,
  Key,
  Monitor,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  MonitoringDashboard,
  type MonitoringDashboardConfig,
  type MonitoringService,
} from './MonitoringDashboard';
import {
  authMonitoringService,
} from '../service/auth-monitoring-service';

// ─── Config ───────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGIN_ERROR: 'Login Error',
  LOGOUT: 'Logout',
  LOGOUT_ERROR: 'Logout Error',
  REGISTER: 'Register',
  REGISTER_ERROR: 'Register Error',
  CODE_TO_TOKEN: 'Code → Token',
  CODE_TO_TOKEN_ERROR: 'Code → Token Error',
  REFRESH_TOKEN: 'Refresh Token',
  REFRESH_TOKEN_ERROR: 'Refresh Token Error',
  CLIENT_LOGIN: 'Client Login',
  CLIENT_LOGIN_ERROR: 'Client Login Error',
  INTROSPECT_TOKEN: 'Introspect Token',
  INTROSPECT_TOKEN_ERROR: 'Introspect Error',
  GRANT_CONSENT: 'Grant Consent',
  GRANT_CONSENT_ERROR: 'Grant Consent Error',
  UPDATE_CONSENT: 'Update Consent',
  UPDATE_CONSENT_ERROR: 'Update Consent Error',
  REVOKE_GRANT: 'Revoke Grant',
  REVOKE_GRANT_ERROR: 'Revoke Grant Error',
};

function eventTypeIcon(type: string) {
  if (type.startsWith('LOGIN') || type.startsWith('CLIENT_LOGIN')) return <LogIn className="w-4 h-4" />;
  if (type.startsWith('LOGOUT')) return <LogOut className="w-4 h-4" />;
  if (type.startsWith('REGISTER')) return <UserPlus className="w-4 h-4" />;
  if (type.startsWith('CODE_TO_TOKEN') || type.startsWith('REFRESH_TOKEN') || type.startsWith('INTROSPECT')) return <Key className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

const authConfig: MonitoringDashboardConfig = {
  service: authMonitoringService as unknown as MonitoringService,
  eventTypeLabels: EVENT_TYPE_LABELS,
  eventTypeIcon,
  headerIcon: LogIn,
  headerTitle: 'Auth Events Dashboard',
  headerDescription: 'Track logins, logouts, registrations, and token exchanges',
  loadingMessage: 'Loading auth events data...',
  bannerActiveTitle: 'Real-time Auth Monitoring Active',
  bannerPausedTitle: 'Real-time Auth Monitoring Paused',
  bannerActiveDescription: 'Authentication events are pushed in real time as they occur.',
  statCards: [
    { icon: BarChart3, label: 'Total Events', getValue: (a) => (a?.totalEvents ?? 0).toLocaleString(), subtitle: 'Last 24 hours', color: 'primary' },
    { icon: CheckCircle, label: 'Success Rate', getValue: (a) => `${(a?.successRate ?? 0).toFixed(1)}%`, subtitle: 'Successful auth events', color: 'green' },
    { icon: LogIn, label: 'Login Events', getValue: (a) => ((a?.eventsByType?.['LOGIN'] ?? 0) + (a?.eventsByType?.['LOGIN_ERROR'] ?? 0)).toLocaleString(), subtitle: 'Logins + errors', color: 'blue' },
    { icon: AlertTriangle, label: 'Failures', getValue: (a) => (a?.recentErrors?.length ?? 0).toString(), subtitle: 'Recent failed events', color: 'red' },
  ],
  activityChartTitle: 'Auth Activity (24h)',
  pieChartIcon: Key,
  pieChartTitle: 'Event Types',
  pieChartSubtitle: 'Distribution by event type',
  emptyEventsMessage: 'No auth events found',
  failuresTitle: 'Recent Auth Failures',
  failuresDescription: 'Failed logins, expired tokens, rejected registrations',
  emptyFailuresMessage: 'No recent auth failures',
  showTopClients: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface AuthMonitoringDashboardProps {
  embedded?: boolean;
  isRealTimeActive?: boolean;
}

export function AuthMonitoringDashboard({ embedded, isRealTimeActive }: AuthMonitoringDashboardProps) {
  return <MonitoringDashboard config={authConfig} embedded={embedded} isRealTimeActive={isRealTimeActive} />;
}
