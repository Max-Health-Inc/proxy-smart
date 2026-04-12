import { Badge, Label } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData } from '@/lib/types/api';
import type { GetAdminMcpServers200ResponseServersInner } from '@/lib/api-client';
import type { McpAccessType } from './helpers';
import { getMcpAccessTypeDescription } from './helpers';

interface McpAccessSectionProps {
    newApp: SmartAppFormData;
    updateMcpAccessType: (t: McpAccessType) => void;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
    mcpServers: GetAdminMcpServers200ResponseServersInner[];
    mcpServersLoading: boolean;
}

export function McpAccessSection({
    newApp,
    updateMcpAccessType,
    updateApp,
    mcpServers,
    mcpServersLoading,
}: McpAccessSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 p-6 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center shadow-sm">
                    <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('MCP Server Access (AI Capabilities)')}</h4>
                    <p className="text-muted-foreground text-sm font-medium">{t('Control which AI/MCP servers this application can use')}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-3">
                    <Label htmlFor="mcpAccessType" className="text-sm font-semibold text-foreground">{t('MCP Access Type')}</Label>
                    <Select value={newApp.mcpAccessType || 'none'} onValueChange={(v) => updateMcpAccessType(v as McpAccessType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('No MCP Access')}</SelectItem>
                            <SelectItem value="all-mcp-servers">{t('All MCP Servers')}</SelectItem>
                            <SelectItem value="selected-mcp-servers">{t('Specific MCP Servers Only')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{getMcpAccessTypeDescription(newApp.mcpAccessType || 'none')}</p>
                </div>

                {newApp.mcpAccessType === 'selected-mcp-servers' && (
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground">{t('Select Allowed MCP Servers')}</Label>
                        {mcpServersLoading ? (
                            <div className="p-4 text-center text-muted-foreground">
                                <div className="animate-spin inline-block w-4 h-4 border-2 border-border/50 border-t-primary rounded-full mr-2"></div>
                                {t('Loading available MCP servers...')}
                            </div>
                        ) : mcpServers.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                                <Cpu className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm">{t('No MCP servers available')}</p>
                                <p className="text-xs text-muted-foreground">{t('Configure MCP servers first')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border/50">
                                {mcpServers.map((server) => (
                                    <label key={server.name} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                                        <Checkbox
                                            checked={(newApp.allowedMcpServerNames || []).includes(server.name)}
                                            onCheckedChange={(checked) => {
                                                const serverNames = checked === true
                                                    ? [...(newApp.allowedMcpServerNames || []), server.name]
                                                    : (newApp.allowedMcpServerNames || []).filter(name => name !== server.name);
                                                updateApp({ allowedMcpServerNames: serverNames });
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
                                                {server.status === 'connected' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                <span className="truncate">{server.url || server.type}</span>
                                                {server.toolCount !== undefined && (
                                                    <Badge variant="outline" className="text-xs">{server.toolCount} tools</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                        {(newApp.allowedMcpServerNames || []).length > 0 && (
                            <div className="text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 p-2 rounded-lg border border-violet-500/20">
                                ✓ {(newApp.allowedMcpServerNames || []).length} MCP server(s) selected
                            </div>
                        )}
                    </div>
                )}

                {newApp.mcpAccessType === 'none' && (
                    <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-slate-800 dark:text-slate-300 mb-1">{t('No MCP Access')}</p>
                                <p className="text-slate-700 dark:text-slate-400 text-xs">
                                    {t('This app will not have access to any MCP servers. AI-powered features will be unavailable.')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {newApp.mcpAccessType === 'all-mcp-servers' && (
                    <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-violet-800 dark:text-violet-300 mb-1">{t('Full MCP Access')}</p>
                                <p className="text-violet-700 dark:text-violet-400 text-xs">
                                    {t('This app will have access to all MCP servers configured in the system, enabling full AI capabilities.')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
