import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useNotificationStore } from '@/stores/notificationStore';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Database,
  Server,
  Shield,
  RefreshCw,
  Trash2,
  Pencil,
  Plug,
  Users,
  ArrowDownUp,
  Unlink,
  CheckCircle2,
  XCircle,
  FolderSync,
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import type {
  UserFederationProviderResponse,
  CreateUserFederationRequest,
  LdapTestConnectionRequest,
  UserFederationSyncResultResponse,
} from '@/lib/api-client';

// ==================== Types ====================

interface FederationWithStatus extends UserFederationProviderResponse {
  status: 'active' | 'inactive' | 'unknown';
}

interface FormData {
  name: string;
  connectionUrl: string;
  bindDn: string;
  bindCredential: string;
  usersDn: string;
  usernameLDAPAttribute: string;
  rdnLDAPAttribute: string;
  uuidLDAPAttribute: string;
  userObjectClasses: string;
  editMode: string;
  vendor: string;
  searchScope: string;
  authType: string;
  pagination: boolean;
  importEnabled: boolean;
  syncRegistrations: boolean;
  trustEmail: boolean;
  batchSizeForSync: string;
  fullSyncPeriod: string;
  changedSyncPeriod: string;
  connectionPooling: boolean;
  startTls: boolean;
}

const defaultFormData: FormData = {
  name: '',
  connectionUrl: '',
  bindDn: '',
  bindCredential: '',
  usersDn: '',
  usernameLDAPAttribute: 'uid',
  rdnLDAPAttribute: 'uid',
  uuidLDAPAttribute: 'entryUUID',
  userObjectClasses: 'inetOrgPerson, organizationalPerson',
  editMode: 'READ_ONLY',
  vendor: 'other',
  searchScope: '2',
  authType: 'simple',
  pagination: true,
  importEnabled: true,
  syncRegistrations: false,
  trustEmail: false,
  batchSizeForSync: '1000',
  fullSyncPeriod: '-1',
  changedSyncPeriod: '-1',
  connectionPooling: true,
  startTls: false,
};

// ==================== Sub-components ====================

