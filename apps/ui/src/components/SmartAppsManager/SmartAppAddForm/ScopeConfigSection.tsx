import { Badge, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData, ScopeSet } from '@/lib/types/api';

interface ScopeConfigSectionProps {
    newApp: SmartAppFormData;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
    scopeSets: ScopeSet[];
    getScopeSetName: (scopeSetId?: string) => string;
}

export function ScopeConfigSection({ newApp, updateApp, scopeSets, getScopeSetName }: ScopeConfigSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Scope Configuration')}</h4>
                    <p className="text-muted-foreground text-sm font-medium">{t('Define what data this application can access')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label htmlFor="scopeSet" className="text-sm font-semibold text-foreground">{t('Scope Template')}</Label>
                    <Select
                        value={newApp.scopeSetId || "__custom__"}
                        onValueChange={(v) => updateApp({ scopeSetId: v === "__custom__" ? "" : v })}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__custom__">{t('Custom Scopes')}</SelectItem>
                            {scopeSets.map(set => (
                                <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="customScopes" className="text-sm font-semibold text-foreground">{t('Additional Scopes')}</Label>
                    <Input
                        id="customScopes"
                        placeholder="patient/Patient.read, user/Observation.read"
                        value={(newApp.optionalClientScopes || []).join(', ')}
                        onChange={(e) => updateApp({
                            optionalClientScopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        })}
                        className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                    />
                </div>
            </div>

            {(newApp.scopeSetId || (newApp.optionalClientScopes || []).length > 0) && (
                <div className="bg-card/70 p-4 rounded-lg border border-border/50">
                    <Label className="text-sm font-semibold text-foreground mb-2 block">{t('Current Scope Preview')}</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                        {t('Template:')} <span className="font-medium">{getScopeSetName(newApp.scopeSetId)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {newApp.scopeSetId && scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-mono">
                                {scope}
                            </Badge>
                        ))}
                        {(newApp.optionalClientScopes || []).map((scope: string, index: number) => (
                            <Badge key={`optional-${index}`} variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-mono">
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
