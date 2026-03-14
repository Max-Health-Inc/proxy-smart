import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getItem, storeItem } from '@/lib/storage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Shield,
  Code,
  Database,
  CheckCircle,
  AlertCircle,
  Copy,
  Play,
  Loader2
} from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { useTranslation } from 'react-i18next';

// FHIR Resource types for scope building
const FHIR_RESOURCES = [
  'Patient', 'Practitioner', 'PractitionerRole', 'Organization', 'Location',
  'Observation', 'DiagnosticReport', 'Condition', 'Procedure', 'MedicationRequest',
  'Medication', 'AllergyIntolerance', 'Immunization', 'Encounter', 'Appointment',
  'DocumentReference', 'Binary', 'QuestionnaireResponse', 'CarePlan', 'Goal',
  'List', 'Composition', 'Bundle', 'ValueSet', 'CodeSystem', 'StructureDefinition'
];

// FHIR permissions
const FHIR_PERMISSIONS = {
  c: { label: 'Create', description: 'Type level create', color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300' },
  r: { label: 'Read', description: 'Instance level read, vread, history', color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300' },
  u: { label: 'Update', description: 'Instance level update, patch', color: 'bg-yellow-500/10 dark:bg-yellow-400/20 text-yellow-800 dark:text-yellow-300' },
  d: { label: 'Delete', description: 'Instance level delete', color: 'bg-red-500/10 dark:bg-red-400/20 text-red-800 dark:text-red-300' },
  s: { label: 'Search', description: 'Type level search, history, system level', color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300' }
};

// Scope contexts - defines the data access pattern for SMART scopes:
// - patient: Access to resources where the patient is the subject
// - user: Access to resources accessible by the current user
// - system: Backend system access without user context (for server-to-server)
// - agent: Access on behalf of an autonomous agent (fhirUser should reference Device resource for identity)
const SCOPE_CONTEXTS = [
  { value: 'patient', label: 'Patient', description: 'Patient-specific data access' },
  { value: 'user', label: 'User', description: 'User-accessible data' },
  { value: 'system', label: 'System', description: 'System-level access (no user context)' },
  { value: 'agent', label: 'Agent', description: 'Access on behalf of an autonomous agent (fhirUser=Device/xyz)' }
];

// Pre-built scope templates with detailed role-based access
const SCOPE_TEMPLATES = [
  {
    id: 'physician-full',
    name: 'Physician - Full Clinical Access',
    description: 'Complete clinical data access for attending physicians with full CRUD permissions',
    role: 'physician',
    color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
    scopes: [
      'patient/Patient.cruds',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.cruds',
      'patient/Condition.cruds',
      'patient/Procedure.cruds',
      'patient/MedicationRequest.cruds',
      'patient/AllergyIntolerance.cruds',
      'patient/Immunization.cruds',
      'patient/Encounter.cruds',
      'patient/Appointment.cruds',
      'patient/CarePlan.cruds',
      'patient/Goal.cruds',
      'patient/DocumentReference.cruds',
      'user/Practitioner.rs',
      'user/Organization.rs',
      'user/Location.rs',
      'launch/patient',
      'launch/encounter',
      'openid',
      'profile',
      'fhirUser',
      'offline_access'
    ]
  },
  {
    id: 'physician-readonly',
    name: 'Physician - Read-Only Access',
    description: 'Read-only clinical data access for consulting physicians',
    role: 'physician',
    color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
    scopes: [
      'patient/Patient.rs',
      'patient/Observation.rs',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/MedicationRequest.rs',
      'patient/AllergyIntolerance.rs',
      'patient/Immunization.rs',
      'patient/Encounter.rs',
      'patient/DocumentReference.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'profile',
      'fhirUser'
    ]
  },
  {
    id: 'nurse-care',
    name: 'Nurse - Care Delivery',
    description: 'Clinical data access for direct patient care with medication and observation updates',
    role: 'nurse',
    color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300 border-green-500/20 dark:border-green-400/20',
    scopes: [
      'patient/Patient.rs',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/MedicationRequest.rs',
      'patient/MedicationAdministration.cruds',
      'patient/AllergyIntolerance.rs',
      'patient/Immunization.cruds',
      'patient/Encounter.rus',
      'patient/Appointment.rs',
      'patient/CarePlan.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'profile',
      'fhirUser'
    ]
  },
  {
    id: 'nurse-basic',
    name: 'Nurse - Basic Access',
    description: 'Essential read-only clinical data for nursing staff',
    role: 'nurse',
    color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300 border-green-500/20 dark:border-green-400/20',
    scopes: [
      'patient/Patient.r',
      'patient/Observation.rs',
      'patient/DiagnosticReport.r',
      'patient/Condition.r',
      'patient/MedicationRequest.r',
      'patient/AllergyIntolerance.r',
      'patient/Immunization.r',
      'patient/Encounter.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'researcher-population',
    name: 'Researcher - Population Health',
    description: 'De-identified population-level data access for research and analytics',
    role: 'researcher',
    color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-400/20',
    scopes: [
      'user/Patient.rs',
      'user/Observation.rs',
      'user/DiagnosticReport.rs',
      'user/Condition.rs',
      'user/Procedure.rs',
      'user/MedicationRequest.rs',
      'user/Encounter.rs',
      'user/AllergyIntolerance.rs',
      'system/ValueSet.rs',
      'system/CodeSystem.rs',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'researcher-clinical-trial',
    name: 'Researcher - Clinical Trial',
    description: 'Patient-specific research data access with consent for clinical trials',
    role: 'researcher',
    color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-400/20',
    scopes: [
      'patient/Patient.r',
      'patient/Observation.rs',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/MedicationRequest.rs',
      'patient/ResearchStudy.rs',
      'patient/ResearchSubject.cruds',
      'patient/QuestionnaireResponse.cruds',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'pharmacist-medication',
    name: 'Pharmacist - Medication Management',
    description: 'Medication-focused access for pharmacists with dispensing capabilities',
    role: 'pharmacist',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    scopes: [
      'patient/Patient.rs',
      'patient/MedicationRequest.rs',
      'patient/Medication.rs',
      'patient/MedicationDispense.cruds',
      'patient/MedicationAdministration.rs',
      'patient/AllergyIntolerance.rs',
      'patient/Condition.rs',
      'patient/Observation.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'therapist-care',
    name: 'Therapist - Care Planning',
    description: 'Therapy-focused access for physical, occupational, and speech therapists',
    role: 'therapist',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    scopes: [
      'patient/Patient.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/Observation.cruds',
      'patient/CarePlan.cruds',
      'patient/Goal.cruds',
      'patient/Appointment.cruds',
      'patient/DiagnosticReport.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'admin-full',
    name: 'Administrator - System Access',
    description: 'Complete system access for healthcare administrators',
    role: 'admin',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'patient/*.cruds',
      'user/*.cruds',
      'system/*.cruds',
      'launch/patient',
      'launch/encounter',
      'openid',
      'profile',
      'fhirUser',
      'offline_access'
    ]
  },
  {
    id: 'emergency-physician',
    name: 'Emergency Physician - Critical Care',
    description: 'Emergency department access with rapid clinical data retrieval',
    role: 'physician',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'patient/Patient.cruds',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.cruds',
      'patient/Condition.cruds',
      'patient/MedicationRequest.cruds',
      'patient/AllergyIntolerance.cruds',
      'patient/Encounter.cruds',
      'patient/Procedure.cruds',
      'user/Practitioner.rs',
      'user/Location.rs',
      'launch/patient',
      'launch/encounter',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'autonomous-agent',
    name: 'Autonomous Agent - Clinical AI',
    description: 'Agent scopes for autonomous AI systems acting independently (fhirUser should reference Device resource)',
    role: 'agent',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    scopes: [
      'agent/Patient.read',
      'agent/Observation.read',
      'agent/DiagnosticReport.read', 
      'agent/Condition.read',
      'agent/MedicationRequest.read',
      'agent/AllergyIntolerance.read',
      'agent/CarePlan.create',
      'agent/RiskAssessment.create',
      'agent/ClinicalImpression.create',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'emergency-agent',
    name: 'Emergency Response Agent',
    description: 'Agent scopes for emergency response robots/devices (fhirUser=Device/emergency-unit-id)',
    role: 'agent',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'agent/Patient.read',
      'agent/Encounter.create',
      'agent/Observation.create',
      'agent/AllergyIntolerance.read',
      'agent/MedicationStatement.read',
      'agent/EmergencyContact.read',
      'openid',
      'fhirUser'
    ]
  }
];

interface ScopeSet {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

export function ScopeManager() {
  const { t } = useTranslation();
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingScope, setEditingScope] = useState<ScopeSet | null>(null);

  // Scope builder state
  const [newScopeSet, setNewScopeSet] = useState({
    name: '',
    description: '',
    scopes: [] as string[]
  });

  // Visual scope builder state
  const [builderState, setBuilderState] = useState({
    context: 'patient' as string,
    resource: '',
    permissions: [] as string[],
    searchParams: '',
    customScope: '',
    selectedRole: undefined as string | undefined
  });

  useEffect(() => {
    loadScopeSets();
  }, []);

  const loadScopeSets = async () => {
    setLoading(true);
    try {
      // Load from encrypted storage - in production, this would be an API call
      const savedSets = await getItem<ScopeSet[]>('smart-scope-sets') || [];

      // Add templates if not already present
      const templatesWithIds = SCOPE_TEMPLATES.map(template => ({
        ...template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: true
      }));

      const existingTemplateIds = savedSets.filter((s: ScopeSet) => s.isTemplate).map((s: ScopeSet) => s.id);
      const newTemplates = templatesWithIds.filter(t => !existingTemplateIds.includes(t.id));

      const allSets = [...savedSets, ...newTemplates];
      setScopeSets(allSets);

      // Save back with templates
      await storeItem('smart-scope-sets', allSets);
    } catch (error) {
      console.error('Failed to load scope sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveScopeSet = async (scopeSet: Omit<ScopeSet, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'>) => {
    const newSet: ScopeSet = {
      ...scopeSet,
      id: editingScope?.id || `scope-${Date.now()}`,
      createdAt: editingScope?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemplate: false
    };

    const updatedSets = editingScope
      ? scopeSets.map(s => s.id === editingScope.id ? newSet : s)
      : [...scopeSets, newSet];

    setScopeSets(updatedSets);
    await storeItem('smart-scope-sets', updatedSets);

    // Reset builder state
    setShowBuilder(false);
    setEditingScope(null);
    setNewScopeSet({ name: '', description: '', scopes: [] });
    setBuilderState({ context: 'patient', resource: '', permissions: [], searchParams: '', customScope: '', selectedRole: undefined });
  };

  const deleteScopeSet = async (id: string) => {
    const updatedSets = scopeSets.filter(s => s.id !== id);
    setScopeSets(updatedSets);
    await storeItem('smart-scope-sets', updatedSets);
  };

  const validateScope = (scope: string): { valid: boolean; message: string; type: 'error' | 'warning' | 'success'; suggestions?: string[] } => {
    if (!scope.trim()) {
      return {
        valid: false,
        message: 'Scope cannot be empty',
        type: 'error',
        suggestions: ['Try: patient/Patient.r', 'Try: openid', 'Try: launch/patient']
      };
    }

    const trimmedScope = scope.trim();

    // Check for common SMART launch scopes
    const launchScopes = ['openid', 'profile', 'fhirUser', 'offline_access', 'online_access'];
    if (launchScopes.includes(trimmedScope)) {
      return {
        valid: true,
        message: `Valid SMART launch scope: ${trimmedScope}`,
        type: 'success'
      };
    }

    // Check for launch context scopes
    const launchContextPattern = /^launch\/(patient|encounter|practitioner|location|organization)(\?.*)?$/;
    if (launchContextPattern.test(trimmedScope)) {
      return {
        valid: true,
        message: `Valid launch context scope: ${trimmedScope}`,
        type: 'success'
      };
    }

    // Check for FHIR resource scopes
    const fhirScopePattern = /^(patient|user|system|agent)\/([\w*]+)\.([cruds]+)(\?.*)?$/;
    const match = fhirScopePattern.exec(trimmedScope);

    if (!match) {
      const suggestions = [];

      // Check if it looks like a FHIR scope but is malformed
      if (trimmedScope.includes('/') && trimmedScope.includes('.')) {
        suggestions.push('Format should be: context/Resource.permissions');
        suggestions.push('Example: patient/Patient.cruds');
      } else if (trimmedScope.includes('/')) {
        suggestions.push('Missing permissions after resource name');
        suggestions.push('Add permissions like: .r (read) or .cruds (full access)');
      } else {
        suggestions.push('Use format: context/Resource.permissions');
        suggestions.push('Valid contexts: patient, user, system, agent');
      }

      return {
        valid: false,
        message: 'Invalid SMART scope format. Expected: context/Resource.permissions or launch scope',
        type: 'error',
        suggestions
      };
    }

    const [, context, resource, permissions] = match;

    // Validate context
    const validContexts = ['patient', 'user', 'system', 'agent'];
    if (!validContexts.includes(context)) {
      return {
        valid: false,
        message: `Invalid context '${context}'. Valid contexts: ${validContexts.join(', ')}`,
        type: 'error',
        suggestions: validContexts.map(c => `${c}/${resource}.${permissions}`)
      };
    }

    // Validate resource
    if (resource !== '*' && !FHIR_RESOURCES.includes(resource)) {
      const similarResources = FHIR_RESOURCES.filter(r =>
        r.toLowerCase().includes(resource.toLowerCase()) ||
        resource.toLowerCase().includes(r.toLowerCase())
      ).slice(0, 3);

      return {
        valid: false,
        message: `'${resource}' is not a standard FHIR resource`,
        type: 'warning',
        suggestions: similarResources.length > 0
          ? similarResources.map(r => `${context}/${r}.${permissions}`)
          : [`${context}/Patient.${permissions}`, `${context}/Observation.${permissions}`]
      };
    }

    // Validate permissions order and content
    const validPermissions = 'cruds';
    let lastIndex = -1;
    const permissionLabels = {
      'c': 'create',
      'r': 'read',
      'u': 'update',
      'd': 'delete',
      's': 'search'
    };

    for (const char of permissions) {
      const currentIndex = validPermissions.indexOf(char);
      if (currentIndex === -1) {
        return {
          valid: false,
          message: `Invalid permission '${char}'. Valid permissions: c(create), r(read), u(update), d(delete), s(search)`,
          type: 'error',
          suggestions: [
            `${context}/${resource}.r`,
            `${context}/${resource}.rs`,
            `${context}/${resource}.cruds`
          ]
        };
      }
      if (currentIndex <= lastIndex) {
        return {
          valid: false,
          message: 'Permissions must be in order: c, r, u, d, s',
          type: 'error',
          suggestions: [`${context}/${resource}.${permissions.split('').sort((a, b) => validPermissions.indexOf(a) - validPermissions.indexOf(b)).join('')}`]
        };
      }
      lastIndex = currentIndex;
    }

    // Check for potential security issues
    const warnings = [];
    if (permissions.includes('d') && context === 'patient') {
      warnings.push('Delete permission on patient data requires careful consideration');
    }
    if (resource === '*' && permissions.includes('c')) {
      warnings.push('Create permission on all resources (*) is very broad');
    }
    if (context === 'system' && permissions.length > 2) {
      warnings.push('System-level access with broad permissions should be restricted');
    }

    const permissionList = permissions.split('').map(p => permissionLabels[p as keyof typeof permissionLabels]).join(', ');

    return {
      valid: true,
      message: warnings.length > 0
        ? `Valid scope with ${permissionList} permissions. Warning: ${warnings[0]}`
        : `Valid FHIR scope: ${context}/${resource} with ${permissionList} permissions`,
      type: warnings.length > 0 ? 'warning' : 'success'
    };
  };

  const buildScope = () => {
    if (builderState.customScope) {
      return builderState.customScope;
    }

    if (!builderState.context || !builderState.resource || builderState.permissions.length === 0) {
      return '';
    }

    let scope = `${builderState.context}/${builderState.resource}.${builderState.permissions.sort().join('')}`;

    if (builderState.searchParams) {
      scope += `?${builderState.searchParams}`;
    }

    return scope;
  };

  const addScopeToSet = () => {
    const scope = buildScope();
    if (scope && !newScopeSet.scopes.includes(scope)) {
      setNewScopeSet({
        ...newScopeSet,
        scopes: [...newScopeSet.scopes, scope]
      });

      // Reset builder for next scope
      setBuilderState({
        context: 'patient',
        resource: '',
        permissions: [],
        searchParams: '',
        customScope: '',
        selectedRole: undefined
      });
    }
  };

  const removeScopeFromSet = (index: number) => {
    setNewScopeSet({
      ...newScopeSet,
      scopes: newScopeSet.scopes.filter((_, i) => i !== index)
    });
  };



  const testScope = async (scope: string) => {
    // In production, this would test the scope against the FHIR server
    const validation = validateScope(scope);
    console.log('Scope validation result:', validation);

    // Simulate API test - would update UI with validation results
    setTimeout(() => {
      console.log('API test completed');
    }, 3000);
  };

  const editScopeSet = (scopeSet: ScopeSet) => {
    setEditingScope(scopeSet);
    setNewScopeSet({
      name: scopeSet.name,
      description: scopeSet.description,
      scopes: [...scopeSet.scopes]
    });
    setShowBuilder(true);
  };

  const loadTemplate = (template: typeof SCOPE_TEMPLATES[0]) => {
    setNewScopeSet({
      name: template.name + ' (Copy)',
      description: template.description,
      scopes: [...template.scopes]
    });
    setShowBuilder(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('SMART Scope Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              {t('Build and manage FHIR resource access scopes')}
            </div>
          </div>
          <Button
            onClick={() => setShowBuilder(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('Create Scope Set')}
          </Button>
        </div>
      </div>

      {/* Scope Builder Modal/Panel */}
      {showBuilder && (
        <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {editingScope ? t('Edit Scope Set') : t('Visual Scope Builder')}
                </h3>
                <p className="text-muted-foreground font-medium">{t('Build SMART on FHIR scopes visually or with templates')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Builder Controls */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-foreground">{t('Scope Set Details')}</Label>
                <Input
                  placeholder={t('Scope set name')}
                  value={newScopeSet.name}
                  onChange={(e) => setNewScopeSet({ ...newScopeSet, name: e.target.value })}
                  className="rounded-xl"
                />
                <Input
                  placeholder={t('Description')}
                  value={newScopeSet.description}
                  onChange={(e) => setNewScopeSet({ ...newScopeSet, description: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">{t('Role-Based Templates')}</Label>
                  <Select
                    value={builderState.selectedRole || 'all'}
                    onValueChange={(value) => setBuilderState({ ...builderState, selectedRole: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger className="w-[160px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Roles')}</SelectItem>
                      <SelectItem value="physician">{t('Physician')}</SelectItem>
                      <SelectItem value="nurse">{t('Nurse')}</SelectItem>
                      <SelectItem value="researcher">{t('Researcher')}</SelectItem>
                      <SelectItem value="pharmacist">{t('Pharmacist')}</SelectItem>
                      <SelectItem value="therapist">{t('Therapist')}</SelectItem>
                      <SelectItem value="admin">{t('Administrator')}</SelectItem>
                      <SelectItem value="agent">{t('Agent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {SCOPE_TEMPLATES
                    .filter(template => !builderState.selectedRole || template.role === builderState.selectedRole)
                    .map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border border-border/50 rounded-xl hover:bg-muted/50 hover:border-border/80 transition-all duration-200 cursor-pointer group"
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${template.color}`}>
                              {template.role}
                            </span>
                            <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                              {template.name}
                            </h4>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                            {template.scopes.length} scopes
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.scopes.slice(0, 4).map((scope, index) => (
                            <span key={index} className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                              {scope}
                            </span>
                          ))}
                          {template.scopes.length > 4 && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                              +{template.scopes.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-foreground">{t('Visual Scope Builder')}</Label>

                {/* Context Selection */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t('Context')}</Label>
                  <Select
                    value={builderState.context}
                    onValueChange={(value) => setBuilderState({ ...builderState, context: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOPE_CONTEXTS.map((ctx) => (
                        <SelectItem key={ctx.value} value={ctx.value}>
                          {ctx.label} - {ctx.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resource Selection */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t('FHIR Resource')}</Label>
                  <Select
                    value={builderState.resource || '__none__'}
                    onValueChange={(value) => setBuilderState({ ...builderState, resource: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select resource...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('Select resource...')}</SelectItem>
                      <SelectItem value="*">{t('* (All resources)')}</SelectItem>
                      {FHIR_RESOURCES.map((resource) => (
                        <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Permissions */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t('Permissions')}</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(FHIR_PERMISSIONS).map(([key, perm]) => (
                      <label key={key} className="flex items-center space-x-2 p-2 border border-border/50 rounded-lg hover:bg-muted/50">
                        <Checkbox
                          checked={builderState.permissions.includes(key)}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              setBuilderState({
                                ...builderState,
                                permissions: [...builderState.permissions, key].sort()
                              });
                            } else {
                              setBuilderState({
                                ...builderState,
                                permissions: builderState.permissions.filter(p => p !== key)
                              });
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-foreground" title={perm.description}>
                          {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search Parameters */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t('Search Parameters (Optional)')}</Label>
                  <Input
                    placeholder="e.g., category=laboratory&status=final"
                    value={builderState.searchParams}
                    onChange={(e) => setBuilderState({ ...builderState, searchParams: e.target.value })}
                    className="rounded-lg text-sm"
                  />
                </div>

                {/* Custom Scope Input */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t('Or enter custom scope')}</Label>
                  <Input
                    placeholder="e.g., launch/patient, openid, fhirUser"
                    value={builderState.customScope}
                    onChange={(e) => setBuilderState({ ...builderState, customScope: e.target.value })}
                    className="rounded-lg text-sm"
                  />
                </div>

                {/* Preview & Add */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">{t('Scope Preview')}</Label>
                  <div className="space-y-2">
                    {(() => {
                      const previewScope = buildScope();
                      const validation = previewScope ? validateScope(previewScope) : null;

                      return (
                        <div className={`p-3 rounded-lg border transition-all duration-200 ${!previewScope ? 'bg-muted border-border/50' :
                          validation?.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                            validation?.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                              'bg-red-500/10 border-red-500/20'
                          }`}>
                          <div className="flex items-center justify-between">
                            <code className={`text-sm font-mono ${!previewScope ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                              {previewScope || t('Build a scope...')}
                            </code>
                            <Button
                              onClick={addScopeToSet}
                              disabled={!previewScope || (validation?.valid === false)}
                              size="sm"
                              className="px-4 py-2"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              {t('Add')}
                            </Button>
                          </div>

                          {validation && (
                            <div className={`mt-2 text-xs font-medium ${validation.type === 'success' ? 'text-green-700 dark:text-green-300' :
                              validation.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                                'text-red-700 dark:text-red-300'
                              }`}>
                              {validation.message}
                            </div>
                          )}

                          {validation?.suggestions && validation.suggestions.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">{t('Suggestions:')}</div>
                              <div className="flex flex-wrap gap-1">
                                {validation.suggestions.slice(0, 2).map((suggestion, index) => (
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setBuilderState({ ...builderState, customScope: suggestion });
                                    }}
                                    className="text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 h-auto px-2 py-1"
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Scope Set */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-foreground">{t('Current Scope Set')}</Label>
              <div className="border border-border/50 rounded-xl p-4 max-h-96 overflow-y-auto bg-card">
                {newScopeSet.scopes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">{t('No scopes added yet')}</p>
                    <p className="text-sm mt-1">{t('Build scopes using the controls on the left or load a template')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newScopeSet.scopes.map((scope, index) => {
                      const validation = validateScope(scope);
                      return (
                        <div key={index} className={`p-4 rounded-xl border transition-all duration-200 ${validation.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                          validation.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                            'bg-red-500/10 border-red-500/20'
                          }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <code className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border border-border/50">
                                {scope}
                              </code>
                              <div className="flex items-center">
                                {validation.type === 'success' && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {validation.type === 'warning' && (
                                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                                )}
                                {validation.type === 'error' && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <CopyButton value={scope} variant="icon-sm" className="p-1 h-8 w-8" title={t('Copy scope')} />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => testScope(scope)}
                                className="p-1 h-8 w-8 hover:bg-muted"
                                title={t('Test scope')}
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeScopeFromSet(index)}
                                className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-muted"
                                title={t('Remove scope')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className={`text-xs font-medium mb-1 ${validation.type === 'success' ? 'text-green-700 dark:text-green-300' :
                            validation.type === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
                              'text-red-700 dark:text-red-300'
                            }`}>
                            {validation.message}
                          </div>

                          {validation.suggestions && validation.suggestions.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">{t('Suggestions:')}</div>
                              <div className="flex flex-wrap gap-1">
                                {validation.suggestions.slice(0, 3).map((suggestion, suggestionIndex) => (
                                  <Button
                                    key={suggestionIndex}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newScopes = [...newScopeSet.scopes];
                                      newScopes[index] = suggestion;
                                      setNewScopeSet({ ...newScopeSet, scopes: newScopes });
                                    }}
                                    className="text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 h-auto px-2 py-1"
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={async () => await saveScopeSet(newScopeSet)}
                  disabled={!newScopeSet.name || newScopeSet.scopes.length === 0}
                >
                  {editingScope ? t('Update') : t('Save')} {t('Scope Set')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBuilder(false);
                    setEditingScope(null);
                    setNewScopeSet({ name: '', description: '', scopes: [] });
                  }}
                  className="px-8 py-3"
                >
                  {t('Cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-primary tracking-wide">{t('Total Scope Sets')}</h3>
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">{scopeSets.length}</div>
              <p className="text-sm text-muted-foreground font-medium">{t('Custom & templates')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 tracking-wide">{t('Custom Scope Sets')}</h3>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-300 mb-2">{scopeSets.filter(s => !s.isTemplate).length}</div>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">{t('User created')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 tracking-wide">{t('Available Templates')}</h3>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-2">{SCOPE_TEMPLATES.length}</div>
              <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">{t('Role-based')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 tracking-wide">{t('Avg Scopes')}</h3>
              </div>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-300 mb-2">
                {scopeSets.length > 0 ? Math.round(scopeSets.reduce((sum, s) => sum + s.scopes.length, 0) / scopeSets.length) : 0}
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">{t('Per scope set')}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Scope Sets')}</h3>
              <p className="text-muted-foreground font-medium">{t('Manage your SMART scope configurations')}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="font-semibold text-foreground">{t('Name')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('Scopes')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('Type')}</TableHead>
                    <TableHead className="font-semibold text-foreground">{t('Updated')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopeSets.map((scopeSet) => (
                    <TableRow key={scopeSet.id} className="border-border/50 hover:bg-muted/50 transition-colors duration-200">
                      <TableCell>
                        <div>
                          <div className="font-semibold text-foreground">{scopeSet.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{scopeSet.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scopeSet.scopes.slice(0, 3).map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs font-mono">
                              {scope}
                            </Badge>
                          ))}
                          {scopeSet.scopes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{scopeSet.scopes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={scopeSet.isTemplate ? 'bg-purple-500/10 text-purple-800 dark:text-purple-300' : 'bg-primary/10 text-primary'}>
                          {scopeSet.isTemplate ? t('Template') : t('Custom')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(scopeSet.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editScopeSet(scopeSet)}>
                              <Edit className="w-4 h-4 mr-2" />
                              {t('Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(scopeSet.scopes.join(' '))}>
                              <Copy className="w-4 h-4 mr-2" />
                              {t('Copy Scopes')}
                            </DropdownMenuItem>
                            {!scopeSet.isTemplate && (
                              <DropdownMenuItem
                                onClick={async () => await deleteScopeSet(scopeSet.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('Delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
