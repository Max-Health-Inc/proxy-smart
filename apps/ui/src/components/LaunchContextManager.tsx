import { useState, useEffect, useRef } from 'react';
import { Badge, Button, Label } from '@max-health-inc/shared-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@max-health-inc/shared-ui';
import { LaunchContextSetBuilder } from './LaunchContextSetBuilder';
import { useLaunchContextSets } from '../stores/smartStore';
import { useAuth } from '@/stores/authStore';
import type { ContextSet } from '@/lib/types/api';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { StatCard } from '@/components/ui/stat-card';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Rocket,
  Settings,
  Copy,
  Check,
  Eye,
  Target,
  AlertCircle,
  Users,
  FileText,
  Shield
} from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { useTranslation } from 'react-i18next';

// Pre-built launch context templates based on SMART on FHIR specification
const LAUNCH_CONTEXT_TEMPLATES = [
  {
    id: 'ehr-patient-launch',
    name: 'EHR Patient Launch',
    description: 'Standard patient context launch from within an EHR with full patient access',
    contexts: [
      'launch',
      'launch/patient',
      'openid',
      'fhirUser',
      'patient/*.rs'
    ],
    category: 'ehr-launch',
    isTemplate: true
  },
  {
    id: 'ehr-encounter-launch',
    name: 'EHR Encounter Launch',
    description: 'Patient and encounter context launch from within an EHR',
    contexts: [
      'launch',
      'launch/patient',
      'launch/encounter',
      'openid',
      'fhirUser',
      'patient/*.rs'
    ],
    category: 'ehr-launch',
    isTemplate: true
  },
  {
    id: 'standalone-patient',
    name: 'Standalone Patient Launch',
    description: 'Standalone app launch with patient selection for apps launched outside EHR',
    contexts: [
      'launch',
      'launch/patient',
      'openid',
      'fhirUser',
      'patient/*.rs'
    ],
    category: 'standalone',
    isTemplate: true
  },
  {
    id: 'practitioner-context',
    name: 'Practitioner Context',
    description: 'Launch with practitioner context for workflow apps',
    contexts: [
      'launch',
      'launch/practitioner',
      'openid',
      'fhirUser',
      'user/Practitioner.rs'
    ],
    category: 'workflow',
    isTemplate: true
  },
  {
    id: 'imaging-study-context',
    name: 'Imaging Study Context',
    description: 'Launch with imaging study context for radiology apps',
    contexts: [
      'launch',
      'launch/imagingstudy',
      'launch/patient',
      'openid',
      'fhirUser',
      'patient/ImagingStudy.rs',
      'patient/DiagnosticReport.rs'
    ],
    category: 'specialty',
    isTemplate: true
  },
  {
    id: 'medication-reconciliation',
    name: 'Medication Reconciliation',
    description: 'Medication reconciliation with role-based list contexts',
    contexts: [
      'launch',
      'launch/patient',
      'launch/list?role=https://example.org/med-list-at-home',
      'launch/list?role=https://example.org/med-list-at-hospital',
      'openid',
      'fhirUser',
      'patient/MedicationRequest.cruds',
      'patient/List.rs'
    ],
    category: 'specialty',
    isTemplate: true
  },
  {
    id: 'questionnaire-context',
    name: 'Questionnaire Data Collection',
    description: 'Data collection app with questionnaire context',
    contexts: [
      'launch',
      'launch/questionnaire',
      'launch/patient',
      'openid',
      'fhirUser',
      'patient/QuestionnaireResponse.cruds'
    ],
    category: 'data-collection',
    isTemplate: true
  },
  {
    id: 'minimal-identity',
    name: 'Minimal Identity Only',
    description: 'Basic identity verification without patient access',
    contexts: [
      'openid',
      'fhirUser'
    ],
    category: 'identity',
    isTemplate: true
  }
];



interface LaunchContextUser {
  userId: string;
  username: string;
  fhirUser?: string;
  patient?: string;
  encounter?: string;
  fhirContext?: string;
  intent?: string;
  smartStyleUrl?: string;
  tenant?: string;
  needPatientBanner?: boolean;
}

// Sample data removed — real user launch contexts are loaded from the backend API

