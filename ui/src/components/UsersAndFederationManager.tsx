import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, FolderSync } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { HealthcareUsersManager } from './HealthcareUsersManager/HealthcareUsersManager';
import { UserFederationManager } from './UserFederationManager/UserFederationManager';

export function UsersAndFederationManager() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('User Management')}
                        </h1>
                        <div className="text-muted-foreground flex items-center text-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            {t('Users & Federation')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start mb-6">
                    <TabsTrigger value="users" className="px-6 py-2.5">
                        <Users className="w-4 h-4 mr-2" />
                        {t('Users')}
                    </TabsTrigger>
                    <TabsTrigger value="federation" className="px-6 py-2.5">
                        <FolderSync className="w-4 h-4 mr-2" />
                        {t('User Federation')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-0">
                    <HealthcareUsersManager />
                </TabsContent>

                <TabsContent value="federation" className="mt-0">
                    <UserFederationManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
