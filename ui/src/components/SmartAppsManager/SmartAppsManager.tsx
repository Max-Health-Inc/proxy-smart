import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Shield, 
  X,
  Database,
  CheckCircle,
  AlertCircle,
  UserPlus,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { SmartAppAddForm } from './SmartAppAddForm';
import { SmartAppsTable } from './SmartAppsTable';
import { SmartAppsStatistics } from './SmartAppsStatistics';
import { DynamicClientRegistrationSettings } from '../DynamicClientRegistrationSettings';
import { NotificationToast } from '../ui/NotificationToast';
import { useAuth } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { getItem } from '@/lib/storage';
import { createAuthenticatedClientApis } from '@/lib/apiClient';
import type { SmartApp, ScopeSet, SmartAppFormData, SmartAppClientTypeEnum } from '@/lib/types/api';

// Mock data for SMART on FHIR applications
const mockApps: SmartApp[] = [
  {
    id: '1',
    name: 'Clinical Decision Support',
    clientId: 'cds-app-123',
    redirectUris: ['https://cds.example.com/callback'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Observation.read'],
    scopeSetId: 'physician-readonly',
    optionalClientScopes: [],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'AI-powered clinical decision support tool',
    appType: 'ehr-launch',
    clientAuthenticatorType: 'client-jwt',
    serverAccessType: 'user-person-servers',
  },
  {
    id: '2',
    name: 'Patient Portal',
    clientId: 'portal-456',
    redirectUris: ['https://portal.example.com/auth'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    optionalClientScopes: ['patient/Appointment.read'],
    status: 'active',
    lastUsed: '2024-12-27',
    description: 'Patient self-service portal',
    appType: 'standalone-app',
    clientAuthenticatorType: 'client-secret',
    serverAccessType: 'all-servers',
  },
  {
    id: '3',
    name: 'Research Analytics',
    clientId: 'research-789',
    redirectUris: ['https://research.example.com/oauth'],
    defaultClientScopes: ['user/Patient.read', 'user/Observation.read', 'user/DiagnosticReport.read'],
    scopeSetId: 'researcher-population',
    optionalClientScopes: [],
    status: 'inactive',
    lastUsed: '2024-12-20',
    description: 'Clinical research data analytics platform',
    appType: 'backend-service',
    clientAuthenticatorType: 'client-jwt',
    serverAccessType: 'selected-servers',
    allowedServerIds: ['hapi-fhir-org', 'test-server-1'],
  },
  {
    id: '4',
    name: 'Mobile Health App',
    clientId: 'mobile-health-101',
    redirectUris: ['https://mhealth.example.com/callback'],
    defaultClientScopes: ['patient/Patient.read', 'patient/Observation.read'],
    optionalClientScopes: ['patient/ActivityDefinition.read'],
    status: 'active',
    lastUsed: '2024-12-26',
    description: 'Mobile application for patient health monitoring',
    appType: 'standalone-app',
    clientAuthenticatorType: 'client-jwt',
    serverAccessType: 'user-person-servers',
  },
  {
    id: '5',
    name: 'Lab Results Viewer',
    clientId: 'lab-viewer-202',
    redirectUris: ['https://labs.example.com/auth'],
    defaultClientScopes: ['patient/DiagnosticReport.read', 'patient/Observation.read'],
    optionalClientScopes: [],
    status: 'active',
    lastUsed: '2024-12-25',
    description: 'Laboratory results visualization tool',
    appType: 'ehr-launch',
    clientAuthenticatorType: 'client-secret',
    serverAccessType: 'selected-servers',
    allowedServerIds: ['lab-server-main'],
  },
  {
    id: '6',
    name: 'Autonomous Clinical AI Agent',
    clientId: 'ai-agent-303',
    redirectUris: ['https://ai-assistant.example.com/callback'],
    defaultClientScopes: ['agent/Patient.read', 'agent/Observation.read', 'agent/Condition.read', 'agent/MedicationRequest.read', 'agent/CarePlan.create'],
    optionalClientScopes: ['agent/RiskAssessment.create', 'agent/ClinicalImpression.create'],
    status: 'active',
    lastUsed: '2024-12-28',
    description: 'Autonomous AI agent that independently analyzes patient data and creates clinical assessments.',
    appType: 'agent',
    clientAuthenticatorType: 'client-jwt',
    serverAccessType: 'all-servers',
  },
  {
    id: '7',
    name: 'Life Saving Lawnmower',
    clientId: 'emergency-mower-911',
    redirectUris: ['https://smart-lawnmower.emergency.com/callback'],
    defaultClientScopes: ['agent/Patient.read', 'agent/Encounter.create', 'agent/Observation.create'],
    optionalClientScopes: ['agent/EmergencyContact.read', 'agent/AllergyIntolerance.read', 'agent/MedicationStatement.read'],
    status: 'active',
    lastUsed: '2024-12-29',
    description: 'Autonomous robotic lawnmower with emergency medical response capabilities.',
    appType: 'agent',
    clientAuthenticatorType: 'client-jwt',
    serverAccessType: 'all-servers',
  },
];

export function SmartAppsManager() {
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
  const [editFormData, setEditFormData] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load scope sets from ScopeManager
  useEffect(() => {
    const loadScopeSets = async () => {
      try {
        const saved = await getItem<ScopeSet[]>('smart-scope-sets');
        if (saved) {
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
        
        setBackendApps(fetchedApps);
        
        // Convert backend apps to our SmartApp format or use mock apps if no real apps
        if (fetchedApps.length === 0) {
          // No apps from backend, show mock apps
          setApps(mockApps);
        } else {
          // Convert backend apps to our format
          const convertedApps: SmartApp[] = fetchedApps.map((backendApp: SmartApp) => ({
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
        // Fallback to mock apps on error
        setApps(mockApps);
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
        // Merge backend apps with mock apps for display
        const backendAppIds = new Set(updatedApps.map(a => a.id));
        const remainingMockApps = mockApps.filter(app => !backendAppIds.has(app.id));
        setApps([...updatedApps, ...remainingMockApps]);
      }

      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create SMART app:', error);
      // Show error notification to user
      alert('Failed to create SMART app. Please check the console for details.');
    }
  };

  // Helper to determine if we're showing mock data
  const isShowingMockData = backendApps.length === 0;

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

      setNotification({
        type: 'success',
        message: `Application "${app.name}" ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Failed to toggle app status:', error);
      
      // Revert optimistic update on error
      setApps(apps.map(a =>
        a.clientId === clientId
          ? { ...a, status: app.status, enabled: app.enabled }
          : a
      ));

      setNotification({
        type: 'error',
        message: `Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} application: ${error instanceof Error ? error.message : 'Unknown error'}`
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

      setNotification({
        type: 'success',
        message: `Successfully deleted application "${editingApp.name}"`
      });
      
      setShowDeleteDialog(false);
      setEditingApp(null);
    } catch (error) {
      console.error('Failed to delete app:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-muted-foreground">Loading SMART applications...</span>
        </div>
      ) : (
        <>
          {/* Enhanced Header Section */}
          <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
              <div className="flex-1">
                <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                  SMART on FHIR Applications
                </h1>
                <div className="text-muted-foreground text-lg flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  Manage registered healthcare applications and their SMART on FHIR permissions
                </div>
                {isShowingMockData && (
                  <div className="mt-4 flex items-center space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-orange-700 dark:text-orange-300 font-medium">
                      Showing sample applications - no real apps found in backend
                    </span>
                  </div>
                )}
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
                Register New App
              </Button>
            </div>
          </div>

          {/* Tabs for different sections */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
            <Tabs value={smartAppsManagerTab} onValueChange={setSmartAppsManagerTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-t-2xl">
                <TabsTrigger value="apps" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Registered Apps</span>
                </TabsTrigger>
                <TabsTrigger value="registration" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                  <UserPlus className="w-4 h-4" />
                  <span>Dynamic Registration</span>
                </TabsTrigger>
              </TabsList>

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
                <h3 className="text-xl font-bold text-foreground tracking-tight">Register New Application</h3>
                <p className="text-muted-foreground font-medium">Configure a new SMART on FHIR application</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
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
                  Configure SMART on FHIR scopes for this application
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
                    Current Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground mb-2">Current Scope Set</div>
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
                      <div className="text-sm font-semibold text-muted-foreground mb-2">Total Scopes</div>
                      <div className="p-3 bg-background rounded-lg border border-border/50">
                        <span className="font-bold text-2xl text-primary">{((editingApp.defaultClientScopes || []).length + (editingApp.optionalClientScopes || []).length)}</span>
                        <span className="text-sm text-muted-foreground ml-2">active scopes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Active Scopes</div>
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
                    Update Scope Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">Select Scope Set</div>
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
                          <SelectItem value="__custom__">Custom Scopes Only</SelectItem>
                          {scopeSets.map((scopeSet) => (
                            <SelectItem key={scopeSet.id} value={scopeSet.id}>
                              {scopeSet.name} ({scopeSet.scopes.length} scopes)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-muted-foreground">Additional Optional Scopes</div>
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
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit App Details Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditFormData({ name: '', description: '' });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Application Details</DialogTitle>
            <DialogDescription>
              Update the basic information for {editingApp?.name}
            </DialogDescription>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Application Name</Label>
                <Input
                  type="text"
                  value={editFormData.name || editingApp.name || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={editFormData.description || editingApp.description || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!editingApp?.clientId) return;
                  try {
                    await clientApis.smartApps.putAdminSmartAppsByClientId({
                      clientId: editingApp.clientId,
                      updateSmartAppRequest: {
                        name: editFormData.name || editingApp.name,
                        description: editFormData.description || editingApp.description,
                      }
                    });
                    // Refresh apps list
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
                    setNotification({ type: 'success', message: 'Application updated successfully' });
                    setShowEditDialog(false);
                    setEditFormData({ name: '', description: '' });
                  } catch (error) {
                    console.error('Failed to update app:', error);
                    setNotification({ type: 'error', message: 'Failed to update application' });
                  }
                }}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Configuration</DialogTitle>
            <DialogDescription>
              Complete configuration details for {editingApp?.name}
            </DialogDescription>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-muted-foreground">Client ID:</div>
                    <div className="font-mono">{editingApp.clientId}</div>
                    <div className="font-medium text-muted-foreground">Name:</div>
                    <div>{editingApp.name}</div>
                    <div className="font-medium text-muted-foreground">Type:</div>
                    <div>{editingApp.appType}</div>
                    <div className="font-medium text-muted-foreground">Authentication:</div>
                    <div>{editingApp.clientAuthenticatorType || 'client-secret'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Redirect URIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {editingApp.redirectUris?.map((uri, i) => (
                      <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">{uri}</code>
                    )) || <span className="text-sm text-muted-foreground">No redirect URIs configured</span>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Scopes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-medium mb-1">Default Scopes:</div>
                      <div className="flex flex-wrap gap-1">
                        {editingApp.defaultClientScopes?.map((scope, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{scope}</Badge>
                        )) || <span className="text-sm text-muted-foreground">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-1">Optional Scopes:</div>
                      <div className="flex flex-wrap gap-1">
                        {editingApp.optionalClientScopes?.map((scope, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{scope}</Badge>
                        )) || <span className="text-sm text-muted-foreground">None</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MCP Access Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">MCP Server Access (AI Capabilities)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-medium mb-1">Access Type:</div>
                      <Badge variant="outline" className="text-xs">
                        {(editingApp as SmartApp & { mcpAccessType?: string }).mcpAccessType || 'none'}
                      </Badge>
                    </div>
                    {(editingApp as SmartApp & { mcpAccessType?: string; allowedMcpServerNames?: string[] }).mcpAccessType === 'selected-mcp-servers' && (
                      <div>
                        <div className="text-xs font-medium mb-1">Allowed MCP Servers:</div>
                        <div className="flex flex-wrap gap-1">
                          {(editingApp as SmartApp & { allowedMcpServerNames?: string[] }).allowedMcpServerNames?.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20">{name}</Badge>
                          )) || <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Skills Access Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Skills (AI Knowledge Packages)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(editingApp.allowedSkillNames && editingApp.allowedSkillNames.length > 0) ? (
                      <div>
                        <div className="text-xs font-medium mb-1">Assigned Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {editingApp.allowedSkillNames.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No skills assigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowConfigDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Authentication Settings Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Authentication Settings</DialogTitle>
            <DialogDescription>
              View authentication configuration for {editingApp?.name}
            </DialogDescription>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Authentication Type</div>
                    <Badge>{editingApp.clientAuthenticatorType || 'client-secret'}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Public Client</div>
                    <Badge>{editingApp.publicClient ? 'Yes' : 'No'}</Badge>
                  </div>
                  {editingApp.clientAuthenticatorType === 'client-jwt' && (
                    <div>
                      <div className="text-sm font-medium mb-1">JWKS Configuration</div>
                      <div className="text-xs text-muted-foreground">
                        Using asymmetric JWT authentication with registered public key
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Changing authentication type requires re-registering the application 
                  to ensure proper key/secret generation. To change the auth method, delete this app and 
                  create a new one with the desired configuration.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Close</Button>
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
                <DialogTitle>Delete Application</DialogTitle>
                <DialogDescription>
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingApp && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">Application:</span> {editingApp.name}
                  </div>
                  <div>
                    <span className="font-medium">Client ID:</span>
                    <code className="ml-2 bg-background px-2 py-1 rounded text-xs">
                      {editingApp.clientId}
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                <p className="text-sm text-red-900 dark:text-red-100">
                  <strong>Warning:</strong> Deleting this application will permanently remove it from Keycloak. 
                  Any active sessions and tokens for this application will be invalidated.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowDeleteDialog(false);
                  setEditingApp(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
              </TabsContent>

              <TabsContent value="registration" className="p-6 space-y-6">
                <DynamicClientRegistrationSettings />
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
