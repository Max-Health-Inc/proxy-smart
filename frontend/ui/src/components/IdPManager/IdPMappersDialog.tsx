// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@proxy-smart/shared-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle, ArrowRight, CheckCircle, Info, Plus, Shuffle, Trash2, Wrench } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslation } from 'react-i18next';
import type {
  IdentityProviderMapperDefinition,
  IdentityProviderMapperResponse,
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

interface NewMapperState {
  name: string;
  type: string;
  config: Record<string, string>;
}

const emptyMapper: NewMapperState = { name: '', type: '', config: {} };

/** Properties Keycloak fills in itself — never rendered as inputs */
const HIDDEN_PROPERTIES = new Set(['syncMode']);

interface MapperDialogState {
  status: IdentityProviderMapperStatus | null;
  definitions: IdentityProviderMapperDefinition[];
  mapperTypes: IdentityProviderMapperTypeResponse[];
}

/**
 * Fetch everything the dialog renders. Mapper types are best-effort: a
 * provider Keycloak cannot enumerate types for still shows its mappers.
 */
async function fetchMapperState(
  api: NonNullable<ReturnType<typeof useAuth>['clientApis']['identityProviders']>,
  alias: string,
): Promise<MapperDialogState> {
  const [statusResponse, mapperTypes] = await Promise.all([
    api.getAdminIdpsByAliasMapperStatus({ alias }),
    api.getAdminIdpsByAliasMapperTypes({ alias }).catch(() => [] as IdentityProviderMapperTypeResponse[]),
  ]);

  return {
    status: statusResponse.status[0] ?? null,
    definitions: statusResponse.definitions,
    mapperTypes,
  };
}

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

  const [status, setStatus] = useState<IdentityProviderMapperStatus | null>(null);
  const [definitions, setDefinitions] = useState<IdentityProviderMapperDefinition[]>([]);
  const [mapperTypes, setMapperTypes] = useState<IdentityProviderMapperTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapper, setNewMapper] = useState<NewMapperState>(emptyMapper);

  const idpApi = clientApis.identityProviders;

  const applyState = useCallback((state: MapperDialogState | null) => {
    setStatus(state?.status ?? null);
    setDefinitions(state?.definitions ?? []);
    setMapperTypes(state?.mapperTypes ?? []);
  }, []);

  // Starts with `loading` true from mount; refetches keep the current rows
  // visible while the individual actions show their own progress.
  const reload = useCallback(() => {
    if (!idpApi || !alias) return Promise.resolve();
    return fetchMapperState(idpApi, alias)
      .then(applyState)
      .catch(() => {
        applyState(null);
        notify({ type: 'error', message: t('Failed to load identity provider mappers.') });
      });
  }, [idpApi, alias, applyState, notify, t]);

  // The parent mounts this dialog per provider, so form state starts clean and
  // only the remote state needs loading here.
  useEffect(() => {
    if (!isOpen || !idpApi || !alias) return;
    let cancelled = false;

    fetchMapperState(idpApi, alias)
      .then((state) => {
        if (cancelled) return;
        applyState(state);
      })
      .catch(() => {
        if (cancelled) return;
        applyState(null);
        notify({ type: 'error', message: t('Failed to load identity provider mappers.') });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, idpApi, alias, applyState, notify, t]);

  const selectedType = useMemo(
    () => mapperTypes.find((type) => type.id === newMapper.type),
    [mapperTypes, newMapper.type],
  );

  const definitionByName = useMemo(
    () => new Map(definitions.map((definition) => [definition.name, definition])),
    [definitions],
  );

  const missing = useMemo(
    () => [...(status?.missingRequired ?? []), ...(status?.missingOptional ?? [])],
    [status],
  );

  const handleProvision = async () => {
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

  const handleCreate = async () => {
    if (!idpApi || !newMapper.name || !newMapper.type) return;
    setCreating(true);
    try {
      await idpApi.postAdminIdpsByAliasMappers({
        alias,
        createIdentityProviderMapperRequest: {
          name: newMapper.name,
          identityProviderMapper: newMapper.type,
          config: newMapper.config,
        },
      });
      notify({ type: 'success', message: t('Mapper created.') });
      setNewMapper(emptyMapper);
      setShowAddForm(false);
      await reload();
      onChanged?.();
    } catch {
      notify({ type: 'error', message: t('Failed to create mapper.') });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (mapper: IdentityProviderMapperResponse) => {
    if (!idpApi || !mapper.id) return;
    try {
      await idpApi.deleteAdminIdpsByAliasMappersByMapperId({ alias, mapperId: mapper.id });
      notify({ type: 'success', message: t('Mapper deleted.') });
      await reload();
      onChanged?.();
    } catch {
      notify({ type: 'error', message: t('Failed to delete mapper.') });
    }
  };

  const renderStatusBanner = () => {
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
          <LoadingButton loading={provisioning} loadingText={t('Provisioning...')} onClick={handleProvision}>
            <Wrench className="w-4 h-4 mr-2" />
            {t('Provision missing mappers')}
          </LoadingButton>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Shuffle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Claim Mappers')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {t('Attribute imports for')} {displayName ?? alias}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {renderStatusBanner()}

            <div className="rounded-xl border border-border/50 bg-card/70 overflow-x-auto">
              {status && status.mappers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/70 border-b border-border/50">
                      <TableHead className="font-semibold text-foreground">{t('Mapper')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('Mapping')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('Sync Mode')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('Type')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.mappers.map((mapper) => (
                      <TableRow key={mapper.id ?? mapper.name} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="py-3 font-medium text-foreground">{mapper.name}</TableCell>
                        <TableCell className="py-3">
                          {mapper.externalName || mapper.userAttribute ? (
                            <span className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                              {mapper.externalName ?? '—'}
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-foreground">{mapper.userAttribute ?? '—'}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('No attribute mapping')}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">{mapper.syncMode ?? '—'}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="font-mono text-xs">{mapper.identityProviderMapper}</Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(mapper)}
                            disabled={!mapper.id}
                            title={t('Delete mapper')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Shuffle}
                  title={t('No mappers configured')}
                  description={t('Brokered users will only carry the standard claims Keycloak imports by default.')}
                />
              )}
            </div>

            {showAddForm ? (
              <div className="space-y-4 p-6 rounded-xl border border-border/50 bg-card/70">
                <h4 className="text-lg font-semibold text-foreground">{t('Add Mapper')}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mapper-name" className="text-sm font-semibold text-foreground">{t('Name')}</Label>
                    <Input
                      id="mapper-name"
                      value={newMapper.name}
                      placeholder="e.g. npi-import"
                      onChange={(event) => setNewMapper((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">{t('Mapper Type')}</Label>
                    <Select
                      value={newMapper.type}
                      onValueChange={(value) => setNewMapper({ name: newMapper.name, type: value, config: {} })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select a mapper type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {mapperTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name ?? type.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedType?.helpText && (
                  <p className="text-sm text-muted-foreground">{selectedType.helpText}</p>
                )}

                {selectedType && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedType.properties
                      .filter((property) => !HIDDEN_PROPERTIES.has(property.name))
                      .map((property) => (
                        <div key={property.name} className="space-y-2">
                          <Label htmlFor={`prop-${property.name}`} className="text-sm font-semibold text-foreground">
                            {property.label ?? property.name}
                            {property.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {property.options && property.options.length > 0 ? (
                            <Select
                              value={newMapper.config[property.name] ?? ''}
                              onValueChange={(value) =>
                                setNewMapper((prev) => ({ ...prev, config: { ...prev.config, [property.name]: value } }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={property.defaultValue ?? t('Select a value')} />
                              </SelectTrigger>
                              <SelectContent>
                                {property.options.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`prop-${property.name}`}
                              value={newMapper.config[property.name] ?? ''}
                              placeholder={property.defaultValue ?? property.name}
                              onChange={(event) =>
                                setNewMapper((prev) => ({
                                  ...prev,
                                  config: { ...prev.config, [property.name]: event.target.value },
                                }))
                              }
                            />
                          )}
                          {property.helpText && (
                            <p className="text-xs text-muted-foreground">{property.helpText}</p>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setShowAddForm(false); setNewMapper(emptyMapper); }}>
                    {t('Cancel')}
                  </Button>
                  <LoadingButton
                    loading={creating}
                    loadingText={t('Creating...')}
                    onClick={handleCreate}
                    disabled={!newMapper.name || !newMapper.type}
                  >
                    {t('Create Mapper')}
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {status?.attributeMapperType
                    ? `${t('Attribute imports use')} ${status.attributeMapperType}`
                    : t('This provider supports no attribute-import mapper type.')}
                </p>
                <Button variant="outline" onClick={() => setShowAddForm(true)} disabled={mapperTypes.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Add Mapper')}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-6">
          <Button onClick={onClose} variant="outline" className="px-8">
            {t('Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
