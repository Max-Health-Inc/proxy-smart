import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@proxy-smart/shared-ui';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Globe,
  Shield,
  Key,
  Server,
  Bot,
  Info,
  Plus,
  X,
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import type { SmartApp } from '@/lib/types/api';
import type { UpdateSmartAppRequest } from '@/lib/api-client/models';
import {
  UpdateSmartAppRequestAppTypeEnum as AppTypeEnum,
  UpdateSmartAppRequestClientTypeEnum as ClientTypeEnum,
  UpdateSmartAppRequestServerAccessTypeEnum as ServerAccessEnum,
} from '@/lib/api-client/models';
import { useTranslation } from 'react-i18next';

// ── Types ────────────────────────────────────────────────────────────────────

interface SmartAppEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: SmartApp;
  onSave: (clientId: string, data: UpdateSmartAppRequest) => Promise<void>;
}

/** Build initial form state from the current SmartApp */
function buildFormState(app: SmartApp): UpdateSmartAppRequest {
  return {
    name: app.name ?? '',
    description: app.description ?? '',
    enabled: app.enabled ?? true,
    appType: (app.appType as UpdateSmartAppRequest['appType']) ?? AppTypeEnum.StandaloneApp,
    clientType: (app.clientType as UpdateSmartAppRequest['clientType']) ?? (app.publicClient ? ClientTypeEnum.Public : ClientTypeEnum.Confidential),
    launchUrl: app.launchUrl ?? '',
    redirectUris: app.redirectUris ?? [],
    webOrigins: app.webOrigins ?? [],
    smartVersion: app.attributes?.smart_version as string ?? '',
    fhirVersion: app.attributes?.fhir_version as string ?? '',
    requirePkce: app.requirePkce ?? false,
    allowOfflineAccess: app.allowOfflineAccess ?? false,
    tokenExchangeEnabled: app.tokenExchangeEnabled ?? false,
    accessTokenLifespan: app.accessTokenLifespan ?? undefined,
    audienceClients: app.audienceClients ?? [],
    consentRequired: app.consentRequired ?? false,
    fullScopeAllowed: app.fullScopeAllowed ?? true,
    clientSessionIdleTimeout: app.clientSessionIdleTimeout ?? undefined,
    clientSessionMaxLifespan: app.clientSessionMaxLifespan ?? undefined,
    backchannelLogoutUrl: app.backchannelLogoutUrl ?? '',
    frontChannelLogoutUrl: app.frontChannelLogoutUrl ?? '',
    logoUri: app.logoUri ?? '',
    tosUri: app.tosUri ?? '',
    policyUri: app.policyUri ?? '',
    contacts: app.contacts ?? [],
    serverAccessType: (app.serverAccessType as UpdateSmartAppRequest['serverAccessType']) ?? ServerAccessEnum.AllServers,
    allowedServerIds: app.allowedServerIds ?? [],
    allowedFhirUserTypes: app.allowedFhirUserTypes ?? [],
    requiredRoles: app.requiredRoles ?? [],
    // Auth fields — only sent when changed
    secret: undefined,
    publicKey: undefined,
    jwksUri: undefined,
    jwksString: undefined,
  };
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SmartAppEditModal({
  open,
  onOpenChange,
  app,
  onSave,
}: SmartAppEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<UpdateSmartAppRequest>(() => buildFormState(app));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof UpdateSmartAppRequest>(key: K, value: UpdateSmartAppRequest[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Only send fields that actually changed
      const payload: UpdateSmartAppRequest = {};
      const original = buildFormState(app);
      for (const key of Object.keys(form) as (keyof UpdateSmartAppRequest)[]) {
        const cur = form[key];
        const orig = original[key];
        if (cur === undefined) continue;
        if (JSON.stringify(cur) !== JSON.stringify(orig)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload as any)[key] = cur;
        }
      }
      await onSave(app.clientId!, payload);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            {t('Edit SMART Application')}
          </DialogTitle>
          <DialogDescription>
            {app.name} <Badge variant="outline" className="ml-2">{app.clientId}</Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="general"><Info className="size-3.5 mr-1.5" /><span className="hidden sm:inline">{t('General')}</span></TabsTrigger>
            <TabsTrigger value="uris"><Globe className="size-3.5 mr-1.5" /><span className="hidden sm:inline">{t('URIs')}</span></TabsTrigger>
            <TabsTrigger value="auth"><Key className="size-3.5 mr-1.5" /><span className="hidden sm:inline">{t('Auth')}</span></TabsTrigger>
            <TabsTrigger value="access"><Server className="size-3.5 mr-1.5" /><span className="hidden sm:inline">{t('Access')}</span></TabsTrigger>
            <TabsTrigger value="metadata"><Bot className="size-3.5 mr-1.5" /><span className="hidden sm:inline">{t('Metadata')}</span></TabsTrigger>
          </TabsList>

          {/* ── General Tab ─────────────────────────────────────────── */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Application Name')}</Label>
                <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Status')}</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={form.enabled ?? true} onCheckedChange={(v) => set('enabled', v)} />
                  <span className="text-sm">{form.enabled ? t('Enabled') : t('Disabled')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Description')}</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('App Type')}</Label>
                <Select value={form.appType ?? ''} onValueChange={(v) => set('appType', v as UpdateSmartAppRequest['appType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AppTypeEnum.StandaloneApp}>Standalone App</SelectItem>
                    <SelectItem value={AppTypeEnum.EhrLaunch}>EHR Launch</SelectItem>
                    <SelectItem value={AppTypeEnum.BackendService}>Backend Service</SelectItem>
                    <SelectItem value={AppTypeEnum.Agent}>Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Client Type')}</Label>
                <Select value={form.clientType ?? ''} onValueChange={(v) => set('clientType', v as UpdateSmartAppRequest['clientType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClientTypeEnum.Public}>Public</SelectItem>
                    <SelectItem value={ClientTypeEnum.Confidential}>Confidential</SelectItem>
                    <SelectItem value={ClientTypeEnum.BackendService}>Backend Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('SMART Version')}</Label>
                <Input value={form.smartVersion ?? ''} onChange={(e) => set('smartVersion', e.target.value)} placeholder="e.g., 2.0.0" />
              </div>
              <div className="space-y-2">
                <Label>{t('FHIR Version')}</Label>
                <Input value={form.fhirVersion ?? ''} onChange={(e) => set('fhirVersion', e.target.value)} placeholder="e.g., R4" />
              </div>
            </div>
          </TabsContent>

          {/* ── URIs Tab ────────────────────────────────────────────── */}
          <TabsContent value="uris" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('Launch URL')}</Label>
              <Input value={form.launchUrl ?? ''} onChange={(e) => set('launchUrl', e.target.value)} placeholder="https://..." />
            </div>
            <StringListField
              label={t('Redirect URIs')}
              values={form.redirectUris ?? []}
              onChange={(v) => set('redirectUris', v)}
              placeholder="https://app.example.com/callback"
            />
            <StringListField
              label={t('Web Origins (CORS)')}
              values={form.webOrigins ?? []}
              onChange={(v) => set('webOrigins', v)}
              placeholder="https://app.example.com"
            />
          </TabsContent>

          {/* ── Auth Tab ────────────────────────────────────────────── */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('Require PKCE')}</Label>
                <p className="text-xs text-muted-foreground">{t('Proof Key for Code Exchange (recommended for public clients)')}</p>
              </div>
              <Switch checked={form.requirePkce ?? false} onCheckedChange={(v) => set('requirePkce', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('Allow Offline Access')}</Label>
                <p className="text-xs text-muted-foreground">{t('Enable refresh tokens for this application')}</p>
              </div>
              <Switch checked={form.allowOfflineAccess ?? false} onCheckedChange={(v) => set('allowOfflineAccess', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('Token Exchange')}</Label>
                <p className="text-xs text-muted-foreground">{t('Allow RFC 8693 standard token exchange for this client')}</p>
              </div>
              <Switch checked={form.tokenExchangeEnabled ?? false} onCheckedChange={(v) => set('tokenExchangeEnabled', v)} />
            </div>

            <div className="space-y-2">
              <Label>{t('Access Token Lifespan')}</Label>
              <p className="text-xs text-muted-foreground">{t('Override realm default (in seconds). Leave empty for realm default.')}</p>
              <Input
                type="number"
                min={0}
                value={form.accessTokenLifespan ?? ''}
                onChange={(e) => set('accessTokenLifespan', e.target.value ? Number(e.target.value) : undefined)}
                placeholder={t('Realm default')}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('Client IDs included as audience in tokens (for token exchange)')}</p>
              <StringListField
                label={t('Audience Clients')}
                values={form.audienceClients ?? []}
                onChange={(v) => set('audienceClients', v)}
                placeholder={t('Add client ID...')}
              />
            </div>

            {/* Consent & Scope */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('Consent Required')}</Label>
                  <p className="text-xs text-muted-foreground">{t('User must explicitly consent to scopes at login')}</p>
                </div>
                <Switch checked={form.consentRequired ?? false} onCheckedChange={(v) => set('consentRequired', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('Full Scope Allowed')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Include all realm/client roles in tokens (disable to restrict)')}</p>
                </div>
                <Switch checked={form.fullScopeAllowed ?? true} onCheckedChange={(v) => set('fullScopeAllowed', v)} />
              </div>
            </div>

            {/* Session Timeouts */}
            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-semibold">{t('Session Timeouts')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Session Idle Timeout')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.clientSessionIdleTimeout ?? ''}
                    onChange={(e) => set('clientSessionIdleTimeout', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t('Realm default')}
                  />
                  <p className="text-xs text-muted-foreground">{t('Seconds before idle session expires')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('Session Max Lifespan')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.clientSessionMaxLifespan ?? ''}
                    onChange={(e) => set('clientSessionMaxLifespan', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t('Realm default')}
                  />
                  <p className="text-xs text-muted-foreground">{t('Max session duration in seconds')}</p>
                </div>
              </div>
            </div>

            {/* Logout Settings */}
            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-semibold">{t('Logout')}</Label>
              <div className="space-y-2">
                <Label>{t('Backchannel Logout URL')}</Label>
                <Input
                  value={form.backchannelLogoutUrl ?? ''}
                  onChange={(e) => set('backchannelLogoutUrl', e.target.value || undefined)}
                  placeholder="https://app.example.com/logout/backchannel"
                />
                <p className="text-xs text-muted-foreground">{t('Server receives a logout token when the session ends')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('Front-Channel Logout URL')}</Label>
                <Input
                  value={form.frontChannelLogoutUrl ?? ''}
                  onChange={(e) => set('frontChannelLogoutUrl', e.target.value || undefined)}
                  placeholder="https://app.example.com/logout"
                />
                <p className="text-xs text-muted-foreground">{t('Browser redirected here on logout (visible to user)')}</p>
              </div>
            </div>

            {form.clientType === ClientTypeEnum.Confidential && (
              <div className="space-y-2 border-t pt-4">
                <Label>{t('Client Secret')}</Label>
                <Input type="password" value={form.secret ?? ''} onChange={(e) => set('secret', e.target.value || undefined)} placeholder={t('Leave empty to keep current')} />
              </div>
            )}

            {(form.clientType === ClientTypeEnum.Confidential || form.clientType === ClientTypeEnum.BackendService) && (
              <>
                <div className="space-y-2">
                  <Label>{t('JWKS URI')}</Label>
                  <Input value={form.jwksUri ?? ''} onChange={(e) => set('jwksUri', e.target.value || undefined)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>{t('Public Key (PEM)')}</Label>
                  <Textarea value={form.publicKey ?? ''} onChange={(e) => set('publicKey', e.target.value || undefined)} rows={3} placeholder="-----BEGIN PUBLIC KEY-----" className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>{t('JWKS String (inline JSON)')}</Label>
                  <Textarea value={form.jwksString ?? ''} onChange={(e) => set('jwksString', e.target.value || undefined)} rows={3} placeholder='{"keys":[...]}' className="font-mono text-xs" />
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Access Control Tab ──────────────────────────────────── */}
          <TabsContent value="access" className="space-y-5 mt-4">
            {/* FHIR Server Access */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('FHIR Server Access')}</Label>
              <Select
                value={form.serverAccessType ?? ServerAccessEnum.AllServers}
                onValueChange={(v) => set('serverAccessType', v as UpdateSmartAppRequest['serverAccessType'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ServerAccessEnum.AllServers}>{t('All Servers')}</SelectItem>
                  <SelectItem value={ServerAccessEnum.SelectedServers}>{t('Selected Servers')}</SelectItem>
                  <SelectItem value={ServerAccessEnum.UserPersonServers}>{t('User-Person Linked Servers')}</SelectItem>
                </SelectContent>
              </Select>
              {form.serverAccessType === ServerAccessEnum.SelectedServers && (
                <StringListField
                  label={t('Allowed Server IDs')}
                  values={form.allowedServerIds ?? []}
                  onChange={(v) => set('allowedServerIds', v)}
                  placeholder="server-id"
                />
              )}
            </div>

            {/* User Restrictions */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">{t('User Restrictions')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Restrict which users can access this app based on their FHIR user type or assigned roles. Leave empty for no restrictions.')}
              </p>
              <StringListField
                label={t('Allowed FHIR User Types')}
                values={form.allowedFhirUserTypes ?? []}
                onChange={(v) => set('allowedFhirUserTypes', v)}
                placeholder="Practitioner"
              />
              <StringListField
                label={t('Required Roles')}
                values={form.requiredRoles ?? []}
                onChange={(v) => set('requiredRoles', v)}
                placeholder="role-name"
              />
            </div>
          </TabsContent>

          {/* ── Metadata Tab ────────────────────────────────────────── */}
          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('Logo URI')}</Label>
              <Input value={form.logoUri ?? ''} onChange={(e) => set('logoUri', e.target.value)} placeholder="https://..." />
              {form.logoUri && (
                <img src={form.logoUri} alt="App logo" className="size-12 rounded object-contain border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Terms of Service URI')}</Label>
                <Input value={form.tosUri ?? ''} onChange={(e) => set('tosUri', e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>{t('Privacy Policy URI')}</Label>
                <Input value={form.policyUri ?? ''} onChange={(e) => set('policyUri', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <StringListField
              label={t('Contacts')}
              values={form.contacts ?? []}
              onChange={(v) => set('contacts', v)}
              placeholder="admin@example.com"
            />
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('Cancel')}
          </Button>
          <LoadingButton onClick={handleSave} loading={saving} loadingText={t('Saving…')}>
            {t('Save Changes')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reusable string-list field ───────────────────────────────────────────────

function StringListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setDraft('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[200px] truncate text-xs">{v}</span>
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
