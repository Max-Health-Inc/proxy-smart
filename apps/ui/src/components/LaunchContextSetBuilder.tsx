import React, { useState, useRef } from 'react';
import type { ContextSet } from '@/lib/types/api';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Plus,
  Edit,
  AlertCircle,
  Sparkles,
  Zap,
  Code2,
  Layers,
  Target,
  Lightbulb,
  Rocket,
  Wand2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Resources available for launch context (per SMART on FHIR 2.2.0 spec)
const LAUNCH_RESOURCES = ['patient', 'encounter', 'practitioner', 'location', 'organization', 'diagnosticreport', 'imagingstudy', 'list', 'questionnaire'];

// Common SMART scopes that are often used with launch contexts
const COMMON_SMART_SCOPES = [
  'openid',
  'fhirUser', 
  'profile',
  'offline_access',
  'online_access',
  'launch',
  'launch/patient',
  'launch/encounter'
];



interface LaunchContextSetBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSet?: ContextSet | null;
  onSave: (contextSet: Omit<ContextSet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function LaunchContextSetBuilder({
  open,
  onOpenChange,
  editingSet,
  onSave,
  onCancel
}: LaunchContextSetBuilderProps) {
  const { t } = useTranslation();
  // Use a key-based reset pattern: track the editingSet identity to reset state
  const editingSetKey = editingSet?.name ?? '';
  
  const [contextSet, setContextSet] = useState<{
    name: string;
    description: string;
    category: string;
    contexts: string[];
  }>(() => editingSet ? {
    name: editingSet.name,
    description: editingSet.description || '',
    category: editingSet.category || '',
    contexts: [...editingSet.contexts]
  } : {
    name: '',
    description: '',
    category: '',
    contexts: []
  });

  const [builderState, setBuilderState] = useState<{
    resource: string;
    role: string;
    customScope: string;
  }>({ resource: '', role: '', customScope: '' });

  const [error, setError] = useState<string | null>(null);
  const [activeBuilder, setActiveBuilder] = useState<'quick' | 'custom'>('quick');

  // Reset state when editingSet changes using a ref to track previous value
  // This uses the "you might need a key" pattern recommended by React
  const prevEditingSetKeyRef = useRef(editingSetKey);
  if (prevEditingSetKeyRef.current !== editingSetKey) {
    prevEditingSetKeyRef.current = editingSetKey;
    // State updates during render are allowed when derived from props
    // React will re-render with the new state
    if (editingSet) {
      setContextSet({
        name: editingSet.name,
        description: editingSet.description || '',
        category: editingSet.category || '',
        contexts: [...editingSet.contexts]
      });
    } else {
      setContextSet({ name: '', description: '', category: '', contexts: [] });
    }
    setBuilderState({ resource: '', role: '', customScope: '' });
    setError(null);
  }

  // Validate scope format
  const validateScope = (scope: string): { valid: boolean; message: string; type: 'error' | 'warning' | 'success' } => {
    if (!scope.trim()) {
      return { valid: false, message: 'Scope cannot be empty', type: 'error' };
    }

    const trimmedScope = scope.trim();

    // Check for common SMART launch scopes
    const commonScopes = ['openid', 'profile', 'fhirUser', 'offline_access', 'online_access', 'launch'];
    if (commonScopes.includes(trimmedScope)) {
      return { valid: true, message: `Valid SMART scope: ${trimmedScope}`, type: 'success' };
    }

    // Check for launch context scopes
    const launchContextPattern = /^launch\/(patient|encounter|practitioner|location|organization|diagnosticreport|imagingstudy|list|questionnaire)(\?.*)?$/;
    if (launchContextPattern.test(trimmedScope)) {
      return { valid: true, message: `Valid launch context scope: ${trimmedScope}`, type: 'success' };
    }

    // Check for FHIR resource scopes
    const fhirScopePattern = /^(patient|user|system)\/([\w*]+)\.([cruds]+)(\?.*)?$/;
    if (fhirScopePattern.test(trimmedScope)) {
      return { valid: true, message: `Valid FHIR resource scope: ${trimmedScope}`, type: 'success' };
    }

    return { valid: false, message: 'Invalid scope format', type: 'error' };
  };

  // Build a launch context scope string
  const buildScope = () => {
    const { resource, role, customScope } = builderState;
    if (customScope.trim()) return customScope.trim();
    if (!resource) return '';
    let scope = `launch/${resource}`;
    if (role.trim()) {
      scope += `?role=${encodeURIComponent(role.trim())}`;
    }
    return scope;
  };

  // Add a scope to the current context set
  const addScope = () => {
    const scope = buildScope();
    if (scope && !contextSet.contexts.includes(scope)) {
      const validation = validateScope(scope);
      if (!validation.valid) {
        setError(`Invalid scope: ${validation.message}`);
        return;
      }
      setContextSet({
        ...contextSet,
        contexts: [...contextSet.contexts, scope]
      });
      setBuilderState({ resource: '', role: '', customScope: '' });
      setError(null);
    }
  };

  // Add a common scope
  const addCommonScope = (scope: string) => {
    if (!contextSet.contexts.includes(scope)) {
      setContextSet({
        ...contextSet,
        contexts: [...contextSet.contexts, scope]
      });
    }
  };

  // Remove a scope from the current context set
  const removeScope = (index: number) => {
    setContextSet({
      ...contextSet,
      contexts: contextSet.contexts.filter((_, i) => i !== index)
    });
  };

  // Handle save
  const handleSave = () => {
    if (!contextSet.name.trim() || contextSet.contexts.length === 0) return;
    
    onSave({
      name: contextSet.name.trim(),
      description: contextSet.description.trim(),
      category: contextSet.category.trim(),
      contexts: contextSet.contexts,
      isTemplate: false
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setContextSet({ name: '', description: '', category: '', contexts: [] });
    setBuilderState({ resource: '', role: '', customScope: '' });
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Rocket className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {editingSet ? 'Edit Launch Context Set' : 'Create Launch Context Set'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {t('Configure launch contexts for SMART on FHIR applications. These determine what contextual information is available during app launch.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-6 p-6 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Basic Information')}</h4>
                <p className="text-muted-foreground text-sm font-medium">{t('Define the context set name, description, and category')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="context-name" className="text-sm font-semibold text-foreground">
                  {t('Context Set Name *')}
                </Label>
                <Input
                  id="context-name"
                  value={contextSet.name}
                  onChange={e => setContextSet({ ...contextSet, name: e.target.value })}
                  placeholder="e.g., Emergency Department Launch, Radiology Workflow"
                  className="rounded-xl border-border focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="context-description" className="text-sm font-semibold text-foreground">
                  {t('Description')}
                </Label>
                <Textarea
                  id="context-description"
                  value={contextSet.description}
                  onChange={e => setContextSet({ ...contextSet, description: e.target.value })}
                  placeholder={t('Describe when this context set should be used and what it enables...')}
                  rows={3}
                  className="rounded-xl border-border focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="context-category" className="text-sm font-semibold text-foreground">
                  {t('Category')}
                </Label>
                <Select
                  value={contextSet.category || '__none__'}
                  onValueChange={(value) => setContextSet({ ...contextSet, category: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select Category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('Select Category')}</SelectItem>
                    <SelectItem value="ehr-launch">{t('EHR Launch')}</SelectItem>
                    <SelectItem value="standalone">{t('Standalone')}</SelectItem>
                    <SelectItem value="workflow">{t('Workflow')}</SelectItem>
                    <SelectItem value="specialty">{t('Specialty')}</SelectItem>
                    <SelectItem value="data-collection">{t('Data Collection')}</SelectItem>
                    <SelectItem value="identity">{t('Identity')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Scope Builder */}
          <div className="space-y-6 p-6 bg-green-50/50 dark:bg-green-950/30 rounded-xl border border-green-200/50 dark:border-green-800/30">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 rounded-lg flex items-center justify-center shadow-sm">
                <Wand2 className="w-4 h-4 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Scope Builder')}</h4>
                <p className="text-muted-foreground text-sm font-medium">{t('Add SMART scopes and launch contexts to this set')}</p>
              </div>
            </div>
            
            {/* Builder Type Selector */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={activeBuilder === 'quick' ? 'default' : 'outline'}
                onClick={() => setActiveBuilder('quick')}
                className={activeBuilder === 'quick' 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800' 
                  : 'rounded-xl border-green-300 dark:border-green-600 bg-white dark:bg-slate-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/50 hover:border-green-400 dark:hover:border-green-500'
                }
              >
                <Zap className="w-4 h-4 mr-2" />
                {t('Quick Add')}
              </Button>
              <Button
                size="sm"
                variant={activeBuilder === 'custom' ? 'default' : 'outline'}
                onClick={() => setActiveBuilder('custom')}
                className={activeBuilder === 'custom' 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800' 
                  : 'rounded-xl border-green-300 dark:border-green-600 bg-white dark:bg-slate-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/50 hover:border-green-400 dark:hover:border-green-500'
                }
              >
                <Code2 className="w-4 h-4 mr-2" />
                {t('Custom Builder')}
              </Button>
            </div>

            {activeBuilder === 'quick' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('Common SMART Scopes')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SMART_SCOPES.map(scope => (
                      <Button
                        key={scope}
                        size="sm"
                        variant="outline"
                        onClick={() => addCommonScope(scope)}
                        disabled={contextSet.contexts.includes(scope)}
                        className="text-xs rounded-xl border-border text-foreground hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50 disabled:text-muted-foreground shadow-sm font-mono"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {scope}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeBuilder === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    {t('Build Launch Context')}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Select
                      value={builderState.resource || '__none__'}
                      onValueChange={(value) => setBuilderState({ ...builderState, resource: value === '__none__' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select Resource')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t('Select Resource')}</SelectItem>
                        {LAUNCH_RESOURCES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('Role URI (optional)')}
                      value={builderState.role}
                      onChange={e => setBuilderState({ ...builderState, role: e.target.value })}
                      className="text-sm rounded-xl border-border focus:border-green-500 focus:ring-green-500 shadow-sm"
                    />
                    <div className="md:col-span-2">
                      <Button 
                        onClick={addScope} 
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                        disabled={!builderState.resource && !builderState.customScope.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('Add Launch Context')}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {t('Or Enter Custom Scope')}
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., patient/Observation.rs, user/*.cruds, launch/patient"
                      value={builderState.customScope}
                      onChange={e => setBuilderState({ ...builderState, customScope: e.target.value })}
                      className="text-sm rounded-xl border-border focus:border-green-500 focus:ring-green-500 shadow-sm"
                      onKeyPress={e => e.key === 'Enter' && addScope()}
                    />
                    <Button 
                      onClick={addScope}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                      disabled={!builderState.customScope.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Scopes */}
          <div className="space-y-6 p-6 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 rounded-lg flex items-center justify-center shadow-sm">
                  <Target className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">
                    Current Scopes ({contextSet.contexts.length})
                  </h4>
                  <p className="text-muted-foreground text-sm font-medium">{t('Review and manage selected scopes')}</p>
                </div>
              </div>
              {contextSet.contexts.length > 0 && (
                <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-600 shadow-sm">
                  {contextSet.contexts.length} configured
                </Badge>
              )}
            </div>
            
            <div className="max-h-40 overflow-y-auto border border-purple-200/50 dark:border-purple-700/30 rounded-xl p-4 bg-white/70 dark:bg-card/70 backdrop-blur-sm shadow-sm">
              {contextSet.contexts.length === 0 ? (
                <EmptyState icon={Target} title={t('No scopes added yet')} description={t('Add scopes using the builder above')} className="py-8" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contextSet.contexts.map((ctx, index) => (
                    <Badge 
                      key={ctx} 
                      variant="outline" 
                      className="flex items-center bg-background shadow-sm hover:shadow-md transition-all duration-200 border-purple-200 dark:border-purple-700/50 text-purple-800 dark:text-purple-300 rounded-lg font-mono text-xs"
                    >
                      <span>{ctx}</span>
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" 
                        onClick={() => removeScope(index)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!contextSet.name.trim() || contextSet.contexts.length === 0}
          >
            {editingSet ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                {t('Update Context Set')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('Create Context Set')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}