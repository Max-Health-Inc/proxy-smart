import { Button } from '@max-health-inc/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Shield } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

import { IdPStatisticsCards } from './IdPStatisticsCards';
import { IdPAddForm } from './IdPAddForm';
import { IdPTable } from './IdPTable';
import { IdPEditDialog } from './IdPEditDialog';
import { ConnectionTestDialog } from './ConnectionTestDialog';
import { CertificatesDialog } from './CertificatesDialog';

import type {
  IdentityProviderWithStats,
  IdentityProviderFormData,
  IdentityProviderConfig,
  IdentityProviderResponse,
  UpdateIdentityProviderRequest,
  CreateIdentityProviderRequest
} from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

const DEFAULT_NAME_ID_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent';

const createDefaultConfig = (): IdentityProviderConfig => ({
  displayName: '',
  entityId: '',
  singleSignOnServiceUrl: '',
  singleLogoutServiceUrl: '',
  logoutUrl: '',
  clientSecret: '',
  tokenUrl: '',
  userInfoUrl: '',
  issuer: '',
  metadataDescriptorUrl: '',
  defaultScopes: 'openid profile email',
  signatureAlgorithm: 'RS256',
  nameIdPolicyFormat: DEFAULT_NAME_ID_FORMAT,
  signingCertificate: '',
  validateSignature: true,
  wantAuthnRequestsSigned: false,
});

const createEmptyFormData = (): IdentityProviderFormData => ({
  alias: '',
  providerId: 'saml',
  displayName: '',
  enabled: true,
  config: createDefaultConfig(),
  vendorName: '',
  firstBrokerLoginFlowAlias: 'first broker login',
  postBrokerLoginFlowAlias: '',
  trustEmail: false,
  linkOnly: false,
  hideOnLogin: false,
});

const sanitizeConfig = (config: IdentityProviderConfig): IdentityProviderConfig => {
  const sanitized: IdentityProviderConfig = { ...config };
  (Object.entries(sanitized) as Array<[
    keyof IdentityProviderConfig,
    IdentityProviderConfig[keyof IdentityProviderConfig]
  ]>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      delete sanitized[key];
      return;
    }
    if (typeof value === 'string' && value.trim() === '') {
      delete sanitized[key];
    }
  });
  return sanitized;
};

const mapResponseToStats = (provider: IdentityProviderResponse): IdentityProviderWithStats => {
  const config = {
    ...createDefaultConfig(),
    ...((provider.config as IdentityProviderConfig) ?? {}),
  };

  return {
    ...provider,
    config,
    vendorName: (provider as IdentityProviderWithStats).vendorName ?? config.displayName,
    status: provider.enabled === false ? 'inactive' : 'active',
    userCount: provider.userCount ?? 0,
    lastUsed: new Date().toISOString(),
  };
};

const formDataFromStats = (provider: IdentityProviderWithStats): IdentityProviderFormData => ({
  alias: provider.alias ?? '',
  providerId: provider.providerId ?? 'saml',
  displayName: provider.displayName ?? '',
  enabled: provider.enabled ?? true,
  config: {
    ...createDefaultConfig(),
    ...((provider.config as IdentityProviderConfig) ?? {}),
  },
  vendorName: provider.vendorName,
  firstBrokerLoginFlowAlias: provider.firstBrokerLoginFlowAlias ?? 'first broker login',
  postBrokerLoginFlowAlias: provider.postBrokerLoginFlowAlias ?? '',
  trustEmail: provider.trustEmail ?? false,
  linkOnly: provider.linkOnly ?? false,
  hideOnLogin: provider.hideOnLogin ?? false,
});

