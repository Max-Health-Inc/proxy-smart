import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { adminApiCall } from '@/lib/admin-api';
import { useTranslation } from 'react-i18next';
import type { SmartAccessControlConfig } from '@/lib/types/api';

// ─── Types ───────────────────────────────────────────────────────────

type EnforcementMode = SmartAccessControlConfig['scopeEnforcement'];

const DEFAULT_CONFIG: SmartAccessControlConfig = {
  scopeEnforcement: 'enforce',
  roleBasedFiltering: 'enforce',
  patientScopedResources: ['Observation', 'Condition', 'Procedure', 'MedicationRequest', 'MedicationStatement', 'DiagnosticReport', 'Encounter', 'AllergyIntolerance', 'ImagingStudy', 'CarePlan', 'Consent'],
  externalAudiences: [],
};

// ─── Component ───────────────────────────────────────────────────────

export function AccessControlSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<SmartAccessControlConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newResource, setNewResource] = useState('');
  const [newAudience, setNewAudience] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApiCall<{ config: SmartAccessControlConfig }>('/admin/smart-access-control/config');
      setConfig(res.config);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load access control settings',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    adminApiCall<{ config: SmartAccessControlConfig }>('/admin/smart-access-control/config')
      .then(res => {
        setConfig(res.config);
        setMessage(null);
      })
      .catch(error => {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to load access control settings',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminApiCall('/admin/smart-access-control/config', 'PUT', config);
      setMessage({ type: 'success', text: t('Access control settings saved successfully') });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save access control settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const addResource = () => {
    const trimmed = newResource.trim();
    if (!trimmed || config.patientScopedResources.includes(trimmed)) return;
    setConfig(prev => ({ ...prev, patientScopedResources: [...prev.patientScopedResources, trimmed] }));
    setNewResource('');
  };

  const removeResource = (value: string) => {
    setConfig(prev => ({ ...prev, patientScopedResources: prev.patientScopedResources.filter(v => v !== value) }));
  };

  const addAudience = () => {
    const trimmed = newAudience.trim();
    if (!trimmed || config.externalAudiences.includes(trimmed)) return;
    setConfig(prev => ({ ...prev, externalAudiences: [...prev.externalAudiences, trimmed] }));
    setNewAudience('');
  };

  const removeAudience = (value: string) => {
    setConfig(prev => ({ ...prev, externalAudiences: prev.externalAudiences.filter(v => v !== value) }));
  };

  if (loading) {
    return <PageLoadingState message={t('Loading access control settings...')} />;
  }

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Scope Enforcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            {t('SMART Scope Enforcement')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('Validates token scopes against requested FHIR resources. Supports SMART v1 (read/write) and v2 (cruds) scope formats.')}
          </p>
          <div className="space-y-2">
            <Label>{t('Enforcement Mode')}</Label>
            <Select value={config.scopeEnforcement} onValueChange={(v: EnforcementMode) => setConfig(prev => ({ ...prev, scopeEnforcement: v }))}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enforce">{t('Enforce')}</SelectItem>
                <SelectItem value="audit-only">{t('Audit Only')}</SelectItem>
                <SelectItem value="disabled">{t('Disabled')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.scopeEnforcement === 'enforce' && t('Requests without sufficient scopes are blocked with 403.')}
              {config.scopeEnforcement === 'audit-only' && t('Insufficient scopes are logged but requests are allowed through.')}
              {config.scopeEnforcement === 'disabled' && t('No scope checking is performed.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role-Based Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            {t('Role-Based Data Filtering')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('Restricts data visibility based on the fhirUser token claim. Patients only see their own data, Practitioners only see assigned patients.')}
          </p>
          <div className="space-y-2">
            <Label>{t('Filtering Mode')}</Label>
            <Select value={config.roleBasedFiltering} onValueChange={(v: EnforcementMode) => setConfig(prev => ({ ...prev, roleBasedFiltering: v }))}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enforce">{t('Enforce')}</SelectItem>
                <SelectItem value="audit-only">{t('Audit Only')}</SelectItem>
                <SelectItem value="disabled">{t('Disabled')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.roleBasedFiltering === 'enforce' && t('Query parameters are injected to restrict results by role. Non-matching requests are blocked.')}
              {config.roleBasedFiltering === 'audit-only' && t('Role violations are logged but data is not filtered.')}
              {config.roleBasedFiltering === 'disabled' && t('No role-based filtering is applied.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Patient-Scoped Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            {t('Patient-Scoped Resources')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('Clinical resource types subject to patient-scoped filtering when role-based filtering is active.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {config.patientScopedResources.map(r => (
              <Badge key={r} variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1 py-1">
                {r}
                <button
                  onClick={() => removeResource(r)}
                  className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newResource}
              onChange={e => setNewResource(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResource())}
              placeholder={t('e.g. DocumentReference')}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addResource} disabled={!newResource.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              {t('Add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* External Audiences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            {t('External Audiences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('External resource servers that use this proxy as their authorization server (e.g. third-party MCP servers). Entries starting with \'.\' match all subdomains (e.g. \'.maxhealth.tech\' matches dicom.maxhealth.tech).')}
          </p>
          <div className="flex flex-wrap gap-2">
            {config.externalAudiences.map(a => (
              <Badge key={a} variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1 py-1">
                {a}
                <button
                  onClick={() => removeAudience(a)}
                  className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {config.externalAudiences.length === 0 && (
              <span className="text-xs text-muted-foreground italic">{t('No external audiences configured')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newAudience}
              onChange={e => setNewAudience(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAudience())}
              placeholder={t('e.g. .maxhealth.tech or https://mcp.example.com')}
              className="max-w-md"
            />
            <Button variant="outline" size="sm" onClick={addAudience} disabled={!newAudience.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              {t('Add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {t('Save Settings')}
        </Button>
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('Reload')}
        </Button>
      </div>
    </div>
  );
}