function StatisticsCards({ federations }: { federations: FederationWithStatus[] }) {
  const { t } = useTranslation();
  const active = federations.filter(f => f.status === 'active').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={Database} label={t('Total Federations')} value={federations.length} color="blue" />
      <StatCard icon={Shield} label={t('Active')} value={active} color="green" />
      <StatCard icon={Server} label={t('Inactive')} value={federations.length - active} color="orange" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxField({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start space-x-3 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-1"
      />
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
    </label>
  );
}

function LdapForm({ form, setForm, onTestConnection, testing }: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onTestConnection: () => void;
  testing: boolean;
}) {
  const { t } = useTranslation();
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Basic */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          {t('Basic Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Provider Name')} *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Corporate LDAP" />
          </div>
          <SelectField
            label={t('LDAP Vendor')}
            value={form.vendor}
            onChange={v => setForm(prev => ({ ...prev, vendor: v }))}
            options={[
              { value: 'ad', label: 'Active Directory' },
              { value: 'rhds', label: 'Red Hat Directory Server' },
              { value: 'tivoli', label: 'Tivoli' },
              { value: 'edirectory', label: 'Novell eDirectory' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
      </div>

      {/* Connection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          {t('Connection Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-semibold">{t('Connection URL')} *</Label>
            <Input value={form.connectionUrl} onChange={set('connectionUrl')} placeholder="ldap://ldap.example.com:389" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Bind DN')}</Label>
            <Input value={form.bindDn} onChange={set('bindDn')} placeholder="cn=admin,dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Bind Credential')}</Label>
            <Input type="password" value={form.bindCredential} onChange={set('bindCredential')} placeholder="••••••••" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CheckboxField
            label={t('Enable StartTLS')}
            checked={form.startTls}
            onChange={v => setForm(prev => ({ ...prev, startTls: v }))}
          />
          <CheckboxField
            label={t('Connection Pooling')}
            checked={form.connectionPooling}
            onChange={v => setForm(prev => ({ ...prev, connectionPooling: v }))}
          />
        </div>
        <LoadingButton
          type="button"
          variant="outline"
          onClick={onTestConnection}
          loading={testing}
          disabled={!form.connectionUrl}
          className="rounded-xl"
        >
          <Plug className="w-4 h-4 mr-2" />
          {t('Test Connection')}
        </LoadingButton>
      </div>

      {/* Users DN & attributes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('LDAP Users')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-semibold">{t('Users DN')} *</Label>
            <Input value={form.usersDn} onChange={set('usersDn')} placeholder="ou=users,dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Username LDAP Attribute')}</Label>
            <Input value={form.usernameLDAPAttribute} onChange={set('usernameLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('RDN LDAP Attribute')}</Label>
            <Input value={form.rdnLDAPAttribute} onChange={set('rdnLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('UUID LDAP Attribute')}</Label>
            <Input value={form.uuidLDAPAttribute} onChange={set('uuidLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('User Object Classes')}</Label>
            <Input value={form.userObjectClasses} onChange={set('userObjectClasses')} />
          </div>
        </div>
      </div>

      {/* Sync & Edit Mode */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowDownUp className="w-5 h-5 text-primary" />
          {t('Sync Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={t('Edit Mode')}
            value={form.editMode}
            onChange={v => setForm(prev => ({ ...prev, editMode: v }))}
            options={[
              { value: 'READ_ONLY', label: 'Read Only' },
              { value: 'WRITABLE', label: 'Writable' },
              { value: 'UNSYNCED', label: 'Unsynced' },
            ]}
          />
          <SelectField
            label={t('Search Scope')}
            value={form.searchScope}
            onChange={v => setForm(prev => ({ ...prev, searchScope: v }))}
            options={[
              { value: '1', label: 'One Level' },
              { value: '2', label: 'Subtree' },
            ]}
          />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Batch Size')}</Label>
            <Input value={form.batchSizeForSync} onChange={set('batchSizeForSync')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Full Sync Period (seconds)')}</Label>
            <Input value={form.fullSyncPeriod} onChange={set('fullSyncPeriod')} placeholder="-1 to disable" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Changed Users Sync Period (seconds)')}</Label>
            <Input value={form.changedSyncPeriod} onChange={set('changedSyncPeriod')} placeholder="-1 to disable" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t('Import Users')}
            description={t('Import users from LDAP into Keycloak database')}
            checked={form.importEnabled}
            onChange={v => setForm(prev => ({ ...prev, importEnabled: v }))}
          />
          <CheckboxField
            label={t('Sync Registrations')}
            description={t('Sync new Keycloak registrations to LDAP')}
            checked={form.syncRegistrations}
            onChange={v => setForm(prev => ({ ...prev, syncRegistrations: v }))}
          />
          <CheckboxField
            label={t('Pagination')}
            description={t('Use paged result controls for LDAP queries')}
            checked={form.pagination}
            onChange={v => setForm(prev => ({ ...prev, pagination: v }))}
          />
          <CheckboxField
            label={t('Trust Email')}
            description={t('Trust email addresses from LDAP without verification')}
            checked={form.trustEmail}
            onChange={v => setForm(prev => ({ ...prev, trustEmail: v }))}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function UserFederationManager({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();
  const [federations, setFederations] = useState<FederationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...defaultFormData });
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<UserFederationSyncResultResponse | null>(null);
  const { notify } = useNotificationStore();

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !clientApis?.userFederation) {
      setFederations([]);
      return;
    }
    try {
      const providers = await clientApis.userFederation.getAdminUserFederation();
      setFederations(providers.map(p => ({
        ...p,
        status: (p.config as Record<string, string>)?.enabled === 'false' ? 'inactive' as const : 'active' as const,
      })));
    } catch (error) {
      console.error('Failed to load user federations:', error);
      setFederations([]);
      notify({ type: 'error', message: t('Failed to load user federations') });
    }
  }, [isAuthenticated, clientApis, t, notify]);

  useEffect(() => {
    if (!isAuthenticated || !clientApis?.userFederation) return;
    clientApis.userFederation.getAdminUserFederation()
      .then(providers => {
        setFederations(providers.map(p => ({
          ...p,
          status: (p.config as Record<string, string>)?.enabled === 'false' ? 'inactive' as const : 'active' as const,
        })));
      })
      .catch(error => {
        console.error('Failed to load user federations:', error);
        setFederations([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, clientApis]);

  const formToRequest = (f: FormData): CreateUserFederationRequest => ({
    name: f.name,
    config: {
      connectionUrl: f.connectionUrl,
      bindDn: f.bindDn || undefined,
      bindCredential: f.bindCredential || undefined,
      startTls: f.startTls,
      usersDn: f.usersDn,
      usernameLDAPAttribute: f.usernameLDAPAttribute,
      rdnLDAPAttribute: f.rdnLDAPAttribute,
      uuidLDAPAttribute: f.uuidLDAPAttribute,
      userObjectClasses: f.userObjectClasses,
      authType: f.authType,
      searchScope: f.searchScope,
      editMode: f.editMode,
      vendor: f.vendor,
      pagination: f.pagination,
      batchSizeForSync: f.batchSizeForSync,
      fullSyncPeriod: f.fullSyncPeriod,
      changedSyncPeriod: f.changedSyncPeriod,
      importEnabled: f.importEnabled,
      syncRegistrations: f.syncRegistrations,
      trustEmail: f.trustEmail,
      connectionPooling: f.connectionPooling,
    },
  });

  const providerToForm = (p: FederationWithStatus): FormData => {
    const c = (p.config ?? {}) as Record<string, string>;
    return {
      name: p.name ?? '',
      connectionUrl: c.connectionUrl ?? '',
      bindDn: c.bindDn ?? '',
      bindCredential: '',
      usersDn: c.usersDn ?? '',
      usernameLDAPAttribute: c.usernameLDAPAttribute ?? 'uid',
      rdnLDAPAttribute: c.rdnLDAPAttribute ?? 'uid',
      uuidLDAPAttribute: c.uuidLDAPAttribute ?? 'entryUUID',
      userObjectClasses: c.userObjectClasses ?? 'inetOrgPerson, organizationalPerson',
      editMode: c.editMode ?? 'READ_ONLY',
      vendor: c.vendor ?? 'other',
      searchScope: c.searchScope ?? '2',
      authType: c.authType ?? 'simple',
      pagination: c.pagination !== 'false',
      importEnabled: c.importEnabled !== 'false',
      syncRegistrations: c.syncRegistrations === 'true',
      trustEmail: c.trustEmail === 'true',
      batchSizeForSync: c.batchSizeForSync ?? '1000',
      fullSyncPeriod: c.fullSyncPeriod ?? '-1',
      changedSyncPeriod: c.changedSyncPeriod ?? '-1',
      connectionPooling: c.connectionPooling !== 'false',
      startTls: c.startTls === 'true',
    };
  };

  const handleAdd = async () => {
    if (!form.name || !form.connectionUrl || !form.usersDn) {
      notify({ type: 'error', message: t('Name, Connection URL, and Users DN are required') });
      return;
    }
    try {
      await clientApis.userFederation.postAdminUserFederation({
        createUserFederationRequest: formToRequest(form),
      });
      await refresh();
      setShowAddForm(false);
      setForm({ ...defaultFormData });
      notify({ type: 'success', message: t('LDAP federation created successfully') });
    } catch (error) {
      console.error('Failed to create federation:', error);
      notify({ type: 'error', message: t('Failed to create LDAP federation') });
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await clientApis.userFederation.putAdminUserFederationById({
        id: editingId,
        updateUserFederationRequest: {
          name: form.name || undefined,
          config: formToRequest(form).config,
        },
      });
      await refresh();
      setEditingId(null);
      setForm({ ...defaultFormData });
      notify({ type: 'success', message: t('LDAP federation updated successfully') });
    } catch (error) {
      console.error('Failed to update federation:', error);
      notify({ type: 'error', message: t('Failed to update LDAP federation') });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await clientApis.userFederation.deleteAdminUserFederationById({ id });
      await refresh();
      notify({ type: 'success', message: t('LDAP federation deleted') });
    } catch (error) {
      console.error('Failed to delete federation:', error);
      notify({ type: 'error', message: t('Failed to delete LDAP federation') });
    }
  };

  const handleSync = async (id: string, action: 'triggerFullSync' | 'triggerChangedUsersSync') => {
    setSyncing(id);
    setSyncResult(null);
    try {
      const result = await clientApis.userFederation.postAdminUserFederationByIdSync({
        id,
        userFederationSyncRequest: { action },
      });
      setSyncResult(result);
      notify({
        type: 'success',
        message: t('Sync completed: {{added}} added, {{updated}} updated, {{removed}} removed, {{failed}} failed', {
          added: result.added ?? 0,
          updated: result.updated ?? 0,
          removed: result.removed ?? 0,
          failed: result.failed ?? 0,
        }),
      });
    } catch (error) {
      console.error('Sync failed:', error);
      notify({ type: 'error', message: t('User sync failed') });
    } finally {
      setSyncing(null);
    }
  };

  const handleRemoveImported = async (id: string) => {
    try {
      await clientApis.userFederation.postAdminUserFederationByIdRemoveImported({ id });
      notify({ type: 'success', message: t('Imported users removed') });
    } catch (error) {
      console.error('Failed to remove imported users:', error);
      notify({ type: 'error', message: t('Failed to remove imported users') });
    }
  };

  const handleUnlink = async (id: string) => {
    try {
      await clientApis.userFederation.postAdminUserFederationByIdUnlink({ id });
      notify({ type: 'success', message: t('Federated users unlinked') });
    } catch (error) {
      console.error('Failed to unlink users:', error);
      notify({ type: 'error', message: t('Failed to unlink federated users') });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const payload: LdapTestConnectionRequest = {
        connectionUrl: form.connectionUrl,
        bindDn: form.bindDn || undefined,
        bindCredential: form.bindCredential || undefined,
        authType: form.authType,
        startTls: form.startTls ? 'true' : undefined,
      };
      await clientApis.userFederation.postAdminUserFederationTestConnection({
        ldapTestConnectionRequest: payload,
      });
      notify({ type: 'success', message: t('LDAP connection test successful') });
    } catch {
      notify({ type: 'error', message: t('LDAP connection test failed') });
    } finally {
      setTestingConnection(false);
    }
  };

  // ==================== Render ====================

  if (loading) {
    return <PageLoadingState message={t('Loading User Federations...')} className="min-h-[300px]" />;
  }

  return (
    <div className={embedded ? "space-y-6" : "p-4 sm:p-6 space-y-6 bg-background min-h-full"}>

      {/* Header */}
      {embedded ? (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setForm({ ...defaultFormData });
              setEditingId(null);
              setShowAddForm(true);
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('Add LDAP Provider')}
          </Button>
        </div>
      ) : (
        <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                {t('User Federation')}
              </h1>
              <div className="text-muted-foreground text-lg flex items-center">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                {t('Configure LDAP user federation to sync users from external directories')}
              </div>
            </div>
            <Button
              onClick={() => {
                setForm({ ...defaultFormData });
                setEditingId(null);
                setShowAddForm(true);
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('Add LDAP Provider')}
            </Button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <StatisticsCards federations={federations} />

      {/* Add / Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              {editingId ? t('Edit LDAP Provider') : t('Add LDAP Provider')}
            </h2>
            <Button
              variant="ghost"
              onClick={() => { setShowAddForm(false); setEditingId(null); setForm({ ...defaultFormData }); }}
              className="rounded-xl"
            >
              {t('Cancel')}
            </Button>
          </div>

          <LdapForm
            form={form}
            setForm={setForm}
            onTestConnection={handleTestConnection}
            testing={testingConnection}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => { setShowAddForm(false); setEditingId(null); setForm({ ...defaultFormData }); }}
              className="rounded-xl"
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={editingId ? handleUpdate : handleAdd}
            >
              {editingId ? t('Update Provider') : t('Create Provider')}
            </Button>
          </div>
        </div>
      )}

      {/* Sync Result Banner */}
      {syncResult && (
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-primary" />
            {t('Last Sync Result')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{syncResult.added ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t('Added')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{syncResult.updated ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t('Updated')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{syncResult.removed ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t('Removed')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{syncResult.failed ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t('Failed')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Federation Table */}
      {federations.length === 0 && !showAddForm ? (
        <div className="text-center py-16 bg-card/70 rounded-2xl border border-dashed border-border/50">
          <Database className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('No LDAP Federations Configured')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t('Add an LDAP provider to start syncing users from an external directory')}
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('Add LDAP Provider')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {federations.map(fed => (
            <div
              key={fed.id}
              className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-foreground truncate">{fed.name ?? 'Unnamed'}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {(fed.config as Record<string, string>)?.connectionUrl ?? 'No URL configured'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {fed.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> {t('Active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <XCircle className="w-3 h-3" /> {t('Inactive')}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {(fed.config as Record<string, string>)?.editMode ?? 'READ_ONLY'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(fed.config as Record<string, string>)?.vendor ?? 'other'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    onClick={() => fed.id && handleSync(fed.id, 'triggerFullSync')}
                    loading={syncing === fed.id}
                    disabled={!fed.id}
                    className="rounded-xl text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {t('Full Sync')}
                  </LoadingButton>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fed.id && handleSync(fed.id, 'triggerChangedUsersSync')}
                    disabled={!fed.id || syncing === fed.id}
                    className="rounded-xl text-xs"
                  >
                    <ArrowDownUp className="w-3 h-3 mr-1" />
                    {t('Changed Sync')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fed.id && handleRemoveImported(fed.id)}
                    disabled={!fed.id}
                    className="rounded-xl text-xs text-orange-600 hover:text-orange-700"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('Remove Imported')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fed.id && handleUnlink(fed.id)}
                    disabled={!fed.id}
                    className="rounded-xl text-xs"
                  >
                    <Unlink className="w-3 h-3 mr-1" />
                    {t('Unlink')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fed.id) {
                        setForm(providerToForm(fed));
                        setEditingId(fed.id);
                        setShowAddForm(false);
                      }
                    }}
                    className="rounded-xl text-xs"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    {t('Edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fed.id && handleDelete(fed.id)}
                    className="rounded-xl text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('Delete')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}