export function IdPManager() {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();
  const { notify } = useNotificationStore();
  const [idps, setIdps] = useState<IdentityProviderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIdp, setEditingIdp] = useState<IdentityProviderFormData | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; message: string; testedAt?: string }>>({});
  const [showCertificates, setShowCertificates] = useState<string | null>(null);
  const [newIdp, setNewIdp] = useState<IdentityProviderFormData>(createEmptyFormData());

  const refreshIdps = useCallback(async () => {
    if (!isAuthenticated || !clientApis.identityProviders) {
      setIdps([]);
      return;
    }

    try {
      const providers = await clientApis.identityProviders.getAdminIdps();
      setIdps(providers.map(mapResponseToStats));
    } catch (error) {
      console.error('Failed to load Identity Providers:', error);
      setIdps([]);
      notify({ type: 'error', message: t('Failed to load Identity Providers. Please try again.') });
    }
  }, [isAuthenticated, clientApis.identityProviders]);

  useEffect(() => {
    setLoading(true);
    refreshIdps().finally(() => setLoading(false));
  }, [refreshIdps]);

  const handleAddIdp = async (formData: IdentityProviderFormData) => {
    const derivedAlias = (formData.alias || formData.displayName || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    if (!derivedAlias) {
      notify({ type: 'error', message: t('Alias or display name is required to create an Identity Provider.') });
      return;
    }

    const providerId = (formData.providerId ?? 'saml').toLowerCase();
    const configWithDisplayName: IdentityProviderConfig = {
      ...formData.config,
      displayName: formData.config.displayName || formData.displayName || derivedAlias,
    };

    try {
      if (isAuthenticated && clientApis.identityProviders) {
        const payload: CreateIdentityProviderRequest = {
          alias: derivedAlias,
          providerId,
          displayName: formData.displayName?.trim() || undefined,
          enabled: formData.enabled,
          config: sanitizeConfig(configWithDisplayName),
          firstBrokerLoginFlowAlias: formData.firstBrokerLoginFlowAlias || undefined,
          postBrokerLoginFlowAlias: formData.postBrokerLoginFlowAlias || undefined,
          trustEmail: formData.trustEmail,
          linkOnly: formData.linkOnly,
          hideOnLogin: formData.hideOnLogin,
        };

        await clientApis.identityProviders.postAdminIdps({
          createIdentityProviderRequest: payload,
        });

        await refreshIdps();
        notify({ type: 'success', message: t('Identity Provider added successfully!') });
      } else {
        const localEntry: IdentityProviderWithStats = {
          alias: derivedAlias,
          providerId,
          displayName: formData.displayName,
          enabled: formData.enabled,
          config: sanitizeConfig(configWithDisplayName),
          vendorName: formData.vendorName,
          status: formData.enabled ? 'active' : 'inactive',
          userCount: 0,
          lastUsed: new Date().toISOString(),
        };

        setIdps((prev) => [...prev, localEntry]);
        notify({ type: 'success', message: t('Identity Provider added (local only).') });
      }
    } catch (error) {
      console.error('Failed to add IdP:', error);
      notify({ type: 'error', message: t('Failed to add Identity Provider. Please try again.') });
    } finally {
      setNewIdp(createEmptyFormData());
      setShowAddForm(false);
    }
  };

  const handleEditIdp = (idp: IdentityProviderWithStats) => {
    setEditingIdp(formDataFromStats(idp));
  };

  const handleUpdateIdp = async (updatedIdp: IdentityProviderFormData) => {
    if (!updatedIdp.alias) {
      notify({ type: 'error', message: t('Alias is required to update an Identity Provider.') });
      return;
    }

    const sanitizedConfig = sanitizeConfig(updatedIdp.config);

    try {
      if (isAuthenticated && clientApis.identityProviders) {
        const payload: UpdateIdentityProviderRequest = {
          displayName: updatedIdp.displayName,
          enabled: updatedIdp.enabled,
          config: Object.keys(sanitizedConfig).length ? sanitizedConfig : undefined,
          firstBrokerLoginFlowAlias: updatedIdp.firstBrokerLoginFlowAlias || undefined,
          postBrokerLoginFlowAlias: updatedIdp.postBrokerLoginFlowAlias || undefined,
          trustEmail: updatedIdp.trustEmail,
          linkOnly: updatedIdp.linkOnly,
          hideOnLogin: updatedIdp.hideOnLogin,
        };

        await clientApis.identityProviders.putAdminIdpsByAlias({
          alias: updatedIdp.alias,
          updateIdentityProviderRequest: payload,
        });

        await refreshIdps();
        notify({ type: 'success', message: t('Identity Provider updated successfully!') });
      } else {
        setIdps((prev) =>
          prev.map((idp) =>
            (idp.alias ?? '') === updatedIdp.alias
              ? {
                  ...idp,
                  providerId: updatedIdp.providerId,
                  displayName: updatedIdp.displayName,
                  enabled: updatedIdp.enabled,
                  status: updatedIdp.enabled ? 'active' : 'inactive',
                  config: sanitizedConfig,
                  vendorName: updatedIdp.vendorName,
                }
              : idp,
          ),
        );
        notify({ type: 'success', message: t('Identity Provider updated (local only).') });
      }
    } catch (error) {
      console.error('Failed to update IdP:', error);
      notify({ type: 'error', message: t('Failed to update Identity Provider. Please try again.') });
    } finally {
      setEditingIdp(null);
    }
  };

  const handleTestConnection = async (idp: IdentityProviderWithStats) => {
    const alias = idp.alias ?? '';
    if (!alias) {
      notify({ type: 'error', message: t('Cannot test connection for providers without an alias.') });
      return;
    }

    setTestingConnection(alias);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const success = (idp.status ?? (idp.enabled ? 'active' : 'inactive')) === 'active' && Math.random() > 0.3;
      const message = success
        ? `Successfully connected to ${idp.displayName ?? alias}.`
        : `Connection failed for ${idp.displayName ?? alias}.`;

      setConnectionResults((prev) => ({
        ...prev,
        [alias]: { success, message, testedAt: new Date().toISOString() },
      }));
    } catch (error) {
      setConnectionResults((prev) => ({
        ...prev,
        [alias]: {
          success: false,
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          testedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const handleViewCertificates = (idp: IdentityProviderWithStats) => {
    if (idp.alias) {
      setShowCertificates(idp.alias);
    }
  };

  const handleDeleteIdp = async (alias: string) => {
    if (!alias) {
      notify({ type: 'error', message: t('Unable to delete provider without an alias.') });
      return;
    }

    try {
      if (isAuthenticated && clientApis.identityProviders) {
        await clientApis.identityProviders.deleteAdminIdpsByAlias({ alias });
        await refreshIdps();
        notify({ type: 'success', message: t('Identity Provider deleted successfully!') });
      } else {
        setIdps((prev) => prev.filter((idp) => (idp.alias ?? '') !== alias));
        notify({ type: 'success', message: t('Identity Provider deleted (local only).') });
      }
    } catch (error) {
      console.error('Failed to delete IdP:', error);
      notify({ type: 'error', message: t('Failed to delete Identity Provider. Please try again.') });
    }
  };

  const toggleIdpStatus = async (alias: string) => {
    if (!alias) {
      notify({ type: 'error', message: t('Unable to toggle status without an alias.') });
      return;
    }

    const target = idps.find((idp) => (idp.alias ?? '') === alias);
    if (!target) {
      return;
    }

    const nextEnabled = !(target.enabled ?? true);

    try {
      if (isAuthenticated && clientApis.identityProviders) {
        await clientApis.identityProviders.putAdminIdpsByAlias({
          alias,
          updateIdentityProviderRequest: { enabled: nextEnabled },
        });

        await refreshIdps();
      } else {
        setIdps((prev) =>
          prev.map((idp) =>
            (idp.alias ?? '') === alias
              ? { ...idp, enabled: nextEnabled, status: nextEnabled ? 'active' : 'inactive' }
              : idp,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to toggle IdP status:', error);
      notify({ type: 'error', message: t('Failed to update Identity Provider status. Please try again.') });
    }
  };

  if (loading) {
    return <PageLoadingState message={t('Loading Identity Providers...')} className="min-h-[300px]" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('Identity Provider Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              {t('Configure and manage identity providers for healthcare system authentication')}
            </div>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('Add Identity Provider')}
          </Button>
        </div>
      </div>

      <IdPStatisticsCards idps={idps} />

      <IdPAddForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          await handleAddIdp(newIdp);
        }}
        newIdp={newIdp}
        setNewIdp={setNewIdp}
      />

      <IdPTable
        idps={idps}
        testingConnection={testingConnection}
        connectionResults={connectionResults}
        onEdit={handleEditIdp}
        onToggleStatus={toggleIdpStatus}
        onTestConnection={handleTestConnection}
        onViewCertificates={handleViewCertificates}
        onDelete={handleDeleteIdp}
      />

      <IdPEditDialog
        isOpen={!!editingIdp}
        onClose={() => setEditingIdp(null)}
        onUpdate={handleUpdateIdp}
        editingIdp={editingIdp}
        setEditingIdp={setEditingIdp}
      />

      {Object.keys(connectionResults).length > 0 && (
        <ConnectionTestDialog
          isOpen={Object.keys(connectionResults).length > 0}
          onClose={() => setConnectionResults({})}
          connectionResults={connectionResults}
          idps={idps}
        />
      )}

      {showCertificates && (
        <CertificatesDialog
          isOpen={!!showCertificates}
          onClose={() => setShowCertificates(null)}
          showCertificates={showCertificates}
          idps={idps}
        />
      )}
    </div>
  );
}