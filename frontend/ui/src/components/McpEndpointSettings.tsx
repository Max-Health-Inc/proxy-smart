/**
 * MCP Endpoint Settings — admin panel for managing the built-in MCP server.
 *
 * Rendered as the "AI Tools" tab content in the admin panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { getStoredToken } from '@/lib/apiClient';
import { config } from '@/config';
import { useTranslation } from 'react-i18next';
import {
  Server,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Info,
  ShieldCheck,
  Database,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Badge, Button, Checkbox, PageLayout, Switch } from '@proxy-smart/shared-ui';

// ── Category extraction ──────────────────────────────────────────────────────

/** Extract a human-readable category from a tool name like `create_admin_smart-apps_` */
function getToolCategory(toolName: string): string {
  // Special standalone tools
  if (toolName === 'search_documentation') return 'Documentation';
  if (toolName === 'read_resource') return 'Documentation';

  // Pattern: {action}_admin_{category}_{rest}
  const match = toolName.match(/^(?:get|create|update|delete)_admin_([a-z-]+)/);
  if (!match) return 'Other';

  const raw = match[1];
  // Normalize category names to human-readable labels
  const categoryMap: Record<string, string> = {
    'shutdown': 'Server Management',
    'restart': 'Server Management',
    'smart-apps': 'SMART Apps',
    'healthcare-users': 'Healthcare Users',
    'roles': 'Roles',
    'launch-contexts': 'Launch Contexts',
    'idps': 'Identity Providers',
    'smart-config': 'SMART Config',
    'branding': 'Branding',
    'client-registration': 'Client Registration',
    'keycloak-config': 'Keycloak Config',
    'mcp-endpoint': 'MCP Endpoint',
    'consent': 'Consent',
    'smart-access-control': 'SMART Access Control',
    'access-control': 'Access Control',
    'user-federation': 'User Federation',
    'scope-mappers': 'Scope Mappers',
    'smart-scopes': 'SMART Scopes',
    'document-import': 'Document Import',
    'organizations': 'Organizations',
    'app-store': 'App Store',
    'client-policies': 'Client Policies',
    'dicom-servers': 'DICOM Servers',
    'auth-flows': 'Auth Flows',
    'scope-sets': 'Scope Sets',
  };
  return categoryMap[raw] ?? raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface ToolCategory {
  name: string;
  tools: McpToolInfo[];
}

function groupToolsByCategory(tools: McpToolInfo[]): ToolCategory[] {
  const map = new Map<string, McpToolInfo[]>();
  for (const tool of tools) {
    const cat = getToolCategory(tool.name);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(tool);
  }
  return Array.from(map.entries())
    .map(([name, tools]) => ({ name, tools }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface McpToolInfo {
  name: string;
  description: string;
  exposed: boolean;
}

interface McpResourceInfo {
  name: string;
  description: string;
  uri: string;
  exposed: boolean;
}

interface McpEndpointStatus {
  enabled: boolean;
  configSource: string;
  endpointPath: string;
  endpointUrl: string;
  tools: McpToolInfo[];
  resources: McpResourceInfo[];
  disabledTools: string[];
  enabledTools: string[] | null;
  exposeResourcesAsTools: boolean;
  updatedAt: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchEndpointStatus(): Promise<McpEndpointStatus> {
  const token = await getStoredToken();
  const res = await fetch(`${config.api.baseUrl}/admin/mcp-endpoint`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch MCP endpoint status: ${res.status}`);
  return res.json();
}

async function updateEndpointConfig(
  body: Partial<{ enabled: boolean; disabledTools: string[]; enabledTools: string[] | null; exposeResourcesAsTools: boolean }>,
): Promise<McpEndpointStatus> {
  const token = await getStoredToken();
  const res = await fetch(`${config.api.baseUrl}/admin/mcp-endpoint`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update MCP endpoint config: ${res.status}`);
  return res.json();
}

async function toggleSingleTool(toolName: string, exposed: boolean): Promise<{ toolName: string; exposed: boolean; updatedAt: string }> {
  const token = await getStoredToken();
  const res = await fetch(`${config.api.baseUrl}/admin/mcp-endpoint/tools/${encodeURIComponent(toolName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ exposed }),
  });
  if (!res.ok) throw new Error(`Failed to toggle tool ${toolName}: ${res.status}`);
  return res.json();
}

// ── Component ────────────────────────────────────────────────────────────────

export function McpEndpointSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<McpEndpointStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Local UI state for pending tool toggles (optimistic)
  const [pendingDisabled, setPendingDisabled] = useState<Set<string>>(new Set());
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await fetchEndpointStatus();
      setStatus(data);
      setPendingDisabled(new Set(data.disabledTools));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpointStatus()
      .then(data => {
        setStatus(data);
        setPendingDisabled(new Set(data.disabledTools));
        setError(null);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = async () => {
    if (!status) return;
    setSaving(true);
    try {
      const data = await updateEndpointConfig({ enabled: !status.enabled });
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleExposeResourcesAsTools = async () => {
    if (!status) return;
    setSaving(true);
    try {
      const data = await updateEndpointConfig({ exposeResourcesAsTools: !status.exposeResourcesAsTools });
      setStatus(data);
      setPendingDisabled(new Set(data.disabledTools));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = async (toolName: string) => {
    const isCurrentlyDisabled = pendingDisabled.has(toolName);
    const newExposed = isCurrentlyDisabled; // if disabled, we want to expose it

    // Optimistic update
    setPendingDisabled((prev) => {
      const next = new Set(prev);
      if (newExposed) next.delete(toolName);
      else next.add(toolName);
      return next;
    });

    try {
      await toggleSingleTool(toolName, newExposed);
      // Update status disabledTools to reflect server state
      setStatus((prev) => {
        if (!prev) return prev;
        const disabledTools = newExposed
          ? prev.disabledTools.filter((t) => t !== toolName)
          : [...prev.disabledTools, toolName];
        return { ...prev, disabledTools };
      });
    } catch (err) {
      // Revert optimistic update
      setPendingDisabled((prev) => {
        const next = new Set(prev);
        if (newExposed) next.add(toolName);
        else next.delete(toolName);
        return next;
      });
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copyUrl = () => {
    if (!status) return;
    navigator.clipboard.writeText(status.endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const toggleAllInCategory = async (tools: McpToolInfo[], enable: boolean) => {
    // Optimistic update
    const prevDisabled = new Set(pendingDisabled);
    const next = new Set(pendingDisabled);
    for (const tool of tools) {
      if (enable) next.delete(tool.name);
      else next.add(tool.name);
    }
    setPendingDisabled(next);
    setSaving(true);

    try {
      const data = await updateEndpointConfig({ disabledTools: Array.from(next) });
      setStatus(data);
      setPendingDisabled(new Set(data.disabledTools));
    } catch (err) {
      // Revert on failure
      setPendingDisabled(prevDisabled);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">{t('Loading MCP endpoint settings...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setLoading(true); setError(null); load(); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> {t('Retry')}
        </Button>
      </div>
    );
  }

  if (!status) return null;

  const exposedCount = status.tools.filter((tool) => !pendingDisabled.has(tool.name)).length;
  const exposedResourceCount = status.resources?.filter((r) => !pendingDisabled.has(r.name)).length ?? 0;
  const totalResourceCount = status.resources?.length ?? 0;

  return (
    <PageLayout>
      {/* ── Endpoint Status Card ──────────────────────────────────────── */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <Server className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {t('Built-in MCP Endpoint')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('Expose backend tools to AI clients (Claude, IDE plugins) via the MCP Streamable HTTP protocol.')}
              </p>
            </div>
          </div>
          <Button
            variant={status.enabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleEnabled}
            disabled={saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status.enabled ? (
              <>
                <ToggleRight className="w-4 h-4 mr-2" /> {t('Enabled')}
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 mr-2" /> {t('Disabled')}
              </>
            )}
          </Button>
        </div>

        {/* Connection info */}
        {status.enabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="font-mono text-xs truncate max-w-[250px] sm:max-w-none">
                {status.endpointUrl}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyUrl}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              <span>
                {t(
                  'OAuth protected — MCP clients will be prompted to log in via Keycloak. The access token is returned to the client (IDE, Claude Desktop, etc.) automatically via RFC 9728 discovery.',
                )}
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {t(
                  'Config source: {{source}}. MCP endpoint is enabled by default and managed here.',
                  { source: status.configSource },
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Resources as Tools Toggle ─────────────────────────────── */}
      {status.enabled && (
        <div className="bg-card/70 backdrop-blur-sm p-5 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {t('Expose Resources as Tools')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('Read-only GET endpoints are always available as MCP resources. Enable this to also register them as tools with readOnlyHint so AI models can invoke them directly.')}
                </p>
              </div>
            </div>
            <Switch
              checked={status.exposeResourcesAsTools}
              onCheckedChange={toggleExposeResourcesAsTools}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* ── Tool Selection ────────────────────────────────────────────── */}
      {status.enabled && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-lg">
          <button
            type="button"
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-left">
              <h4 className="text-lg font-semibold text-foreground">
                {t('Exposed Tools')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('Choose which tools are available to MCP clients. {{exposed}} of {{total}} enabled.', {
                  exposed: exposedCount,
                  total: status.tools.length,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${toolsExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {toolsExpanded && (status.tools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('No tools available. The tool registry may not be initialized yet.')}
            </p>
          ) : (
            <div className="space-y-2 mt-4">
              {groupToolsByCategory(status.tools).map((category) => {
                const isCatExpanded = expandedCategories.has(category.name);
                const enabledInCat = category.tools.filter((tool) => !pendingDisabled.has(tool.name)).length;
                const allEnabled = enabledInCat === category.tools.length;
                const noneEnabled = enabledInCat === 0;

                return (
                  <div key={category.name} className="border border-border/50 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.name)}
                        className="flex items-center gap-2 cursor-pointer flex-1 text-left"
                      >
                        {isCatExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{category.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {enabledInCat}/{category.tools.length}
                        </Badge>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={allEnabled}
                          onClick={() => toggleAllInCategory(category.tools, true)}
                        >
                          {t('All')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={noneEnabled}
                          onClick={() => toggleAllInCategory(category.tools, false)}
                        >
                          {t('None')}
                        </Button>
                      </div>
                    </div>
                    {isCatExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                        {category.tools.map((tool) => {
                          const isDisabled = pendingDisabled.has(tool.name);
                          return (
                            <label
                              key={tool.name}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                isDisabled
                                  ? 'border-border/30 bg-muted/20 opacity-60'
                                  : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
                              }`}
                            >
                              <Checkbox
                                checked={!isDisabled}
                                onCheckedChange={() => toggleTool(tool.name)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{tool.name}</span>
                                  {isDisabled ? (
                                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Resource Selection ─────────────────────────────────────────── */}
      {status.enabled && totalResourceCount > 0 && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-lg">
          <button
            type="button"
            onClick={() => setResourcesExpanded(!resourcesExpanded)}
            className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h4 className="text-lg font-semibold text-foreground">
                  {t('Exposed Resources')}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Read-only GET endpoints exposed as MCP resources. {{exposed}} of {{total}} enabled.', {
                  exposed: exposedResourceCount,
                  total: totalResourceCount,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${resourcesExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {resourcesExpanded && <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            {status.resources.map((resource) => {
              const isDisabled = pendingDisabled.has(resource.name);
              return (
                <label
                  key={resource.name}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isDisabled
                      ? 'border-border/30 bg-muted/20 opacity-60'
                      : 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
                  }`}
                >
                  <Checkbox
                    checked={!isDisabled}
                    onCheckedChange={() => toggleTool(resource.name)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{resource.name}</span>
                      {isDisabled ? (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
                    <p className="text-xs font-mono text-muted-foreground/70 line-clamp-1 mt-0.5">{resource.uri}</p>
                  </div>
                </label>
              );
            })}
          </div>}
        </div>
      )}
    </PageLayout>
  );
}
