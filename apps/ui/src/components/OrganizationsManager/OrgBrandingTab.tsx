import { useState, useEffect } from 'react';
import { Button, Input, Label, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { Textarea } from '@/components/ui/textarea';
import { Save, RotateCcw, Loader2, Image, Globe, MapPin } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import type { OrgBrandConfig } from '@/lib/api-client';

const CATEGORY_OPTIONS = [
  { value: 'prov', label: 'Healthcare Provider' },
  { value: 'ins', label: 'Health Insurance' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'imaging', label: 'Imaging Center' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'health-information-network', label: 'Health Information Network' },
  { value: 'health-data-aggregator', label: 'Health Data Aggregator' },
] as const;

interface OrgBrandingTabProps {
  orgId: string;
  orgName: string;
}

export function OrgBrandingTab({ orgId, orgName }: OrgBrandingTabProps) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const [config, setConfig] = useState<OrgBrandConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!clientApis.organizations) return;
    clientApis.organizations.getAdminOrganizationsByOrgIdBranding({ orgId })
      .then(resp => {
        setConfig(resp.config ?? {});
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load org branding:', err);
        setError(t('Failed to load branding overrides'));
      })
      .finally(() => setLoading(false));
  }, [orgId, clientApis.organizations, t]);

  const handleSave = async () => {
    if (!clientApis.organizations) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const resp = await clientApis.organizations.putAdminOrganizationsByOrgIdBranding({
        orgId,
        orgBrandConfig: config,
      });
      setConfig(resp.config ?? {});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save org branding:', err);
      setError(t('Failed to save branding overrides'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!clientApis.organizations) return;
    setSaving(true);
    setError(null);
    try {
      await clientApis.organizations.putAdminOrganizationsByOrgIdBranding({
        orgId,
        orgBrandConfig: {},
      });
      setConfig({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reset org branding:', err);
      setError(t('Failed to reset branding'));
    } finally {
      setSaving(false);
    }
  };

  const hasOverrides = Object.keys(config).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground text-sm">{t('Loading branding...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t('Brand Overrides')}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {t('Override realm-wide branding for')} {orgName}.{' '}
            {t('Empty fields inherit from the main branding tab.')}
          </p>
        </div>
        {hasOverrides && (
          <Badge variant="outline" className="text-xs">
            {Object.keys(config).length} {t('override(s)')}
          </Badge>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 text-green-700 dark:text-green-300 text-sm p-3 rounded-lg">
          {t('Branding saved successfully!')}
        </div>
      )}

      {/* Identity */}
      <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
        <legend className="flex items-center gap-2 text-sm font-medium px-2">
          <Globe className="w-4 h-4" /> {t('Identity')}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OverrideField
            label={t('Name')} value={config.name ?? ''}
            placeholder={t('Inherit from main')}
            onChange={(v) => setConfig((p) => v ? { ...p, name: v } : (() => { const { name: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Website')} value={config.website ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, website: v } : (() => { const { website: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Identifier URI')} value={config.identifier ?? ''}
            placeholder={t('Inherit from main')}
            onChange={(v) => setConfig((p) => v ? { ...p, identifier: v } : (() => { const { identifier: _, ...rest } = p; return rest; })())}
          />
          <div className="space-y-2">
            <Label className="text-xs font-medium">{t('Category')}</Label>
            <Select
              value={config.category ?? '__inherit__'}
              onValueChange={(v) => setConfig((p) => {
                if (v === '__inherit__') { const { category: _, ...rest } = p; return rest; }
                return { ...p, category: v as OrgBrandConfig['category'] };
              })}
            >
              <SelectTrigger className="rounded-lg border-border/50 text-sm">
                <SelectValue placeholder={t('Inherit from main')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">{t('— Inherit from main —')}</SelectItem>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* Logo */}
      <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
        <legend className="flex items-center gap-2 text-sm font-medium px-2">
          <Image className="w-4 h-4" /> {t('Logo')}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OverrideField
            label={t('Logo URL')} value={config.logoUrl ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, logoUrl: v } : (() => { const { logoUrl: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Logo License URL')} value={config.logoLicenseUrl ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, logoLicenseUrl: v } : (() => { const { logoLicenseUrl: _, ...rest } = p; return rest; })())}
          />
        </div>
        {config.logoUrl && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <img src={config.logoUrl} alt="Logo preview" className="h-10 max-w-[200px] object-contain" />
            <span className="text-xs text-muted-foreground">{t('Preview')}</span>
          </div>
        )}
      </fieldset>

      {/* Portal */}
      <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
        <legend className="flex items-center gap-2 text-sm font-medium px-2">
          <Globe className="w-4 h-4" /> {t('Patient Portal')}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OverrideField
            label={t('Portal Name')} value={config.portalName ?? ''}
            placeholder={t('Inherit from main')}
            onChange={(v) => setConfig((p) => v ? { ...p, portalName: v } : (() => { const { portalName: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Portal URL')} value={config.portalUrl ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, portalUrl: v } : (() => { const { portalUrl: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Portal Logo URL')} value={config.portalLogoUrl ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, portalLogoUrl: v } : (() => { const { portalLogoUrl: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Portal Logo License')} value={config.portalLogoLicenseUrl ?? ''}
            placeholder={t('Inherit from main')} type="url"
            onChange={(v) => setConfig((p) => v ? { ...p, portalLogoLicenseUrl: v } : (() => { const { portalLogoLicenseUrl: _, ...rest } = p; return rest; })())}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">{t('Portal Description (Markdown)')}</Label>
          <Textarea
            value={config.portalDescription ?? ''}
            placeholder={t('Inherit from main')}
            onChange={(e) => setConfig((p) => e.target.value ? { ...p, portalDescription: e.target.value } : (() => { const { portalDescription: _, ...rest } = p; return rest; })())}
            rows={3} className="rounded-lg border-border/50 text-sm"
          />
        </div>
      </fieldset>

      {/* Address */}
      <fieldset className="space-y-4 rounded-xl border border-border/50 p-4">
        <legend className="flex items-center gap-2 text-sm font-medium px-2">
          <MapPin className="w-4 h-4" /> {t('Address')}
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverrideField
            label={t('City')} value={config.addressCity ?? ''}
            placeholder={t('Inherit')}
            onChange={(v) => setConfig((p) => v ? { ...p, addressCity: v } : (() => { const { addressCity: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('State')} value={config.addressState ?? ''}
            placeholder={t('Inherit')}
            onChange={(v) => setConfig((p) => v ? { ...p, addressState: v } : (() => { const { addressState: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Postal Code')} value={config.addressPostalCode ?? ''}
            placeholder={t('Inherit')}
            onChange={(v) => setConfig((p) => v ? { ...p, addressPostalCode: v } : (() => { const { addressPostalCode: _, ...rest } = p; return rest; })())}
          />
          <OverrideField
            label={t('Country')} value={config.addressCountry ?? ''}
            placeholder={t('Inherit')}
            onChange={(v) => setConfig((p) => v ? { ...p, addressCountry: v } : (() => { const { addressCountry: _, ...rest } = p; return rest; })())}
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || !hasOverrides}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('Clear All Overrides')}
        </Button>
        <LoadingButton size="sm" onClick={handleSave} loading={saving} loadingText={t('Saving...')}>
          <Save className="h-4 w-4 mr-2" />
          {t('Save Overrides')}
        </LoadingButton>
      </div>
    </div>
  );
}

// ── Helper: Override field with "inherit" placeholder ────────────────

function OverrideField({
  label, value, placeholder, type = 'text', onChange,
}: {
  label: string; value: string; placeholder: string; type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-border/50 text-sm"
      />
    </div>
  );
}
