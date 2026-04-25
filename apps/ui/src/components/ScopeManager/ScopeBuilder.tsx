import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Plus,
  Trash2,
  Shield,
  Code,
  CheckCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FHIR_RESOURCES, FHIR_PERMISSIONS, SCOPE_CONTEXTS, SCOPE_TEMPLATES } from './constants';
import type { BuilderState, ScopeSet, ScopeTemplate, ScopeValidation } from './types';

interface ScopeBuilderProps {
  editingScope: ScopeSet | null;
  newScopeSet: { name: string; description: string; scopes: string[] };
  setNewScopeSet: React.Dispatch<React.SetStateAction<{ name: string; description: string; scopes: string[] }>>;
  builderState: BuilderState;
  setBuilderState: React.Dispatch<React.SetStateAction<BuilderState>>;
  onSave: (scopeSet: Omit<ScopeSet, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'>) => Promise<void>;
  onCancel: () => void;
  onLoadTemplate: (template: ScopeTemplate) => void;
  validateScope: (scope: string) => ScopeValidation;
}

export function ScopeBuilder({
  editingScope,
  newScopeSet,
  setNewScopeSet,
  builderState,
  setBuilderState,
  onSave,
  onCancel,
  onLoadTemplate,
  validateScope,
}: ScopeBuilderProps) {
  const { t } = useTranslation();

  const buildScope = () => {
    if (builderState.customScope) return builderState.customScope;
    if (!builderState.context || !builderState.resource || builderState.permissions.length === 0) return '';
    let scope = `${builderState.context}/${builderState.resource}.${builderState.permissions.sort().join('')}`;
    if (builderState.searchParams) scope += `?${builderState.searchParams}`;
    return scope;
  };

  const addScopeToSet = () => {
    const scope = buildScope();
    if (scope && !newScopeSet.scopes.includes(scope)) {
      setNewScopeSet({ ...newScopeSet, scopes: [...newScopeSet.scopes, scope] });
      setBuilderState({ context: 'patient', resource: '', permissions: [], searchParams: '', customScope: '', selectedRole: undefined });
    }
  };

  const removeScopeFromSet = (index: number) => {
    setNewScopeSet({ ...newScopeSet, scopes: newScopeSet.scopes.filter((_, i) => i !== index) });
  };

  const testScope = async (scope: string) => {
    const validation = validateScope(scope);
    console.log('Scope validation result:', validation);
    setTimeout(() => console.log('API test completed'), 3000);
  };

  return (
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
            <p className="text-muted-foreground font-medium">
              {t('Build SMART on FHIR scopes visually or with templates')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Builder Controls */}
        <div className="space-y-6">
          {/* Scope Set Details */}
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

          {/* Role-Based Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">{t('Role-Based Templates')}</Label>
              <Select
                value={builderState.selectedRole || 'all'}
                onValueChange={(value) =>
                  setBuilderState({ ...builderState, selectedRole: value === 'all' ? undefined : value })
                }
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
              {SCOPE_TEMPLATES.filter(
                (template) => !builderState.selectedRole || template.role === builderState.selectedRole,
              ).map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-border/50 rounded-xl hover:bg-muted/50 hover:border-border/80 transition-all duration-200 cursor-pointer group"
                  onClick={() => onLoadTemplate(template)}
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

          {/* Visual Scope Builder */}
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
                onValueChange={(value) =>
                  setBuilderState({ ...builderState, resource: value === '__none__' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select resource...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('Select resource...')}</SelectItem>
                  <SelectItem value="*">{t('* (All resources)')}</SelectItem>
                  {FHIR_RESOURCES.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">{t('Permissions')}</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(FHIR_PERMISSIONS).map(([key, perm]) => (
                  <label
                    key={key}
                    className="flex items-center space-x-2 p-2 border border-border/50 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={builderState.permissions.includes(key)}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setBuilderState({
                            ...builderState,
                            permissions: [...builderState.permissions, key].sort(),
                          });
                        } else {
                          setBuilderState({
                            ...builderState,
                            permissions: builderState.permissions.filter((p) => p !== key),
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
              <Label className="text-xs text-muted-foreground mb-2 block">
                {t('Search Parameters (Optional)')}
              </Label>
              <Input
                placeholder="e.g., category=laboratory&status=final"
                value={builderState.searchParams}
                onChange={(e) => setBuilderState({ ...builderState, searchParams: e.target.value })}
                className="rounded-lg text-sm"
              />
            </div>

            {/* Custom Scope Input */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                {t('Or enter custom scope')}
              </Label>
              <Input
                placeholder="e.g., launch/patient, openid, fhirUser"
                value={builderState.customScope}
                onChange={(e) => setBuilderState({ ...builderState, customScope: e.target.value })}
                className="rounded-lg text-sm"
              />
            </div>

            {/* Preview & Add */}
            <ScopePreview
              scope={buildScope()}
              validateScope={validateScope}
              onAdd={addScopeToSet}
              onSuggestionClick={(suggestion) =>
                setBuilderState({ ...builderState, customScope: suggestion })
              }
            />
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
                <p className="text-sm mt-1">
                  {t('Build scopes using the controls on the left or load a template')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {newScopeSet.scopes.map((scope, index) => (
                  <ScopeItem
                    key={index}
                    scope={scope}
                    index={index}
                    validation={validateScope(scope)}
                    onTest={() => testScope(scope)}
                    onRemove={() => removeScopeFromSet(index)}
                    onReplaceSuggestion={(suggestion) => {
                      const newScopes = [...newScopeSet.scopes];
                      newScopes[index] = suggestion;
                      setNewScopeSet({ ...newScopeSet, scopes: newScopes });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={async () => await onSave(newScopeSet)}
              disabled={!newScopeSet.name || newScopeSet.scopes.length === 0}
            >
              {editingScope ? t('Update') : t('Save')} {t('Scope Set')}
            </Button>
            <Button variant="outline" onClick={onCancel} className="px-8 py-3">
              {t('Cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function ScopePreview({
  scope,
  validateScope,
  onAdd,
  onSuggestionClick,
}: {
  scope: string;
  validateScope: (s: string) => ScopeValidation;
  onAdd: () => void;
  onSuggestionClick: (suggestion: string) => void;
}) {
  const { t } = useTranslation();
  const validation = scope ? validateScope(scope) : null;

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">{t('Scope Preview')}</Label>
      <div className="space-y-2">
        <div
          className={`p-3 rounded-lg border transition-all duration-200 ${
            !scope
              ? 'bg-muted border-border/50'
              : validation?.type === 'success'
                ? 'bg-green-500/10 border-green-500/20'
                : validation?.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/20'
                  : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <code className={`text-sm font-mono ${!scope ? 'text-muted-foreground' : 'text-foreground'}`}>
              {scope || t('Build a scope...')}
            </code>
            <Button
              onClick={onAdd}
              disabled={!scope || validation?.valid === false}
              size="sm"
              className="px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('Add')}
            </Button>
          </div>

          {validation && (
            <div
              className={`mt-2 text-xs font-medium ${
                validation.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : validation.type === 'warning'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-red-700 dark:text-red-300'
              }`}
            >
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
                    onClick={() => onSuggestionClick(suggestion)}
                    className="text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 h-auto px-2 py-1"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeItem({
  scope,
  index: _index,
  validation,
  onTest,
  onRemove,
  onReplaceSuggestion,
}: {
  scope: string;
  index: number;
  validation: ScopeValidation;
  onTest: () => void;
  onRemove: () => void;
  onReplaceSuggestion: (suggestion: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        validation.type === 'success'
          ? 'bg-green-500/10 border-green-500/20'
          : validation.type === 'warning'
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-red-500/10 border-red-500/20'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          <code className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border border-border/50">
            {scope}
          </code>
          <div className="flex items-center">
            {validation.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {validation.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
            {validation.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <CopyButton value={scope} variant="icon-sm" className="p-1 h-8 w-8" title={t('Copy scope')} />
          <Button
            size="sm"
            variant="ghost"
            onClick={onTest}
            className="p-1 h-8 w-8 hover:bg-muted"
            title={t('Test scope')}
          >
            <Play className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-muted"
            title={t('Remove scope')}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div
        className={`text-xs font-medium mb-1 ${
          validation.type === 'success'
            ? 'text-green-700 dark:text-green-300'
            : validation.type === 'warning'
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-red-700 dark:text-red-300'
        }`}
      >
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
                onClick={() => onReplaceSuggestion(suggestion)}
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
}
