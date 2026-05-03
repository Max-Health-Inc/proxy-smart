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
} from '@max-health-inc/shared-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, UserPlus, Trash2, Search, Loader2, X } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Organization,
  OrganizationMember,
  HealthcareUser,
} from '@/lib/api-client';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

interface OrgMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  org: Organization | null;
}

export function OrgMembersDialog({ isOpen, onClose, org }: OrgMembersDialogProps) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User picker state
  const [allUsers, setAllUsers] = useState<HealthcareUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<HealthcareUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMembers = useCallback(async () => {
    if (!org?.id || !clientApis.organizations) return;
    setLoading(true);
    setError(null);
    try {
      const result = await clientApis.organizations.getAdminOrganizationsByOrgIdMembers({
        orgId: org.id,
        limit: 100,
      });
      setMembers(result);
    } catch (err) {
      console.error('Failed to load members:', err);
      setError(t('Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [org, clientApis, t]);

  useEffect(() => {
    if (!isOpen || !org?.id) return;

    if (clientApis.organizations) {
      clientApis.organizations.getAdminOrganizationsByOrgIdMembers({
        orgId: org.id,
        limit: 100,
      })
        .then(result => {
          setMembers(result);
          setError(null);
        })
        .catch(err => {
          console.error('Failed to load members:', err);
          setError(t('Failed to load members'));
        })
        .finally(() => setLoading(false));
    }

    if (clientApis.healthcareUsers && !usersLoaded) {
      clientApis.healthcareUsers.getAdminHealthcareUsers({ limit: 500 })
        .then(users => {
          setAllUsers(users);
          setUsersLoaded(true);
        })
        .catch(err => console.error('Failed to load healthcare users:', err));
    }
  }, [isOpen, org?.id, clientApis.organizations, clientApis.healthcareUsers, usersLoaded, t]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const memberIds = new Set(members.map((m) => m.id));

  const filteredUsers = allUsers.filter((u) => {
    if (memberIds.has(u.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  const handleSelectUser = (user: HealthcareUser) => {
    setSelectedUser(user);
    setSearchQuery(`${user.username} (${user.firstName ?? ''} ${user.lastName ?? ''})`);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleAddMember = async () => {
    if (!selectedUser || !org?.id || !clientApis.organizations) return;
    setAdding(true);
    setError(null);
    try {
      await clientApis.organizations.postAdminOrganizationsByOrgIdMembers({
        orgId: org.id,
        addMemberRequest: { userId: selectedUser.id },
      });
      clearSelection();
      await loadMembers();
    } catch (err) {
      console.error('Failed to add member:', err);
      setError(t('Failed to add member.'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!org?.id || !clientApis.organizations) return;
    setError(null);
    try {
      await clientApis.organizations.deleteAdminOrganizationsByOrgIdMembersByUserId({
        orgId: org.id,
        userId,
      });
      await loadMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(t('Failed to remove member'));
    }
  };

  if (!org) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Organization Members')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {t('Manage members for')} {org.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-70 text-xs">{t('Dismiss')}</button>
          </div>
        )}

        <div className="space-y-4">
          {/* User search picker */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={inputRef}
                  placeholder={t('Search users by name, email, or username...')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => !selectedUser && setShowDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedUser) {
                      e.preventDefault();
                      handleAddMember();
                    }
                    if (e.key === 'Escape') setShowDropdown(false);
                  }}
                  className="rounded-xl border-border/50 pl-10 pr-8"
                />
                {selectedUser && (
                  <button
                    onClick={clearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <LoadingButton onClick={handleAddMember} loading={adding} disabled={!selectedUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('Add')}
              </LoadingButton>
            </div>

            {showDropdown && !selectedUser && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {!usersLoaded ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">{t('Loading users...')}</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {searchQuery.trim() ? t('No matching users found') : t('All users are already members')}
                  </div>
                ) : (
                  filteredUsers.slice(0, 50).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {(user.firstName?.[0] ?? user.username[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.username} · {user.email}
                        </div>
                      </div>
                      {!user.enabled && (
                        <Badge variant="outline" className="text-xs shrink-0">disabled</Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Members table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t('Loading members...')}</span>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground/70 text-sm">{t('Username')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-sm">{t('Email')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-sm">{t('Name')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-sm">{t('Type')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 text-sm">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {t('No members yet. Search and add users above.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{member.username}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {member.membershipType ?? 'UNMANAGED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => member.id && handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-right">
            {t('{{count}} member(s)', { count: members.length })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
