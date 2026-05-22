import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Plus,
  Globe,
  Image,
  MapPin,
  ExternalLink,
  Paintbrush,
} from 'lucide-react';
import { config } from '@/config';
import { adminApiCall } from '@/lib/admin-api';
import { useTranslation } from 'react-i18next';
import type { UserAccessCategoryValueSetCode } from 'hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-UserAccessCategoryValueSet';
import { isValidUserAccessCategoryValueSetCode, UserAccessCategoryValueSetConcepts } from 'hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-UserAccessCategoryValueSet';

// ─── Types ───────────────────────────────────────────────────────────

interface BrandConfig {
  name: string;
  website: string;
  logoUrl: string | null;
  logoLicenseUrl: string | null;
  aliases: string[];
  category: UserAccessCategoryValueSetCode;
  portalName: string | null;
  portalUrl: string | null;
  portalDescription: string | null;
  portalLogoUrl: string | null;
  portalLogoLicenseUrl: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  identifier: string;
  loginTheme: string | null;
}

const DEFAULT_BRAND: BrandConfig = {
  name: '',
  website: '',
  logoUrl: null,
  logoLicenseUrl: null,
  aliases: [],
  category: 'prov',
  portalName: null,
  portalUrl: null,
  portalDescription: null,
  portalLogoUrl: null,
  portalLogoLicenseUrl: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  identifier: '',
  loginTheme: null,
};

const CATEGORY_OPTIONS = UserAccessCategoryValueSetConcepts.map(c => ({
  value: c.code,
  label: c.display,
}));

// ─── Component ───────────────────────────────────────────────────────

export function BrandSettings() {
  const { t } = useTranslation();
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAlias, setNewAlias] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApiCall<{ config: BrandConfig }>('/admin/branding');
      setBrand(res.config);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load brand settings',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    adminApiCall<{ config: BrandConfig }>('/admin/branding')
      .then(res => {
        setBrand(res.config);
        setMessage(null);
      })
      .catch(error => {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to load brand settings',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminApiCall('/admin/branding', 'PUT', brand);
      setMessage({ type: 'success', text: t('Brand settings saved successfully') });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save brand settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed || brand.aliases.includes(trimmed)) return;
    setBrand(prev => ({ ...prev, aliases: [...prev.aliases, trimmed] }));
    setNewAlias('');
  };

  const removeAlias = (alias: string) => {
    setBrand(prev => ({ ...prev, aliases: prev.aliases.filter(a => a !== alias) }));
  };

  const updateField = (field: keyof BrandConfig, value: string | null) => {
    setBrand(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <PageLoadingState message={t('Loading brand settings...')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Brand Management')}</h3>
              <p className="text-muted-foreground font-medium">{t('SMART App Launch 2.2.0 User-Access Brands')}</p>
            </div>
            {brand.name && (
              <Badge variant="default" className="px-3 py-1 ml-4">
                {brand.name}
              </Badge>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setMessage(null); loadSettings(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('Reload')}
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('Saving...') : t('Save Changes')}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              {t('Brand Identity')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Brand Name')}</Label>
              <Input
                value={brand.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="My Healthcare Organization"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Website')}</Label>
              <Input
                value={brand.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Brand Identifier')}</Label>
              <Input
                value={brand.identifier}
                onChange={(e) => updateField('identifier', e.target.value)}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                {t('URI that uniquely identifies this brand (typically the website URL)')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('Organization Category')}</Label>
              <Select
                value={brand.category}
                onValueChange={(value) => { if (isValidUserAccessCategoryValueSetCode(value)) updateField('category', value) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aliases */}
            <div className="space-y-2">
              <Label>{t('Aliases')}</Label>
              <div className="flex space-x-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={t('Add alternative name...')}
                  onKeyDown={(e) => e.key === 'Enter' && addAlias()}
                />
                <Button variant="outline" size="icon" onClick={addAlias}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {brand.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {brand.aliases.map((alias) => (
                    <Badge key={alias} variant="secondary" className="flex items-center gap-1">
                      {alias}
                      <button onClick={() => removeAlias(alias)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logo & Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="w-4 h-4" />
              {t('Logo & Branding')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Brand Logo URL')}</Label>
              <Input
                value={brand.logoUrl || ''}
                onChange={(e) => updateField('logoUrl', e.target.value || null)}
                placeholder="https://example.com/logo.svg"
              />
              <p className="text-xs text-muted-foreground">
                {t('SVG or 1024px PNG with transparent background recommended')}
              </p>
            </div>

            {brand.logoUrl && (
              <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center">
                <img
                  src={brand.logoUrl}
                  alt="Brand logo preview"
                  className="max-h-16 max-w-48 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('Logo License URL')}</Label>
              <Input
                value={brand.logoLicenseUrl || ''}
                onChange={(e) => updateField('logoLicenseUrl', e.target.value || null)}
                placeholder="https://example.com/logo-license"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Portal Logo URL')}</Label>
              <Input
                value={brand.portalLogoUrl || ''}
                onChange={(e) => updateField('portalLogoUrl', e.target.value || null)}
                placeholder="https://example.com/portal-logo.svg"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Portal Logo License URL')}</Label>
              <Input
                value={brand.portalLogoLicenseUrl || ''}
                onChange={(e) => updateField('portalLogoLicenseUrl', e.target.value || null)}
                placeholder="https://example.com/portal-logo-license"
              />
            </div>

            {/* Login Theme */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paintbrush className="w-3.5 h-3.5" />
                {t('Keycloak Login Theme')}
              </Label>
              <Select
                value={brand.loginTheme || '__default__'}
                onValueChange={(value) => updateField('loginTheme', value === '__default__' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('— Keycloak Default —')}</SelectItem>
                  <SelectItem value="keycloak">keycloak</SelectItem>
                  <SelectItem value="keycloak.v2">keycloak.v2</SelectItem>
                  <SelectItem value="proxy-smart">proxy-smart</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('Controls the theme used on the Keycloak login page. Requires the theme to be installed on the server.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Patient Portal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-4 h-4" />
              {t('Patient Portal')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Portal Name')}</Label>
              <Input
                value={brand.portalName || ''}
                onChange={(e) => updateField('portalName', e.target.value || null)}
                placeholder="MyChart"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Portal URL')}</Label>
              <Input
                value={brand.portalUrl || ''}
                onChange={(e) => updateField('portalUrl', e.target.value || null)}
                placeholder="https://mychart.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Portal Description')}</Label>
              <Textarea
                value={brand.portalDescription || ''}
                onChange={(e) => updateField('portalDescription', e.target.value || null)}
                placeholder={t('Patient-facing portal description (supports Markdown)')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              {t('Organization Address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('City')}</Label>
              <Input
                value={brand.addressCity || ''}
                onChange={(e) => updateField('addressCity', e.target.value || null)}
                placeholder="Boston"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('State / Province')}</Label>
                <Input
                  value={brand.addressState || ''}
                  onChange={(e) => updateField('addressState', e.target.value || null)}
                  placeholder="MA"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input
                  value={brand.addressPostalCode || ''}
                  onChange={(e) => updateField('addressPostalCode', e.target.value || null)}
                  placeholder="02101"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Country')}</Label>
              <Input
                value={brand.addressCountry || ''}
                onChange={(e) => updateField('addressCountry', e.target.value || null)}
                placeholder="US"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Public Endpoint Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            {t('Public Brand Discovery')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {t('The brand bundle is published as a FHIR Bundle at the URL below and referenced from .well-known/smart-configuration.')}
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg font-mono text-sm">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{config.api.baseUrl}/branding.json</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
