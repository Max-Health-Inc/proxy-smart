import { Button } from '@proxy-smart/shared-ui';
import {
    Stethoscope,
    RefreshCw,
    Heart,
    RotateCcw,
    Power,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SystemHealthState } from './useDashboardData';

interface DashboardHeaderProps {
    profile: { firstName?: string; lastName?: string; username?: string } | null;
    systemHealth: SystemHealthState;
    onRefresh: () => void;
    onHealthCheck: () => void;
    onRestart: () => void;
    onShutdown: () => void;
}

export function DashboardHeader({
    profile,
    systemHealth,
    onRefresh,
    onHealthCheck,
    onRestart,
    onShutdown,
}: DashboardHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-muted/50 p-4 border border-border/50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div className="flex-1">
                    <h1 className="text-xl font-light text-foreground mb-1 tracking-tight">
                        {t('Proxy Smart Dashboard')}
                    </h1>
                    <div className="text-muted-foreground flex items-center text-sm">
                        <div className="w-6 h-6 bg-primary/10 flex items-center justify-center mr-2">
                            <Stethoscope className="w-3.5 h-3.5 text-primary" />
                        </div>
                        {t('Welcome back, {{name}}', {
                            name: profile?.firstName && profile?.lastName
                                ? `${profile.firstName} ${profile.lastName}`
                                : profile?.username || t('Healthcare Administrator'),
                        })}
                    </div>

                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={onRefresh}>
                        <RefreshCw className="w-4 h-4" />
                        {t('Refresh')}
                    </Button>
                    <Button variant="outline" onClick={onHealthCheck}>
                        <Heart className="w-4 h-4" />
                        {t('Health')}
                    </Button>
                    <Button variant="outline" onClick={onRestart}>
                        <RotateCcw className="w-4 h-4" />
                        {t('Restart')}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={onShutdown}>
                        <Power className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
