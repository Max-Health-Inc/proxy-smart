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
} from '@max-health-inc/shared-ui';
import { Copy, Database, Edit, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScopeSet } from './types';

interface ScopeSetsTableProps {
  scopeSets: ScopeSet[];
  loading: boolean;
  onEdit: (scopeSet: ScopeSet) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ScopeSetsTable({ scopeSets, loading, onEdit, onDelete }: ScopeSetsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
      <div className="p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Scope Sets')}</h3>
            <p className="text-muted-foreground font-medium">
              {t('Manage your SMART scope configurations')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-foreground">{t('Name')}</TableHead>
                  <TableHead className="font-semibold text-foreground">{t('Scopes')}</TableHead>
                  <TableHead className="font-semibold text-foreground">{t('Type')}</TableHead>
                  <TableHead className="font-semibold text-foreground">{t('Updated')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopeSets.map((scopeSet) => (
                  <TableRow
                    key={scopeSet.id}
                    className="border-border/50 hover:bg-muted/50 transition-colors duration-200"
                  >
                    <TableCell>
                      <div>
                        <div className="font-semibold text-foreground">{scopeSet.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {scopeSet.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {scopeSet.scopes.slice(0, 3).map((scope, index) => (
                          <Badge key={index} variant="outline" className="text-xs font-mono">
                            {scope}
                          </Badge>
                        ))}
                        {scopeSet.scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{scopeSet.scopes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          scopeSet.isTemplate
                            ? 'bg-purple-500/10 text-purple-800 dark:text-purple-300'
                            : 'bg-primary/10 text-primary'
                        }
                      >
                        {scopeSet.isTemplate ? t('Template') : t('Custom')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(scopeSet.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(scopeSet)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(scopeSet.scopes.join(' '))}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {t('Copy Scopes')}
                          </DropdownMenuItem>
                          {!scopeSet.isTemplate && (
                            <DropdownMenuItem
                              onClick={async () => await onDelete(scopeSet.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('Delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
