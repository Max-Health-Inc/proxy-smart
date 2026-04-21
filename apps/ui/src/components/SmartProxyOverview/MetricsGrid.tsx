import {
  Zap,
  Users,
  Database,
  Shield,
  BarChart3,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/ui/stat-card';
import type { DashboardData } from '../../lib/types/api';
import type { OAuthAnalyticsState } from './useDashboardData';

interface MetricsGridProps {
  dashboardData: DashboardData;
  oauthAnalytics: OAuthAnalyticsState;
}

export function MetricsGrid({ dashboardData, oauthAnalytics }: MetricsGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard
        icon={Zap}
        label={t('SMART Apps')}
        value={dashboardData.loading ? '...' : String(dashboardData.smartAppsCount)}
        subtitle={t('Active')}
        color="primary"
      />
      <StatCard
        icon={Users}
        label={t('Users')}
        value={dashboardData.loading ? '...' : String(dashboardData.usersCount)}
        subtitle={t('Registered')}
      />
      <StatCard
        icon={Database}
        label={t('FHIR Servers')}
        value={dashboardData.loading ? '...' : String(dashboardData.serversCount)}
        subtitle={t('Connected')}
      />
      <StatCard
        icon={Shield}
        label={t('Identity Providers')}
        value={dashboardData.loading ? '...' : String(dashboardData.identityProvidersCount)}
        subtitle={t('Active')}
      />
      <StatCard
        icon={BarChart3}
        label={t('OAuth Flows')}
        value={oauthAnalytics.loading ? '...' : oauthAnalytics.totalFlows.toLocaleString()}
        subtitle={t('Processed')}
      />
      <StatCard
        icon={CheckCircle}
        label={t('Success Rate')}
        value={
          oauthAnalytics.loading
            ? '...'
            : oauthAnalytics.totalFlows === 0
              ? '--'
              : `${oauthAnalytics.successRate.toFixed(1)}%`
        }
        subtitle={t('OAuth Success')}
      />
      <StatCard
        icon={Clock}
        label={t('Avg Response')}
        value={
          oauthAnalytics.loading
            ? '...'
            : oauthAnalytics.totalFlows === 0
              ? '--'
              : `${oauthAnalytics.averageResponseTime}ms`
        }
        subtitle={t('Performance')}
      />
      <StatCard
        icon={Shield}
        label={t('Active Tokens')}
        value={oauthAnalytics.loading ? '...' : oauthAnalytics.activeTokens.toLocaleString()}
        subtitle={t('Valid')}
      />
    </div>
  );
}
