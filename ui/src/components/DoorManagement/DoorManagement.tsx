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
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Spinner } from '../ui/spinner';
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
    fetchHealth();
  }, [fetchHealth]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
          <span className="ml-3 text-muted-foreground">{t('Checking door management status...')}</span>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DoorOpen className="h-6 w-6 text-foreground" />
            <h2 className="text-2xl font-bold text-foreground">{t('Door Management')}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('Retry')}
          </Button>
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
      <div className="p-6 sm:p-8">
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
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-6 w-6 text-foreground" />
          <h2 className="text-2xl font-bold text-foreground">{t('Door Management')}</h2>
          <Badge variant={health.connected ? 'default' : 'destructive'} className="ml-2">
            {health.connected ? (
              <><Wifi className="h-3 w-3 mr-1" />{t('Connected')}</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" />{t('Disconnected')}</>
            )}
          </Badge>
          {health.provider && (
            <Badge variant="outline" className="ml-1 capitalize">
              {health.provider}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="doors">{t('Doors')}</TabsTrigger>
          {showGroups && <TabsTrigger value="groups">{t('Groups')}</TabsTrigger>}
          {showMembers && <TabsTrigger value="members">{t('Members')}</TabsTrigger>}
          {showEvents && <TabsTrigger value="events">{t('Events')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel />
        </TabsContent>

        <TabsContent value="doors">
          <DoorsPanel />
        </TabsContent>

        {showGroups && (
          <TabsContent value="groups">
            <GroupsPanel />
          </TabsContent>
        )}

        {showMembers && (
          <TabsContent value="members">
            <MembersPanel capabilities={capabilities} />
          </TabsContent>
        )}

        {showEvents && (
          <TabsContent value="events">
            <EventsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
