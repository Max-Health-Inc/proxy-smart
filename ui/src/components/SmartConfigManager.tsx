import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScopeManager } from './ScopeManager';
import { LaunchContextManager } from './LaunchContextManager';

export function SmartConfigManager() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('scopes');

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('SMART Configuration')}
                        </h1>
                        <div className="text-muted-foreground flex items-center text-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Target className="w-5 h-5 text-primary" />
                            </div>
                            {t('Scopes & Launch Context')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start mb-6">
                    <TabsTrigger value="scopes" className="px-6 py-2.5">
                        <Target className="w-4 h-4 mr-2" />
                        {t('Scopes')}
                    </TabsTrigger>
                    <TabsTrigger value="launch-context" className="px-6 py-2.5">
                        <Play className="w-4 h-4 mr-2" />
                        {t('Launch Context')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="scopes" className="mt-0">
                    <ScopeManager />
                </TabsContent>

                <TabsContent value="launch-context" className="mt-0">
                    <LaunchContextManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
