// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle, Info, Shuffle, Wrench } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  MapperManagerDialog,
  type MapperBannerContext,
  type MapperCreateInput,
  type MapperDialogData,
  type MapperRow,
  type MapperTypeOption,
} from '@/components/mappers/MapperManagerDialog';
import { useAuth } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslation } from 'react-i18next';
import type {
  IdentityProviderMapperDefinition,
  IdentityProviderMapperStatus,
  IdentityProviderMapperTypeResponse,
} from '@/lib/api-client';

interface IdPMappersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Alias of the provider whose mappers are being managed */
  alias: string;
  displayName?: string;
  /** Called after any change so the parent can refresh its status overview */
  onChanged?: () => void;
}

interface IdpMapperExtra {
  status: IdentityProviderMapperStatus | null;
  definitions: IdentityProviderMapperDefinition[];
}

/** Keycloak fills syncMode in from the definition, so it is not an input */
const HIDDEN_PROPERTIES = ['syncMode'];

type IdentityProvidersApi = NonNullable<ReturnType<typeof useAuth>['clientApis']['identityProviders']>;

const toTypeOption = (type: IdentityProviderMapperTypeResponse): MapperTypeOption => ({
  id: type.id,
  name: type.name,
  helpText: type.helpText,
  properties: type.properties,
});

/**
 * Claim mapping for a single identity provider.
 *
 * Brokered users only carry the attributes an IdP mapper imports for them, so
 * this is where an admin sees whether `fhirUser` actually reaches Keycloak,
 * provisions the expected imports, and configures non-standard claim shapes.
 */
export function IdPMappersDialog({ isOpen, onClose, alias, displayName, onChanged }: IdPMappersDialogProps) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const { notify } = useNotificationStore();
  const [provisioning, setProvisioning] = useState(false);

  const idpApi = clientApis.identityProviders as IdentityProvidersApi | undefined;

  const load = useCallback(async (): Promise<MapperDialogData<IdpMapperExtra>> => {
    if (!idpApi) return { mappers: [], types: [] };

    // Mapper types are best-effort: a provider Keycloak cannot enumerate types
    // for still shows the mappers it already has.
    const [statusResponse, types] = await Promise.all([
      idpApi.getAdminIdpsByAliasMapperStatus({ alias }),
      idpApi.getAdminIdpsByAliasMapperTypes({ alias }).catch(() => [] as IdentityProviderMapperTypeResponse[]),
    ]);

    const status = statusResponse.status[0] ?? null;

    return {
      mappers: (status?.mappers ?? []).map(mapper => ({
        id: mapper.id,
        name: mapper.name,
        typeId: mapper.identityProviderMapper,
        source: mapper.externalName,
        target: mapper.userAttribute,
        detail: mapper.syncMode,
      })),
      types: types.map(toTypeOption),
      extra: { status, definitions: statusResponse.definitions },
    };
  }, [idpApi, alias]);

  const create = useCallback(async ({ name, typeId, config }: MapperCreateInput) => {
    if (!idpApi) return;
    await idpApi.postAdminIdpsByAliasMappers({
      alias,
      createIdentityProviderMapperRequest: { name, identityProviderMapper: typeId, config },
    });
  }, [idpApi, alias]);

  const remove = useCallback(async (mapper: MapperRow) => {
    if (!idpApi || !mapper.id) return;
    await idpApi.deleteAdminIdpsByAliasMappersByMapperId({ alias, mapperId: mapper.id });
  }, [idpApi, alias]);

  const handleProvision = async (reload: () => Promise<void>) => {
    if (!idpApi) return;
    setProvisioning(true);
    try {
      const result = await idpApi.postAdminIdpsByAliasMappersFix({ alias });
      notify({ type: result.errors.length > 0 ? 'error' : 'success', message: result.message });
      await reload();
      onChanged?.();
    } catch {
      notify({ type: 'error', message: t('Failed to provision identity provider mappers.') });
    } finally {
      setProvisioning(false);
    }
  };

  const renderBanner = ({ extra, reload }: MapperBannerContext<IdpMapperExtra>) => {
    const status = extra?.status;
    const definitions = extra?.definitions ?? [];
    const missing = [...(status?.missingRequired ?? []), ...(status?.missingOptional ?? [])];

    // A client-assertion trust anchor brokers machines, not people: attribute
    // imports would never fire, so it is reported as not applicable.
    if (status && !status.userFacing) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/40">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('Machine trust anchor, not a user login')}</p>
            <p className="text-sm text-muted-foreground">
              {t('This provider federates signed client assertions rather than users, so user attribute imports do not apply to it.')}
            </p>
          </div>
        </div>
      );
    }

    if (status?.unsupported) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/40">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('No attribute mappers for this provider type')}</p>
            <p className="text-sm text-muted-foreground">
              {t('Keycloak offers no claim-to-attribute mapper for this provider, so nothing can be imported automatically.')}
            </p>
          </div>
        </div>
      );
    }

    if (status?.healthy && missing.length === 0) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100">{t('Claim mapping complete')}</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('Users brokered through this provider receive every attribute SMART launches depend on.')}
            </p>
          </div>
        </div>
      );
    }

    const requiredMissing = status?.missingRequired.length ?? 0;
    const definitionByName = new Map(definitions.map(definition => [definition.name, definition]));

    return (
      <div className={`flex flex-col gap-4 p-4 rounded-xl border ${
        requiredMissing > 0
          ? 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20'
          : 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 mt-0.5 ${requiredMissing > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {requiredMissing > 0
                ? t('Required attribute imports are missing')
                : t('Optional attribute imports are missing')}
            </p>
            <ul className="space-y-1">
              {missing.map((name) => {
                const definition = definitionByName.get(name);
                return (
                  <li key={name} className="text-sm text-muted-foreground">
                    <span className="font-mono text-foreground">{name}</span>
                    {definition && (
                      <>
                        {' — '}
                        {definition.description}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div>
          <LoadingButton
            loading={provisioning}
            loadingText={t('Provisioning...')}
            onClick={() => handleProvision(reload)}
          >
            <Wrench className="w-4 h-4 mr-2" />
            {t('Provision missing mappers')}
          </LoadingButton>
        </div>
      </div>
    );
  };

  return (
    <MapperManagerDialog<IdpMapperExtra>
      isOpen={isOpen}
      onClose={onClose}
      icon={Shuffle}
      title={t('Claim Mappers')}
      subtitle={`${t('Attribute imports for')} ${displayName ?? alias}`}
      load={load}
      create={create}
      remove={remove}
      renderBanner={renderBanner}
      detailLabel={t('Sync Mode')}
      hiddenProperties={HIDDEN_PROPERTIES}
      emptyDescription={t('Brokered users will only carry the standard claims Keycloak imports by default.')}
      renderFooterNote={({ extra }) => extra?.status?.attributeMapperType
        ? `${t('Attribute imports use')} ${extra.status.attributeMapperType}`
        : t('This provider supports no attribute-import mapper type.')}
      onChanged={onChanged}
    />
  );
}
