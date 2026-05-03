import { Button } from '@max-health-inc/shared-ui';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScopeSet, SmartAppFormData } from '@/lib/types/api';
import { useSmartAppForm } from './useSmartAppForm';
import { BasicInfoSection } from './BasicInfoSection';
import { AuthCredentialsSection } from './AuthCredentialsSection';
import { ServerAccessSection } from './ServerAccessSection';
import { ScopeConfigSection } from './ScopeConfigSection';

interface SmartAppAddFormProps {
    open: boolean;
    onClose: () => void;
    onAddApp: (app: SmartAppFormData) => void;
    scopeSets: ScopeSet[];
}

export function SmartAppAddForm({ open, onClose, onAddApp, scopeSets }: SmartAppAddFormProps) {
    const { t } = useTranslation();
    const {
        newApp,
        updateApp,
        updateAppType,
        updateServerAccessType,
        servers,
        serversLoading,
        getScopeSetName,
        handleSubmit,
        handleCancel,
    } = useSmartAppForm(open, onClose, onAddApp, scopeSets);

    if (!open) return null;

    return (
        <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                        <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Register New SMART on FHIR Application')}</h3>
                        <p className="text-muted-foreground font-medium">{t('Add a new healthcare application to your system')}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <BasicInfoSection newApp={newApp} updateApp={updateApp} updateAppType={updateAppType} />
                <AuthCredentialsSection newApp={newApp} updateApp={updateApp} />
                <ServerAccessSection
                    newApp={newApp}
                    updateServerAccessType={updateServerAccessType}
                    updateApp={updateApp}
                    servers={servers}
                    serversLoading={serversLoading}
                />
                <ScopeConfigSection
                    newApp={newApp}
                    updateApp={updateApp}
                    scopeSets={scopeSets}
                    getScopeSetName={getScopeSetName}
                />

                <div className="flex gap-4 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1 rounded-xl py-3 font-semibold"
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('Register Application')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
