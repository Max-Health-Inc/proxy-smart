import { Button } from '@proxy-smart/shared-ui';
import { Shield, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { KeycloakConfigForm } from '../KeycloakConfigForm';
import { config } from '@/config';
import { useDashboardData } from './useDashboardData';
import { DashboardHeader } from './DashboardHeader';
import { MetricsGrid } from './MetricsGrid';
import { SystemHealthPanel } from './SystemHealthPanel';
import { FhirServersPanel } from './FhirServersPanel';

interface SmartProxyOverviewProps {
    onNavigate: (tab: string) => void;
}

export function SmartProxyOverview({ onNavigate }: SmartProxyOverviewProps) {
    const { t } = useTranslation();
    const {
        profile,
        notification,
        setNotification,
        dashboardData,
        keycloakConfig,
        oauthAnalytics,
        fhirServersHealth,
        systemHealth,
        doorHealth,
        showKeycloakModal,
        setShowKeycloakModal,
        handleRefresh,
        handleServerShutdown,
        handleServerRestart,
        handleHealthCheck,
        handleKeycloakConfig,
        handleKeycloakSuccess,
        handleKeycloakCancel,
    } = useDashboardData();

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-3 border ${notification.type === 'success'
                    ? 'bg-card border-border text-foreground'
                    : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-foreground'
                    } animate-in slide-in-from-top-2 duration-300`}>
                    <div className="flex items-center space-x-2">
                        {notification.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-foreground" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className="font-medium">{notification.message}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotification(null)}
                            className="ml-2 h-6 w-6 p-0 text-current hover:bg-current/10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <DashboardHeader
                profile={profile}
                systemHealth={systemHealth}
                onRefresh={handleRefresh}
                onHealthCheck={handleHealthCheck}
                onRestart={handleServerRestart}
                onShutdown={handleServerShutdown}
            />

            {/* Key Metrics Cards */}
            <MetricsGrid dashboardData={dashboardData} oauthAnalytics={oauthAnalytics} />

            {/* System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SystemHealthPanel
                    systemHealth={systemHealth}
                    keycloakConfig={keycloakConfig}
                    doorHealth={doorHealth}
                    onKeycloakConfig={handleKeycloakConfig}
                />
                <FhirServersPanel
                    fhirServersHealth={fhirServersHealth}
                    onNavigate={onNavigate}
                />
            </div>

            {/* Enhanced Footer Info */}
            <div className="bg-card/90 border border-border/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 py-2 px-3 bg-muted/20">
                        <div className="w-7 h-7 bg-primary/10 flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Platform (UI) Version')}</div>
                            <div className="text-lg font-bold text-foreground">v{config.version}</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 py-2 px-3 bg-muted/20">
                        <div className="w-7 h-7 bg-foreground/10 flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-foreground" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Environment')}</div>
                            <div className="text-lg font-bold text-foreground">{config.app.environment.charAt(0).toUpperCase() + config.app.environment.slice(1)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Keycloak Configuration Modal */}
            <Dialog open={showKeycloakModal} onOpenChange={setShowKeycloakModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Shield className="w-5 h-5 text-primary" />
                            <span>{t('Dynamic Client Registration Setup')}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <KeycloakConfigForm
                            onSuccess={handleKeycloakSuccess}
                            onCancel={handleKeycloakCancel}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
