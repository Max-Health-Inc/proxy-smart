import { Button } from '@max-health-inc/shared-ui';
import {
    Activity,
    Shield,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SystemHealthState, KeycloakConfigState } from './useDashboardData';
import type { AccessHealthResponse } from '../../lib/api-client/models/AccessHealthResponse';

interface SystemHealthPanelProps {
    systemHealth: SystemHealthState;
    keycloakConfig: KeycloakConfigState;
    doorHealth: AccessHealthResponse | null;
    onKeycloakConfig: () => void;
}

export function SystemHealthPanel({
    systemHealth,
    keycloakConfig,
    doorHealth,
    onKeycloakConfig,
}: SystemHealthPanelProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-card/70 p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center mr-3">
                        <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground">{t('System Health')}</h3>
                </div>
                <Button
                    variant={keycloakConfig.hasAdminClient ? "default" : "outline"}
                    size="sm"
                    onClick={onKeycloakConfig}
                    className={`px-3 py-1.5 transition-all duration-200 ${
                        keycloakConfig.hasAdminClient
                            ? 'bg-foreground hover:bg-foreground/90 text-background border-transparent'
                            : 'bg-muted/50 hover:bg-muted border-border text-foreground'
                    }`}
                >
                    <Shield className="w-4 h-4 mr-2" />
                    {keycloakConfig.hasAdminClient ? t('Admin Client Config') : t('Setup Dynamic Registration')}
                </Button>
            </div>
            <div className="divide-y divide-border/50">
                <div className="space-y-4">
                    <HealthRow label={t('API Response Time')}>
                        <span className="text-foreground font-semibold flex items-center">
                            <div className="w-3 h-3 bg-foreground rounded-full mr-3 animate-pulse shadow-lg"></div>
                            {systemHealth.apiResponseTime > 0 ? `${systemHealth.apiResponseTime}ms` : '...'}
                        </span>
                    </HealthRow>
                    <HealthRow label={t('Keycloak Database')}>
                        <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-foreground mr-2" />
                            <span className="text-foreground font-semibold">
                                {systemHealth.databaseStatus === 'healthy' ? t('Healthy') : systemHealth.databaseStatus}
                            </span>
                        </div>
                    </HealthRow>
                    <HealthRow label={t('Dynamic Client Registration')}>
                        <div className="flex items-center">
                            {keycloakConfig.hasAdminClient ? (
                                <CheckCircle className="w-5 h-5 text-foreground mr-2" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-muted-foreground mr-2" />
                            )}
                            <span className={`font-semibold ${keycloakConfig.hasAdminClient ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {keycloakConfig.loading
                                    ? t('Checking...')
                                    : keycloakConfig.hasAdminClient
                                        ? t('Enabled')
                                        : t('Disabled')
                                }
                            </span>
                        </div>
                    </HealthRow>
                    <HealthRow label={t('Keycloak Realm')}>
                        <span className="text-foreground font-semibold">
                            {keycloakConfig.loading ? t('Loading...') : keycloakConfig.realm || t('Not Set')}
                        </span>
                    </HealthRow>
                    <HealthRow label={t('Keycloak URL')}>
                        <span className="text-foreground font-semibold text-xs">
                            {keycloakConfig.loading
                                ? t('Loading...')
                                : keycloakConfig.baseUrl
                                    ? keycloakConfig.baseUrl.replace(/\/$/, '')
                                    : t('Not Set')
                            }
                        </span>
                    </HealthRow>
                    <HealthRow label={t('Keycloak Last Connected')}>
                        <span className="text-foreground font-semibold">{systemHealth.keycloakLastConnected}</span>
                    </HealthRow>
                    <HealthRow label={t('System Uptime')}>
                        <span className="text-foreground font-semibold">{systemHealth.systemUptime}</span>
                    </HealthRow>
                    <HealthRow label={t('Memory Usage')}>
                        <span className="text-foreground font-semibold">{systemHealth.memoryUsage}</span>
                    </HealthRow>
                    <HealthRow label={t('Server Version')}>
                        <span className="text-foreground font-semibold">{systemHealth.serverVersion}</span>
                    </HealthRow>
                    <HealthRow label={t('Door Management')}>
                        <div className="flex items-center">
                            {doorHealth?.connected ? (
                                <CheckCircle className="w-5 h-5 text-foreground mr-2" />
                            ) : doorHealth?.configured ? (
                                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-muted-foreground mr-2" />
                            )}
                            <span className={`font-semibold ${
                                doorHealth?.connected
                                    ? 'text-foreground'
                                    : doorHealth?.configured
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-muted-foreground'
                            }`}>
                                {doorHealth?.connected
                                    ? `${doorHealth.provider} — ${t('Connected')}`
                                    : doorHealth?.configured
                                    ? `${doorHealth.provider} — ${t('Disconnected')}`
                                    : t('Not configured')}
                            </span>
                        </div>
                    </HealthRow>
                </div>
            </div>
        </div>
    );
}

function HealthRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center py-2 px-3 bg-muted/20">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}
