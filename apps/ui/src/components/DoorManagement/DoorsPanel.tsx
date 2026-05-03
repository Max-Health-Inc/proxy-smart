import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  DoorOpen,
  Unlock,
  RefreshCw,
  Wifi,
  WifiOff,
  Lock,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Badge, Button } from '@max-health-inc/shared-ui';
import { SearchInput } from '../ui/search-input';
import { PageLoadingState } from '../ui/page-loading-state';
import { PageErrorState } from '../ui/page-error-state';
import { EmptyState } from '../ui/empty-state';
import type {
  AccessDoor,
  AccessLocation,
} from '../../lib/api-client';

export function DoorsPanel() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doors, setDoors] = useState<AccessDoor[]>([]);
  const [locations, setLocations] = useState<AccessLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unlocking, setUnlocking] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const fetchData = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setLoading(true);
      const [doorsResponse, locationsResponse] = await Promise.all([
        clientApis.admin.getAdminAccessControlDoors({ limit: 100 }),
        clientApis.admin.getAdminAccessControlLocations({ limit: 100 }),
      ]);
      setDoors(doorsResponse.data);
      setLocations(locationsResponse.data);
    } catch (err) {
      console.error('Failed to fetch doors:', err);
      setError(t('Failed to load doors'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    if (!clientApis) return;
    Promise.all([
      clientApis.admin.getAdminAccessControlDoors({ limit: 100 }),
      clientApis.admin.getAdminAccessControlLocations({ limit: 100 }),
    ])
      .then(([doorsResponse, locationsResponse]) => {
        setDoors(doorsResponse.data);
        setLocations(locationsResponse.data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch doors:', err);
        setError(t('Failed to load doors'));
      })
      .finally(() => setLoading(false));
  }, [clientApis, t]);

  const handleUnlock = useCallback(async (doorId: string) => {
    if (!clientApis) return;
    setUnlocking(prev => ({ ...prev, [doorId]: 'loading' }));
    try {
      await clientApis.admin.postAdminAccessControlDoorsByIdUnlock({ id: doorId });
      setUnlocking(prev => ({ ...prev, [doorId]: 'success' }));
      // Reset status after 3 seconds
      setTimeout(() => {
        setUnlocking(prev => ({ ...prev, [doorId]: 'idle' }));
      }, 3000);
    } catch (err) {
      console.error('Failed to unlock door:', err);
      setUnlocking(prev => ({ ...prev, [doorId]: 'error' }));
      setTimeout(() => {
        setUnlocking(prev => ({ ...prev, [doorId]: 'idle' }));
      }, 3000);
    }
  }, [clientApis]);

  const getLocationName = useCallback((locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name ?? locationId;
  }, [locations]);

  if (loading) {
    return <PageLoadingState message={t('Loading doors...')} />;
  }

  if (error) {
    return (
      <PageErrorState
        title={error}
        onRetry={fetchData}
        retryLabel={t('Retry')}
      />
    );
  }

  // Filter doors by search query
  const filteredDoors = doors.filter(door =>
    door.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getLocationName(door.locationId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group doors by location
  const doorsByLocation = filteredDoors.reduce<Record<string, AccessDoor[]>>((acc, door) => {
    const key = door.locationId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(door);
    return acc;
  }, {});

  const sortedLocationIds = Object.keys(doorsByLocation).sort((a, b) =>
    getLocationName(a).localeCompare(getLocationName(b))
  );

  return (
    <div className="space-y-4">
      {/* Search and Refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder={t('Search doors...')}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {t('{{count}} door(s)', { count: filteredDoors.length })}
        </div>
      </div>

      {/* Doors grouped by location */}
      {filteredDoors.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={searchQuery ? t('No doors match your search') : t('No doors found')}
        />
      ) : (
        <div className="space-y-6">
          {sortedLocationIds.map(locationId => (
            <div key={locationId} className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {/* Location Header */}
              <div className="px-4 py-3 bg-muted/30 border-b border-border/30 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {getLocationName(locationId)}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {t('{{count}} door(s)', { count: doorsByLocation[locationId].length })}
                </Badge>
              </div>

              {/* Door Cards */}
              <div className="divide-y divide-border/30">
                {doorsByLocation[locationId].map(door => {
                  const unlockStatus = unlocking[door.id] || 'idle';
                  return (
                    <div
                      key={door.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <DoorOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{door.name}</div>
                          {door.type && (
                            <span className="text-xs text-muted-foreground">{door.type}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Online Status */}
                        <Badge variant={door.online ? 'default' : 'secondary'} className="text-xs">
                          {door.online ? (
                            <><Wifi className="h-3 w-3 mr-1" />{t('Online')}</>
                          ) : (
                            <><WifiOff className="h-3 w-3 mr-1" />{t('Offline')}</>
                          )}
                        </Badge>

                        {/* Lock Status */}
                        {door.locked !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {door.locked ? (
                              <><Lock className="h-3 w-3 mr-1" />{t('Locked')}</>
                            ) : (
                              <><Unlock className="h-3 w-3 mr-1" />{t('Unlocked')}</>
                            )}
                          </Badge>
                        )}

                        {/* Unlock Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlock(door.id)}
                          disabled={!door.online || unlockStatus === 'loading'}
                          className="min-w-[90px]"
                        >
                          {unlockStatus === 'loading' ? (
                            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t('Unlocking')}</>
                          ) : unlockStatus === 'success' ? (
                            <><CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />{t('Unlocked')}</>
                          ) : unlockStatus === 'error' ? (
                            <><AlertCircle className="h-4 w-4 mr-1 text-destructive" />{t('Failed')}</>
                          ) : (
                            <><Unlock className="h-4 w-4 mr-1" />{t('Unlock')}</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
