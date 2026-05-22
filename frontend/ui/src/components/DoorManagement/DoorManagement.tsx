import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  DoorOpen,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge, Button, Spinner } from '@proxy-smart/shared-ui';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@proxy-smart/shared-ui';
import type {
  AccessHealthResponse,
} from '../../lib/api-client';
import { OverviewPanel } from './OverviewPanel';
import { DoorsPanel } from './DoorsPanel';
import { GroupsPanel } from './GroupsPanel';
import { MembersPanel } from './MembersPanel';
import { EventsPanel } from './EventsPanel';
import { ConfigureProviderPanel } from './ConfigureProviderPanel';

export function DoorManagement() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<AccessHealthResponse | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const fetchHealth = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      const result = await clientApis.admin.getAdminAccessControlHealth();
      setHealth(result);
    } catch (err) {
      console.error('Failed to fetch door management health:', err);
      setError(t('Failed to check door management status'));
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    if (!clientApis) return;
    clientApis.admin.getAdminAccessControlHealth()
      .then(result => { setHealth(result); setError(null); })
      .catch(err => {
        console.error('Failed to fetch door management health:', err);
        setError(t('Failed to check door management status'));
        setHealth(null);
      })
      .finally(() => setLoading(false));
  }, [clientApis, t]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
          <span className="ml-3 text-muted-foreground">{t('Checking door management status...')}</span>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
        <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DoorOpen className="h-6 w-6 text-foreground" />
              <h1 className="text-3xl font-medium text-foreground tracking-tight">{t('Door Management')}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('Retry')}
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('Unable to Connect')}</h3>
          <p className="text-muted-foreground max-w-md">
            {error || t('Could not reach the door management service. Please check your configuration.')}
          </p>
        </div>
      </div>
    );
  }

  if (!health.configured) {
    return (
      <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
        <ConfigureProviderPanel onSuccess={() => {
          setLoading(true);
          fetchHealth();
        }} />
      </div>
    );
  }

  // Determine which tabs to show based on capabilities
  const capabilities = health.capabilities;
  const showGroups = capabilities?.groups ?? false;
  const showMembers = capabilities?.members ?? false;
  const showEvents = capabilities?.events ?? false;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <DoorOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-foreground tracking-tight">{t('Door Management')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={health.connected ? 'default' : 'destructive'}>
                  {health.connected ? (
                    <><Wifi className="h-3 w-3 mr-1" />{t('Connected')}</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" />{t('Disconnected')}</>
                  )}
                </Badge>
                {health.provider && (
                  <Badge variant="outline" className="capitalize">
                    {health.provider}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <ResponsiveTabsList columns={5}>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="doors">{t('Doors')}</TabsTrigger>
          {showGroups && <TabsTrigger value="groups">{t('Groups')}</TabsTrigger>}
          {showMembers && <TabsTrigger value="members">{t('Members')}</TabsTrigger>}
          {showEvents && <TabsTrigger value="events">{t('Events')}</TabsTrigger>}
        </ResponsiveTabsList>

        <TabsContent value="overview" className="p-6 space-y-6">
          <OverviewPanel />
        </TabsContent>

        <TabsContent value="doors" className="p-6 space-y-6">
          <DoorsPanel />
        </TabsContent>

        {showGroups && (
          <TabsContent value="groups" className="p-6 space-y-6">
            <GroupsPanel />
          </TabsContent>
        )}

        {showMembers && (
          <TabsContent value="members" className="p-6 space-y-6">
            <MembersPanel capabilities={capabilities} />
          </TabsContent>
        )}

        {showEvents && (
          <TabsContent value="events" className="p-6 space-y-6">
            <EventsPanel />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
}
