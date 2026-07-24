import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@proxy-smart/shared-ui';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Users, Server, Plus, MoreHorizontal, Link, Monitor } from 'lucide-react';
import type { FhirPersonAssociation, FhirServer, HealthcareUser } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';
import { isPlumbingRoleName } from './rolePickerHelpers';

interface HealthcareUsersTableProps {
  users: HealthcareUser[];
  fhirServers?: FhirServer[];
  onEditUser: (user: HealthcareUser) => void;
  onToggleStatus: (userId: string, currentStatus: 'active' | 'inactive') => void;
  onDeleteUser: (userId: string) => void;
  onAddFhirPerson: (user: HealthcareUser) => void;
  onManageLinks?: (user: HealthcareUser) => void;
}

/**
 * Get initials from full name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Human-friendly label for a raw role name: hyphens/underscores become spaces
 * and each word is title-cased (e.g. "gateway-admin" -> "Gateway Admin").
 */
function humanizeRole(role: string): string {
  return role.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Most-significant roles first, so the leading badge is the meaningful "primary".
const ROLE_PRIORITY = [
  'admin', 'administrator', 'realm-admin', 'gateway-admin',
  'practitioner', 'nurse', 'researcher', 'manage', 'user',
];

function rolePriorityIndex(name: string): number {
  const i = ROLE_PRIORITY.indexOf(name.toLowerCase());
  return i === -1 ? ROLE_PRIORITY.length : i;
}

interface DisplayRole {
  name: string;
  label: string;
  isConsole: boolean;
}

/**
 * Build the de-noised, ordered role list for display: realm roles plus admin
 * console (admin-ui) roles, with Keycloak plumbing roles (default-roles-*,
 * offline_access, uma_authorization) filtered out and duplicates removed.
 * Sorted so the most significant role comes first (the "primary").
 */
function getDisplayRoles(
  realmRoles: string[] | undefined,
  clientRoles: { [client: string]: string[] } | undefined,
): DisplayRole[] {
  const seen = new Set<string>();
  const roles: DisplayRole[] = [];
  const add = (name: string, isConsole: boolean) => {
    if (isPlumbingRoleName(name) || seen.has(name)) return;
    seen.add(name);
    roles.push({ name, label: humanizeRole(name), isConsole });
  };
  realmRoles?.forEach((r) => add(r, false));
  clientRoles?.['admin-ui']?.forEach((r) => add(r, true));
  return roles.sort((a, b) => rolePriorityIndex(a.name) - rolePriorityIndex(b.name));
}

/**
 * Get role badge color based on role name
 */
function getRoleBadgeColor(role: string): string {
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('admin')) {
    return 'bg-violet-500/10 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 border-violet-500/20 dark:border-violet-400/20';
  } else if (roleLower.includes('doctor')) {
    return 'bg-primary/10 text-primary border-primary/20';
  } else if (roleLower.includes('nurse')) {
    return 'bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/20';
  } else if (roleLower.includes('researcher') || roleLower.includes('research')) {
    return 'bg-orange-500/10 dark:bg-orange-400/20 text-orange-700 dark:text-orange-300 border-orange-500/20 dark:border-orange-400/20';
  } else if (roleLower.includes('practitioner')) {
    return 'bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-400/20';
  }
  
  // Default role badge styling
  return 'bg-muted text-muted-foreground border-border';
}

/**
 * Roles cell: a single prominent primary badge (category-coloured) followed by
 * up to two de-noised secondary roles and a "+N" overflow, with plumbing roles
 * hidden. Admin-console roles are marked with a monitor icon rather than a "UI:"
 * prefix. Users with only plumbing roles read as a plain "Standard user".
 */
