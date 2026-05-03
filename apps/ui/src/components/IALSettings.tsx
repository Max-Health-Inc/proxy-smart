import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Fingerprint,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { adminApiCall } from '@/lib/admin-api';
import { useTranslation } from 'react-i18next';
import type { IalConfig, IalConfigMinimumLevelEnum } from '@/lib/types/api';

// ─── Defaults ────────────────────────────────────────────────────────

type IalLevel = IalConfigMinimumLevelEnum;

const DEFAULT_IAL: IalConfig = {
  enabled: false,
  minimumLevel: 'level1',
  sensitiveResourceTypes: [],
  sensitiveMinimumLevel: 'level3',
  verifyPatientLink: true,
  allowOnPersonLookupFailure: false,
  cacheTtl: 300000,
};

const IAL_LEVEL_LABELS: Record<IalLevel, string> = {
  level1: 'Level 1 — Self-asserted',
  level2: 'Level 2 — Remote proofing',
  level3: 'Level 3 — In-person proofing',
  level4: 'Level 4 — In-person + biometrics',
};

// ─── Component ───────────────────────────────────────────────────────

export function IALSettings() {
  const { t } = useTranslation();
  const [ial, setIal] = useState<IalConfig>(DEFAULT_IAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newSensitiveType, setNewSensitiveType] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApiCall<{ config: IalConfig }>('/admin/consent/ial');
      setIal(res.config);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('Failed to load IAL settings'),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    adminApiCall<{ config: IalConfig }>('/admin/consent/ial')
      .then(res => {
        setIal(res.config);
        setMessage(null);
      })
      .catch(error => {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : t('Failed to load IAL settings'),
        });
      })
      .finally(() => setLoading(false));
  }, [t]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminApiCall('/admin/consent/ial', 'PUT', ial);
      setMessage({ type: 'success', text: t('IAL settings saved successfully') });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('Failed to save IAL settings'),
      });
    } finally {
      setSaving(false);
    }
  };

  const addSensitiveType = () => {
    const trimmed = newSensitiveType.trim();
    if (!trimmed || ial.sensitiveResourceTypes.includes(trimmed)) return;
    setIal(prev => ({ ...prev, sensitiveResourceTypes: [...prev.sensitiveResourceTypes, trimmed] }));
    setNewSensitiveType('');
  };

  const removeSensitiveType = (value: string) => {
    setIal(prev => ({ ...prev, sensitiveResourceTypes: prev.sensitiveResourceTypes.filter(v => v !== value) }));
  };

  if (loading) {
    return <PageLoadingState message={t('Loading IAL settings...')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
              <Fingerprint className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {t('Identity Assurance Level (IAL)')}
              </h3>
              <p className="text-muted-foreground font-medium">
                {t('Person→Patient link verification (NIST SP 800-63-3)')}
              </p>
            </div>
            <Badge variant={ial.enabled ? 'default' : 'secondary'} className="px-3 py-1 ml-4">
              {ial.enabled ? t('Enabled') : t('Disabled')}
            </Badge>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setMessage(null); loadSettings(); }} disabled={saving}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Reload')}
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('Save IAL Settings')}
            </Button>
          </div>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <Alert
          className={
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-400/10'
              : 'border-destructive/20 bg-destructive/10'
          }
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
          <AlertDescription
            className={message.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IAL Core */}
        <Card className="bg-card/70 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-violet-500/10 dark:bg-violet-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <Fingerprint className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Assurance Levels')}</h3>
                <p className="text-muted-foreground font-medium">{t('Minimum identity verification requirements')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="ial-enabled">{t('Enable IAL Verification')}</Label>
                <p className="text-sm text-muted-foreground">{t('Verify identity assurance via Person resources')}</p>
              </div>
              <Switch
                id="ial-enabled"
                checked={ial.enabled}
                onCheckedChange={checked => setIal(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Minimum Level (General)')}</Label>
              <Select
                value={ial.minimumLevel}
                onValueChange={(v: IalLevel) => setIal(prev => ({ ...prev, minimumLevel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IAL_LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Minimum Level (Sensitive Resources)')}</Label>
              <Select
                value={ial.sensitiveMinimumLevel}
                onValueChange={(v: IalLevel) => setIal(prev => ({ ...prev, sensitiveMinimumLevel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IAL_LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ial-cache-ttl">{t('Person Cache TTL (ms)')}</Label>
              <Input
                id="ial-cache-ttl"
                type="number"
                min={0}
                value={ial.cacheTtl}
                onChange={e => setIal(prev => ({ ...prev, cacheTtl: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('How long Person resources are cached. 300000 = 5 minutes.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* IAL Policies */}
        <Card className="bg-card/70 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/10 dark:bg-orange-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('IAL Policies')}</h3>
                <p className="text-muted-foreground font-medium">{t('Patient link and failure behaviour')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="verify-patient-link">{t('Verify Patient Link')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("Ensure token's smart_patient matches Person.link[]")}
                </p>
              </div>
              <Switch
                id="verify-patient-link"
                checked={ial.verifyPatientLink}
                onCheckedChange={checked => setIal(prev => ({ ...prev, verifyPatientLink: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="allow-on-lookup-failure">{t('Allow on Person Lookup Failure')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('Allow access when Person resource cannot be resolved (default: deny)')}
                </p>
              </div>
              <Switch
                id="allow-on-lookup-failure"
                checked={ial.allowOnPersonLookupFailure}
                onCheckedChange={checked => setIal(prev => ({ ...prev, allowOnPersonLookupFailure: checked }))}
              />
            </div>

            {/* Sensitive Resource Types */}
            <div className="space-y-2">
              <Label>{t('Sensitive Resource Types')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Resource types requiring elevated IAL (e.g. MedicationRequest, DiagnosticReport)')}
              </p>
              <div className="flex gap-2">
                <Input
                  value={newSensitiveType}
                  onChange={e => setNewSensitiveType(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSensitiveType())}
                  placeholder={t('Add sensitive resource type…')}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={addSensitiveType} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {ial.sensitiveResourceTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ial.sensitiveResourceTypes.map(item => (
                    <Badge key={item} variant="secondary" className="px-2 py-1 text-xs font-mono">
                      {item}
                      <button type="button" onClick={() => removeSensitiveType(item)} className="ml-1.5 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}