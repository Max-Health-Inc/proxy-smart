import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Shield,
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
import type { ConsentConfig } from '@/lib/types/api';

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_CONSENT: ConsentConfig = {
  enabled: false,
  mode: 'disabled',
  cacheTtl: 60000,
  exemptClients: [],
  requiredForResourceTypes: [],
  exemptResourceTypes: ['CapabilityStatement', 'metadata'],
};

// ─── Component ───────────────────────────────────────────────────────

export function ConsentSettings() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<ConsentConfig>(DEFAULT_CONSENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newExemptClient, setNewExemptClient] = useState('');
  const [newRequiredType, setNewRequiredType] = useState('');
  const [newExemptType, setNewExemptType] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApiCall<{ config: ConsentConfig }>('/admin/consent/config');
      setConsent(res.config);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load consent settings',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    adminApiCall<{ config: ConsentConfig }>('/admin/consent/config')
      .then(res => {
        setConsent(res.config);
        setMessage(null);
      })
      .catch(error => {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to load consent settings',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminApiCall('/admin/consent/config', 'PUT', consent);
      setMessage({ type: 'success', text: 'Consent settings saved successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save consent settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const addToList = (field: keyof ConsentConfig, value: string, inputSetter: React.Dispatch<React.SetStateAction<string>>) => {
    const trimmed = value.trim();
    const currentList = consent[field] as string[];
    if (!trimmed || currentList.includes(trimmed)) return;
    setConsent(prev => ({ ...prev, [field]: [...currentList, trimmed] }));
    inputSetter('');
  };

  const removeFromList = (field: keyof ConsentConfig, value: string) => {
    const currentList = consent[field] as string[];
    setConsent(prev => ({ ...prev, [field]: currentList.filter(v => v !== value) }));
  };

  if (loading) {
    return <PageLoadingState message={t('Loading consent settings...')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Consent Enforcement')}</h3>
              <p className="text-muted-foreground font-medium">{t('FHIR Consent-based access control policy')}</p>
            </div>
            <Badge variant={consent.enabled ? 'default' : 'secondary'} className="px-3 py-1 ml-4">
              {consent.enabled ? consent.mode : 'Disabled'}
            </Badge>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setMessage(null); loadSettings(); }} disabled={saving}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('Reload')}
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Consent Settings
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
        {/* Consent Core */}
        <Card className="bg-card/70 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Enforcement')}</h3>
                <p className="text-muted-foreground font-medium">{t('Mode and caching')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="consent-enabled">{t('Enable Consent Enforcement')}</Label>
                <p className="text-sm text-muted-foreground">{t('Check FHIR Consent resources before proxying requests')}</p>
              </div>
              <Switch
                id="consent-enabled"
                checked={consent.enabled}
                onCheckedChange={checked => setConsent(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Enforcement Mode')}</Label>
              <Select
                value={consent.mode}
                onValueChange={(v: ConsentConfig['mode']) => setConsent(prev => ({ ...prev, mode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enforce">{t('Enforce — block requests without valid consent')}</SelectItem>
                  <SelectItem value="audit-only">{t('Audit Only — log decisions but allow all')}</SelectItem>
                  <SelectItem value="disabled">{t('Disabled — no consent checking')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consent-cache-ttl">{t('Cache TTL (ms)')}</Label>
              <Input
                id="consent-cache-ttl"
                type="number"
                min={0}
                value={consent.cacheTtl}
                onChange={e => setConsent(prev => ({ ...prev, cacheTtl: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('How long consent decisions are cached. 60000 = 1 minute.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Consent Scoping */}
        <Card className="bg-card/70 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-400/20 rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Consent Scoping')}</h3>
                <p className="text-muted-foreground font-medium">{t('Exempt clients &amp; resource types')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TagListField
              label={t('Exempt Clients')}
              description={t('Client IDs that skip consent checks')}
              items={consent.exemptClients}
              inputValue={newExemptClient}
              onInputChange={setNewExemptClient}
              onAdd={() => addToList('exemptClients', newExemptClient, setNewExemptClient)}
              onRemove={v => removeFromList('exemptClients', v)}
            />

            <TagListField
              label={t('Required For Resource Types')}
              description={t('Only these resource types need consent (empty = all types)')}
              items={consent.requiredForResourceTypes}
              inputValue={newRequiredType}
              onInputChange={setNewRequiredType}
              onAdd={() => addToList('requiredForResourceTypes', newRequiredType, setNewRequiredType)}
              onRemove={v => removeFromList('requiredForResourceTypes', v)}
            />

            <TagListField
              label={t('Exempt Resource Types')}
              description={t('Resource types that never require consent')}
              items={consent.exemptResourceTypes}
              inputValue={newExemptType}
              onInputChange={setNewExemptType}
              onAdd={() => addToList('exemptResourceTypes', newExemptType, setNewExemptType)}
              onRemove={v => removeFromList('exemptResourceTypes', v)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



// ─── Reusable tag-list sub-component ────────────────────────────────

function TagListField({
  label,
  description,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  description: string;
  items: string[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={onAdd} className="shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {items.map(item => (
            <Badge key={item} variant="secondary" className="px-2 py-1 text-xs font-mono">
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="ml-1.5 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}