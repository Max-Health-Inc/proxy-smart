// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@proxy-smart/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Database,
  RefreshCw,
  Trash2,
  Pencil,
  ArrowDownUp,
  Unlink,
  CheckCircle2,
  XCircle,
  FolderSync,
  Shuffle,
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { LdapMappersDialog } from './LdapMappersDialog';
import { LdapForm } from './LdapForm';
import { FederationStatisticsCards } from './FederationStatisticsCards';
import { defaultFormData, type FederationWithStatus, type FormData } from './types';
import type {
  CreateUserFederationRequest,
  LdapTestConnectionRequest,
  UserFederationSyncResultResponse,
} from '@max-health-inc/proxy-smart-client';


// ==================== Mapper Overview ====================

/** Keycloak user attribute a SMART launch resolves the imported user through */
const SMART_USER_ATTRIBUTE = 'fhirUser';

interface MapperOverview {
  count: number;
  /** Whether some mapper writes the fhirUser user attribute */
  mapsFhirUser: boolean;
}

type FederationApi = NonNullable<ReturnType<typeof useAuth>['clientApis']['userFederation']>;

/**
 * Per-provider mapper summary for the cards. Best-effort: a provider whose
 * mappers cannot be listed simply shows no summary rather than failing the page.
 */
async function fetchMapperOverviews(
  api: FederationApi,
  ids: string[],
): Promise<Record<string, MapperOverview>> {
  const entries = await Promise.all(ids.map(async (id): Promise<[string, MapperOverview] | null> => {
    try {
      const mappers = await api.getAdminUserFederationByIdMappers({ id });
      return [id, {
        count: mappers.length,
        mapsFhirUser: mappers.some(mapper =>
          (mapper.config as Record<string, string> | undefined)?.['user.model.attribute'] === SMART_USER_ATTRIBUTE),
      }];
    } catch {
      return null;
    }
  }));

  return Object.fromEntries(entries.filter((entry): entry is [string, MapperOverview] => entry !== null));
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
  const [mapperOverviews, setMapperOverviews] = useState<Record<string, MapperOverview>>({});
  const [managingMappers, setManagingMappers] = useState<{ id: string; name?: string } | null>(null);
  const { notify } = useNotificationStore();

  const refreshMapperOverviews = useCallback(async (providers: FederationWithStatus[]) => {
    if (!clientApis?.userFederation) return;
    const ids = providers.map(provider => provider.id).filter((id): id is string => !!id);
    setMapperOverviews(await fetchMapperOverviews(clientApis.userFederation, ids));
  }, [clientApis]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !clientApis?.userFederation) {
      setFederations([]);
      return;
    }
    try {
      const providers = await clientApis.userFederation.getAdminUserFederation();
      const withStatus = providers.map(p => ({
        ...p,
        status: (p.config as Record<string, string>)?.enabled === 'false' ? 'inactive' as const : 'active' as const,
      }));
      setFederations(withStatus);
      await refreshMapperOverviews(withStatus);
    } catch (error) {
      console.error('Failed to load user federations:', error);
      setFederations([]);
      notify({ type: 'error', message: t('Failed to load user federations') });
    }
  }, [isAuthenticated, clientApis, t, notify, refreshMapperOverviews]);

  useEffect(() => {
    if (!isAuthenticated || !clientApis?.userFederation) return;
    clientApis.userFederation.getAdminUserFederation()
      .then(providers => {
        const withStatus = providers.map(p => ({
          ...p,
          status: (p.config as Record<string, string>)?.enabled === 'false' ? 'inactive' as const : 'active' as const,
        }));
        setFederations(withStatus);
        return refreshMapperOverviews(withStatus);
      })
      .catch(error => {
        console.error('Failed to load user federations:', error);
        setFederations([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, clientApis, refreshMapperOverviews]);

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
      <FederationStatisticsCards federations={federations} />

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
                      {fed.id && mapperOverviews[fed.id] && (
                        <button
                          type="button"
                          onClick={() => setManagingMappers({ id: fed.id!, name: fed.name })}
                          className={`inline-flex items-center gap-1 text-xs hover:underline ${
                            mapperOverviews[fed.id].mapsFhirUser
                              ? 'text-muted-foreground'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                          title={mapperOverviews[fed.id].mapsFhirUser
                            ? t('A mapper writes the fhirUser attribute')
                            : t('No mapper writes fhirUser')}
                        >
                          <Shuffle className="w-3 h-3" />
                          {mapperOverviews[fed.id].mapsFhirUser
                            ? t('{{count}} mappers', { count: mapperOverviews[fed.id].count })
                            : t('no fhirUser mapper')}
                        </button>
                      )}
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
                    onClick={() => fed.id && setManagingMappers({ id: fed.id, name: fed.name })}
                    disabled={!fed.id}
                    className="rounded-xl text-xs"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    {t('Mappers')}
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

      {managingMappers && (
        <LdapMappersDialog
          isOpen={!!managingMappers}
          onClose={() => setManagingMappers(null)}
          providerId={managingMappers.id}
          providerName={managingMappers.name}
          onChanged={() => refreshMapperOverviews(federations)}
        />
      )}
    </div>
  );
}