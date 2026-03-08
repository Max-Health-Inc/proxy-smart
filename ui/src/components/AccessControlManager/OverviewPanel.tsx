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
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import type { AccessOverviewResponse } from '../../lib/api-client';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  color?: string;
}

function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

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
      console.error('Failed to fetch access control overview:', err);
      setError(t('Failed to load overview data'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
        <span className="ml-3 text-muted-foreground">{t('Loading overview...')}</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || t('Failed to load overview')}</p>
        <Button variant="outline" size="sm" onClick={fetchOverview}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Retry')}
        </Button>
      </div>
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
        <StatCard
          icon={<MapPin className="h-5 w-5 text-primary" />}
          label={t('Locations')}
          value={locations.pagination.count}
          subtitle={t('{{count}} location(s) configured', { count: locations.pagination.count })}
        />
        <StatCard
          icon={<DoorOpen className="h-5 w-5 text-primary" />}
          label={t('Doors')}
          value={doors.pagination.count}
          subtitle={t('{{online}} online, {{offline}} offline', { online: onlineDoors, offline: offlineDoors })}
        />
        <StatCard
          icon={<Layers className="h-5 w-5 text-primary" />}
          label={t('Groups')}
          value={groups.pagination.count}
          subtitle={t('Access groups')}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label={t('Members')}
          value={members.pagination.count}
          subtitle={t('Registered members')}
        />
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
