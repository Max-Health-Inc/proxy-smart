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
import { 
  MoreHorizontal, 
  Shield, 
  Edit, 
  TestTube, 
  FileText, 
  XCircle, 
  Loader2, 
  CheckCircle 
} from 'lucide-react';
import type { IdentityProviderWithStats } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface IdPTableProps {
  idps: IdentityProviderWithStats[];
  testingConnection: string | null;
  connectionResults: Record<string, { success: boolean; message: string }>;
  onToggleStatus: (alias: string) => void;
  onEdit: (idp: IdentityProviderWithStats) => void;
  onTestConnection: (idp: IdentityProviderWithStats) => Promise<void>;
  onViewCertificates: (idp: IdentityProviderWithStats) => void;
  onDelete: (alias: string) => void;
}

export function IdPTable({
  idps,
  testingConnection,
  connectionResults,
  onToggleStatus,
  onEdit,
  onTestConnection,
  onViewCertificates,
  onDelete
}: IdPTableProps) {
  const { t } = useTranslation();
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'saml':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'oauth2':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'oidc':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'ldap':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="backdrop-blur-sm bg-card/70 rounded-2xl shadow-lg border border-border/50 p-4 sm:p-8 transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-medium text-foreground mb-2">
          {t('Identity Providers')}
        </h3>
        <p className="text-muted-foreground">
          {t('View and manage all configured identity providers')}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/70">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/70 border-b border-border/50">
              <TableHead className="font-semibold text-foreground">{t('Provider')}</TableHead>
              <TableHead className="font-semibold text-foreground">{t('Type')}</TableHead>
              <TableHead className="font-semibold text-foreground">{t('Status')}</TableHead>
              <TableHead className="font-semibold text-foreground">{t('Users')}</TableHead>
              <TableHead className="font-semibold text-foreground">{t('Last Used')}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {idps.map((idp, index) => {
              const alias = idp.alias ?? '';
              const status = idp.status ?? (idp.enabled ? 'active' : 'inactive');
              const normalizedType = (idp.providerId ?? 'unknown').toLowerCase();
              const providerType = (() => {
                switch (normalizedType) {
                  case 'saml':
                    return 'SAML';
                  case 'oauth2':
                    return 'OAuth2';
                  case 'oidc':
                    return 'OIDC';
                  case 'ldap':
                    return 'LDAP';
                  default:
                    return idp.providerId ?? 'Unknown';
                }
              })();

              return (
                <TableRow
                  key={alias || idp.internalId || idp.displayName || `idp-${index}`}
                  className="hover:bg-muted/30 transition-colors duration-200 border-b border-border/50"
                >
                <TableCell className="py-4">
                  <div>
                    <div className="font-medium text-foreground">{idp.displayName ?? idp.alias ?? 'Unknown Provider'}</div>
                    <div className="text-sm text-muted-foreground">{idp.vendorName ?? idp.providerId ?? 'Unknown'}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge className={`${getTypeBadgeColor(normalizedType)} shadow-sm`}>
                    {providerType}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <Badge 
                    variant={status === 'active' ? 'default' : 'secondary'}
                    className={`${status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'} shadow-sm`}
                  >
                    {status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-sm font-medium text-foreground">{idp.userCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-1">users</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground py-4">
                  {idp.lastUsed ? new Date(idp.lastUsed).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors duration-200 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover/90 backdrop-blur-sm border border-border shadow-xl">
                      <DropdownMenuItem onClick={() => onToggleStatus(alias)} className="hover:bg-muted/50" disabled={!alias}>
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          {status === 'active' ? 'Disable' : 'Enable'}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(idp)} className="hover:bg-muted/50">
                        <div className="flex items-center">
                          <Edit className="h-4 w-4 mr-2" />
                          {t('Edit Configuration')}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onTestConnection(idp)} 
                        className="hover:bg-muted/50"
                        disabled={!alias || testingConnection === alias}
                      >
                        <div className="flex items-center">
                          {testingConnection === alias ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : alias && connectionResults[alias] ? (
                            connectionResults[alias].success ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                            )
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          {testingConnection === alias ? 'Testing...' : 'Test Connection'}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewCertificates(idp)} className="hover:bg-muted/50">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          {t('View Certificates')}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(alias)}
                        className="text-destructive hover:bg-destructive/10"
                        disabled={!alias}
                      >
                        <div className="flex items-center">
                          <XCircle className="h-4 w-4 mr-2" />
                          {t('Remove Provider')}
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}