import { useState, useEffect } from 'react';
import { useAuth } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { alert, confirm, confirmInput } from '../stores/alertStore';
import { aiAssistant } from '../lib/ai-assistant';
import {
    Activity,
    Users,
    Shield,
    Stethoscope,
    Zap,
    RefreshCw,
    Database,
    CheckCircle,
    AlertCircle,
    Clock,
    BarChart3,
    Power,
    RotateCcw,
    Heart,
    X,
    Bot
} from 'lucide-react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { KeycloakConfigForm } from './KeycloakConfigForm';
import type { 
    DashboardData,
    FhirServersListResponse,
    KeycloakConfigResponse,
    SystemStatusResponse
} from '../lib/types/api';
import type { AccessHealthResponse } from '../lib/api-client/models/AccessHealthResponse';
import { config } from '../config';

interface SmartProxyOverviewProps {
    onNavigate: (tab: string) => void;
}

export function SmartProxyOverview({ onNavigate }: SmartProxyOverviewProps) {
    const { profile, fetchProfile, clientApis } = useAuth();
    const { t } = useTranslation();

    // Modal state for Keycloak configuration
    const [showKeycloakModal, setShowKeycloakModal] = useState(false);

    // Notification state for server management operations
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // State for real data with proper typing
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
            todayRequests: 0
        },
        serverStatus: {
            keycloak: 'unknown',
            fhir: 'unknown',
            database: 'unknown'
        },
        recentActivity: []
    });

    // Keycloak configuration state - using meaningful types from api.ts
    const [keycloakConfig, setKeycloakConfig] = useState<KeycloakConfigResponse & {
        loading: boolean;
        error: string | null;
    }>({
        baseUrl: null,
        realm: null,
        hasAdminClient: false,
        adminClientId: null,
        loading: true,
        error: null
    });

    // OAuth Analytics state with proper typing
    const [oauthAnalytics, setOauthAnalytics] = useState<{
        totalFlows: number;
        successRate: number;
        averageResponseTime: number;
        activeTokens: number;
        loading: boolean;
        error: string | null;
    }>({
        totalFlows: 0,
        successRate: 0,
        averageResponseTime: 0,
        activeTokens: 0,
        loading: true,
        error: null
    });

    // FHIR Servers Health state - based on actual API response fields
    const [fhirServersHealth, setFhirServersHealth] = useState<{
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
    }>({
        servers: [],
        loading: true,
        error: null
    });
    
    const [systemHealth, setSystemHealth] = useState<{
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
    }>({
        apiResponseTime: 0,
        databaseStatus: 'checking',
        systemUptime: 'N/A %',
        lastBackup: null,
        serverVersion: 'unknown',
        keycloakStatus: 'checking',
        keycloakLastConnected: 'unknown',
        memoryUsage: 'unknown',
        aiAgentStatus: 'checking',
        aiAgentSearchType: 'checking'
    });

    const [doorHealth, setDoorHealth] = useState<AccessHealthResponse | null>(null);

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            // Set initial AI Agent status - check backend availability
            const isOpenAIConnected = await aiAssistant.isOpenAIAvailable();
            const aiAgentStatus = isOpenAIConnected ? 'connected' : 'fallback';
            const aiAgentSearchType = isOpenAIConnected ? 'openai_powered' : 'semantic_search';
            
            setSystemHealth(prev => ({ 
                ...prev, 
                aiAgentStatus, 
                aiAgentSearchType 
            }));

            try {
                setDashboardData(prev => ({ ...prev, loading: true, error: null }));
                setOauthAnalytics(prev => ({ ...prev, loading: true, error: null }));
                setFhirServersHealth(prev => ({ ...prev, loading: true, error: null }));

                // Fetch data in parallel with correct API methods
                const [smartApps, users, servers, identityProvidersCount, analytics, systemStatus, keycloakStatus, acHealth] = await Promise.allSettled([
                    clientApis.smartApps.getAdminSmartApps(),
                    clientApis.healthcareUsers.getAdminHealthcareUsers(),
                    clientApis.servers.getFhirServers(),
                    clientApis.identityProviders.getAdminIdpsCount(),
                    clientApis.oauthMonitoring.getMonitoringOauthAnalytics(),
                    clientApis.server.getStatus(),
                    clientApis.admin.getAdminKeycloakConfigStatus(),
                    clientApis.admin.getAdminAccessControlHealth()
                ]);

                if (acHealth.status === 'fulfilled') setDoorHealth(acHealth.value);

                // Update dashboard data with proper type checking
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
                        todayRequests: 0
                    },
                    serverStatus: {
                        keycloak: systemStatus.status === 'fulfilled' ? 'healthy' : 'unknown',
                        fhir: 'unknown',
                        database: 'unknown'
                    },
                    recentActivity: []
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
                        error: null
                    });
                } else {
                    setOauthAnalytics(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Failed to load OAuth analytics'
                    }));
                }

                // Update system health with real data
                if (systemStatus.status === 'fulfilled') {
                    const statusData = systemStatus.value as SystemStatusResponse;

                    // Format uptime
                    const uptimeSeconds = statusData.uptime || 0;
                    const uptimeHours = Math.floor(uptimeSeconds / 3600);
                    const uptimeFormatted = uptimeHours > 0 ? `${uptimeHours}h` : `${Math.floor(uptimeSeconds / 60)}m`;

                    // Check AI Agent status - use await since it's async
                    const isOpenAIConnected = await aiAssistant.isOpenAIAvailable();
                    const aiAgentStatus = isOpenAIConnected ? 'connected' : 'fallback';
                    const aiAgentSearchType = isOpenAIConnected ? 'openai_powered' : 'semantic_search';

                    // Get memory usage from status endpoint instead of health
                    let memoryUsage = 'unknown';
                    if (statusData.memory) {
                        memoryUsage = `${statusData.memory.used}MB / ${statusData.memory.total}MB`;
                    }

                    // Format last connected time
                    let keycloakLastConnected = 'never';
                    if (statusData.keycloak?.lastConnected) {
                        const lastConnectedDate = new Date(statusData.keycloak.lastConnected);
                        const now = new Date();
                        const timeDiff = now.getTime() - lastConnectedDate.getTime();
                        const seconds = Math.floor(timeDiff / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);

                        if (days > 0) {
                            keycloakLastConnected = `${days}d ago`;
                        } else if (hours > 0) {
                            keycloakLastConnected = `${hours}h ago`;
                        } else if (minutes > 0) {
                            keycloakLastConnected = `${minutes}m ago`;
                        } else {
                            keycloakLastConnected = 'just now';
                        }
                    }

                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'healthy', // We know it's healthy if we got a response
                        systemUptime: uptimeFormatted,
                        lastBackup: null, // Remove mock backup timestamp
                        serverVersion: statusData.version,
                        keycloakStatus: statusData.keycloak?.status || 'unknown',
                        keycloakLastConnected,
                        memoryUsage,
                        aiAgentStatus,
                        aiAgentSearchType
                    }));
                } else {
                    // Check AI Agent status even when system status fails - use await since it's async
                    const isOpenAIConnected = await aiAssistant.isOpenAIAvailable();
                    const aiAgentStatus = isOpenAIConnected ? 'connected' : 'fallback';
                    const aiAgentSearchType = isOpenAIConnected ? 'openai_powered' : 'semantic_search';

                    setSystemHealth(prev => ({
                        ...prev,
                        databaseStatus: 'error',
                        keycloakStatus: 'error',
                        keycloakLastConnected: 'unknown',
                        aiAgentStatus,
                        aiAgentSearchType
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
                        error: null
                    });
                } else {
                    setKeycloakConfig((prev: KeycloakConfigResponse & { loading: boolean; error: string | null }) => ({
                        ...prev,
                        loading: false,
                        error: 'Failed to load Keycloak configuration'
                    }));
                }

                // Measure API response time with a simple call
                const startTime = performance.now();
                try {
                    await clientApis.smartApps.getAdminSmartApps();
                    const endTime = performance.now();

                    setSystemHealth(prev => ({
                        ...prev,
                        apiResponseTime: Math.round(endTime - startTime)
                    }));
                } catch {
                    setSystemHealth(prev => ({
                        ...prev,
                        apiResponseTime: 0
                    }));
                }

                // Update FHIR servers health with actual server data (no mock health metrics)
                if (servers.status === 'fulfilled') {
                    const serversData = servers.value as FhirServersListResponse;
                    const serversArray = serversData.servers || [];
                    
                    // Use actual server data without adding fake health metrics
                    setFhirServersHealth({
                        servers: serversArray,
                        loading: false,
                        error: null
                    });
                } else {
                    setFhirServersHealth({
                        servers: [],
                        loading: false,
                        error: 'Failed to load FHIR servers data'
                    });
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setDashboardData(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load dashboard data'
                }));
                setOauthAnalytics(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load OAuth analytics'
                }));
            }
        };

        fetchDashboardData();
    }, [clientApis]);

    const handleRefresh = async () => {
        await fetchProfile();
        // Trigger dashboard data refresh
        setDashboardData(prev => ({ ...prev, loading: true }));
        // Reset AI Agent status to checking
        setSystemHealth(prev => ({ 
            ...prev, 
            aiAgentStatus: 'checking', 
            aiAgentSearchType: 'checking',
            keycloakLastConnected: 'checking...'
        }));
        // The useEffect will handle the refresh
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
                if (value.trim().length < 10) {
                    return t('Reason must be at least 10 characters long');
                }
                return null;
            },
            onConfirm: async (reason) => {
                try {
                    await clientApis.admin.postAdminShutdown();
                    alert({
                        title: t('Server Shutdown Initiated'),
                        message: t('Server shutdown has been initiated successfully. Reason: {{reason}}', { reason }),
                        type: 'success'
                    });
                } catch (error) {
                    alert({
                        title: t('Shutdown Failed'),
                        message: t('Failed to shutdown server: {{error}}', {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }),
                        type: 'error'
                    });
                }
            }
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
                if (value.trim().length < 10) {
                    return t('Reason must be at least 10 characters long');
                }
                return null;
            },
            onConfirm: async (reason) => {
                try {
                    await clientApis.admin.postAdminRestart();
                    alert({
                        title: t('Server Restart Initiated'),
                        message: t('Server restart has been initiated successfully. Reason: {{reason}}', { reason }),
                        type: 'success'
                    });
                } catch (error) {
                    alert({
                        title: t('Restart Failed'),
                        message: t('Failed to restart server: {{error}}', {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }),
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleHealthCheck = async () => {
        try {
            const data = await clientApis.server.getHealth();
            setNotification({
                type: 'success',
                message: t('Health check completed: Server is {{status}}', {
                    status: data.status
                })
            });
        } catch (error) {
            setNotification({
                type: 'error',
                message: t('Failed to perform health check: {{error}}', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            });
        }
    };

    const handleKeycloakConfig = () => {
        if (profile) {
            // User is logged in, warn about logout
            confirm({
                title: t('Keycloak Configuration'),
                message: t('⚠️ Warning: Changing the Keycloak URL or client configuration may log you out of the system. You may need to log in again after making changes. Do you want to continue?'),
                type: 'warning',
                confirmText: t('Continue'),
                cancelText: t('Cancel'),
                onConfirm: () => {
                    setShowKeycloakModal(true);
                }
            });
        } else {
            // User not logged in, open modal directly
            setShowKeycloakModal(true);
        }
    };

    const handleKeycloakSuccess = () => {
        setShowKeycloakModal(false);
        setNotification({
            type: 'success',
            message: t('Keycloak configuration saved successfully')
        });
        // Refresh dashboard data to reflect new configuration
        handleRefresh();
    };

    const handleKeycloakCancel = () => {
        setShowKeycloakModal(false);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${notification.type === 'success'
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
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('Proxy Smart Dashboard')}
                        </h1>
                        <div className="text-muted-foreground flex items-center text-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Stethoscope className="w-5 h-5 text-primary" />
                            </div>
                            {t('Welcome back, {{name}}', {
                                name: profile?.firstName && profile?.lastName
                                    ? `${profile.firstName} ${profile.lastName}`
                                    : profile?.username || t('Healthcare Administrator')
                            })}
                        </div>
                        
                        {/* AI Agent Status */}
                        <div className="mt-4 flex items-center space-x-3 p-3 bg-muted/20 rounded-xl border border-border/30">
                            {systemHealth.aiAgentStatus === 'connected' ? (
                                <Bot className="w-5 h-5 text-foreground" />
                            ) : systemHealth.aiAgentStatus === 'fallback' ? (
                                <Bot className="w-5 h-5 text-muted-foreground" />
                            ) : systemHealth.aiAgentStatus === 'checking' ? (
                                <Bot className="w-5 h-5 text-muted-foreground animate-pulse" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            )}
                            <div>
                                <span className={`font-semibold text-sm ${
                                    systemHealth.aiAgentStatus === 'connected'
                                        ? 'text-foreground'
                                        : systemHealth.aiAgentStatus === 'fallback'
                                            ? 'text-muted-foreground'
                                            : systemHealth.aiAgentStatus === 'checking'
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                }`}>
                                    {systemHealth.aiAgentStatus === 'connected' 
                                        ? t('AI Assistant: Backend Connected') 
                                        : systemHealth.aiAgentStatus === 'fallback'
                                            ? t('AI Assistant: Backend Unavailable')
                                            : systemHealth.aiAgentStatus === 'checking'
                                                ? t('AI Assistant: Checking...')
                                                : t('AI Assistant: Disconnected')
                                    }
                                </span>
                                <div className="text-xs text-muted-foreground">
                                    {systemHealth.aiAgentSearchType === 'openai_powered' 
                                        ? t('Using backend AI with OpenAI GPT') 
                                        : systemHealth.aiAgentSearchType === 'semantic_search'
                                            ? t('Using semantic search as fallback')
                                            : systemHealth.aiAgentSearchType === 'checking'
                                                ? t('...')
                                                : t('No AI assistance available')
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleRefresh}
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t('Refresh')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleHealthCheck}
                        >
                            <Heart className="w-4 h-4" />
                            {t('Health')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleServerRestart}
                        >
                            <RotateCcw className="w-4 h-4" />
                            {t('Restart')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={handleServerShutdown}
                        >
                            <Power className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Cards - Compact and Professional */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('SMART Apps')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {dashboardData.loading ? '...' : dashboardData.smartAppsCount}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Active')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('Users')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {dashboardData.loading ? '...' : dashboardData.usersCount}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Registered')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Database className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('FHIR Servers')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {dashboardData.loading ? '...' : dashboardData.serversCount}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Connected')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('Identity Providers')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {dashboardData.loading ? '...' : dashboardData.identityProvidersCount}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Active')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('OAuth Flows')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {oauthAnalytics.loading ? '...' : oauthAnalytics.totalFlows.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Processed')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('Success Rate')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {oauthAnalytics.loading
                            ? '...'
                            : oauthAnalytics.totalFlows === 0
                                ? '--'
                                : `${oauthAnalytics.successRate.toFixed(1)}%`
                        }
                    </div>
                    <p className="text-xs text-muted-foreground">{t('OAuth Success')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('Avg Response')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {oauthAnalytics.loading
                            ? '...'
                            : oauthAnalytics.totalFlows === 0
                                ? '--'
                                : `${oauthAnalytics.averageResponseTime}ms`
                        }
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Performance')}</p>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-foreground" />
                        </div>
                        <h3 className="text-xs font-medium text-muted-foreground">{t('Active Tokens')}</h3>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {oauthAnalytics.loading ? '...' : oauthAnalytics.activeTokens.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Valid')}</p>
                </div>
            </div>

            {/* System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                                <Activity className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('System Health')}</h3>
                        </div>
                        <Button
                            variant={keycloakConfig.hasAdminClient ? "default" : "outline"}
                            size="sm"
                            onClick={handleKeycloakConfig}
                            className={`rounded-xl px-4 py-2 transition-all duration-200 ${
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
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('API Response Time')}</span>
                                <span className="text-foreground font-semibold flex items-center">
                                    <div className="w-3 h-3 bg-foreground rounded-full mr-3 animate-pulse shadow-lg"></div>
                                    {systemHealth.apiResponseTime > 0 ? `${systemHealth.apiResponseTime}ms` : '...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak Database')}</span>
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-foreground mr-2" />
                                    <span className="text-foreground font-semibold">
                                        {systemHealth.databaseStatus === 'healthy' ? t('Healthy') : systemHealth.databaseStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Dynamic Client Registration')}</span>
                                <div className="flex items-center">
                                    {keycloakConfig.hasAdminClient ? (
                                        <CheckCircle className="w-5 h-5 text-foreground mr-2" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-muted-foreground mr-2" />
                                    )}
                                    <span className={`font-semibold ${keycloakConfig.hasAdminClient
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                        }`}>
                                        {keycloakConfig.loading 
                                            ? t('Checking...') 
                                            : keycloakConfig.hasAdminClient 
                                                ? t('Enabled') 
                                                : t('Disabled')
                                        }
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak Realm')}</span>
                                <span className="text-foreground font-semibold">
                                    {keycloakConfig.loading
                                        ? t('Loading...')
                                        : keycloakConfig.realm || t('Not Set')
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak URL')}</span>
                                <span className="text-foreground font-semibold text-xs">
                                    {keycloakConfig.loading
                                        ? t('Loading...')
                                        : keycloakConfig.baseUrl 
                                            ? keycloakConfig.baseUrl.replace(/\/$/, '') // Remove trailing slash
                                            : t('Not Set')
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Keycloak Last Connected')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.keycloakLastConnected}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('System Uptime')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.systemUptime}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Memory Usage')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.memoryUsage}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Server Version')}</span>
                                <span className="text-foreground font-semibold">
                                    {systemHealth.serverVersion}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
                                <span className="text-sm font-medium text-muted-foreground">{t('Door Management')}</span>
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
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="w-14 h-14 bg-orange-500/10 dark:bg-orange-400/20 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                                <Database className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('FHIR Servers Health')}</h3>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate('fhir-servers')}
                            className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-700 dark:text-orange-300 rounded-xl px-4 py-2 transition-all duration-200"
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
                                <div key={server.id || index} className={`flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 border ${
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
                                                <span className="text-foreground font-medium">
                                                    {server.name}
                                                </span>
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
                                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                    {server.error}
                                                </div>
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
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Database className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h4 className="text-lg font-semibold text-foreground mb-2">{t('No FHIR Servers')}</h4>
                                <p className="text-muted-foreground text-sm">
                                    {t('No FHIR servers have been configured yet.')}
                                </p>
                                <p className="text-muted-foreground text-xs mt-2">
                                    {t('Click "Manage Servers" to add your first FHIR server.')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Footer Info */}
            <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-muted-foreground">{t('Platform (UI) Version')}</div>
                            <div className="text-lg font-bold text-foreground">v{config.version}</div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 bg-foreground/10 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-foreground" />
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
