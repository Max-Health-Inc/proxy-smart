import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  DoorOpen,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { Badge, Button, Input, Label } from '@max-health-inc/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import { SearchInput } from '../ui/search-input';
import { PageLoadingState } from '../ui/page-loading-state';
import { PageErrorState } from '../ui/page-error-state';
import { EmptyState } from '../ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type {
  AccessGroup,
  AccessGroupDoor,
  AccessDoor,
} from '../../lib/api-client';

export function GroupsPanel() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [groupDoors, setGroupDoors] = useState<AccessGroupDoor[]>([]);
  const [allDoors, setAllDoors] = useState<AccessDoor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Create group dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AccessGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign door dialog
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);
  const [assignDoorId, setAssignDoorId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setLoading(true);
      const [groupsResponse, doorsResponse, groupDoorsResponse] = await Promise.all([
        clientApis.admin.getAdminAccessControlGroups({ limit: 100 }),
        clientApis.admin.getAdminAccessControlDoors({ limit: 100 }),
        clientApis.admin.getAdminAccessControlGroupDoors({ limit: 500 }),
      ]);
      setGroups(groupsResponse.data);
      setAllDoors(doorsResponse.data);
      setGroupDoors(groupDoorsResponse.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError(t('Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    if (!clientApis) return;
    Promise.all([
      clientApis.admin.getAdminAccessControlGroups({ limit: 100 }),
      clientApis.admin.getAdminAccessControlDoors({ limit: 100 }),
      clientApis.admin.getAdminAccessControlGroupDoors({ limit: 500 }),
    ])
      .then(([groupsResponse, doorsResponse, groupDoorsResponse]) => {
        setGroups(groupsResponse.data);
        setAllDoors(doorsResponse.data);
        setGroupDoors(groupDoorsResponse.data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch groups:', err);
        setError(t('Failed to load groups'));
      })
      .finally(() => setLoading(false));
  }, [clientApis, t]);

  const handleCreateGroup = useCallback(async () => {
    if (!clientApis || !newGroupName.trim()) return;
    setCreating(true);
    try {
      await clientApis.admin.postAdminAccessControlGroups({
        createGroupRequest: {
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
        },
      });
      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  }, [clientApis, newGroupName, newGroupDescription, fetchData]);

  const handleDeleteGroup = useCallback(async () => {
    if (!clientApis || !deleteTarget) return;
    setDeleting(true);
    try {
      await clientApis.admin.deleteAdminAccessControlGroupsById({ id: deleteTarget.id });
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete group:', err);
    } finally {
      setDeleting(false);
    }
  }, [clientApis, deleteTarget, fetchData]);

  const handleAssignDoor = useCallback(async () => {
    if (!clientApis || !assignGroupId || !assignDoorId) return;
    setAssigning(true);
    try {
      await clientApis.admin.postAdminAccessControlGroupDoors({
        assignDoorRequest: {
          groupId: assignGroupId,
          doorId: assignDoorId,
        },
      });
      setAssignGroupId(null);
      setAssignDoorId('');
      await fetchData();
    } catch (err) {
      console.error('Failed to assign door:', err);
    } finally {
      setAssigning(false);
    }
  }, [clientApis, assignGroupId, assignDoorId, fetchData]);

  const handleRemoveDoorFromGroup = useCallback(async (assignmentId: string) => {
    if (!clientApis) return;
    try {
      await clientApis.admin.deleteAdminAccessControlGroupDoorsById({ id: assignmentId });
      await fetchData();
    } catch (err) {
      console.error('Failed to remove door from group:', err);
    }
  }, [clientApis, fetchData]);

  const getDoorName = useCallback((doorId: string) => {
    const door = allDoors.find(d => d.id === doorId);
    return door?.name ?? doorId;
  }, [allDoors]);

  const getGroupDoors = useCallback((groupId: string) => {
    return groupDoors.filter(gd => gd.groupId === groupId);
  }, [groupDoors]);

  // Doors not yet assigned to the group
  const getAvailableDoors = useCallback((groupId: string) => {
    const assignedDoorIds = new Set(getGroupDoors(groupId).map(gd => gd.doorId));
    return allDoors.filter(d => !assignedDoorIds.has(d.id));
  }, [allDoors, getGroupDoors]);

  if (loading) {
    return <PageLoadingState message={t('Loading groups...')} />;
  }

  if (error) {
    return (
      <PageErrorState
        title={error}
        onRetry={fetchData}
        retryLabel={t('Retry')}
      />
    );
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search, Create, Refresh */}
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder={t('Search groups...')}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <Button variant="default" size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('Create Group')}
        </Button>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {t('{{count}} group(s)', { count: filteredGroups.length })}
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={searchQuery ? t('No groups match your search') : t('No groups found. Create one to get started.')}
        />
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const isExpanded = expandedGroup === group.id;
            const doors = getGroupDoors(group.id);
            return (
              <div key={group.id} className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <Layers className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-muted-foreground truncate">{group.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      <DoorOpen className="h-3 w-3 mr-1" />
                      {t('{{count}} door(s)', { count: doors.length })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(group); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: Door Assignments */}
                {isExpanded && (
                  <div className="border-t border-border/30 px-4 py-3 bg-muted/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">{t('Assigned Doors')}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setAssignGroupId(group.id); setAssignDoorId(''); }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('Assign Door')}
                      </Button>
                    </div>
                    {doors.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">{t('No doors assigned to this group')}</p>
                    ) : (
                      <div className="space-y-1">
                        {doors.map(gd => (
                          <div key={gd.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/20">
                            <div className="flex items-center gap-2">
                              <DoorOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{getDoorName(gd.doorId)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDoorFromGroup(gd.id)}
                              className="text-destructive hover:text-destructive h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Create Group')}</DialogTitle>
            <DialogDescription>{t('Create a new door group')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">{t('Name')}</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder={t('Group name')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">{t('Description')}</Label>
              <Input
                id="group-description"
                value={newGroupDescription}
                onChange={e => setNewGroupDescription(e.target.value)}
                placeholder={t('Optional description')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('Cancel')}</Button>
            <LoadingButton onClick={handleCreateGroup} disabled={!newGroupName.trim()} loading={creating} loadingText={t('Creating...')}>
              {t('Create')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Group')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', { name: deleteTarget?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('Cancel')}</Button>
            <LoadingButton variant="destructive" onClick={handleDeleteGroup} loading={deleting} loadingText={t('Deleting...')}>
              {t('Delete')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Door Dialog */}
      <Dialog open={!!assignGroupId} onOpenChange={() => setAssignGroupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Assign Door to Group')}</DialogTitle>
            <DialogDescription>{t('Select a door to add to this group')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {assignGroupId && getAvailableDoors(assignGroupId).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('All doors are already assigned to this group')}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignGroupId && getAvailableDoors(assignGroupId).map(door => (
                  <div
                    key={door.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      assignDoorId === door.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/30 hover:bg-muted/20'
                    }`}
                    onClick={() => setAssignDoorId(door.id)}
                  >
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{door.name}</span>
                    </div>
                    <Badge variant={door.online ? 'default' : 'secondary'} className="text-xs">
                      {door.online ? t('Online') : t('Offline')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignGroupId(null)}>{t('Cancel')}</Button>
            <LoadingButton onClick={handleAssignDoor} disabled={!assignDoorId} loading={assigning} loadingText={t('Assigning...')}>
              {t('Assign')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
