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
import type { DashboardData } from '../../lib/types/api';
import type { OAuthAnalyticsState } from './useDashboardData';

interface MetricsGridProps {
    dashboardData: DashboardData;
    oauthAnalytics: OAuthAnalyticsState;
}

export function MetricsGrid({ dashboardData, oauthAnalytics }: MetricsGridProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <MetricCard
                icon={<Zap className="w-3 h-3 text-primary" />}
                iconBg="bg-primary/10"
                label={t('SMART Apps')}
                value={dashboardData.loading ? '...' : String(dashboardData.smartAppsCount)}
                subtitle={t('Active')}
            />
            <MetricCard
                icon={<Users className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
                label={t('Users')}
                value={dashboardData.loading ? '...' : String(dashboardData.usersCount)}
                subtitle={t('Registered')}
            />
            <MetricCard
                icon={<Database className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
                label={t('FHIR Servers')}
                value={dashboardData.loading ? '...' : String(dashboardData.serversCount)}
                subtitle={t('Connected')}
            />
            <MetricCard
                icon={<Shield className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
                label={t('Identity Providers')}
                value={dashboardData.loading ? '...' : String(dashboardData.identityProvidersCount)}
                subtitle={t('Active')}
            />
            <MetricCard
                icon={<BarChart3 className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
                label={t('OAuth Flows')}
                value={oauthAnalytics.loading ? '...' : oauthAnalytics.totalFlows.toLocaleString()}
                subtitle={t('Processed')}
            />
            <MetricCard
                icon={<CheckCircle className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
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
            <MetricCard
                icon={<Clock className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
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
            <MetricCard
                icon={<Shield className="w-3 h-3 text-foreground" />}
                iconBg="bg-secondary"
                label={t('Active Tokens')}
                value={oauthAnalytics.loading ? '...' : oauthAnalytics.activeTokens.toLocaleString()}
                subtitle={t('Valid')}
            />
        </div>
    );
}

function MetricCard({ icon, iconBg, label, value, subtitle }: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string;
    subtitle: string;
}) {
    return (
        <div className="bg-card/70 p-3 border border-border/50 transition-colors duration-200">
            <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-6 h-6 ${iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <h3 className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground">{label}</h3>
            </div>
            <div className="text-lg font-light text-foreground">{value}</div>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
    );
}
