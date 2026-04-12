import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import { alert, confirm, confirmInput } from '../../stores/alertStore';
import { aiAssistant } from '../../lib/ai-assistant';
import type {
    DashboardData,
    FhirServersListResponse,
    KeycloakConfigResponse,
    SystemStatusResponse,
} from '../../lib/types/api';
import type { AccessHealthResponse } from '../../lib/api-client/models/AccessHealthResponse';

// ─── State Types ─────────────────────────────────────────────────────

export interface OAuthAnalyticsState {
    totalFlows: number;
    successRate: number;
    averageResponseTime: number;
    activeTokens: number;
    loading: boolean;
    error: string | null;
}

export interface FhirServersHealthState {
    servers: Array<{
        id: string;
        name: string;
        url: string;
        fhirVersion: string;
        serverVersion?: string;
        serverName?: string;
        supported: boolean;
        error?: string;
        endpoints?: {
            base: string;
            smartConfig: string;
            metadata: string;
        };
    }>;
    loading: boolean;
    error: string | null;
}

export interface SystemHealthState {
    apiResponseTime: number;
    databaseStatus: string;
    systemUptime: string;
    lastBackup: Date | null;
    serverVersion: string;
    keycloakStatus: string;
    keycloakLastConnected: string;
    memoryUsage: string;
    aiAgentStatus: string;
    aiAgentSearchType: string;
}

export type KeycloakConfigState = KeycloakConfigResponse & {
    loading: boolean;
    error: string | null;
};

export type NotificationState = { type: 'success' | 'error'; message: string } | null;

// ─── Hook ────────────────────────────────────────────────────────────

