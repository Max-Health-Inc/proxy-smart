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
  Search,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
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
    fetchData();
  }, [fetchData]);

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
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
        <span className="ml-3 text-muted-foreground">{t('Loading doors...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('Retry')}
        </Button>
      </div>
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search doors...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <div className="text-center py-12">
          <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? t('No doors match your search') : t('No doors found')}
          </p>
        </div>
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
