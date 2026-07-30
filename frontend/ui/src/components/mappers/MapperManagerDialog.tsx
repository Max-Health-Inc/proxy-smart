// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { ArrowRight, Plus, Shuffle, Trash2, type LucideIcon } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslation } from 'react-i18next';

/**
 * Mapper management shared by identity providers and LDAP federation.
 *
 * Both Keycloak surfaces answer the same question -- which external value ends
 * up on which Keycloak user attribute -- and both describe their mapper types
 * through the same property metadata, so the table, the type-driven add form
 * and the delete flow live here. Callers supply an adapter for their endpoints
 * and whatever status banner their surface can meaningfully show.
 */

export interface MapperRow {
  id?: string;
  name: string;
  /** Keycloak mapper type id (identityProviderMapper / component providerId) */
  typeId: string;
  /** External value the mapper reads (claim, assertion attribute, LDAP attribute) */
  source?: string;
  /** Keycloak user attribute the mapper writes */
  target?: string;
  /** Surface-specific extra column (sync mode, read-only, ...) */
  detail?: string;
}

export interface MapperTypeProperty {
  name: string;
  label?: string;
  helpText?: string;
  defaultValue?: string;
  options?: string[];
  required?: boolean;
}

export interface MapperTypeOption {
  id: string;
  name?: string;
  helpText?: string;
  properties: MapperTypeProperty[];
}

export interface MapperDialogData<TExtra = undefined> {
  mappers: MapperRow[];
  types: MapperTypeOption[];
  /** Surface-specific payload handed back to renderBanner */
  extra?: TExtra;
}

export interface MapperCreateInput {
  name: string;
  typeId: string;
  config: Record<string, string>;
}

export interface MapperBannerContext<TExtra> {
  extra: TExtra | undefined;
  mappers: MapperRow[];
  /** Refetch after the banner performs an action */
  reload: () => Promise<void>;
}

interface MapperManagerDialogProps<TExtra> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  load: () => Promise<MapperDialogData<TExtra>>;
  create: (input: MapperCreateInput) => Promise<void>;
  remove: (mapper: MapperRow) => Promise<void>;
  /** Status or advisory shown above the table */
  renderBanner?: (context: MapperBannerContext<TExtra>) => ReactNode;
  /** Column header for MapperRow.detail; the column is hidden when omitted */
  detailLabel?: string;
  /** Config keys the caller fills in itself, never rendered as inputs */
  hiddenProperties?: string[];
  /** Shown under the empty state, explains the consequence of having no mappers */
  emptyDescription?: string;
  /** Shown next to the add button, e.g. which mapper type is used for imports */
  renderFooterNote?: (context: MapperBannerContext<TExtra>) => ReactNode;
  /** Called after any mutation so the parent can refresh its own overview */
  onChanged?: () => void;
}

interface NewMapperState {
  name: string;
  typeId: string;
  config: Record<string, string>;
}

const emptyMapper: NewMapperState = { name: '', typeId: '', config: {} };

export function MapperManagerDialog<TExtra = undefined>({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon = Shuffle,
  load,
  create,
  remove,
  renderBanner,
  detailLabel,
  hiddenProperties = [],
  emptyDescription,
  renderFooterNote,
  onChanged,
}: MapperManagerDialogProps<TExtra>) {
  const { t } = useTranslation();
  const { notify } = useNotificationStore();

  const [data, setData] = useState<MapperDialogData<TExtra>>({ mappers: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapper, setNewMapper] = useState<NewMapperState>(emptyMapper);

  const failedToLoad = t('Failed to load mappers.');

  // Starts with `loading` true from mount; refetches keep the current rows
  // visible while the individual actions show their own progress.
  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch {
      setData({ mappers: [], types: [] });
      notify({ type: 'error', message: failedToLoad });
    }
  }, [load, notify, failedToLoad]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    load()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        setData({ mappers: [], types: [] });
        notify({ type: 'error', message: failedToLoad });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, load, notify, failedToLoad]);

  const selectedType = useMemo(
    () => data.types.find((type) => type.id === newMapper.typeId),
    [data.types, newMapper.typeId],
  );

  const hidden = useMemo(() => new Set(hiddenProperties), [hiddenProperties]);

  const bannerContext: MapperBannerContext<TExtra> = { extra: data.extra, mappers: data.mappers, reload };

  const handleCreate = async () => {
    if (!newMapper.name || !newMapper.typeId) return;
    setCreating(true);
    try {
      await create({ name: newMapper.name, typeId: newMapper.typeId, config: newMapper.config });
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

  const handleDelete = async (mapper: MapperRow) => {
    try {
      await remove(mapper);
      notify({ type: 'success', message: t('Mapper deleted.') });
      await reload();
      onChanged?.();
    } catch {
      notify({ type: 'error', message: t('Failed to delete mapper.') });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {subtitle}
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
            {renderBanner?.(bannerContext)}

            <div className="rounded-xl border border-border/50 bg-card/70 overflow-x-auto">
              {data.mappers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/70 border-b border-border/50">
                      <TableHead className="font-semibold text-foreground">{t('Mapper')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('Mapping')}</TableHead>
                      {detailLabel && (
                        <TableHead className="font-semibold text-foreground">{detailLabel}</TableHead>
                      )}
                      <TableHead className="font-semibold text-foreground">{t('Type')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.mappers.map((mapper) => (
                      <TableRow key={mapper.id ?? mapper.name} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="py-3 font-medium text-foreground">{mapper.name}</TableCell>
                        <TableCell className="py-3">
                          {mapper.source || mapper.target ? (
                            <span className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                              {mapper.source ?? '—'}
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-foreground">{mapper.target ?? '—'}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('No attribute mapping')}</span>
                          )}
                        </TableCell>
                        {detailLabel && (
                          <TableCell className="py-3 text-sm text-muted-foreground">{mapper.detail ?? '—'}</TableCell>
                        )}
                        <TableCell className="py-3">
                          <Badge variant="secondary" className="font-mono text-xs">{mapper.typeId}</Badge>
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
                  description={emptyDescription}
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
                      value={newMapper.typeId}
                      onValueChange={(value) => setNewMapper({ name: newMapper.name, typeId: value, config: {} })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select a mapper type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {data.types.map((type) => (
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
                      .filter((property) => !hidden.has(property.name))
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
                    disabled={!newMapper.name || !newMapper.typeId}
                  >
                    {t('Create Mapper')}
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">{renderFooterNote?.(bannerContext)}</p>
                <Button variant="outline" onClick={() => setShowAddForm(true)} disabled={data.types.length === 0}>
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
