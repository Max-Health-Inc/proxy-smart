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
import { MoreHorizontal, Edit, Trash2, Users, Power, Globe } from 'lucide-react';
import type { Organization } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

interface OrgTableProps {
  orgs: Organization[];
  onEdit: (org: Organization) => void;
  onDelete: (orgId: string) => void;
  onToggleStatus: (orgId: string) => void;
  onManageMembers: (org: Organization) => void;
}

export function OrgTable({ orgs, onEdit, onDelete, onToggleStatus, onManageMembers }: OrgTableProps) {
  const { t } = useTranslation();

  return (
    <div className="backdrop-blur-sm bg-card/70 rounded-2xl shadow-lg border border-border/50 p-4 sm:p-8 transition-all duration-300 hover:shadow-xl">
      <div className="mb-8">
        <h3 className="text-2xl font-medium text-foreground mb-2">
          {t('Organizations')}
        </h3>
        <p className="text-muted-foreground">
          {t('View and manage all Keycloak organizations')}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/70">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-semibold text-foreground/70 text-sm">{t('Name')}</TableHead>
              <TableHead className="font-semibold text-foreground/70 text-sm">{t('Alias')}</TableHead>
              <TableHead className="font-semibold text-foreground/70 text-sm">{t('Domains')}</TableHead>
              <TableHead className="font-semibold text-foreground/70 text-sm">{t('Status')}</TableHead>
              <TableHead className="text-right font-semibold text-foreground/70 text-sm">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {t('No organizations found. Create your first organization to get started.')}
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-foreground">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{org.alias}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(org.domains ?? []).length === 0 ? (
                        <span className="text-muted-foreground text-sm">{t('None')}</span>
                      ) : (
                        org.domains!.map((d) => (
                          <Badge
                            key={d.name}
                            variant="outline"
                            className="text-xs"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            {d.name}
                            {d.verified && <span className="ml-1 text-green-500">✓</span>}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={org.enabled !== false ? 'default' : 'secondary'}
                      className={org.enabled !== false
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}
                    >
                      {org.enabled !== false ? t('Enabled') : t('Disabled')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(org)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('Edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManageMembers(org)}>
                          <Users className="mr-2 h-4 w-4" />
                          {t('Members')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => org.id && onToggleStatus(org.id)}>
                          <Power className="mr-2 h-4 w-4" />
                          {org.enabled !== false ? t('Disable') : t('Enable')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => org.id && onDelete(org.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
