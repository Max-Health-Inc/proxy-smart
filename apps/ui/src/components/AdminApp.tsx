import { SmartAppsManager } from './SmartAppsManager/SmartAppsManager';
import { ServersManager } from './ServersManager';
import { SmartConfigManager } from './SmartConfigManager';
import { SmartProxyOverview } from './SmartProxyOverview';
import { McpEndpointSettings } from './McpEndpointSettings';
import { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { UsersAndFederationManager } from './UsersAndFederationManager';
import { useAuth } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { LoginForm } from './LoginForm';
import { cn } from '../lib/utils';
import { AlertDialogs } from './AlertDialogs';
import { NotificationToasts } from './ui/NotificationToast';
import { AIChatOverlay } from './ai/AIChatOverlay';
import { Panel } from './ui/panel';
import { Button, Spinner } from '@proxy-smart/shared-ui';
import { ADMIN_TABS, type AdminTab } from '@/lib/admin-tabs';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { ShieldAlert, X } from 'lucide-react';
import { OAuthMonitoringDashboard } from './OAuthMonitoringDashboard';
import { DoorManagement } from './DoorManagement/DoorManagement';
import { IdPManager } from './IdPManager/IdPManager';
import { BrandSettings } from './BrandSettings';
import { OrganizationsManager } from './OrganizationsManager/OrganizationsManager';


// Get tab from URL hash
function getTabFromHash(): AdminTab {
    const hash = window.location.hash.slice(1); // Remove the '#'
    return ADMIN_TABS.includes(hash as AdminTab) ? (hash as AdminTab) : 'dashboard';
}

// Set tab in URL hash
function setTabInHash(tab: string) {
    window.location.hash = tab;
}

export function AdminApp() {
    const [currentView, setCurrentView] = useState<string>(() => getTabFromHash());
    const { isAuthenticated, loading, profile, clientApis } = useAuth();
    const { activeTab, setActiveTab, isAIAssistantEnabled, setIsAIAssistantEnabled } = useAppStore();
    const { t } = useTranslation();
    const [bootstrapBannerDismissed, setBootstrapBannerDismissed] = useState(false);

    const isBootstrapAdmin = profile?.username === 'admin';

    // Check AI Assistant status
    useEffect(() => {
        const checkAIAssistantStatus = async () => {
            // Only check if authenticated, not loading, has profile, and has clientApis
            if (!isAuthenticated || loading || !profile || !clientApis) {
                return;
            }
            
            try {
                const apps = await clientApis.smartApps.getAdminSmartApps();
                const aiAssistant = apps.find(app => app.clientId === 'ai-assistant-agent');
                setIsAIAssistantEnabled(aiAssistant?.enabled ?? false);
            } catch (error) {
                console.error('Failed to check AI Assistant status:', error);
                // Default to false if we can't fetch the status
                setIsAIAssistantEnabled(false);
            }
        };

        checkAIAssistantStatus();
    }, [isAuthenticated, loading, profile, clientApis, setIsAIAssistantEnabled]);

    // Sync with URL hash on mount and when hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const tabFromHash = getTabFromHash();
            setCurrentView(tabFromHash);
            setActiveTab(tabFromHash);
        };

        // Set initial tab from hash
        handleHashChange();

        // Listen for hash changes (back/forward navigation)
        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [setActiveTab]);

    // Use activeTab from store or fallback to currentView for navigation
    const currentTab = activeTab || currentView;
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setCurrentView(tab);
        setTabInHash(tab); // Update URL hash
    };

    // Show loading state while fetching profile
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Panel className="max-w-md mx-auto">
                    <div className="flex flex-col items-center text-center p-8">
                        <Spinner size="lg" />
                        <h2 className="mt-4 text-lg font-semibold text-foreground">
                            {t('Loading Admin Panel...')}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            {t('Please wait while we initialize your workspace.')}
                        </p>
                    </div>
                </Panel>
            </div>
        );
    }

    // Show login form if not authenticated or no profile
    if (!isAuthenticated || !profile) {
        return <LoginForm />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navigation 
                activeTab={currentTab} 
                onTabChange={handleTabChange} 
                profile={profile} 
            />

            {/* Bootstrap admin warning banner */}
            {isBootstrapAdmin && !bootstrapBannerDismissed && (
                <div className="px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="w-full lg:w-[90%] max-w-none mx-auto">
                        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <AlertTitle className="font-semibold">
                                {t('Bootstrap Admin Account')}
                            </AlertTitle>
                            <AlertDescription className="mt-1">
                                {t('You are logged in with the temporary bootstrap admin account. Please create a permanent admin user in the Identity Providers or Users tab. Once a permanent admin exists, Keycloak will automatically disable this bootstrap account.')}
                            </AlertDescription>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                onClick={() => setBootstrapBannerDismissed(true)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </Alert>
                    </div>
                </div>
            )}
            <main className="flex-1 pt-2 md:pt-4">
                <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                    <div className="w-full lg:w-[90%] max-w-none mx-auto">
                        <Panel className={cn("min-h-[400px] sm:min-h-[600px] shadow-2xl border-0 bg-background backdrop-blur-sm rounded-3xl overflow-hidden border border-border/20 animate-fade-in w-full max-w-none", "max-w-none w-full")}>
                            {currentTab === 'dashboard' && <SmartProxyOverview onNavigate={handleTabChange} />}
                            {currentTab === 'smart-apps' && <SmartAppsManager />}
                            {currentTab === 'users' && <UsersAndFederationManager />}
                            {currentTab === 'servers' && <ServersManager />}
                            {currentTab === 'ai-tools' && <McpEndpointSettings />}
                            {currentTab === 'idp' && <IdPManager />}
                            {currentTab === 'smart-config' && <SmartConfigManager />}
                            {currentTab === 'oauth-monitoring' && <OAuthMonitoringDashboard />}
                            {currentTab === 'door-management' && <DoorManagement />}
                            {currentTab === 'branding' && <BrandSettings />}
                            {currentTab === 'organizations' && <OrganizationsManager />}
                        </Panel>
                    </div>
                </div>
            </main>

            <footer className="py-4 text-center text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Max Health Inc.
            </footer>

            {/* Alert Dialogs */}
            <AlertDialogs />

            {/* Global toast notifications */}
            <NotificationToasts />

            {/* AI Chat Overlay - only show if AI Assistant is enabled */}
            {isAIAssistantEnabled && <AIChatOverlay />}
        </div>
    );
}
