import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
  Switch,
  Textarea,
} from '@proxy-smart/shared-ui';
import {
  Plus,
  ShieldCheck,
  Info,
  Pencil,
  Trash2,
  KeyRound,
  Wrench,
  Users as UsersIcon,
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/authStore';
import { config } from '@/config';
import { getStoredToken } from '@/lib/apiClient';
import type { RoleResponse, ScopeSet } from '@/lib/api-client';

const NONE_SCOPE_SET = '__none__';

/**
 * Roles administration.
 *
 * IMPORTANT: roles here carry DESCRIPTIVE metadata only. A role may reference a
 * scope set as a human-readable LABEL of the "typical scopes it represents". That
 * link is never an access grant. FHIR/MCP access enforcement stays scope-based and
 * is untouched by anything on this page.
 */
export function RolesManager() {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [scopeSets, setScopeSets] = useState<ScopeSet[]>([]);
  const [roleUserCounts, setRoleUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showTechnical, setShowTechnical] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; representedScopeSetId: string }>({
    name: '',
    description: '',
    representedScopeSetId: NONE_SCOPE_SET,
  });

  /* ─── Data ─────────────────────────────────────────────────────── */

  const loadRoles = useCallback(async (includeTechnical: boolean): Promise<RoleResponse[]> => {
    // The generated client does not surface the ?includeTechnical query param, so
    // when we need the technical roles we fetch directly (mirrors fetchClientRoles
    // in HealthcareUsersManager). The default getAdminRoles() already hides them.
    if (!includeTechnical) {
      return clientApis.roles.getAdminRoles();
    }
    const token = await getStoredToken();
    const res = await fetch(`${config.api.baseUrl}/admin/roles/?includeTechnical=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return clientApis.roles.getAdminRoles();
    return (await res.json()) as RoleResponse[];
  }, [clientApis.roles]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    Promise.all([
      loadRoles(showTechnical).catch(() => [] as RoleResponse[]),
      clientApis.scopeSets.getAdminScopeSets().then(r => r?.scopeSets ?? []).catch(() => [] as ScopeSet[]),
      clientApis.healthcareUsers.getAdminHealthcareUsers().catch(() => []),
    ])
      .then(([fetchedRoles, fetchedScopeSets, users]) => {
        if (cancelled) return;
        setRoles(fetchedRoles);
        setScopeSets(fetchedScopeSets);

        // "Who has this role" counts, derived from a single users fetch.
        const counts: Record<string, number> = {};
        for (const user of users) {
          const assigned = new Set<string>([
            ...((user.realmRoles as string[] | undefined) ?? []),
            ...(((user.clientRoles as Record<string, string[]> | undefined)?.['admin-ui']) ?? []),
          ]);
          for (const roleName of assigned) {
            counts[roleName] = (counts[roleName] ?? 0) + 1;
          }
        }
        setRoleUserCounts(counts);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isAuthenticated, showTechnical, loadRoles, clientApis.scopeSets, clientApis.healthcareUsers]);

  const refreshRoles = useCallback(async () => {
    const fetched = await loadRoles(showTechnical).catch(() => [] as RoleResponse[]);
    setRoles(fetched);
  }, [loadRoles, showTechnical]);

  /* ─── Handlers ─────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', representedScopeSetId: NONE_SCOPE_SET });
    setDialogOpen(true);
  };

  const openEdit = (role: RoleResponse) => {
    setEditingRole(role);
    setForm({
      name: role.name ?? '',
      description: role.description ?? '',
      representedScopeSetId: role.representedScopeSetId ?? NONE_SCOPE_SET,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const scopeSetId = form.representedScopeSetId === NONE_SCOPE_SET ? '' : form.representedScopeSetId;
    setSubmitting(true);
    try {
      if (editingRole?.name) {
        await clientApis.roles.putAdminRolesByRoleName({
          roleName: editingRole.name,
          updateRoleRequest: {
            description: form.description,
            // Empty string clears the descriptive link on the backend.
            representedScopeSetId: scopeSetId,
          },
        });
      } else {
        await clientApis.roles.postAdminRoles({
          createRoleRequest: {
            name: form.name.trim(),
            description: form.description || undefined,
            representedScopeSetId: scopeSetId || undefined,
          },
        });
      }
      await refreshRoles();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save role:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleResponse) => {
    if (!role.name || role.isTechnical) return;
    if (!window.confirm(t('Delete role "{{name}}"? This cannot be undone.').replace('{{name}}', role.name))) {
      return;
    }
    try {
      await clientApis.roles.deleteAdminRolesByRoleName({ roleName: role.name });
      await refreshRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  /* ─── Render ───────────────────────────────────────────────────── */

  const visibleRoles = showTechnical ? roles : roles.filter(r => !r.isTechnical);
  const technicalCount = roles.filter(r => r.isTechnical).length;
  const linkedCount = roles.filter(r => (r.representedScopes?.length ?? 0) > 0).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {t('Role Management')}
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              {t('Define roles and the typical scopes they represent')}
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            {t('Create Role')}
          </Button>
        </div>
      </div>

      {/* Helper line: roles are admin-console access + clinical-intent labels, not enforced FHIR access. */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('Roles control access to this admin console and act as labels for clinical intent. The scopes shown below are the typical scopes a role represents; they are descriptive only and are not enforced as FHIR data access.')}
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={ShieldCheck}
          label={t('Roles')}
          value={visibleRoles.length}
          subtitle={t('Visible roles')}
          color="primary"
        />
        <StatCard
          icon={KeyRound}
          label={t('With Typical Scopes')}
          value={linkedCount}
          subtitle={t('Linked to a scope set or scopes')}
          color="green"
        />
        <StatCard
          icon={Wrench}
          label={t('Technical Roles')}
          value={technicalCount}
          subtitle={t('Plumbing, hidden by default')}
          color="orange"
        />
      </div>

      {/* Show-technical toggle */}
      <div className="flex items-center justify-end gap-3">
        <Label htmlFor="show-technical" className="text-sm text-muted-foreground">
          {t('Show technical roles')}
        </Label>
        <Switch id="show-technical" checked={showTechnical} onCheckedChange={setShowTechnical} />
      </div>

      {/* Roles list */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t('Loading roles...')}</div>
        ) : visibleRoles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t('No roles found')}</div>
        ) : (
          <ul className="divide-y divide-border/50">
            {visibleRoles.map((role) => {
              const scopes = role.representedScopes ?? [];
              const userCount = role.name ? (roleUserCounts[role.name] ?? 0) : 0;
              return (
                <li key={role.id ?? role.name} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{role.name}</span>
                        {role.isTechnical && (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                            <Wrench className="w-3 h-3 mr-1" />
                            {t('Technical')}
                          </Badge>
                        )}
                        {role.composite && (
                          <Badge variant="outline" className="text-xs">{t('Composite')}</Badge>
                        )}
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          <UsersIcon className="w-3 h-3 mr-1" />
                          {t('{{count}} users').replace('{{count}}', String(userCount))}
                        </Badge>
                      </div>

                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      )}

                      <div className="mt-2">
                        {scopes.length > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">
                              {t('Typical scopes for this role')}
                              {role.representedScopeSetName ? ` (${role.representedScopeSetName})` : ''}:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scopes.map((scope) => (
                                <Badge key={scope} variant="outline" className="text-xs font-mono">
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">{t('No typical scopes set')}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(role)} title={t('Edit role')}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!role.isTechnical && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(role)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('Delete role')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {editingRole ? t('Edit Role') : t('Create Role')}
            </DialogTitle>
            <DialogDescription>
              {t('Set a description and the scope set whose scopes this role typically represents. This is a label only and does not grant access.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">{t('Role name')}</Label>
              <Input
                id="role-name"
                placeholder="e.g., practitioner"
                value={form.name}
                disabled={!!editingRole}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {editingRole && (
                <p className="text-xs text-muted-foreground">{t('Role name cannot be changed')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">{t('Description')}</Label>
              <Textarea
                id="role-description"
                placeholder={t('What is this role for?')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-scope-set">{t('Represented scope set')}</Label>
              <Select
                value={form.representedScopeSetId}
                onValueChange={(value) => setForm({ ...form, representedScopeSetId: value })}
              >
                <SelectTrigger id="role-scope-set">
                  <SelectValue placeholder={t('Select a scope set...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SCOPE_SET}>{t('None')}</SelectItem>
                  {scopeSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('Descriptive label of the typical scopes this role represents. Not enforced.')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <LoadingButton
              onClick={handleSubmit}
              loading={submitting}
              loadingText={editingRole ? t('Saving...') : t('Creating...')}
              disabled={!editingRole && !form.name.trim()}
            >
              {editingRole ? t('Save') : t('Create Role')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
