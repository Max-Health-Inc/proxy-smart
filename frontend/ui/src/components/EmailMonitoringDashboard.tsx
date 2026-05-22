import {
  KeyRound,
  Mail,
  ShieldCheck,
  Send,
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
  emailMonitoringService,
} from '../service/email-monitoring-service';

// ─── Config ───────────────────────────────────────────────────────────────────

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

const emailConfig: MonitoringDashboardConfig = {
  service: emailMonitoringService as unknown as MonitoringService,
  eventTypeLabels: EVENT_TYPE_LABELS,
  eventTypeIcon,
  headerIcon: Mail,
  headerTitle: 'Email Events Dashboard',
  headerDescription: 'Track password resets, email verifications, and action tokens',
  loadingMessage: 'Loading email events data...',
  bannerActiveTitle: 'Real-time Email Monitoring Active',
  bannerPausedTitle: 'Real-time Email Monitoring Paused',
  bannerActiveDescription: 'Email events are pushed in real time as they occur.',
  statCards: [
    { icon: BarChart3, label: 'Total Events', getValue: (a) => (a?.totalEvents ?? 0).toLocaleString(), subtitle: 'Last 24 hours', color: 'primary' },
    { icon: CheckCircle, label: 'Success Rate', getValue: (a) => `${(a?.successRate ?? 0).toFixed(1)}%`, subtitle: 'Delivered successfully', color: 'green' },
    { icon: KeyRound, label: 'Password Resets', getValue: (a) => ((a?.eventsByType?.['SEND_RESET_PASSWORD'] ?? 0) + (a?.eventsByType?.['SEND_RESET_PASSWORD_ERROR'] ?? 0)).toLocaleString(), subtitle: 'Reset emails sent', color: 'blue' },
    { icon: AlertTriangle, label: 'Failures', getValue: (a) => (a?.recentErrors?.length ?? 0).toString(), subtitle: 'Recent failed events', color: 'red' },
  ],
  activityChartTitle: 'Email Activity (24h)',
  pieChartIcon: Mail,
  pieChartTitle: 'Email Types',
  pieChartSubtitle: 'Distribution by email type',
  emptyEventsMessage: 'No email events found',
  failuresTitle: 'Recent Email Failures',
  failuresDescription: 'Failed password resets, verification emails, and action tokens',
  emptyFailuresMessage: 'No recent email failures',
  extraSearchFilter: (event, query) => !!(event.details?.email?.toLowerCase().includes(query)),
};

// ─── Component ───────────────────────────────────────────────────────────────

interface EmailMonitoringDashboardProps {
  embedded?: boolean;
  isRealTimeActive?: boolean;
}

export function EmailMonitoringDashboard({ embedded, isRealTimeActive }: EmailMonitoringDashboardProps) {
  return <MonitoringDashboard config={emailConfig} embedded={embedded} isRealTimeActive={isRealTimeActive} />;
}