function UserRoles({ user }: { user: HealthcareUser }) {
  const { t } = useTranslation();
  const roles = getDisplayRoles(user.realmRoles, user.clientRoles);

  if (roles.length === 0) {
    return <span className="text-sm text-muted-foreground">{t('Standard user')}</span>;
  }

  const [primary, ...rest] = roles;
  const visible = rest.slice(0, 2);
  const overflow = rest.slice(2);

  return (
    <div className="flex flex-wrap items-center gap-1.5" title={roles.map((r) => r.label).join(', ')}>
      <Badge
        className={`${getRoleBadgeColor(primary.name)} border-0 shadow-sm font-semibold gap-1`}
        title={primary.isConsole ? t('Admin console role') : undefined}
      >
        {primary.isConsole && <Monitor className="w-3 h-3" />}
        {primary.label}
      </Badge>
      {visible.map((r) => (
        <Badge
          key={r.name}
          variant="outline"
          className="text-xs font-medium text-muted-foreground border-border gap-1"
          title={r.isConsole ? t('Admin console role') : undefined}
        >
          {r.isConsole && <Monitor className="w-3 h-3" />}
          {r.label}
        </Badge>
      ))}
      {overflow.length > 0 && (
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground border-border"
          title={overflow.map((r) => r.label).join(', ')}
        >
          +{overflow.length}
        </Badge>
      )}
    </div>
  );
}

export function HealthcareUsersTable({
  users,
  fhirServers = [],
  onEditUser,
  onToggleStatus,
  onDeleteUser,
  onAddFhirPerson,
  onManageLinks
}: HealthcareUsersTableProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-4 sm:p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Healthcare Users')}</h3>
            <p className="text-muted-foreground font-medium">{t('View and manage all healthcare professionals and administrative users')}</p>
          </div>
        </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-semibold text-muted-foreground">{t('User')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Roles')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Organization')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('FHIR Associations')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Status')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Created')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Last Login')}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-border/50 hover:bg-muted/30 transition-colors duration-200">
                  <TableCell>
                    <div className="flex items-center gap-4 py-2">
                      <Avatar className="h-10 w-10 border-2 border-border shadow-md">
                        <AvatarImage src={undefined} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(`${user.firstName} ${user.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">{`${user.firstName} ${user.lastName}`.trim()}</div>
                        <div className="text-sm text-muted-foreground mt-1">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserRoles user={user} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-medium">
                    {user.organization}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        {(user.fhirPersons?.length ?? 0) > 0 ? (
                          user.fhirPersons!.slice(0, 2).map((association: FhirPersonAssociation, index: number) => {
                            const serverName = fhirServers.find(s => s.id === association.serverId)?.name || association.serverId;
                            return (
                              <div key={index} className="flex items-center space-x-2 text-xs">
                                <Server className="w-3 h-3 text-primary" />
                                <span className="font-medium text-foreground">{serverName}:</span>
                                <code className="text-muted-foreground bg-muted px-1 py-0.5 rounded text-xs">
                                  {association.personId}
                                </code>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {t('No associations')}
                          </div>
                        )}
                        {(user.fhirPersons?.length ?? 0) > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{user.fhirPersons!.length - 2} more
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddFhirPerson(user)}
                          className="text-xs h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {t('Add FHIR Person')}
                        </Button>
                        {(user.fhirPersons?.length ?? 0) > 0 && onManageLinks && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onManageLinks(user)}
                            className="text-xs h-6 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10"
                          >
                            <Link className="w-3 h-3 mr-1" />
                            {t('Manage Links')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.enabled ? "default" : "secondary"} className="font-medium">
                      {user.enabled ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.createdTimestamp ? new Date(user.createdTimestamp).toLocaleDateString() : 'Not available'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-muted transition-colors duration-200">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-lg">
                        <DropdownMenuItem onClick={() => onToggleStatus(user.id, user.enabled ? 'active' : 'inactive')} className="rounded-lg">
                          {user.enabled ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditUser(user)} className="rounded-lg">
                          {t('Edit Profile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteUser(user.id)}
                          className="text-destructive rounded-lg hover:bg-destructive/10"
                        >
                          {t('Delete User')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}