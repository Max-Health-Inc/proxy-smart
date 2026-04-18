import { Badge, Button } from '@proxy-smart/shared-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@proxy-smart/shared-ui';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit,
  ExternalLink,
  Link2,
  Plus,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssignedAppsBadges } from '../AssignAppsDialog';
import type { McpServer, McpServerHealth, McpServerTool, McpTemplate, McpTemplatesData, SmartApp } from './types';

interface McpServersTabProps {
  servers: McpServer[];
  loading: boolean;
  error: string | null;
  templates: McpTemplatesData | null;
  filteredTemplates: McpTemplate[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  templatesExpanded: boolean;
  setTemplatesExpanded: (v: boolean) => void;
  installedServerNames: Set<string>;
  expandedServer: string | null;
  serverTools: Record<string, McpServerTool[]>;
  serverHealth: Record<string, McpServerHealth>;
  smartApps: SmartApp[];
  submitting: boolean;
  onToggleExpansion: (serverName: string) => void;
  onInstallTemplate: (template: McpTemplate) => void;
  onOpenAdd: () => void;
  onOpenEdit: (server: McpServer) => void;
  onOpenDelete: (server: McpServer) => void;
  onOpenAssign: (name: string, field: 'allowedMcpServerNames' | 'allowedSkillNames', label: string) => void;
}

export function McpServersTab({
  servers,
  loading,
  error,
  templates,
  filteredTemplates,
  selectedCategory,
  setSelectedCategory,
  templatesExpanded,
  setTemplatesExpanded,
  installedServerNames,
  expandedServer,
  serverTools,
  serverHealth,
  smartApps,
  submitting,
  onToggleExpansion,
  onInstallTemplate,
  onOpenAdd,
  onOpenEdit,
  onOpenDelete,
  onOpenAssign,
}: McpServersTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Quick Setup Templates */}
      {templates && templates.templates.length > 0 && (
        <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <button
            type="button"
            onClick={() => setTemplatesExpanded(!templatesExpanded)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                <Sparkles className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {t('Quick Setup Templates')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('One-click setup for popular MCP servers')}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-6 h-6 text-muted-foreground transition-transform duration-200 ${templatesExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {templatesExpanded && (
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full mt-6">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6">
                <TabsTrigger value="all" className="px-4 py-2">
                  {t('All')} ({templates.templates.length})
                </TabsTrigger>
                {Object.entries(templates.categories).map(([key, category]) => {
                  const count = templates.templates.filter((tmpl) => tmpl.category === key).length;
                  if (count === 0) return null;
                  return (
                    <TabsTrigger key={key} value={key} className="px-4 py-2">
                      <span className="mr-2">{category.icon}</span>
                      {category.name} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isInstalled={installedServerNames.has(template.id)}
                      submitting={submitting}
                      onInstall={() => onInstallTemplate(template)}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* Server List */}
      <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
              <Server className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {t('Configured Servers')}
            </h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {servers.length} {servers.length === 1 ? t('server') : t('servers')}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Server className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground text-sm">{t('Loading MCP servers...')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          ) : servers.length > 0 ? (
            servers.map((server, index) => (
              <ServerRow
                key={server.name || index}
                server={server}
                isExpanded={expandedServer === server.name}
                serverTools={serverTools[server.name!]}
                serverHealth={serverHealth[server.name!]}
                smartApps={smartApps}
                onToggle={() => onToggleExpansion(server.name!)}
                onEdit={() => onOpenEdit(server)}
                onDelete={() => onOpenDelete(server)}
                onAssign={() =>
                  onOpenAssign(server.name!, 'allowedMcpServerNames', 'MCP server')
                }
              />
            ))
          ) : (
            <EmptyServerState onAdd={onOpenAdd} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function TemplateCard({
  template,
  isInstalled,
  submitting,
  onInstall,
}: {
  template: McpTemplate;
  isInstalled: boolean;
  submitting: boolean;
  onInstall: () => void;
}) {
  const { t } = useTranslation();
  const securityLevel = template.securityNote?.includes('DANGER')
    ? 'danger'
    : template.securityNote?.includes('CAUTION')
      ? 'caution'
      : 'safe';

  return (
    <div className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:border-primary/30">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{template.name}</h4>
            <div className="flex items-center space-x-1 mt-1">
              <Badge variant={template.isRemote ? 'default' : 'secondary'} className="text-xs">
                {template.isRemote ? (
                  <>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t('Remote')}
                  </>
                ) : (
                  <>{t('Local')}</>
                )}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.transport.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        {securityLevel === 'danger' && <ShieldAlert className="w-5 h-5 text-red-500" />}
        {securityLevel === 'caution' && <Shield className="w-5 h-5 text-yellow-500" />}
        {securityLevel === 'safe' && <ShieldCheck className="w-5 h-5 text-green-500" />}
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>

      {template.securityNote && (
        <div
          className={`text-xs p-2 rounded-lg mb-3 ${
            securityLevel === 'danger'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : securityLevel === 'caution'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : 'bg-green-500/10 text-green-600 dark:text-green-400'
          }`}
        >
          {template.securityNote}
        </div>
      )}

      {template.auth.required && (
        <div className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg mb-3">
          🔐 {t('Requires')} {template.auth.type === 'oauth' ? 'OAuth' : template.auth.type}
        </div>
      )}

      <Button
        onClick={onInstall}
        disabled={isInstalled || submitting || !template.isRemote}
        size="sm"
        className="w-full"
        variant={isInstalled ? 'secondary' : 'default'}
      >
        {isInstalled ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('Installed')}
          </>
        ) : !template.isRemote ? (
          <>{t('Manual Install Required')}</>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            {t('Install')}
          </>
        )}
      </Button>
    </div>
  );
}

function ServerRow({
  server,
  isExpanded,
  serverTools: tools,
  serverHealth: health,
  smartApps,
  onToggle,
  onEdit,
  onDelete,
  onAssign,
}: {
  server: McpServer;
  isExpanded: boolean;
  serverTools?: McpServerTool[];
  serverHealth?: McpServerHealth;
  smartApps: SmartApp[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  const { t } = useTranslation();
  const status = server.status || 'unknown';

  return (
    <div>
      <div
        className={`flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 border cursor-pointer ${getStatusColor(status)}`}
        onClick={onToggle}
      >
        <div className="flex items-center flex-1">
          {getStatusIcon(status)}
          <div className="flex-1 ml-4">
            <div className="flex items-center space-x-2">
              <span className="text-foreground font-medium">{server.name}</span>
              <span className="text-xs bg-muted/80 px-2 py-1 rounded-full font-medium text-muted-foreground">
                {server.type}
              </span>
            </div>
            {server.description && (
              <div className="text-xs text-muted-foreground mt-1">{server.description}</div>
            )}
            {server.url && (
              <div className="text-xs text-muted-foreground mt-1 font-mono">{server.url}</div>
            )}
            {server.lastChecked && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('Last checked')}: {formatTimestamp(server.lastChecked)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {server.toolCount !== undefined && (
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1 rounded-lg">
              <Wrench className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {server.toolCount} {server.toolCount === 1 ? t('tool') : t('tools')}
              </span>
            </div>
          )}
          <span className="text-sm font-semibold">
            {status === 'connected' && (
              <span className="text-emerald-600 dark:text-emerald-400">{t('Connected')}</span>
            )}
            {status === 'error' && (
              <span className="text-red-600 dark:text-red-400">{t('Error')}</span>
            )}
            {(status === 'unknown' || !server.status) && (
              <span className="text-gray-600 dark:text-gray-400">{t('Unknown')}</span>
            )}
          </span>
          {server.type === 'external' && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={t('Edit server')}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={t('Assign to SMART Apps')}
              >
                <Link2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 ml-12 p-4 bg-muted/20 rounded-xl border border-border/30">
          {health && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                {t('Health Status')}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/50 p-2 rounded">
                  <span className="text-muted-foreground">{t('Status')}:</span>
                  <span className="ml-2 font-semibold text-foreground">{health.status}</span>
                </div>
                {health.responseTime !== undefined && (
                  <div className="bg-background/50 p-2 rounded">
                    <span className="text-muted-foreground">{t('Response Time')}:</span>
                    <span className="ml-2 font-semibold text-foreground">
                      {health.responseTime}ms
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tools && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                <Wrench className="w-4 h-4 mr-2 text-primary" />
                {t('Available Tools')} ({tools.length})
              </h4>
              <div className="space-y-2">
                {tools.map((tool, toolIndex) => (
                  <div
                    key={toolIndex}
                    className="bg-background/50 p-3 rounded-lg border border-border/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-3 h-3 text-primary" />
                          <span className="text-sm font-medium text-foreground">{tool.name}</span>
                        </div>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground mt-1 ml-5">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AssignedAppsBadges
            resourceName={server.name!}
            field="allowedMcpServerNames"
            smartApps={smartApps}
            onManage={onAssign}
            emptyMessage={t('No SMART apps are using this MCP server yet.')}
          />
        </div>
      )}
    </div>
  );
}

function EmptyServerState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <Server className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="text-lg font-semibold text-foreground mb-2">{t('No MCP Servers')}</h4>
      <p className="text-muted-foreground text-sm mb-4">
        {t('No MCP servers have been configured yet.')}
      </p>
      <Button variant="outline" onClick={onAdd} className="mx-auto">
        <Plus className="w-4 h-4 mr-2" />
        {t('Add Server')}
      </Button>
      <p className="text-muted-foreground text-xs mt-4">
        {t('Or configure via environment variables:')}
      </p>
      <div className="mt-2 bg-muted/30 p-4 rounded-lg text-left max-w-md mx-auto">
        <code className="text-xs font-mono text-foreground">
          EXTERNAL_MCP_SERVERS=[{'{'}name: ..., url: ...{'}'}]
        </code>
      </div>
    </div>
  );
}

/* ─── Utility functions ──────────────────────────────────────────── */

function getStatusIcon(status: string) {
  switch (status) {
    case 'connected':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'checking':
      return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500/5 dark:bg-emerald-400/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/20 border-emerald-500/20 dark:border-emerald-400/30';
    case 'error':
      return 'bg-red-500/5 dark:bg-red-400/10 hover:bg-red-500/10 dark:hover:bg-red-400/20 border-red-500/20 dark:border-red-400/30';
    case 'checking':
      return 'bg-yellow-500/5 dark:bg-yellow-400/10 hover:bg-yellow-500/10 dark:hover:bg-yellow-400/20 border-yellow-500/20 dark:border-yellow-400/30';
    default:
      return 'bg-gray-500/5 dark:bg-gray-400/10 hover:bg-gray-500/10 dark:hover:bg-gray-400/20 border-gray-500/20 dark:border-gray-400/30';
  }
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  if (diffSecs > 0) return `${diffSecs}s ago`;
  return 'Just now';
}
