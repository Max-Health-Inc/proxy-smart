import { useState } from 'react';
import { useFhirServers } from '@/stores/smartStore';
import type { ScopeSet, SmartAppFormData } from '@/lib/types/api';
import type { SmartAppType, AuthenticationType, ServerAccessType } from './helpers';
import { requiresRedirectUri, hasFixedAuthType, getFixedAuthType } from './helpers';

const INITIAL_FORM_STATE: SmartAppFormData = {
    name: '',
    clientId: '',
    launchUrl: '',
    redirectUris: [],
    description: '',
    defaultClientScopes: [],
    scopeSetId: '',
    optionalClientScopes: [],
    appType: 'standalone-app',
    authenticationType: 'symmetric',
    serverAccessType: 'all-servers',
    allowedServerIds: [],
    publicClient: false,
    webOrigins: [],
    smartVersion: '2.0.0',
    fhirVersion: 'R4',
    systemScopes: [],
};

export function useSmartAppForm(
    open: boolean,
    onClose: () => void,
    onAddApp: (app: SmartAppFormData) => void,
    scopeSets: ScopeSet[],
) {
    const { servers, loading: serversLoading } = useFhirServers();

    const [newApp, setNewApp] = useState<SmartAppFormData>({ ...INITIAL_FORM_STATE });

    const resetForm = () => setNewApp({ ...INITIAL_FORM_STATE });

    const updateApp = (patch: Partial<SmartAppFormData>) => {
        setNewApp(prev => ({ ...prev, ...patch }));
    };

    const updateAppType = (appType: SmartAppType) => {
        setNewApp(prev => ({
            ...prev,
            appType,
            redirectUris: requiresRedirectUri(appType) ? prev.redirectUris : [],
            authenticationType: hasFixedAuthType(appType) ? getFixedAuthType(appType) : (prev.authenticationType || 'symmetric'),
        }));
    };

    const updateServerAccessType = (serverAccessType: ServerAccessType) => {
        setNewApp(prev => ({
            ...prev,
            serverAccessType,
            allowedServerIds: serverAccessType === 'selected-servers' ? prev.allowedServerIds : [],
        }));
    };

    const getScopeSetName = (scopeSetId?: string) => {
        if (!scopeSetId) return 'Custom';
        const scopeSet = scopeSets.find(set => set.id === scopeSetId);
        return scopeSet ? scopeSet.name : 'Unknown';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalDefaultScopes = [...(newApp.defaultClientScopes || [])];
        if (newApp.scopeSetId) {
            const selectedScopeSet = scopeSets.find(set => set.id === newApp.scopeSetId);
            if (selectedScopeSet) {
                finalDefaultScopes = [...selectedScopeSet.scopes, ...(newApp.optionalClientScopes || [])];
            }
        } else {
            finalDefaultScopes = [...(newApp.defaultClientScopes || []), ...(newApp.optionalClientScopes || [])];
        }

        onAddApp({
            name: newApp.name,
            clientId: newApp.clientId,
            launchUrl: newApp.launchUrl,
            redirectUris: newApp.redirectUris || [],
            description: newApp.description,
            defaultClientScopes: finalDefaultScopes,
            scopeSetId: newApp.scopeSetId,
            optionalClientScopes: newApp.optionalClientScopes || [],
            appType: newApp.appType!,
            serverAccessType: newApp.serverAccessType!,
            allowedServerIds: newApp.allowedServerIds || [],
            jwksUri: newApp.jwksUri,
            publicKey: newApp.publicKey,
        });

        resetForm();
        onClose();
    };

    const handleCancel = () => {
        resetForm();
        onClose();
    };

    return {
        // Form state
        newApp,
        updateApp,
        updateAppType,
        updateServerAccessType,
        // Data
        servers,
        serversLoading,
        scopeSets,
        // Helpers
        getScopeSetName,
        // Handlers
        handleSubmit,
        handleCancel,
    };
}
