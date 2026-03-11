import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Server, Plus, MoreHorizontal } from 'lucide-react';
import type { FhirPersonAssociation, FhirServer } from '@/lib/types/api';

// TODO: dont use custom interfaces for backend models, use or inherit the existing generated API models instead
interface HealthcareUser {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  organization?: string;
  enabled: boolean;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
  primaryRole?: string;
  fhirPersons: FhirPersonAssociation[];
  createdAt: string;
  lastLogin?: string;
}

interface HealthcareUsersTableProps {
  users: HealthcareUser[];
  fhirServers?: FhirServer[];
  onEditUser: (user: HealthcareUser) => void;
  onToggleStatus: (userId: string, currentStatus: 'active' | 'inactive') => void;
  onDeleteUser: (userId: string) => void;
  onAddFhirPerson: (user: HealthcareUser) => void;
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
 * Get primary role from user roles
 */
function getPrimaryRole(realmRoles: string[], clientRoles: { [client: string]: string[] }, primaryRole?: string): string {
  if (primaryRole) return primaryRole;
  
  // Priority order for roles
  const rolePriority = ['admin', 'administrator', 'practitioner', 'nurse', 'researcher', 'user'];
  
  // Check realm roles first
  for (const role of rolePriority) {
    if (realmRoles?.includes(role)) {
      return role;
    }
  }
  
  // Check client roles
  for (const client in clientRoles) {
    for (const role of rolePriority) {
      if (clientRoles[client]?.includes(role)) {
        return role;
      }
    }
  }
  
  return realmRoles?.[0] || 'user';
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

export function HealthcareUsersTable({
  users,
  fhirServers = [],
  onEditUser,
  onToggleStatus,
  onDeleteUser,
  onAddFhirPerson
}: HealthcareUsersTableProps) {
  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Healthcare Users</h3>
            <p className="text-muted-foreground font-medium">View and manage all healthcare professionals and administrative users</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-semibold text-muted-foreground">User</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Primary Role</TableHead>
                <TableHead className="font-semibold text-muted-foreground">All Roles</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Organization</TableHead>
                <TableHead className="font-semibold text-muted-foreground">FHIR Associations</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Created</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Last Login</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-border/50 hover:bg-muted/30 transition-colors duration-200">
                  <TableCell>
                    <div className="flex items-center gap-4 py-2">
                      <Avatar className="h-10 w-10 border-2 border-border shadow-md">
                        <AvatarImage src={undefined} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">{user.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(getPrimaryRole(user.realmRoles, user.clientRoles, user.primaryRole))} border-0 shadow-sm font-medium`}>
                      {getPrimaryRole(user.realmRoles, user.clientRoles, user.primaryRole)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.realmRoles?.map((role: string) => (
                        <Badge key={`realm-${role}`} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {role}
                        </Badge>
                      ))}
                      {user.clientRoles?.['admin-ui']?.map((role: string) => (
                        <Badge key={`client-${role}`} variant="outline" className="text-xs bg-violet-500/10 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 border-violet-500/20 dark:border-violet-400/20">
                          UI: {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-medium">
                    {user.organization}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        {user.fhirPersons.length > 0 ? (
                          user.fhirPersons.slice(0, 2).map((association: FhirPersonAssociation, index: number) => {
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
                            No associations
                          </div>
                        )}
                        {user.fhirPersons.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{user.fhirPersons.length - 2} more
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddFhirPerson(user)}
                        className="text-xs h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add FHIR Person
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.enabled ? "default" : "secondary"} className="font-medium">
                      {user.enabled ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
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
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteUser(user.id)}
                          className="text-destructive rounded-lg hover:bg-destructive/10"
                        >
                          Delete User
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
    </div>
  );
}
