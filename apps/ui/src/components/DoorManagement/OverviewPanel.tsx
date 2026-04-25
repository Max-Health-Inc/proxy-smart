import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  DoorOpen,
  Users,
  Layers,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { StatCard } from '../ui/stat-card';
import { PageLoadingState } from '../ui/page-loading-state';
import { PageErrorState } from '../ui/page-error-state';
import type { AccessOverviewResponse } from '../../lib/api-client';

export function OverviewPanel() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AccessOverviewResponse | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setLoading(true);
      const result = await clientApis.admin.getAdminAccessControlOverview();
      setOverview(result);
    } catch (err) {
      console.error('Failed to fetch door management overview:', err);
      setError(t('Failed to load overview data'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    if (!clientApis) return;
    clientApis.admin.getAdminAccessControlOverview()
      .then(result => { setOverview(result); setError(null); })
      .catch(err => {
        console.error('Failed to fetch door management overview:', err);
        setError(t('Failed to load overview data'));
      })
      .finally(() => setLoading(false));
  }, [clientApis, t]);

  if (loading) {
    return <PageLoadingState message={t('Loading overview...')} />;
  }

  if (error || !overview) {
    return (
      <PageErrorState
        title={error || t('Failed to load overview')}
        onRetry={fetchOverview}
        retryLabel={t('Retry')}
      />
    );
  }

  const locations = overview.locations;
  const doors = overview.doors;
  const groups = overview.groups;
  const members = overview.members;

  const onlineDoors = doors.data.filter(d => d.online).length;
  const offlineDoors = doors.data.filter(d => !d.online).length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MapPin} label={t('Locations')} value={locations.pagination.count} subtitle={t('{{count}} location(s) configured', { count: locations.pagination.count })} color="primary" />
        <StatCard icon={DoorOpen} label={t('Doors')} value={doors.pagination.count} subtitle={t('{{online}} online, {{offline}} offline', { online: onlineDoors, offline: offlineDoors })} color="primary" />
        <StatCard icon={Layers} label={t('Groups')} value={groups.pagination.count} subtitle={t('Door groups')} color="primary" />
        <StatCard icon={Users} label={t('Members')} value={members.pagination.count} subtitle={t('Registered members')} color="primary" />
      </div>

      {/* Door Status Summary */}
      {doors.data.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('Door Status')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {doors.data.map(door => (
              <div
                key={door.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-background"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <DoorOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{door.name}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {door.online ? (
                    <span className="flex items-center text-xs text-emerald-500">
                      <Wifi className="h-3 w-3 mr-1" />
                      {t('Online')}
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-destructive">
                      <WifiOff className="h-3 w-3 mr-1" />
                      {t('Offline')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations Summary */}
      {locations.data.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('Locations')}</h3>
          <div className="space-y-2">
            {locations.data.map(location => (
              <div
                key={location.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-background"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{location.name}</span>
                </div>
                {location.address && (
                  <span className="text-xs text-muted-foreground">{location.address}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