export function useDashboardData() {
    const { profile, fetchProfile, clientApis } = useAuth();
    const { t } = useTranslation();

    const [showKeycloakModal, setShowKeycloakModal] = useState(false);
    const [notification, setNotification] = useState<NotificationState>(null);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const [dashboardData, setDashboardData] = useState<DashboardData>({
        smartAppsCount: 0,
        usersCount: 0,
        serversCount: 0,
        identityProvidersCount: 0,
        loading: true,
        error: null,
        stats: {
            totalApps: 0,
            activeUsers: 0,
            connectedServers: 0,
            todayRequests: 0,
        },
        serverStatus: {
            keycloak: 'unknown',
            fhir: 'unknown',
            database: 'unknown',
        },
        recentActivity: [],
    });

    const [keycloakConfig, setKeycloakConfig] = useState<KeycloakConfigState>({
        baseUrl: null,
        realm: null,
        hasAdminClient: false,
        adminClientId: null,
        loading: true,
        error: null,
    });

    const [oauthAnalytics, setOauthAnalytics] = useState<OAuthAnalyticsState>({
        totalFlows: 0,
        successRate: 0,
        averageResponseTime: 0,
        activeTokens: 0,
        loading: true,
        error: null,
    });

    const [fhirServersHealth, setFhirServersHealth] = useState<FhirServersHealthState>({
        servers: [],
        loading: true,
        error: null,
    });

    const [systemHealth, setSystemHealth] = useState<SystemHealthState>({
        apiResponseTime: 0,
        databaseStatus: 'checking',
        systemUptime: 'N/A %',
        lastBackup: null,
        serverVersion: 'unknown',
        keycloakStatus: 'checking',
        keycloakLastConnected: 'unknown',
        memoryUsage: 'unknown',
        aiAgentStatus: 'checking',
        aiAgentSearchType: 'checking',
    });

    const [doorHealth, setDoorHealth] = useState<AccessHealthResponse | null>(null);

    // ─── Fetch dashboard data ────────────────────────────────────

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Set initial AI Agent status
            const aiStatus = await aiAssistant.getAvailabilityStatus();
            const aiAgentStatus = aiStatus === 'connected' ? 'connected'
                : aiStatus === 'not_configured' ? 'not_configured'
                : 'disconnected';
            const aiAgentSearchType = aiStatus === 'connected' ? 'openai_powered'
                : aiStatus === 'not_configured' ? 'not_configured'
                : 'none';

            setSystemHealth(prev => ({ ...prev, aiAgentStatus, aiAgentSearchType }));

            try {
                setDashboardData(prev => ({ ...prev, loading: true, error: null }));
                setOauthAnalytics(prev => ({ ...prev, loading: true, error: null }));
                setFhirServersHealth(prev => ({ ...prev, loading: true, error: null }));

                const [smartApps, users, servers, identityProvidersCount, analytics, systemStatus, keycloakStatus, acHealth] = await Promise.allSettled([
                    clientApis.smartApps.getAdminSmartApps(),
                    clientApis.healthcareUsers.getAdminHealthcareUsers(),
                    clientApis.servers.getFhirServers(),
                    clientApis.identityProviders.getAdminIdpsCount(),
                    clientApis.oauthMonitoring.getMonitoringOauthAnalytics(),
                    clientApis.server.getStatus(),
                    clientApis.admin.getAdminKeycloakConfigStatus(),
                    clientApis.admin.getAdminAccessControlHealth(),
                ]);

                if (acHealth.status === 'fulfilled') setDoorHealth(acHealth.value);

                const appsCount = smartApps.status === 'fulfilled' ? Array.isArray(smartApps.value) ? smartApps.value.length : 0 : 0;
                const usersCount = users.status === 'fulfilled' ? Array.isArray(users.value) ? users.value.length : 0 : 0;
                const serversCount = servers.status === 'fulfilled' ? (servers.value as { servers?: unknown[] }).servers?.length || 0 : 0;
                const idpCount = identityProvidersCount.status === 'fulfilled' ? (identityProvidersCount.value as { count?: number }).count || 0 : 0;

                setDashboardData({
                    smartAppsCount: appsCount,
                    usersCount: usersCount,
                    serversCount: serversCount,
                    identityProvidersCount: idpCount,
                    loading: false,
                    error: null,
                    stats: {
                        totalApps: appsCount,
                        activeUsers: usersCount,
                        connectedServers: serversCount,
                        todayRequests: 0,
                    },
                    serverStatus: {
                        keycloak: systemStatus.status === 'fulfilled' ? 'healthy' : 'unknown',
                        fhir: 'unknown',
                        database: 'unknown',
                    },
                    recentActivity: [],
                });

                // Update OAuth analytics
                if (analytics.status === 'fulfilled') {
                    const analyticsData = analytics.value as {
                        totalFlows?: number;
                        successRate?: number;
                        averageResponseTime?: number;
                        activeTokens?: number;
                    };
                    setOauthAnalytics({
                        totalFlows: analyticsData.totalFlows || 0,
                        successRate: analyticsData.successRate || 0,
                        averageResponseTime: analyticsData.averageResponseTime || 0,
                        activeTokens: analyticsData.activeTokens || 0,
                        loading: false,
                        error: null,
                    });
                } else {
                    setOauthAnalytics(prev => ({ ...prev, loading: false, error: 'Failed to load OAuth analytics' }));
                }

                // Update system health with real data
                if (systemStatus.status === 'fulfilled') {
                    const statusData = systemStatus.value as SystemStatusResponse;
                    const uptimeSeconds = statusData.uptime || 0;
                    const uptimeHours = Math.floor(uptimeSeconds / 3600);
                    const uptimeFormatted = uptimeHours > 0 ? `${uptimeHours}h` : `${Math.floor(uptimeSeconds / 60)}m`;

                    const aiStatus = await aiAssistant.getAvailabilityStatus();
                    const aiAgentStatus = aiStatus === 'connected' ? 'connected'
                        : aiStatus === 'not_configured' ? 'not_configured'
                        : 'disconnected';
                    const aiAgentSearchType = aiStatus === 'connected' ? 'openai_powered'
                        : aiStatus === 'not_configured' ? 'not_configured'
                        : 'none';

                    let memoryUsage = 'unknown';
                    if (statusData.memory) {
                        memoryUsage = `${statusData.memory.used}MB / ${statusData.memory.total}MB`;
                    }

                    let keycloakLastConnected = 'never';
                    if (statusData.keycloak?.lastConnected) {
                        const lastConnectedDate = new Date(statusData.keycloak.lastConnected);
                        const now = new Date();
                        const timeDiff = now.getTime() - lastConnectedDate.getTime();
                        const seconds = Math.floor(timeDiff / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);

                        if (days > 0) keycloakLastConnected = `${days}d ago`;
                        else if (hours > 0) keycloakLastConnected = `${hours}h ago`;
                        else if (minutes > 0) keycloakLastConnected = `${minutes}m ago`;
                        else keycloakLastConnected = 'just now';
                    }

                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'healthy',
                        systemUptime: uptimeFormatted,
                        lastBackup: null,
                        serverVersion: statusData.version,
                        keycloakStatus: statusData.keycloak?.status || 'unknown',
                        keycloakLastConnected,
                        memoryUsage,
                        aiAgentStatus,
                        aiAgentSearchType,
                    }));
                } else {
                    const aiStatus = await aiAssistant.getAvailabilityStatus();
                    const aiAgentStatus = aiStatus === 'connected' ? 'connected'
                        : aiStatus === 'not_configured' ? 'not_configured'
                        : 'disconnected';
                    const aiAgentSearchType = aiStatus === 'connected' ? 'openai_powered'
                        : aiStatus === 'not_configured' ? 'not_configured'
                        : 'none';

                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'error',
                        keycloakStatus: 'error',
                        keycloakLastConnected: 'unknown',
                        aiAgentStatus,
                        aiAgentSearchType,
                    }));
                }

                // Update Keycloak configuration status
                if (keycloakStatus.status === 'fulfilled') {
                    const kcData = keycloakStatus.value as KeycloakConfigResponse;
                    setKeycloakConfig({
                        baseUrl: kcData.baseUrl,
                        realm: kcData.realm,
                        hasAdminClient: kcData.hasAdminClient,
                        adminClientId: kcData.adminClientId,
                        loading: false,
                        error: null,
                    });
                } else {
                    setKeycloakConfig((prev: KeycloakConfigState) => ({
                        ...prev,
                        loading: false,
                        error: 'Failed to load Keycloak configuration',
                    }));
                }

                // Measure API response time
                const startTime = performance.now();
                try {
                    await clientApis.smartApps.getAdminSmartApps();
                    const endTime = performance.now();
                    setSystemHealth(prev => ({ ...prev, apiResponseTime: Math.round(endTime - startTime) }));
                } catch {
                    setSystemHealth(prev => ({ ...prev, apiResponseTime: 0 }));
                }

                // Update FHIR servers health
                if (servers.status === 'fulfilled') {
                    const serversData = servers.value as FhirServersListResponse;
                    setFhirServersHealth({ servers: serversData.servers || [], loading: false, error: null });
                } else {
                    setFhirServersHealth({ servers: [], loading: false, error: 'Failed to load FHIR servers data' });
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setDashboardData(prev => ({ ...prev, loading: false, error: 'Failed to load dashboard data' }));
                setOauthAnalytics(prev => ({ ...prev, loading: false, error: 'Failed to load OAuth analytics' }));
            }
        };

        fetchDashboardData();
    }, [clientApis]);

    // ─── Handlers ────────────────────────────────────────────────

    const handleRefresh = async () => {
        await fetchProfile();
        setDashboardData(prev => ({ ...prev, loading: true }));
        setSystemHealth(prev => ({
            ...prev,
            aiAgentStatus: 'checking',
            aiAgentSearchType: 'checking',
            keycloakLastConnected: 'checking...',
        }));
    };

    const handleServerShutdown = async () => {
        confirmInput({
            title: t('Shutdown Server'),
            message: t('Are you sure you want to shutdown the server? This will stop all services. Please provide a reason for this action:'),
            type: 'warning',
            confirmText: t('Shutdown Server'),
            cancelText: t('Cancel'),
            inputLabel: t('Shutdown Reason'),
            inputPlaceholder: t('e.g., Scheduled maintenance, emergency stop, etc.'),
            inputRequired: true,
            inputType: 'textarea',
            inputValidation: (value) => {
                if (value.trim().length < 10) return t('Reason must be at least 10 characters long');
                return null;
            },
            onConfirm: async (reason) => {
                try {
                    await clientApis.admin.postAdminShutdown();
                    alert({
                        title: t('Server Shutdown Initiated'),
                        message: t('Server shutdown has been initiated successfully. Reason: {{reason}}', { reason }),
                        type: 'success',
                    });
                } catch (error) {
                    alert({
                        title: t('Shutdown Failed'),
                        message: t('Failed to shutdown server: {{error}}', {
                            error: error instanceof Error ? error.message : 'Unknown error',
                        }),
                        type: 'error',
                    });
                }
            },
        });
    };

    const handleServerRestart = async () => {
        confirmInput({
            title: t('Restart Server'),
            message: t('Are you sure you want to restart the server? This will temporarily interrupt all services. Please provide a reason for this action:'),
            type: 'warning',
            confirmText: t('Restart Server'),
            cancelText: t('Cancel'),
            inputLabel: t('Restart Reason'),
            inputPlaceholder: t('e.g., Configuration changes, performance issues, updates, etc.'),
            inputRequired: true,
            inputType: 'textarea',
            inputValidation: (value) => {
                if (value.trim().length < 10) return t('Reason must be at least 10 characters long');
                return null;
            },
            onConfirm: async (reason) => {
                try {
                    await clientApis.admin.postAdminRestart();
                    alert({
                        title: t('Server Restart Initiated'),
                        message: t('Server restart has been initiated successfully. Reason: {{reason}}', { reason }),
                        type: 'success',
                    });
                } catch (error) {
                    alert({
                        title: t('Restart Failed'),
                        message: t('Failed to restart server: {{error}}', {
                            error: error instanceof Error ? error.message : 'Unknown error',
                        }),
                        type: 'error',
                    });
                }
            },
        });
    };

    const handleHealthCheck = async () => {
        try {
            const data = await clientApis.server.getHealth();
            setNotification({
                type: 'success',
                message: t('Health check completed: Server is {{status}}', { status: data.status }),
            });
        } catch (error) {
            setNotification({
                type: 'error',
                message: t('Failed to perform health check: {{error}}', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                }),
            });
        }
    };

    const handleKeycloakConfig = () => {
        if (profile) {
            confirm({
                title: t('Keycloak Configuration'),
                message: t('⚠️ Warning: Changing the Keycloak URL or client configuration may log you out of the system. You may need to log in again after making changes. Do you want to continue?'),
                type: 'warning',
                confirmText: t('Continue'),
                cancelText: t('Cancel'),
                onConfirm: () => setShowKeycloakModal(true),
            });
        } else {
            setShowKeycloakModal(true);
        }
    };

    const handleKeycloakSuccess = () => {
        setShowKeycloakModal(false);
        setNotification({ type: 'success', message: t('Keycloak configuration saved successfully') });
        handleRefresh();
    };

    const handleKeycloakCancel = () => {
        setShowKeycloakModal(false);
    };

    return {
        // State
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
        // Handlers
        handleRefresh,
        handleServerShutdown,
        handleServerRestart,
        handleHealthCheck,
        handleKeycloakConfig,
        handleKeycloakSuccess,
        handleKeycloakCancel,
    };
}
