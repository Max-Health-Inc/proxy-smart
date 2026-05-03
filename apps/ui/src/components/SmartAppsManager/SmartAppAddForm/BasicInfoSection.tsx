import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData } from '@/lib/types/api';
import type { SmartAppType, AuthenticationType } from './helpers';
import {
    isInteractive,
    requiresRedirectUri,
    hasFixedAuthType,
    getAuthTypeDescription,
    getRedirectUriHelperText,
    isAgent,
} from './helpers';

interface BasicInfoSectionProps {
    newApp: SmartAppFormData;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
    updateAppType: (appType: SmartAppType) => void;
}

export function BasicInfoSection({ newApp, updateApp, updateAppType }: BasicInfoSectionProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground">{t('Application Name')}</Label>
                    <Input
                        id="name"
                        placeholder="e.g., Clinical Decision Support"
                        value={newApp.name}
                        onChange={(e) => updateApp({ name: e.target.value })}
                        className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                        required
                    />
                </div>
                <div className="space-y-3">
                    <Label htmlFor="clientId" className="text-sm font-semibold text-foreground">{t('Client ID')}</Label>
                    <Input
                        id="clientId"
                        placeholder="e.g., app-client-123"
                        value={newApp.clientId}
                        onChange={(e) => updateApp({ clientId: e.target.value })}
                        className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label htmlFor="appType" className="text-sm font-semibold text-foreground">{t('Application Type')}</Label>
                    <Select value={newApp.appType} onValueChange={(v) => updateAppType(v as SmartAppType)} required>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standalone-app">{t('Standalone App (Interactive)')}</SelectItem>
                            <SelectItem value="ehr-launch">{t('EHR Launch App (Interactive)')}</SelectItem>
                            <SelectItem value="backend-service">{t('Backend Service (Non-interactive, Deterministic)')}</SelectItem>
                            <SelectItem value="agent">{t('AI Agent (Non-interactive, Autonomous)')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {isInteractive(newApp.appType) && (
                    <div className="space-y-3">
                        <Label htmlFor="authenticationType" className="text-sm font-semibold text-foreground">{t('Authentication Type')}</Label>
                        <Select
                            value={newApp.authenticationType}
                            onValueChange={(v) => updateApp({ authenticationType: v as AuthenticationType })}
                            required
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asymmetric">{t('Asymmetric Client Authentication')}</SelectItem>
                                <SelectItem value="symmetric">{t('Symmetric Client Authentication')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {hasFixedAuthType(newApp.appType) && (
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground">{t('Authentication Type')}</Label>
                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                            <span className="text-sm font-medium text-foreground">{t('Asymmetric (Required)')}</span>
                            <p className="text-xs text-muted-foreground mt-1">{getAuthTypeDescription(newApp.appType!)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Redirect URI */}
            <div className="space-y-3">
                <Label htmlFor="redirectUri" className="text-sm font-semibold text-foreground">{t('Redirect URI')}</Label>
                <Input
                    id="redirectUri"
                    type="url"
                    placeholder="https://your-app.com/callback"
                    value={(newApp.redirectUris || [])[0] || ''}
                    onChange={(e) => updateApp({ redirectUris: e.target.value ? [e.target.value] : [] })}
                    className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                    required={requiresRedirectUri(newApp.appType!)}
                    disabled={!requiresRedirectUri(newApp.appType!)}
                />
                {!requiresRedirectUri(newApp.appType!) && (
                    <p className="text-xs text-muted-foreground">{getRedirectUriHelperText(newApp.appType!)}</p>
                )}
                {isAgent(newApp.appType!) && (
                    <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">{t('Agent Flow Characteristics')}</p>
                                <p className="text-purple-700 dark:text-purple-400 mb-2">
                                    {t('Autonomous agents operate like backend services (no user login) but with non-deterministic, self-initiated behavior:')}
                                </p>
                                <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                                    <li><strong>{t('No interactive login')}</strong> - Uses client credentials like backend services</li>
                                    <li><strong>{t('Non-deterministic')}</strong> - Makes autonomous decisions based on environmental triggers</li>
                                    <li><strong>{t('Dynamic identity')}</strong> - fhirUser resolved to specific Device resource at runtime</li>
                                    <li><strong>{t('Self-initiated')}</strong> - Actions triggered by AI/ML algorithms, not scheduled tasks</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="space-y-3">
                <Label htmlFor="description" className="text-sm font-semibold text-foreground">{t('Description')}</Label>
                <Input
                    id="description"
                    placeholder={t('Brief description of the application')}
                    value={newApp.description}
                    onChange={(e) => updateApp({ description: e.target.value })}
                    className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                />
            </div>
        </>
    );
}
