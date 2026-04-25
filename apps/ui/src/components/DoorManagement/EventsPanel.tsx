import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  RefreshCw,
  Clock,
  DoorOpen,
  User,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Badge, Button } from '@proxy-smart/shared-ui';
import { SearchInput } from '../ui/search-input';
import { PageLoadingState } from '../ui/page-loading-state';
import { PageErrorState } from '../ui/page-error-state';
import { EmptyState } from '../ui/empty-state';
import type { AccessEvent } from '../../lib/api-client';

const PAGE_SIZE = 25;

export function EventsPanel() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setNotConfigured(false);
      setLoading(true);

      // Check if access control is configured before fetching events
      const health = await clientApis.admin.getAdminAccessControlHealth();
      if (!health.configured) {
        setNotConfigured(true);
        return;
      }

      const response = await clientApis.admin.getAdminAccessControlEvents({
        limit: PAGE_SIZE,
        offset,
      });
      setEvents(response.data);
      setTotalCount(response.pagination.count);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(t('Failed to load events'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t, offset]);

  useEffect(() => {
    if (!clientApis) return;
    clientApis.admin.getAdminAccessControlHealth()
      .then(health => {
        if (!health.configured) {
          setNotConfigured(true);
          return;
        }
        return clientApis.admin.getAdminAccessControlEvents({ limit: PAGE_SIZE, offset });
      })
      .then(response => {
        if (response) {
          setEvents(response.data);
          setTotalCount(response.pagination.count);
        }
        setError(null);
        setNotConfigured(prev => prev);
      })
      .catch(err => {
        console.error('Failed to fetch events:', err);
        setError(t('Failed to load events'));
      })
      .finally(() => setLoading(false));
  }, [clientApis, t, offset]);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const getActionColor = (action: string): string => {
    if (action.includes('unlock')) return 'text-emerald-500';
    if (action.includes('create')) return 'text-blue-500';
    if (action.includes('delete') || action.includes('remove')) return 'text-destructive';
    if (action.includes('sync')) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('unlock')) return 'default';
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    return 'outline';
  };

  // Filter events by search query
  const filteredEvents = events.filter(event =>
    event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.message ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.actorEmail ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.objectType ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (loading && events.length === 0) {
    return <PageLoadingState message={t('Loading events...')} />;
  }

  if (notConfigured) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('Door access monitoring is not available')}
        description={t('Configure a door management provider (KISI or UniFi Access) to view access events.')}
      />
    );
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

  return (
    <div className="space-y-4">
      {/* Search and Refresh */}
      <div className="flex items-center gap-3">
        <SearchInput
          placeholder={t('Search events...')}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {t('{{count}} event(s)', { count: totalCount })}
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={searchQuery ? t('No events match your search') : t('No events recorded yet')}
        />
      ) : (
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border/30">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                {/* Action Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {event.action.includes('door') || event.action.includes('unlock') ? (
                    <DoorOpen className={`h-4 w-4 ${getActionColor(event.action)}`} />
                  ) : event.actorType === 'user' || event.action.includes('member') ? (
                    <User className={`h-4 w-4 ${getActionColor(event.action)}`} />
                  ) : (
                    <Activity className={`h-4 w-4 ${getActionColor(event.action)}`} />
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionBadgeVariant(event.action)} className="text-xs">
                      {event.action}
                    </Badge>
                    {event.objectType && (
                      <span className="text-xs text-muted-foreground">{event.objectType}</span>
                    )}
                  </div>
                  {event.message && (
                    <p className="text-sm text-foreground truncate">{event.message}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {event.actorEmail && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.actorEmail}
                      </span>
                    )}
                    {event.doorId && (
                      <span className="flex items-center gap-1">
                        <DoorOpen className="h-3 w-3" />
                        {event.doorId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(event.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('Previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('Page {{current}} of {{total}}', { current: currentPage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= totalCount || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            {t('Next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
