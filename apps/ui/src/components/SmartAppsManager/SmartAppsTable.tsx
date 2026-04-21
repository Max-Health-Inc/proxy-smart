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
import {
  MoreHorizontal,
  Settings,
  Shield,
  Edit,
  Eye,
  Trash2,
  X,
  CheckCircle,
  Server,
  Users,
  Globe,
  AlertCircle,
} from 'lucide-react';
import type { SmartApp, ScopeSet, SmartAppType } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

// UI-only type for display purposes
type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';

interface SmartAppsTableProps {
  apps: SmartApp[];
  scopeSets: ScopeSet[];
  onToggleAppStatus: (id: string) => void;
  onOpenScopeEditor: (app: SmartApp) => void;
  onDeleteApp: (id: string) => void;
  onEditApp: (app: SmartApp) => void;
  onViewConfig: (app: SmartApp) => void;
  onEditAuth: (app: SmartApp) => void;
}

export function SmartAppsTable({
  apps,
  scopeSets,
  onToggleAppStatus,
  onOpenScopeEditor,
  onDeleteApp,
  onEditApp,
  onViewConfig,
  onEditAuth,
}: SmartAppsTableProps) {
  const { t } = useTranslation();
  const getServerAccessBadge = (app: SmartApp) => {
    switch (app.serverAccessType) {
      case 'all-servers':
        return {
          label: 'All Servers',
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Globe,
        };
      case 'selected-servers':
        return {
          label: `${app.allowedServerIds?.length || 0} Servers`,
          className: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          icon: Server,
        };
      case 'user-person-servers':
        return {
          label: 'User Person Servers',
          className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
          icon: Users,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-muted/50 text-muted-foreground border-border/50',
          icon: AlertCircle,
        };
    }
  };

  const getAppTypeBadge = (appType: SmartAppType, authenticationType: AuthenticationType) => {
    switch (appType) {
      case 'backend-service':
        return {
          label: 'Backend Service',
          className: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        };
      case 'standalone-app':
        return {
          label: `Standalone (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'ehr-launch':
        return {
          label: `EHR Launch (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'agent':
        return {
          label: `AI Agent (${authenticationType === 'asymmetric' ? 'Asymmetric' : 'Symmetric'})`,
          className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-muted/50 text-muted-foreground border-border/50',
        };
    }
  };

  const getAppTypeIcon = (appType: SmartAppType) => {
    switch (appType) {
      case 'backend-service':
        return '🔧';
      case 'standalone-app':
        return '📱';
      case 'ehr-launch':
        return '🏥';
      case 'agent':
        return '🤖';
      default:
        return '❓';
    }
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-4 sm:p-8 pb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Registered Applications')}</h3>
            <p className="text-muted-foreground font-medium">{t('View and manage all SMART on FHIR applications')}</p>
          </div>
        </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-semibold text-muted-foreground">{t('Application')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Type & Auth')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Server Access')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Client ID')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Status')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Scopes')}</TableHead>
                <TableHead className="font-semibold text-muted-foreground">{t('Last Used')}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => {
                // Derive authentication type from clientAuthenticatorType
                const authType: AuthenticationType = 
                  app.clientAuthenticatorType === 'client-jwt' ? 'asymmetric' :
                  app.clientAuthenticatorType === 'client-secret' ? 'symmetric' : 'none';
                const appTypeBadge = getAppTypeBadge(app.appType || 'standalone-app', authType);
                return (
                  <TableRow key={app.id} className="border-border/50 hover:bg-muted/50 transition-colors duration-200">
                    <TableCell>
                      <div className="py-2 max-w-[280px]">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg shrink-0">{getAppTypeIcon(app.appType || 'standalone-app')}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{app.name}</div>
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {app.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${appTypeBadge.className} shadow-sm`}>
                        {appTypeBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const accessBadge = getServerAccessBadge(app);
                        const IconComponent = accessBadge.icon;
                        return (
                          <div className="space-y-1">
                            <Badge className={`${accessBadge.className} shadow-sm`}>
                              <IconComponent className="w-3 h-3 mr-1" />
                              {accessBadge.label}
                            </Badge>
                            {app.serverAccessType === 'selected-servers' && app.allowedServerIds && (
                              <div className="text-xs text-muted-foreground">
                                {app.allowedServerIds.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted/50 px-3 py-2 rounded-lg text-sm font-medium text-foreground shadow-sm border border-border/50">
                        {app.clientId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={app.status === 'active' ? 'default' : 'secondary'}
                        className={app.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-muted/50 text-muted-foreground border-border/50'
                        }
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {getScopeSetName(app.scopeSetId)}
                          </span>
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            {((app.defaultClientScopes || []).length + (app.optionalClientScopes || []).length)} scopes
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {/* Show first 2 default scopes */}
                          {(app.defaultClientScopes || []).slice(0, 2).map((scope, index) => (
                            <Badge key={`default-${index}`} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-mono">
                              {scope.split('/')[1]?.split('.')[0] || scope}
                            </Badge>
                          ))}
                          {/* Show optional scopes if there's room */}
                          {(app.defaultClientScopes || []).length < 2 && (app.optionalClientScopes || []).slice(0, 2 - (app.defaultClientScopes || []).length).map((scope, index) => (
                            <Badge key={`optional-${index}`} variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-mono">
                              {scope.split('/')[1]?.split('.')[0] || scope} (opt)
                            </Badge>
                          ))}
                          {((app.defaultClientScopes || []).length + (app.optionalClientScopes || []).length) > 2 && (
                            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                              +{((app.defaultClientScopes || []).length + (app.optionalClientScopes || []).length) - 2}
                            </Badge>
                          )}
                        </div>
                        {(app.optionalClientScopes || []).length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                              {(app.optionalClientScopes || []).length} optional
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-medium">
                      {app.lastUsed}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-muted transition-colors duration-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-lg">
                          <DropdownMenuItem onClick={() => app.clientId && onToggleAppStatus(app.clientId)} className="rounded-lg">
                            <div className="flex items-center">
                              {app.status === 'active' ? (
                                <X className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                              )}
                              {app.status === 'active' ? 'Deactivate' : 'Activate'}
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenScopeEditor(app)} className="rounded-lg">
                            <Shield className="w-4 h-4 mr-2 text-primary" />
                            {t('Manage Scopes')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditApp(app)} className="rounded-lg">
                            <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                            {t('Edit Details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewConfig(app)} className="rounded-lg">
                            <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                            {t('View Configuration')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditAuth(app)} className="rounded-lg">
                            <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                            {t('Authentication Settings')}
                          </DropdownMenuItem>
                          {app.clientId !== 'ai-assistant-agent' && (
                            <DropdownMenuItem
                              onClick={() => app.clientId && onDeleteApp(app.clientId)}
                              className="text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('Delete')}
                            </DropdownMenuItem>
                          )}
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