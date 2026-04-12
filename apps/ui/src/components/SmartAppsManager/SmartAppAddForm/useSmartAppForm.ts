import { useState, useEffect, useCallback } from 'react';
import { useFhirServers } from '@/stores/smartStore';
import { useAuth } from '@/stores/authStore';
import type { ScopeSet, SmartAppFormData } from '@/lib/types/api';
import type { GetAdminMcpServers200ResponseServersInner, GetAdminAiToolsSkills200ResponseSkillsInner } from '@/lib/api-client';
import type { SmartAppType, AuthenticationType, ServerAccessType, McpAccessType } from './helpers';
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
    mcpAccessType: 'none',
    allowedMcpServerNames: [],
    allowedSkillNames: [],
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
    const { clientApis } = useAuth();

    const [mcpServers, setMcpServers] = useState<GetAdminMcpServers200ResponseServersInner[]>([]);
    const [mcpServersLoading, setMcpServersLoading] = useState(false);
    const [skills, setSkills] = useState<GetAdminAiToolsSkills200ResponseSkillsInner[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [newApp, setNewApp] = useState<SmartAppFormData>({ ...INITIAL_FORM_STATE });

    const fetchMcpServers = useCallback(async () => {
        if (!clientApis?.mcpManagement) return;
        setMcpServersLoading(true);
        try {
            const response = await clientApis.mcpManagement.getAdminMcpServers();
            setMcpServers(response.servers || []);
        } catch (err) {
            console.error('Failed to fetch MCP servers:', err);
        } finally {
            setMcpServersLoading(false);
        }
    }, [clientApis]);

    const fetchSkills = useCallback(async () => {
        if (!clientApis?.aiTools) return;
        setSkillsLoading(true);
        try {
            const response = await clientApis.aiTools.getAdminAiToolsSkills();
            setSkills(response.skills || []);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        } finally {
            setSkillsLoading(false);
        }
    }, [clientApis]);

    useEffect(() => {
        if (open) {
            fetchMcpServers();
            fetchSkills();
        }
    }, [open, fetchMcpServers, fetchSkills]);

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

    const updateMcpAccessType = (mcpAccessType: McpAccessType) => {
        setNewApp(prev => ({
            ...prev,
            mcpAccessType,
            allowedMcpServerNames: mcpAccessType === 'selected-mcp-servers' ? prev.allowedMcpServerNames : [],
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
            mcpAccessType: newApp.mcpAccessType,
            allowedMcpServerNames: newApp.mcpAccessType === 'selected-mcp-servers' ? newApp.allowedMcpServerNames : [],
            allowedSkillNames: newApp.allowedSkillNames || [],
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
        updateMcpAccessType,
        // Data
        servers,
        serversLoading,
        mcpServers,
        mcpServersLoading,
        skills,
        skillsLoading,
        scopeSets,
        // Helpers
        getScopeSetName,
        // Handlers
        handleSubmit,
        handleCancel,
    };
}
