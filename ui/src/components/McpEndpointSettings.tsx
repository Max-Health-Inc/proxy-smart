/**
 * MCP Endpoint Settings — admin panel for managing the built-in MCP server.
 *
 * Rendered as a TabsContent inside McpServersManager ("MCP Endpoint" tab).
 */

import { useState, useEffect, useCallback } from 'react';
import { getStoredToken } from '../lib/apiClient';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

// ── Types ────────────────────────────────────────────────────────────────────

interface McpToolInfo {
  name: string;
  description: string;
  exposed: boolean;
}

interface McpEndpointStatus {
  enabled: boolean;
  configSource: string;
  endpointPath: string;
  endpointUrl: string;
  tools: McpToolInfo[];
  disabledTools: string[];
  enabledTools: string[] | null;
  updatedAt: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE ?? '') as string;

async function fetchEndpointStatus(): Promise<McpEndpointStatus> {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}/admin/mcp-endpoint`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch MCP endpoint status: ${res.status}`);
  return res.json();
}

async function updateEndpointConfig(
  body: Partial<{ enabled: boolean; disabledTools: string[]; enabledTools: string[] | null }>,
): Promise<McpEndpointStatus> {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}/admin/mcp-endpoint`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update MCP endpoint config: ${res.status}`);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpointStatus();
      setStatus(data);
      setPendingDisabled(new Set(data.disabledTools));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const toggleTool = (toolName: string) => {
    setPendingDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  const saveToolConfig = async () => {
    setSaving(true);
    try {
      const data = await updateEndpointConfig({ disabledTools: Array.from(pendingDisabled) });
      setStatus(data);
      setPendingDisabled(new Set(data.disabledTools));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    if (!status) return;
    navigator.clipboard.writeText(status.endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasToolChanges =
    status &&
    (pendingDisabled.size !== status.disabledTools.length ||
      [...pendingDisabled].some((t) => !status.disabledTools.includes(t)));

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
        <Button variant="outline" size="sm" className="mt-4" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> {t('Retry')}
        </Button>
      </div>
    );
  }

  if (!status) return null;

  const exposedCount = status.tools.filter((tool) => !pendingDisabled.has(tool.name)).length;

  return (
    <div className="space-y-6">
      {/* ── Endpoint Status Card ──────────────────────────────────────── */}
      <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
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
              <Badge variant="outline" className="font-mono text-xs">
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
                  'Config source: {{source}}. Defaults to enabled in mono mode (MONO_MODE=true). Override with MCP_ENDPOINT_ENABLED env var.',
                  { source: status.configSource },
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Tool Selection ────────────────────────────────────────────── */}
      {status.enabled && (
        <div className="bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
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
            {hasToolChanges && (
              <Button size="sm" onClick={saveToolConfig} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('Save Changes')}
              </Button>
            )}
          </div>

          {status.tools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('No tools available. The tool registry may not be initialized yet.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {status.tools.map((tool) => {
                const isDisabled = pendingDisabled.has(tool.name);
                return (
                  <label
                    key={tool.name}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
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
      )}
    </div>
  );
}
