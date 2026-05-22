import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui';
import { Textarea } from '@/components/ui/textarea';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Shield, 
  X,
  Database,
  CheckCircle,
  UserPlus,
  AlertTriangle,
  Trash2,
  Store
} from 'lucide-react';
import { SmartAppAddForm } from './SmartAppAddForm';
import { SmartAppEditModal } from './SmartAppEditModal';
import { SmartAppsTable } from './SmartAppsTable';
import { SmartAppsStatistics } from './SmartAppsStatistics';
import { AppStoreManagement } from './AppStoreManagement';
import { DynamicClientRegistrationSettings } from '../DynamicClientRegistrationSettings';
import { useAuth } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppStore } from '@/stores/appStore';
import { getItem } from '@/lib/storage';
import { createAuthenticatedClientApis } from '@/lib/apiClient';
import type { SmartApp, ScopeSet, SmartAppFormData, SmartAppClientTypeEnum } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

export function SmartAppsManager() {
  const { t } = useTranslation();
  const { smartAppsManagerTab, setSmartAppsManagerTab, setIsAIAssistantEnabled } = useAppStore();
  const { clientApis } = useAuth();
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendApps, setBackendApps] = useState<SmartApp[]>([]);
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<SmartApp | null>(null);
  const { notify } = useNotificationStore();

  // Load scope sets from ScopeManager
  useEffect(() => {
    const loadScopeSets = async () => {
      try {
        const saved = await getItem<ScopeSet[]>('smart-scope-sets');
        if (Array.isArray(saved)) {
          setScopeSets(saved);
        }
      } catch (error) {
        console.error('Failed to load scope sets:', error);
      }
    };
    loadScopeSets();
  }, []);

  // Fetch SMART apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const fetchedApps = await clientApis.smartApps.getAdminSmartApps();
        const appsList = Array.isArray(fetchedApps) ? fetchedApps : [];
        
        setBackendApps(appsList);
        
        if (appsList.length > 0) {
          // Convert backend apps to our format
          const convertedApps: SmartApp[] = appsList.map((backendApp: SmartApp) => ({
            ...backendApp, // Inherit all API model fields (includes clientAuthenticatorType)
            // UI-specific computed/helper fields
            scopeSetId: undefined,
            status: backendApp.enabled ? 'active' : 'inactive',
            lastUsed: new Date().toISOString().split('T')[0], // Default to today
            // Use appType from backend if available, otherwise infer from serviceAccountsEnabled
            appType: backendApp.appType || (backendApp.serviceAccountsEnabled ? 'backend-service' : 'standalone-app'),
            serverAccessType: 'all-servers', // Default for now
            allowedServerIds: undefined,
          }));
          setApps(convertedApps);
        }
      } catch (error) {
        console.error('Failed to fetch SMART apps:', error);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [clientApis.smartApps]);

  const handleAddApp = async (appData: SmartAppFormData) => {
    try {
      // Call backend API to create the SMART app
      await clientApis.smartApps.postAdminSmartApps({
        createSmartAppRequest: {
          clientId: appData.clientId || '',
          name: appData.name,
          description: appData.description,
          publicClient: appData.publicClient,
          redirectUris: appData.redirectUris,
          webOrigins: appData.webOrigins,
          defaultClientScopes: appData.defaultClientScopes,
          optionalClientScopes: appData.optionalClientScopes,
          smartVersion: appData.smartVersion,
          fhirVersion: appData.fhirVersion,
          appType: appData.appType,
          clientType: appData.clientType as SmartAppClientTypeEnum,
          publicKey: appData.publicKey,
          jwksUri: appData.jwksUri,
          systemScopes: appData.systemScopes
        }
      });

      // Refresh the apps list from the backend to get the newly created app
      const updatedApps = await clientApis.smartApps.getAdminSmartApps();
      if (Array.isArray(updatedApps)) {
        setBackendApps(updatedApps);
        setApps(updatedApps);
      }

      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create SMART app:', error);
      // Show error notification to user
      alert('Failed to create SMART app. Please check the console for details.');
    }
  };


  const updateAppScopes = (appId: string | undefined, scopeSetId: string | null, additionalScopes: string[]) => {
    if (!appId) return;
    
    setApps(prevApps => prevApps.map(app => {
      if (app.id === appId) {
        let finalDefaultScopes = [...additionalScopes];
        if (scopeSetId) {
          const selectedScopeSet = scopeSets.find(set => set.id === scopeSetId);
          if (selectedScopeSet) {
            finalDefaultScopes = [...selectedScopeSet.scopes, ...additionalScopes];
          }
        }
        return {
          ...app,
          scopeSetId: scopeSetId || undefined,
          defaultClientScopes: finalDefaultScopes,
          optionalClientScopes: app.optionalClientScopes || []
        };
      }
      return app;
    }));
  };

  const openScopeEditor = (app: SmartApp) => {
    setEditingApp(app);
    setShowScopeDialog(true);
  };

  const handleEditApp = (app: SmartApp) => {
    setEditingApp(app);
    setShowEditDialog(true);
  };

  const handleViewConfig = (app: SmartApp) => {
    setEditingApp(app);
    setShowConfigDialog(true);
  };

  const handleEditAuth = (app: SmartApp) => {
    setEditingApp(app);
    setShowAuthDialog(true);
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  const toggleAppStatus = async (clientId: string) => {
    const app = apps.find(a => a.clientId === clientId);
    if (!app) return;

    const newStatus = app.status === 'active' ? 'inactive' : 'active';
    const newEnabled = newStatus === 'active';

    try {
      // Optimistically update UI
      setApps(apps.map(a =>
        a.clientId === clientId
          ? { ...a, status: newStatus, enabled: newEnabled }
          : a
      ));

      // Call backend API
      const apis = await createAuthenticatedClientApis();
      await apis.smartApps.putAdminSmartAppsByClientId({
        clientId: clientId,
        updateSmartAppRequest: {
          name: app.name,
          description: app.description,
          enabled: newEnabled,
          redirectUris: app.redirectUris,
          webOrigins: app.webOrigins || []
        }
      });

      // Update AI Assistant enabled state if this is the AI Assistant
      if (clientId === 'ai-assistant-agent') {
        setIsAIAssistantEnabled(newEnabled);
      }

      notify({
        type: 'success',
        message: t('Application "{{name}}" {{action}} successfully', { name: app.name, action: newStatus === 'active' ? t('activated') : t('deactivated') })
      });
    } catch (error) {
      console.error('Failed to toggle app status:', error);
      
      // Revert optimistic update on error
      setApps(apps.map(a =>
        a.clientId === clientId
          ? { ...a, status: app.status, enabled: app.enabled }
          : a
      ));

      notify({
        type: 'error',
        message: t('Failed to {{action}} application: {{error}}', { action: newStatus === 'active' ? t('activate') : t('deactivate'), error: error instanceof Error ? error.message : 'Unknown error' })
      });
    }
  };

  const deleteApp = (clientId: string) => {
    const app = apps.find(a => a.clientId === clientId);
    if (app) {
      setEditingApp(app);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!editingApp?.clientId) return;

    try {
      const apis = await createAuthenticatedClientApis();
      await apis.smartApps.deleteAdminSmartAppsByClientId({
        clientId: editingApp.clientId
      });

      // Remove from local state
      setApps(apps.filter(app => app.clientId !== editingApp.clientId));
      setBackendApps(backendApps.filter(app => app.clientId !== editingApp.clientId));

      notify({
        type: 'success',
        message: t('Successfully deleted application "{{name}}"', { name: editingApp.name })
      });
      
      setShowDeleteDialog(false);
      setEditingApp(null);
    } catch (error) {
      console.error('Failed to delete app:', error);
      notify({
        type: 'error',
        message: t('Failed to delete application: {{error}}', { error: error instanceof Error ? error.message : 'Unknown error' })
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {loading ? (
        <PageLoadingState message={t('Loading SMART applications...')} />
      ) : (
        <>
          {/* Enhanced Header Section */}
          <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
              <div className="flex-1">
                <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                  {t('SMART on FHIR Applications')}
                </h1>
                <div className="text-muted-foreground text-lg flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  {t('Manage registered healthcare applications and their SMART on FHIR permissions')}
                </div>

                {scopeSets.length > 0 && (
                  <div className="mt-4 flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      {scopeSets.length} scope templates available for quick configuration
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4" />
                {t('Register New App')}
              </Button>
            </div>
          </div>

          {/* Tabs for different sections */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
            <Tabs value={smartAppsManagerTab} onValueChange={setSmartAppsManagerTab} className="w-full">
              <ResponsiveTabsList columns={3}>
                <TabsTrigger value="apps" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('Registered Apps')}</span>
                </TabsTrigger>
                <TabsTrigger value="app-store" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <Store className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('App Store')}</span>
                </TabsTrigger>
                <TabsTrigger value="registration" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('Dynamic Registration')}</span>
                </TabsTrigger>
              </ResponsiveTabsList>

              <TabsContent value="apps" className="p-6 space-y-6">

      {/* Add App Form - Inline when shown */}
      {showAddForm && (
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Register New Application')}</h3>
                <p className="text-muted-foreground font-medium">{t('Configure a new SMART on FHIR application')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              {t('Cancel')}
            </Button>
          </div>
          <SmartAppAddForm
            open={true}
            onClose={() => setShowAddForm(false)}
            onAddApp={handleAddApp}
            scopeSets={scopeSets}
          />
        </div>
      )}

      {/* Enhanced Statistics Cards */}
      <SmartAppsStatistics apps={apps} />

      {/* Enhanced Applications Table */}
      <SmartAppsTable
        apps={apps}
        scopeSets={scopeSets}
        onToggleAppStatus={toggleAppStatus}
        onOpenScopeEditor={openScopeEditor}
        onDeleteApp={deleteApp}
        onEditApp={handleEditApp}
        onViewConfig={handleViewConfig}
        onEditAuth={handleEditAuth}
      />

      {/* Scope Management Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                  Manage Scopes: {editingApp?.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-1">
                  {t('Configure SMART on FHIR scopes for this application')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingApp && (
            <div className="space-y-6">
              {/* Current Configuration */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center">
                    <Database className="w-5 h-5 mr-2 text-primary" />
                    {t('Current Configuration')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-2">{t('Current Scope Set')}</div>
                      <div className="p-3 bg-background rounded-lg border border-border/50">
                        <span className="font-medium text-foreground">
                          {getScopeSetName(editingApp.scopeSetId)}
                        </span>
                        {editingApp.scopeSetId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {scopeSets.find(set => set.id === editingApp.scopeSetId)?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-2">{t('Total Scopes')}</div>
                      <div className="p-3 bg-background rounded-lg border border-border/50">
                        <span className="font-bold text-2xl text-primary">{((editingApp.defaultClientScopes || []).length + (editingApp.optionalClientScopes || []).length)}</span>
                        <span className="text-sm text-muted-foreground ml-2">active scopes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-2">{t('Active Scopes')}</div>
                    <div className="bg-background p-4 rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {/* Default Scopes */}
                        {(editingApp.defaultClientScopes || []).map((scope: string, index: number) => (
                          <Badge key={`default-${index}`} variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                            {scope}
                          </Badge>
                        ))}
                        {/* Optional Scopes */}
                        {(editingApp.optionalClientScopes || []).map((scope: string, index: number) => (
                          <Badge key={`optional-${index}`} variant="outline" className="text-xs font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                            {scope} (optional)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scope Set Selection */}
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
                    {t('Update Scope Configuration')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">{t('Select Scope Set')}</div>
                      <Select
                        value={editingApp.scopeSetId || '__custom__'}
                        onValueChange={(value) => {
                          const scopeSetId = value === '__custom__' ? null : value;
                          const additionalScopes = editingApp.optionalClientScopes || [];
                          updateAppScopes(editingApp.id, scopeSetId, additionalScopes);
                          setEditingApp({
                            ...editingApp,
                            scopeSetId: scopeSetId || undefined,
                            defaultClientScopes: scopeSetId 
                              ? [...(scopeSets.find(set => set.id === scopeSetId)?.scopes || []), ...additionalScopes]
                              : additionalScopes
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">{t('Custom Scopes Only')}</SelectItem>
                          {scopeSets.map((scopeSet) => (
                            <SelectItem key={scopeSet.id} value={scopeSet.id}>
                              {scopeSet.name} ({scopeSet.scopes.length} scopes)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">{t('Additional Optional Scopes')}</div>
                      <Textarea
                        value={(editingApp.optionalClientScopes || []).join('\n')}
                        onChange={(e) => {
                          const optionalScopes = e.target.value.split('\n').filter(scope => scope.trim());
                          updateAppScopes(editingApp.id, editingApp.scopeSetId || null, []);
                          setEditingApp({
                            ...editingApp,
                            optionalClientScopes: optionalScopes,
                            defaultClientScopes: editingApp.scopeSetId 
                              ? [...(scopeSets.find(set => set.id === editingApp.scopeSetId)?.scopes || [])]
                              : (editingApp.defaultClientScopes || [])
                          });
                        }}
                        rows={5}
                        className="font-mono"
                        placeholder="patient/Patient.read&#10;patient/Observation.read&#10;openid profile"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4 pt-4">
                <Button variant="outline" onClick={() => setShowScopeDialog(false)} className="px-8 py-3 rounded-xl">
                  {t('Close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit App Details Modal */}
      {editingApp && (
        <SmartAppEditModal
          key={editingApp.clientId}
          open={showEditDialog}
          onOpenChange={(open) => setShowEditDialog(open)}
          app={editingApp}
          onSave={async (clientId, data) => {
            await clientApis.smartApps.putAdminSmartAppsByClientId({
              clientId,
              updateSmartAppRequest: data,
            });
            const updatedApps = await clientApis.smartApps.getAdminSmartApps();
            if (Array.isArray(updatedApps)) {
              setBackendApps(updatedApps);
              setApps(updatedApps.map((app: SmartApp) => ({
                ...app,
                status: app.enabled ? 'active' : 'inactive',
                lastUsed: new Date().toISOString().split('T')[0],
                appType: app.appType || (app.serviceAccountsEnabled ? 'backend-service' : 'standalone-app'),
                serverAccessType: 'all-servers',
              })));
            }
            notify({ type: 'success', message: t('Application updated successfully') });
          }}
        />
      )}

      {/* View Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Application Configuration')}</DialogTitle>
            <DialogDescription>
              Complete configuration details for {editingApp?.name}
            </DialogDescription>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('Basic Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-muted-foreground">{t('Client ID:')}</div>
                    <div className="font-mono">{editingApp.clientId}</div>
                    <div className="font-medium text-muted-foreground">{t('Name:')}</div>
                    <div>{editingApp.name}</div>
                    <div className="font-medium text-muted-foreground">{t('Type:')}</div>
                    <div>{editingApp.appType}</div>
                    <div className="font-medium text-muted-foreground">{t('Authentication:')}</div>
                    <div>{editingApp.clientAuthenticatorType || 'client-secret'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('Redirect URIs')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {editingApp.redirectUris?.map((uri, i) => (
                      <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">{uri}</code>
                    )) || <span className="text-sm text-muted-foreground">{t('No redirect URIs configured')}</span>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('Scopes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-medium mb-1">{t('Default Scopes:')}</div>
                      <div className="flex flex-wrap gap-1">
                        {editingApp.defaultClientScopes?.map((scope, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{scope}</Badge>
                        )) || <span className="text-sm text-muted-foreground">{t('None')}</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-1">{t('Optional Scopes:')}</div>
                      <div className="flex flex-wrap gap-1">
                        {editingApp.optionalClientScopes?.map((scope, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{scope}</Badge>
                        )) || <span className="text-sm text-muted-foreground">{t('None')}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowConfigDialog(false)}>{t('Close')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Authentication Settings Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Authentication Settings')}</DialogTitle>
            <DialogDescription>
              View authentication configuration for {editingApp?.name}
            </DialogDescription>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('Current Configuration')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">{t('Authentication Type')}</div>
                    <Badge>{editingApp.clientAuthenticatorType || 'client-secret'}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">{t('Public Client')}</div>
                    <Badge>{editingApp.publicClient ? 'Yes' : 'No'}</Badge>
                  </div>
                  {editingApp.clientAuthenticatorType === 'client-jwt' && (
                    <div>
                      <div className="text-sm font-medium mb-1">{t('JWKS Configuration')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('Using asymmetric JWT authentication with registered public key')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('Note:')}</strong> {t('Changing authentication type requires re-registering the application to ensure proper key/secret generation. To change the auth method, delete this app and create a new one with the desired configuration.')}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAuthDialog(false)}>{t('Close')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle>{t('Delete Application')}</DialogTitle>
                <DialogDescription>
                  {t('This action cannot be undone')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">{t('Application:')}</span> {editingApp.name}
                  </div>
                  <div>
                    <span className="font-medium">{t('Client ID:')}</span>
                    <code className="ml-2 bg-background px-2 py-1 rounded text-xs">
                      {editingApp.clientId}
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                <p className="text-sm text-red-900 dark:text-red-100">
                  <strong>{t('Warning:')}</strong> {t('Deleting this application will permanently remove it from Keycloak. Any active sessions and tokens for this application will be invalidated.')}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowDeleteDialog(false);
                  setEditingApp(null);
                }}>
                  {t('Cancel')}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('Delete Application')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
              </TabsContent>

              <TabsContent value="registration" className="p-6 space-y-6">
                <DynamicClientRegistrationSettings />
              </TabsContent>

              <TabsContent value="app-store" className="p-6 space-y-6">
                <AppStoreManagement />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}