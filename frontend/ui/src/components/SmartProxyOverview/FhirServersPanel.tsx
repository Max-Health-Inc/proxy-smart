import { Button } from '@proxy-smart/shared-ui';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Database,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FhirServersHealthState } from './useDashboardData';

interface FhirServersPanelProps {
    fhirServersHealth: FhirServersHealthState;
    onNavigate: (tab: string) => void;
}

export function FhirServersPanel({ fhirServersHealth, onNavigate }: FhirServersPanelProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-card/70 p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500/10 dark:bg-orange-400/20 flex items-center justify-center mr-3">
                        <Database className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground">{t('FHIR Servers Health')}</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('servers')}
                    className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 transition-all duration-200"
                >
                    <Database className="w-4 h-4 mr-2" />
                    {t('Manage Servers')}
                </Button>
            </div>
            <div className="space-y-4">
                {fhirServersHealth.loading ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Database className="w-8 h-8 text-muted-foreground animate-pulse" />
                        </div>
                        <p className="text-muted-foreground text-sm">{t('Loading FHIR servers...')}</p>
                    </div>
                ) : fhirServersHealth.error ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">{fhirServersHealth.error}</p>
                    </div>
                ) : fhirServersHealth.servers.length > 0 ? (
                    fhirServersHealth.servers.map((server, index) => (
                        <div key={server.id || index} className={`flex items-center justify-between py-2.5 px-3 transition-colors duration-200 border ${
                            server.supported && !server.error
                                ? 'bg-emerald-500/5 dark:bg-emerald-400/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/20 border-emerald-500/20 dark:border-emerald-400/30'
                                : server.error
                                    ? 'bg-red-500/5 dark:bg-red-400/10 hover:bg-red-500/10 dark:hover:bg-red-400/20 border-red-500/20 dark:border-red-400/30'
                                    : 'bg-yellow-500/5 dark:bg-yellow-400/10 hover:bg-yellow-500/10 dark:hover:bg-yellow-400/20 border-yellow-500/20 dark:border-yellow-400/30'
                        }`}>
                            <div className="flex items-center flex-1">
                                <div className={`w-4 h-4 rounded-full mr-4 shadow-sm ${
                                    server.supported && !server.error
                                        ? 'bg-emerald-500 dark:bg-emerald-400'
                                        : server.error
                                            ? 'bg-red-500 dark:bg-red-400'
                                            : 'bg-yellow-500 dark:bg-yellow-400'
                                }`}></div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-foreground font-medium">{server.name}</span>
                                        <span className="text-xs bg-muted/80 px-2 py-1 rounded-full font-medium text-muted-foreground">
                                            {server.fhirVersion}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        <a href={server.endpoints?.base || server.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline transition-colors">
                                            {server.endpoints?.base || server.url}
                                        </a>
                                    </div>
                                    {server.error && (
                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">{server.error}</div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-sm font-semibold ${
                                    server.supported && !server.error
                                        ? 'text-foreground'
                                        : server.error
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'
                                }`}>
                                    {server.supported && !server.error
                                        ? t('Healthy')
                                        : server.error
                                            ? t('Error')
                                            : t('Unknown')
                                    }
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <EmptyState icon={Database} title={t('No FHIR Servers')} description={t('No FHIR servers have been configured yet. Click "Manage Servers" to add your first FHIR server.')} className="py-8" />
                )}
            </div>
        </div>
    );
}
