import { useState, useEffect } from 'react';
import { Button } from '@max-health-inc/shared-ui';
import { getItem, storeItem } from '@/lib/storage';
import { StatCard } from '@/components/ui/stat-card';
import { Plus, Shield, Code, Database, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FHIR_RESOURCES, SCOPE_TEMPLATES } from './constants';
import { ScopeBuilder } from './ScopeBuilder';
import { ScopeSetsTable } from './ScopeSetsTable';
import { RegisteredScopes } from './RegisteredScopes';
import type { BuilderState, ScopeSet, ScopeTemplate, ScopeValidation } from './types';

const INITIAL_BUILDER_STATE: BuilderState = {
  context: 'patient',
  resource: '',
  permissions: [],
  searchParams: '',
  customScope: '',
  selectedRole: undefined,
};

export function ScopeManager({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingScope, setEditingScope] = useState<ScopeSet | null>(null);

  const [newScopeSet, setNewScopeSet] = useState({ name: '', description: '', scopes: [] as string[] });
  const [builderState, setBuilderState] = useState<BuilderState>(INITIAL_BUILDER_STATE);

  /* ─── Data ─────────────────────────────────────────────────────── */

  useEffect(() => {
    getItem<ScopeSet[]>('smart-scope-sets')
      .then(async savedSets => {
        const sets = savedSets || [];
        const templatesWithIds = SCOPE_TEMPLATES.map((template) => ({
          ...template,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTemplate: true,
        }));
        const existingTemplateIds = sets.filter((s: ScopeSet) => s.isTemplate).map((s: ScopeSet) => s.id);
        const newTemplates = templatesWithIds.filter((t) => !existingTemplateIds.includes(t.id));
        const allSets = [...sets, ...newTemplates];
        setScopeSets(allSets);
        await storeItem('smart-scope-sets', allSets);
      })
      .catch(error => console.error('Failed to load scope sets:', error))
      .finally(() => setLoading(false));
  }, []);

  const saveScopeSet = async (scopeSet: Omit<ScopeSet, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'>) => {
    const newSet: ScopeSet = {
      ...scopeSet,
      id: editingScope?.id || `scope-${crypto.randomUUID()}`,
      createdAt: editingScope?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemplate: false,
    };
    const updatedSets = editingScope ? scopeSets.map((s) => (s.id === editingScope.id ? newSet : s)) : [...scopeSets, newSet];
    setScopeSets(updatedSets);
    await storeItem('smart-scope-sets', updatedSets);
    resetBuilder();
  };

  const deleteScopeSet = async (id: string) => {
    const updatedSets = scopeSets.filter((s) => s.id !== id);
    setScopeSets(updatedSets);
    await storeItem('smart-scope-sets', updatedSets);
  };

  /* ─── Handlers ─────────────────────────────────────────────────── */

  const resetBuilder = () => {
    setShowBuilder(false);
    setEditingScope(null);
    setNewScopeSet({ name: '', description: '', scopes: [] });
    setBuilderState(INITIAL_BUILDER_STATE);
  };

  const editScopeSet = (scopeSet: ScopeSet) => {
    setEditingScope(scopeSet);
    setNewScopeSet({ name: scopeSet.name, description: scopeSet.description, scopes: [...scopeSet.scopes] });
    setShowBuilder(true);
  };

  const loadTemplate = (template: ScopeTemplate) => {
    setNewScopeSet({ name: template.name + ' (Copy)', description: template.description, scopes: [...template.scopes] });
    setShowBuilder(true);
  };

  /* ─── Validation ───────────────────────────────────────────────── */

  const validateScope = (scope: string): ScopeValidation => {
    if (!scope.trim()) {
      return { valid: false, message: 'Scope cannot be empty', type: 'error', suggestions: ['Try: patient/Patient.r', 'Try: openid', 'Try: launch/patient'] };
    }

    const trimmedScope = scope.trim();

    // Common SMART launch scopes
    const launchScopes = ['openid', 'profile', 'fhirUser', 'offline_access', 'online_access'];
    if (launchScopes.includes(trimmedScope)) {
      return { valid: true, message: `Valid SMART launch scope: ${trimmedScope}`, type: 'success' };
    }

    // Launch context scopes
    const launchContextPattern = /^launch\/(patient|encounter|practitioner|location|organization)(\?.*)?$/;
    if (launchContextPattern.test(trimmedScope)) {
      return { valid: true, message: `Valid launch context scope: ${trimmedScope}`, type: 'success' };
    }

    // FHIR resource scopes
    const fhirScopePattern = /^(patient|user|system|agent)\/([\w*]+)\.([cruds]+)(\?.*)?$/;
    const match = fhirScopePattern.exec(trimmedScope);

    if (!match) {
      const suggestions = [];
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
      return { valid: false, message: 'Invalid SMART scope format. Expected: context/Resource.permissions or launch scope', type: 'error', suggestions };
    }

    const [, context, resource, permissions] = match;

    // Validate context
    const validContexts = ['patient', 'user', 'system', 'agent'];
    if (!validContexts.includes(context)) {
      return { valid: false, message: `Invalid context '${context}'. Valid contexts: ${validContexts.join(', ')}`, type: 'error', suggestions: validContexts.map((c) => `${c}/${resource}.${permissions}`) };
    }

    // Validate resource
    if (resource !== '*' && !FHIR_RESOURCES.includes(resource)) {
      const similarResources = FHIR_RESOURCES.filter((r) => r.toLowerCase().includes(resource.toLowerCase()) || resource.toLowerCase().includes(r.toLowerCase())).slice(0, 3);
      return {
        valid: false,
        message: `'${resource}' is not a standard FHIR resource`,
        type: 'warning',
        suggestions: similarResources.length > 0 ? similarResources.map((r) => `${context}/${r}.${permissions}`) : [`${context}/Patient.${permissions}`, `${context}/Observation.${permissions}`],
      };
    }

    // Validate permissions order
    const validPermissions = 'cruds';
    let lastIndex = -1;
    const permissionLabels: Record<string, string> = { c: 'create', r: 'read', u: 'update', d: 'delete', s: 'search' };

    for (const char of permissions) {
      const currentIndex = validPermissions.indexOf(char);
      if (currentIndex === -1) {
        return {
          valid: false,
          message: `Invalid permission '${char}'. Valid permissions: c(create), r(read), u(update), d(delete), s(search)`,
          type: 'error',
          suggestions: [`${context}/${resource}.r`, `${context}/${resource}.rs`, `${context}/${resource}.cruds`],
        };
      }
      if (currentIndex <= lastIndex) {
        return {
          valid: false,
          message: 'Permissions must be in order: c, r, u, d, s',
          type: 'error',
          suggestions: [
            `${context}/${resource}.${permissions
              .split('')
              .sort((a, b) => validPermissions.indexOf(a) - validPermissions.indexOf(b))
              .join('')}`,
          ],
        };
      }
      lastIndex = currentIndex;
    }

    // Security warnings
    const warnings = [];
    if (permissions.includes('d') && context === 'patient') warnings.push('Delete permission on patient data requires careful consideration');
    if (resource === '*' && permissions.includes('c')) warnings.push('Create permission on all resources (*) is very broad');
    if (context === 'system' && permissions.length > 2) warnings.push('System-level access with broad permissions should be restricted');

    const permissionList = permissions
      .split('')
      .map((p) => permissionLabels[p])
      .join(', ');

    return {
      valid: true,
      message: warnings.length > 0 ? `Valid scope with ${permissionList} permissions. Warning: ${warnings[0]}` : `Valid FHIR scope: ${context}/${resource} with ${permissionList} permissions`,
      type: warnings.length > 0 ? 'warning' : 'success',
    };
  };

  /* ─── Render ───────────────────────────────────────────────────── */

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-6 space-y-6 bg-background min-h-full'}>
      {/* Header */}
      {embedded ? (
        <div className="flex justify-end">
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="h-5 w-5 mr-2" />
            {t('Create Scope Set')}
          </Button>
        </div>
      ) : (
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
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-5 w-5 mr-2" />
              {t('Create Scope Set')}
            </Button>
          </div>
        </div>
      )}

      {/* Registered Keycloak Scopes */}
      <RegisteredScopes embedded />

      {/* Scope Builder */}
      {showBuilder && (
        <ScopeBuilder
          editingScope={editingScope}
          newScopeSet={newScopeSet}
          setNewScopeSet={setNewScopeSet}
          builderState={builderState}
          setBuilderState={setBuilderState}
          onSave={saveScopeSet}
          onCancel={resetBuilder}
          onLoadTemplate={loadTemplate}
          validateScope={validateScope}
        />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={Database}
          label={t('Total Scope Sets')}
          value={scopeSets.length}
          subtitle={t('Custom & templates')}
          color="primary"
        />
        <StatCard
          icon={Shield}
          label={t('Custom Scope Sets')}
          value={scopeSets.filter((s) => !s.isTemplate).length}
          subtitle={t('User created')}
          color="green"
        />
        <StatCard
          icon={Code}
          label={t('Available Templates')}
          value={SCOPE_TEMPLATES.length}
          subtitle={t('Role-based')}
          color="purple"
        />
        <StatCard
          icon={Settings}
          label={t('Avg Scopes')}
          value={
            scopeSets.length > 0
              ? Math.round(scopeSets.reduce((sum, s) => sum + s.scopes.length, 0) / scopeSets.length)
              : 0
          }
          subtitle={t('Per scope set')}
          color="orange"
        />
      </div>

      {/* Scope Sets Table */}
      <ScopeSetsTable
        scopeSets={scopeSets}
        loading={loading}
        onEdit={editScopeSet}
        onDelete={deleteScopeSet}
      />
    </div>
  );
}
