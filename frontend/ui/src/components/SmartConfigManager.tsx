import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Play, Shield, Link, ShieldCheck, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui';
import { ScopeManager } from './ScopeManager';
import { LaunchContextManager } from './LaunchContextManager';
import { ProtocolMappersManager } from './ProtocolMappersManager';
import { ConsentSettings } from './ConsentSettings';
import { AccessControlSettings } from './AccessControlSettings';

export function SmartConfigManager() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('scopes');

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('SMART Configuration')}
                        </h1>
                        <div className="text-muted-foreground text-lg flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            {t('Manage FHIR resource scopes and application launch contexts')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs in card */}
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <ResponsiveTabsList columns={5}>
                        <TabsTrigger value="scopes" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Target className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Scopes')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="launch-context" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Play className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Launch Context')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="mappers" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Link className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Protocol Mappers')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="consent" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Consent Enforcement')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="access-control" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Lock className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('Access Control')}</span>
                        </TabsTrigger>
                    </ResponsiveTabsList>

                    <TabsContent value="scopes" className="p-6 space-y-6">
                        <ScopeManager embedded />
                    </TabsContent>

                    <TabsContent value="launch-context" className="p-6 space-y-6">
                        <LaunchContextManager embedded />
                    </TabsContent>

                    <TabsContent value="mappers" className="p-6 space-y-6">
                        <ProtocolMappersManager embedded />
                    </TabsContent>

                    <TabsContent value="consent" className="p-6 space-y-6">
                        <ConsentSettings />
                    </TabsContent>

                    <TabsContent value="access-control" className="p-6 space-y-6">
                        <AccessControlSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
