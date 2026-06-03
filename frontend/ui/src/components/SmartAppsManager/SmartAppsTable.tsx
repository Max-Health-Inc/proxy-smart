import {
  Badge,
  Button,
  DataList,
  DataListItem,
  DataListIcon,
  DataListContent,
  DataListTitle,
  DataListDescription,
  DataListBadges,
  DataListActions,
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
          label: `${String(app.allowedServerIds?.length ?? 0)} Servers`,
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
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Registered Applications')}</h3>
            <p className="text-muted-foreground font-medium">{t('View and manage all SMART on FHIR applications')}</p>
          </div>
        </div>
      </div>

      <DataList borderless>
        {apps.map((app) => {
          const authType: AuthenticationType =
            app.clientAuthenticatorType === 'client-jwt' ? 'asymmetric' :
            app.clientAuthenticatorType === 'client-secret' ? 'symmetric' : 'none';
          const appTypeBadge = getAppTypeBadge(app.appType || 'standalone-app', authType);
          const accessBadge = getServerAccessBadge(app);
          const AccessIcon = accessBadge.icon;
          const totalScopes = (app.defaultClientScopes || []).length + (app.optionalClientScopes || []).length;

          return (
            <DataListItem key={app.id} muted={app.status !== 'active'}>
              <DataListIcon size="lg" className="text-xl">
                {getAppTypeIcon(app.appType || 'standalone-app')}
              </DataListIcon>

              <DataListContent>
                <DataListTitle>{app.name}</DataListTitle>
                <DataListDescription>
                  {app.clientId}
                  {app.description && ` · ${app.description}`}
                </DataListDescription>
                <DataListBadges>
                  <Badge className={`${appTypeBadge.className} shadow-sm text-xs`}>
                    {appTypeBadge.label}
                  </Badge>
                  <Badge className={`${accessBadge.className} shadow-sm text-xs`}>
                    <AccessIcon className="w-3 h-3 mr-1" />
                    {accessBadge.label}
                  </Badge>
                  <Badge
                    variant={app.status === 'active' ? 'default' : 'secondary'}
                    className={`text-xs ${app.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-muted/50 text-muted-foreground border-border/50'
                    }`}
                  >
                    {app.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {getScopeSetName(app.scopeSetId)} · {totalScopes} scopes
                  </Badge>
                  {app.lastUsed && (
                    <span className="text-xs text-muted-foreground">{app.lastUsed}</span>
                  )}
                </DataListBadges>
              </DataListContent>

              <DataListActions>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-muted transition-colors duration-200">
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
              </DataListActions>
            </DataListItem>
          );
        })}
      </DataList>
    </div>
  );
}