import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Users,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Mail,
  CheckCircle,
  XCircle,
  ArrowDownUp,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Spinner } from '../ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type {
  AccessMember,
  AccessHealthResponseCapabilities,
  SyncResponse,
} from '../../lib/api-client';

interface MembersPanelProps {
  capabilities?: AccessHealthResponseCapabilities;
}

export function MembersPanel({ capabilities }: MembersPanelProps) {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Create member dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AccessMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync dialog
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  const canSync = capabilities?.sync ?? false;

  const fetchData = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setLoading(true);
      const response = await clientApis.admin.getAdminAccessControlMembers({ limit: 100 });
      setMembers(response.data);
      setTotalCount(response.pagination.count);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(t('Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMember = useCallback(async () => {
    if (!clientApis || !newMemberEmail.trim()) return;
    setCreating(true);
    try {
      await clientApis.admin.postAdminAccessControlMembers({
        createMemberRequest: {
          email: newMemberEmail.trim(),
          name: newMemberName.trim() || undefined,
        },
      });
      setShowCreateDialog(false);
      setNewMemberEmail('');
      setNewMemberName('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create member:', err);
    } finally {
      setCreating(false);
    }
  }, [clientApis, newMemberEmail, newMemberName, fetchData]);

  const handleDeleteMember = useCallback(async () => {
    if (!clientApis || !deleteTarget) return;
    setDeleting(true);
    try {
      await clientApis.admin.deleteAdminAccessControlMembersById({ id: deleteTarget.id });
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete member:', err);
    } finally {
      setDeleting(false);
    }
  }, [clientApis, deleteTarget, fetchData]);

  const handleSync = useCallback(async () => {
    if (!clientApis) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await clientApis.admin.postAdminAccessControlSync({
        syncRequest: {},
      });
      setSyncResult(result);
      await fetchData();
    } catch (err) {
      console.error('Failed to sync members:', err);
    } finally {
      setSyncing(false);
    }
  }, [clientApis, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
        <span className="ml-3 text-muted-foreground">{t('Loading members...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Retry')}
        </Button>
      </div>
    );
  }

  const filteredMembers = members.filter(member =>
    (member.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search, Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search members...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="default" size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Member')}
        </Button>
        {canSync && (
          <Button variant="outline" size="sm" onClick={() => { setSyncResult(null); setShowSyncDialog(true); }}>
            <ArrowDownUp className="h-4 w-4 mr-2" />
            {t('Sync from Keycloak')}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {t('{{count}} member(s)', { count: totalCount })}
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? t('No members match your search') : t('No members found. Add one or sync from Keycloak.')}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border/30">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {member.name || member.email.split('@')[0]}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status Badges */}
                  {member.enabled !== undefined && (
                    <Badge variant={member.enabled ? 'default' : 'secondary'} className="text-xs">
                      {member.enabled ? (
                        <><UserCheck className="h-3 w-3 mr-1" />{t('Enabled')}</>
                      ) : (
                        <><UserX className="h-3 w-3 mr-1" />{t('Disabled')}</>
                      )}
                    </Badge>
                  )}
                  {member.confirmed !== undefined && (
                    <Badge variant={member.confirmed ? 'outline' : 'secondary'} className="text-xs">
                      {member.confirmed ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />{t('Confirmed')}</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />{t('Pending')}</>
                      )}
                    </Badge>
                  )}
                  {member.groupIds && member.groupIds.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {t('{{count}} group(s)', { count: member.groupIds.length })}
                    </Badge>
                  )}

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(member)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Member Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Member')}</DialogTitle>
            <DialogDescription>{t('Register a new member for access control')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-email">{t('Email')}</Label>
              <Input
                id="member-email"
                type="email"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                placeholder={t('member@example.com')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-name">{t('Name')}</Label>
              <Input
                id="member-name"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder={t('Display name (optional)')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreateMember} disabled={!newMemberEmail.trim() || creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('Adding...')}</> : t('Add Member')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Remove Member')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to remove "{{name}}"? This action cannot be undone.', {
                name: deleteTarget?.name || deleteTarget?.email,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('Removing...')}</> : t('Remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Sync Members from Keycloak')}</DialogTitle>
            <DialogDescription>
              {t('This will sync Keycloak users to the access control provider. Existing members will be skipped.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {syncResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{t('Created: {{count}}', { count: syncResult.created.length })}</span>
                </div>
                {syncResult.created.length > 0 && (
                  <div className="pl-6 text-xs text-muted-foreground space-y-1">
                    {syncResult.created.map(email => <div key={email}>{email}</div>)}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDownUp className="h-4 w-4" />
                  <span>{t('Skipped: {{count}}', { count: syncResult.skipped.length })}</span>
                </div>
                {syncResult.failed.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{t('Failed: {{count}}', { count: syncResult.failed.length })}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('Click "Sync Now" to begin the synchronization process.')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              {syncResult ? t('Close') : t('Cancel')}
            </Button>
            {!syncResult && (
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('Syncing...')}</>
                ) : (
                  <><ArrowDownUp className="h-4 w-4 mr-2" />{t('Sync Now')}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