export function LaunchContextManager({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  // Use fhirStore for context sets management
  const { contextSets, addContextSet, updateContextSet, deleteContextSet } = useLaunchContextSets();

  // Use auth store to get authenticated client APIs and auth state
  const { isAuthenticated, profile, clientApis } = useAuth();

  // Track if templates have been initialized to prevent infinite loops
  const templatesInitialized = useRef(false);

  const [launchContextUsers, setLaunchContextUsers] = useState<LaunchContextUser[]>([]);
  const [loading] = useState(false);
  const [launchContextsLoading, setLaunchContextsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSet, setEditingSet] = useState<ContextSet | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Ref to prevent infinite loading of launch contexts
  const launchContextsLoadingRef = useRef(false);
  const launchContextsLoadedRef = useRef(false);

  // Function to retry loading launch contexts
  const retryLoadLaunchContexts = () => {
    launchContextsLoadedRef.current = false; // Reset the loaded flag
    launchContextsLoadingRef.current = false; // Reset the loading flag too
    // If we're already on the users tab, we need to force a reload by toggling the state
    if (activeTab === 'users') {
      // Trigger the useEffect by changing state
      setActiveTab('overview');
      setTimeout(() => setActiveTab('users'), 50);
    } else {
      setActiveTab('users'); // This will trigger the useEffect to load launch contexts
    }
  };

  // Initialize templates in the store if not already present
  useEffect(() => {
    // Only initialize once to prevent infinite loops
    if (templatesInitialized.current) {
      return;
    }

    // Check if templates are already in the store
    const existingTemplateIds = contextSets.filter(s => s.isTemplate).map(s => s.id);

    // Add templates if not already present
    const templatesWithDates = LAUNCH_CONTEXT_TEMPLATES.map(template => ({
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const newTemplates = templatesWithDates.filter(t => !existingTemplateIds.includes(t.id));

    // Only add templates if there are new ones to avoid infinite loops
    if (newTemplates.length > 0) {
      newTemplates.forEach(template => {
        addContextSet(template);
      });

      console.debug('🎯 Launch context templates initialized:', {
        existing: existingTemplateIds.length,
        added: newTemplates.length
      });
    }

    // Mark as initialized
    templatesInitialized.current = true;
  }, [addContextSet, contextSets]); // Include contextSets but use ref to prevent infinite loop

  // Load launch contexts on component mount and when switching to users tab
  useEffect(() => {
    // Only load launch contexts when explicitly switching to users tab, not on component mount
    if (activeTab !== 'users' || launchContextsLoadedRef.current) return;
    launchContextsLoadedRef.current = true;

    // Prevent infinite loading
    if (launchContextsLoadingRef.current) {
      console.debug('Launch contexts already loading, skipping...');
      return;
    }

    // Check auth and roles — skip silently, computed state can show messages
    if (!isAuthenticated || !profile?.roles?.includes('admin')) {
      return;
    }

    launchContextsLoadingRef.current = true;
    clientApis.launchContexts.getAdminLaunchContexts()
      .then(response => {
        setLaunchContextUsers(response);
        setError(null);
        console.log('Successfully loaded launch contexts:', response.length);
      })
      .catch(err => {
        console.error('Failed to load launch contexts:', err);
        setError('Failed to load launch contexts. Please try again.');
      })
      .finally(() => {
        setLaunchContextsLoading(false);
        launchContextsLoadingRef.current = false;
      });
  }, [activeTab, isAuthenticated, profile, clientApis.launchContexts]);

  // Handle saving a context set from the builder
  const handleSaveContextSet = (contextSetData: Omit<ContextSet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = editingSet?.id || `ctx-${Date.now()}`;
    const now = new Date().toISOString();
    const set: ContextSet = {
      ...contextSetData,
      id,
      createdAt: editingSet?.createdAt || now,
      updatedAt: now,
    };

    if (editingSet) {
      updateContextSet(editingSet.id, set);
    } else {
      addContextSet(set);
    }

    // Reset form
    setShowBuilder(false);
    setEditingSet(null);
  };

  // Handle canceling the builder
  const handleCancelBuilder = () => {
    setShowBuilder(false);
    setEditingSet(null);
  };

  // Delete a context set
  const deleteSet = (id: string) => {
    deleteContextSet(id);
  };

  // Edit a context set
  const editSet = (set: ContextSet) => {
    setEditingSet(set);
    setShowBuilder(true);
  };

  // Copy a template
  const copyTemplate = (template: ContextSet) => {
    setEditingSet({
      ...template,
      id: `copy-${template.id}`,
      name: template.name + ' (Copy)',
      isTemplate: false
    });
    setShowBuilder(true);
  };


  if (loading) {
    return <PageLoadingState message={t('Loading Launch Contexts...')} className="min-h-[400px]" />;
  }

  return (
    <div className={embedded ? "space-y-6" : "p-4 sm:p-6 space-y-6 bg-background min-h-full"}>
      {/* Enhanced Header */}
      {embedded ? (
        <div className="flex justify-end space-x-3">
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="w-5 h-5 mr-2" />
            {t('New Context Set')}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-5 h-5 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      ) : (
        <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                {t('Launch Context Management')}
              </h1>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-lg">
                  {t('Configure SMART on FHIR launch contexts and scope templates')}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="w-5 h-5 mr-2" />
                {t('New Context Set')}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="w-5 h-5 mr-2" />
                {t('Refresh')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={Target}
          label={t('Total Context Sets')}
          value={contextSets.length}
          color="blue"
        />
        <StatCard
          icon={Settings}
          label={t('Templates')}
          value={contextSets.filter(s => s.isTemplate).length}
          color="blue"
        />
        <StatCard
          icon={Check}
          label={t('Custom Sets')}
          value={contextSets.filter(s => !s.isTemplate).length}
          color="green"
        />
        <StatCard
          icon={Rocket}
          label={t('Launch Scopes')}
          value={contextSets.reduce((total, set) => total + set.contexts.length, 0)}
          subtitle={t('Total scopes')}
          color="purple"
        />
      </div>

      {/* Enhanced Main Content */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${profile?.roles?.includes('admin') ? 'grid-cols-3' : 'grid-cols-2'} bg-muted/50 rounded-t-2xl`}>
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Context Overview')}</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('Template Library')}</TabsTrigger>
            {profile?.roles?.includes('admin') && (
              <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">{t('User Contexts')}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="p-6 space-y-6">
            {contextSets.filter(s => !s.isTemplate).length === 0 ? (
              <div className="bg-card/70 backdrop-blur-sm p-12 rounded-2xl border border-border/50 shadow-lg text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-muted rounded-2xl flex items-center justify-center shadow-sm">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t('No Custom Context Sets')}</h3>
                <p className="text-muted-foreground mb-6 font-medium">
                  {t('Create your first launch context set or use a template from the Template Library')}
                </p>
                <Button
                  onClick={() => setShowBuilder(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Create Context Set')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contextSets.filter(s => !s.isTemplate).map((set) => (
                  <div key={set.id} className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{set.name}</h3>
                          {set.description && (
                            <p className="text-sm text-muted-foreground">{set.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        {set.contexts.length} contexts
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-semibold text-foreground">{t('Launch Contexts:')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {set.contexts.map((ctx) => (
                          <div key={ctx} className="flex items-center group">
                            <Badge
                              variant="outline"
                              className="text-xs bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                              onClick={() => navigator.clipboard.writeText(ctx)}
                            >
                              {ctx}
                            </Badge>
                            <CopyButton value={ctx} variant="icon-xs" className="h-auto p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                      <span>Updated: {new Date(set.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        size="sm"
                        onClick={() => editSet(set)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('Edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSet(set.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contextSets.filter(s => s.isTemplate).map((template) => (
                <div key={template.id} className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                        <Settings className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/30">
                      {t('Template')}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <h4 className="text-sm font-semibold text-foreground">{t('Launch Contexts:')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.contexts.map((ctx) => (
                        <div key={ctx} className="flex items-center group">
                          <Badge
                            variant="outline"
                            className="text-xs bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                            onClick={() => navigator.clipboard.writeText(ctx)}
                          >
                            {ctx}
                          </Badge>
                          <CopyButton value={ctx} variant="icon-xs" className="h-auto p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      onClick={() => copyTemplate(template)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {t('Use Template')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(template.contexts.join(' '))}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="users" className="p-6 space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t('User Launch Contexts')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('View users with configured SMART launch context attributes.')}
                  </p>
                </div>
              </div>
            </div>

            {launchContextsLoading ? (
              <PageLoadingState message={t('Loading launch contexts...')} className="min-h-[200px]" />
            ) : error ? (
              <div className="space-y-6">
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                    <div>
                      <h3 className="text-lg font-semibold text-destructive">{t('Unable to Load Launch Contexts')}</h3>
                      <p className="text-destructive/80">{error}</p>
                    </div>
                  </div>
                  {error.includes('admin privileges') && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>{t('Note:')}</strong> {t('To view user launch contexts, you need admin privileges in Keycloak. Contact your system administrator to grant you the necessary permissions.')}
                      </p>
                    </div>
                  )}
                  <div className="flex space-x-3 mt-4">
                    <Button
                      onClick={retryLoadLaunchContexts}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('Retry')}
                    </Button>
                    <Button
                      onClick={() => setError(null)}
                      variant="outline"
                    >
                      {t('Dismiss')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : launchContextUsers.length === 0 ? (
              <div className="space-y-6">
                <div className="bg-card/70 backdrop-blur-sm p-12 rounded-2xl border border-border/50 shadow-lg text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-muted to-muted/70 rounded-2xl flex items-center justify-center shadow-sm">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{t('No Users with Launch Contexts')}</h3>
                  <p className="text-muted-foreground mb-6 font-medium">
                    {t('No users currently have launch context attributes configured in your system')}
                  </p>
                  <Button
                    onClick={retryLoadLaunchContexts}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('Refresh Launch Contexts')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {launchContextUsers.map((user: LaunchContextUser) => (
                  <div key={user.userId} className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{user.username}</h3>
                          <p className="text-sm text-muted-foreground">User ID: {user.userId}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {user.fhirUser && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('FHIR User')}</Label>
                          <p className="text-sm font-mono text-foreground mt-1">{user.fhirUser}</p>
                        </div>
                      )}
                      {user.patient && (
                        <div className="bg-blue-500/10 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('Patient Context')}</Label>
                          <p className="text-sm font-mono text-blue-900 dark:text-blue-100 mt-1">{user.patient}</p>
                        </div>
                      )}
                      {user.encounter && (
                        <div className="bg-green-500/10 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">{t('Encounter Context')}</Label>
                          <p className="text-sm font-mono text-green-900 dark:text-green-100 mt-1">{user.encounter}</p>
                        </div>
                      )}
                      {user.intent && (
                        <div className="bg-purple-500/10 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">{t('Intent')}</Label>
                          <p className="text-sm font-mono text-purple-900 dark:text-purple-100 mt-1">{user.intent}</p>
                        </div>
                      )}
                      {user.smartStyleUrl && (
                        <div className="bg-orange-500/10 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('Style URL')}</Label>
                          <p className="text-sm font-mono text-orange-900 dark:text-orange-100 mt-1 truncate">{user.smartStyleUrl}</p>
                        </div>
                      )}
                      {user.tenant && (
                        <div className="bg-indigo-500/10 p-3 rounded-lg">
                          <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{t('Tenant')}</Label>
                          <p className="text-sm font-mono text-indigo-900 dark:text-indigo-100 mt-1">{user.tenant}</p>
                        </div>
                      )}
                    </div>

                    {user.fhirContext && (
                      <div className="bg-yellow-500/10 p-3 rounded-lg mb-4">
                        <Label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">{t('FHIR Context')}</Label>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs bg-background">
                            <FileText className="w-3 h-3 mr-1" />
                            {t('View JSON')}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {user.needPatientBanner !== undefined && (
                      <div className="flex items-center space-x-2 mb-4">
                        <Shield className={`w-4 h-4 ${user.needPatientBanner ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                        <span className="text-sm text-foreground">
                          Patient Banner: {user.needPatientBanner ? 'Required' : 'Not Required'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Launch Context Set Builder */}
      <LaunchContextSetBuilder
        open={showBuilder}
        onOpenChange={setShowBuilder}
        editingSet={editingSet}
        onSave={handleSaveContextSet}
        onCancel={handleCancelBuilder}
      />
    </div>
  );
}