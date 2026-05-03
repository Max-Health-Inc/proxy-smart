import { Badge, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Server, Users, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData } from '@/lib/types/api';
import type { ServerAccessType } from './helpers';
import { getServerAccessTypeDescription } from './helpers';

interface ServerAccessSectionProps {
    newApp: SmartAppFormData;
    updateServerAccessType: (t: ServerAccessType) => void;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
    servers: Array<{ id: string; name: string; url: string; fhirVersion: string; supported: boolean }>;
    serversLoading: boolean;
}

export function ServerAccessSection({
    newApp,
    updateServerAccessType,
    updateApp,
    servers,
    serversLoading,
}: ServerAccessSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 p-6 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center shadow-sm">
                    <Server className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Server Access Configuration')}</h4>
                    <p className="text-muted-foreground text-sm font-medium">{t('Control which FHIR servers this application can access')}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-3">
                    <Label htmlFor="serverAccessType" className="text-sm font-semibold text-foreground">{t('Server Access Type')}</Label>
                    <Select value={newApp.serverAccessType} onValueChange={(v) => updateServerAccessType(v as ServerAccessType)} required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-servers">{t('All Available Servers')}</SelectItem>
                            <SelectItem value="selected-servers">{t('Specific Servers Only')}</SelectItem>
                            {newApp.appType !== 'backend-service' && (
                                <SelectItem value="user-person-servers">{t('Servers with User Person Records')}</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{getServerAccessTypeDescription(newApp.serverAccessType!)}</p>
                </div>

                {newApp.serverAccessType === 'selected-servers' && (
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground">{t('Select Allowed Servers')}</Label>
                        {serversLoading ? (
                            <div className="p-4 text-center text-muted-foreground">
                                <div className="animate-spin inline-block w-4 h-4 border-2 border-border/50 border-t-primary rounded-full mr-2"></div>
                                {t('Loading available servers...')}
                            </div>
                        ) : servers.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                                <Server className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm">{t('No FHIR servers available')}</p>
                                <p className="text-xs text-muted-foreground">{t('Configure FHIR servers first')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border/50">
                                {servers.map((server) => (
                                    <label key={server.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                                        <Checkbox
                                            checked={(newApp.allowedServerIds || []).includes(server.id)}
                                            onCheckedChange={(checked) => {
                                                const serverIds = checked === true
                                                    ? [...(newApp.allowedServerIds || []), server.id]
                                                    : (newApp.allowedServerIds || []).filter(id => id !== server.id);
                                                updateApp({ allowedServerIds: serverIds });
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
                                                {server.supported ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                <span className="truncate">{server.url}</span>
                                                <Badge variant="outline" className="text-xs">{server.fhirVersion}</Badge>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                        {(newApp.allowedServerIds || []).length > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                                ✓ {(newApp.allowedServerIds || []).length} server(s) selected
                            </div>
                        )}
                    </div>
                )}

                {newApp.serverAccessType === 'user-person-servers' && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">{t('User Person Server Access')}</p>
                                <p className="text-purple-700 dark:text-purple-400 mb-2">
                                    {t('This app will only be able to access FHIR servers where the authenticated user has an associated Person resource.')}
                                </p>
                                <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                                    <li>{t('Server access is determined dynamically at runtime')}</li>
                                    <li>{t('Based on the user\'s Person resource links')}</li>
                                    <li>{t('Provides automatic data governance and access control')}</li>
                                    <li>{t('Only available for interactive applications (not backend services)')}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {newApp.serverAccessType === 'all-servers' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Globe className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-green-800 dark:text-green-300 mb-1">{t('All Server Access')}</p>
                                <p className="text-green-700 dark:text-green-400 text-xs">
                                    {t('This app will have access to all FHIR servers configured behind the Proxy. Use this option for apps that need broad access across all healthcare data sources.')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
