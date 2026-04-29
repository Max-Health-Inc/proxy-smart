import { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@proxy-smart/shared-ui';
import { Plus, Trash2, RefreshCw, Shield, Search, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartScopeResponse } from '@/lib/api-client';
import { useAuth } from '@/stores/authStore';

/** Categorize a scope name for display */
function getScopeCategory(name: string): { label: string; color: string } {
  if (['openid', 'profile', 'email', 'address', 'phone'].includes(name))
    return { label: 'OIDC', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' }
  if (name.startsWith('launch'))
    return { label: 'Launch', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' }
  if (['fhirUser', 'online_access', 'offline_access'].includes(name))
    return { label: 'SMART', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' }
  if (name.startsWith('patient/'))
    return { label: 'Patient', color: 'bg-green-500/10 text-green-700 dark:text-green-300' }
  if (name.startsWith('user/'))
    return { label: 'User', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
  if (name.startsWith('system/'))
    return { label: 'System', color: 'bg-red-500/10 text-red-700 dark:text-red-300' }
  if (name.startsWith('agent/'))
    return { label: 'Agent', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' }
  return { label: 'Other', color: 'bg-muted text-muted-foreground' }
}

export function RegisteredScopes({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const [scopes, setScopes] = useState<SmartScopeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newScopeName, setNewScopeName] = useState('');
  const [newScopeDescription, setNewScopeDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SmartScopeResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchScopes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientApis.admin.getAdminSmartScopes({ smartOnly: 'true' });
      setScopes(res.scopes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [clientApis]);

  useEffect(() => { fetchScopes(); }, [fetchScopes]);

  const handleCreate = async () => {
    if (!newScopeName.trim()) return;
    setCreating(true);
    try {
      await clientApis.admin.postAdminSmartScopes({
        createSmartScopeRequest: {
          name: newScopeName.trim(),
          description: newScopeDescription.trim() || undefined,
        },
      });
      setShowCreateDialog(false);
      setNewScopeName('');
      setNewScopeDescription('');
      await fetchScopes();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await clientApis.admin.deleteAdminSmartScopesByScopeId({ scopeId: deleteTarget.id });
      setDeleteTarget(null);
      await fetchScopes();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = scopes.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Group counts
  const counts = {
    total: scopes.length,
    fhir: scopes.filter(s => /^(patient|user|system|agent)\//.test(s.name)).length,
    launch: scopes.filter(s => s.name.startsWith('launch') || ['fhirUser', 'online_access', 'offline_access'].includes(s.name)).length,
    oidc: scopes.filter(s => ['openid', 'profile', 'email', 'address', 'phone'].includes(s.name)).length,
  };

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-6 space-y-6 bg-background min-h-full'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('Registered Scopes')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('Keycloak client scopes available for SMART apps')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchScopes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('Create Scope')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('Total'), value: counts.total, color: 'text-foreground' },
          { label: t('FHIR Resource'), value: counts.fhir, color: 'text-green-600 dark:text-green-400' },
          { label: t('SMART/Launch'), value: counts.launch, color: 'text-blue-600 dark:text-blue-400' },
          { label: t('OIDC'), value: counts.oidc, color: 'text-slate-600 dark:text-slate-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('Filter scopes...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold">{t('Scope Name')}</TableHead>
                  <TableHead className="font-semibold">{t('Category')}</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">{t('Description')}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {search ? t('No scopes match your filter') : t('No SMART scopes registered')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(scope => {
                    const cat = getScopeCategory(scope.name);
                    return (
                      <TableRow key={scope.id} className="border-border/50 hover:bg-muted/50">
                        <TableCell>
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {scope.name}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={cat.color}>{cat.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {scope.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(scope)}
                            title={t('Delete scope')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Create SMART Scope')}</DialogTitle>
            <DialogDescription>
              {t('Register a new SMART on FHIR scope in Keycloak. Use the format context/Resource.permissions (e.g. user/Claim.cud).')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Scope Name')}</label>
              <Input
                placeholder="e.g. user/Claim.cud"
                value={newScopeName}
                onChange={e => setNewScopeName(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Description')} ({t('optional')})</label>
              <Input
                placeholder={t('Human-readable description')}
                value={newScopeDescription}
                onChange={e => setNewScopeDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newScopeName.trim() || creating}>
              {creating ? t('Creating...') : t('Create Scope')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Scope')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this scope? It will be removed from all SMART apps that use it.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded block text-center">
              {deleteTarget?.name}
            </code>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('Deleting...') : t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
