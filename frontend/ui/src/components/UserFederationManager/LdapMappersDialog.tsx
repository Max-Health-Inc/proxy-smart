// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useCallback } from 'react';
import { AlertCircle, CheckCircle, Database } from 'lucide-react';
import {
  MapperManagerDialog,
  type MapperBannerContext,
  type MapperCreateInput,
  type MapperDialogData,
  type MapperRow,
} from '@/components/mappers/MapperManagerDialog';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import type { UserFederationMapperTypeResponse } from '@/lib/api-client';

interface LdapMappersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Component ID of the LDAP federation provider */
  providerId: string;
  providerName?: string;
  /** Called after any change so the parent can refresh its overview */
  onChanged?: () => void;
}

/**
 * The Keycloak user attribute a SMART launch cannot do without. Unlike an IdP
 * claim, the directory attribute it comes from is deployment-specific, so this
 * dialog reports the gap instead of guessing a source attribute.
 */
const SMART_USER_ATTRIBUTE = 'fhirUser';

/** Config keys the LDAP mapper types use for source and target */
const SOURCE_KEYS = ['ldap.attribute', 'group.name.ldap.attribute', 'role.name.ldap.attribute'];
const TARGET_KEYS = ['user.model.attribute', 'groups.path', 'roles.dn', 'groups.dn'];

type UserFederationApi = NonNullable<ReturnType<typeof useAuth>['clientApis']['userFederation']>;

const firstOf = (config: Record<string, string>, keys: string[]): string | undefined =>
  keys.map(key => config[key]).find(value => !!value);

/**
 * LDAP mapper management for a user federation provider.
 *
 * LDAP mappers decide which directory attributes reach the Keycloak user, so
 * they are the federation counterpart to an identity provider's claim mappers.
 */
export function LdapMappersDialog({ isOpen, onClose, providerId, providerName, onChanged }: LdapMappersDialogProps) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();

  const federationApi = clientApis.userFederation as UserFederationApi | undefined;

  const load = useCallback(async (): Promise<MapperDialogData> => {
    if (!federationApi) return { mappers: [], types: [] };

    // Mapper types are best-effort: a provider Keycloak cannot enumerate
    // sub-component types for still shows the mappers it already has.
    const [mappers, types] = await Promise.all([
      federationApi.getAdminUserFederationByIdMappers({ id: providerId }),
      federationApi.getAdminUserFederationByIdMapperTypes({ id: providerId })
        .catch(() => [] as UserFederationMapperTypeResponse[]),
    ]);

    return {
      mappers: mappers.map(mapper => {
        const config = (mapper.config ?? {}) as Record<string, string>;
        return {
          id: mapper.id,
          name: mapper.name ?? '',
          typeId: mapper.providerId ?? '',
          source: firstOf(config, SOURCE_KEYS),
          target: firstOf(config, TARGET_KEYS),
          detail: config['read.only'] === 'true' ? t('Read-only') : undefined,
        };
      }),
      types: types.map(type => ({
        id: type.id,
        name: type.id,
        helpText: type.helpText,
        properties: type.properties,
      })),
    };
  }, [federationApi, providerId, t]);

  const create = useCallback(async ({ name, typeId, config }: MapperCreateInput) => {
    if (!federationApi) return;
    await federationApi.postAdminUserFederationByIdMappers({
      id: providerId,
      createUserFederationMapperRequest: { name, providerId: typeId, config },
    });
  }, [federationApi, providerId]);

  const remove = useCallback(async (mapper: MapperRow) => {
    if (!federationApi || !mapper.id) return;
    await federationApi.deleteAdminUserFederationByIdMappersByMapperId({ id: providerId, mapperId: mapper.id });
  }, [federationApi, providerId]);

  const renderBanner = ({ mappers }: MapperBannerContext<undefined>) => {
    const importsFhirUser = mappers.some(mapper => mapper.target === SMART_USER_ATTRIBUTE);

    if (importsFhirUser) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100">{t('Directory users carry fhirUser')}</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('A mapper writes the fhirUser attribute, so imported users resolve to a FHIR resource.')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{t('No mapper writes fhirUser')}</p>
          <p className="text-sm text-muted-foreground">
            {t('Users imported from this directory will not resolve to a FHIR resource in SMART launches. Add a user-attribute mapper whose user model attribute is fhirUser, reading whichever LDAP attribute your directory stores it in.')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <MapperManagerDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={Database}
      title={t('LDAP Mappers')}
      subtitle={`${t('Attribute mappings for')} ${providerName ?? providerId}`}
      load={load}
      create={create}
      remove={remove}
      renderBanner={renderBanner}
      emptyDescription={t('Imported users will only carry the attributes Keycloak maps by default.')}
      renderFooterNote={() => t('Mapper types come from Keycloak and differ per LDAP vendor.')}
      onChanged={onChanged}
    />
  );
}
