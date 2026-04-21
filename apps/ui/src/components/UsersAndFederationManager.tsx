import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, FolderSync, Plus } from 'lucide-react';
import { Button, Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui';
import { HealthcareUsersManager } from './HealthcareUsersManager/HealthcareUsersManager';
import { UserFederationManager } from './UserFederationManager/UserFederationManager';

export function UsersAndFederationManager() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('users');
    const [showAddUser, setShowAddUser] = useState(false);

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('User Management')}
                        </h1>
                        <div className="text-muted-foreground text-lg flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            {t('Manage healthcare professionals, administrative users, and identity federation')}
                        </div>
                    </div>
                    {activeTab === 'users' && (
                        <Button onClick={() => setShowAddUser(true)}>
                            <Plus className="h-4 w-4" />
                            {t('Add New User')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs in card */}
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <ResponsiveTabsList columns={2}>
                        <TabsTrigger value="users" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Users className="w-4 h-4" />
                            <span>{t('Users')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="federation" className="flex items-center space-x-2 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <FolderSync className="w-4 h-4" />
                            <span>{t('User Federation')}</span>
                        </TabsTrigger>
                    </ResponsiveTabsList>

                    <TabsContent value="users" className="p-6 space-y-6">
                        <HealthcareUsersManager embedded addUserOpen={showAddUser} onAddUserOpenChange={setShowAddUser} />
                    </TabsContent>

                    <TabsContent value="federation" className="p-6 space-y-6">
                        <UserFederationManager embedded />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
