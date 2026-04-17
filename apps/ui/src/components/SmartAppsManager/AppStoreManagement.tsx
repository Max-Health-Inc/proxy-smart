import { useState, useEffect, useCallback } from 'react';
import { Badge, Button } from '@proxy-smart/shared-ui';
import { Eye, EyeOff, RefreshCw, ExternalLink, Store } from 'lucide-react';
import { config } from '@/config';
import { getItem } from '@/lib/storage';
import { useTranslation } from 'react-i18next';

interface AppStoreApp {
  id: string;
  launch_url: string;
  client_id: string;
  client_name: string;
  description: string;
  category: string;
  icon: string;
  hidden: boolean;
}

interface AppStoreResponse {
  apps: AppStoreApp[];
  hiddenAppIds: string[];
  updatedAt: string;
}

async function getToken(): Promise<string | null> {
  try {
    const tokens = await getItem<{ access_token: string }>('openid_tokens');
    return tokens?.access_token || null;
  } catch {
    return null;
  }
}

async function fetchAppStore(): Promise<AppStoreResponse> {
  const token = await getToken();
  const res = await fetch(`${config.api.baseUrl}/admin/app-store`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch app store: ${res.status}`);
  return res.json();
}

async function toggleVisibility(appId: string, hidden: boolean): Promise<AppStoreResponse> {
  const token = await getToken();
  const action = hidden ? 'show' : 'hide';
  const res = await fetch(`${config.api.baseUrl}/admin/app-store/${encodeURIComponent(appId)}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to ${action} app: ${res.status}`);
  return res.json();
}

export function AppStoreManagement() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<AppStoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAppStore();
      setApps(data.apps);
    } catch (error) {
      console.error('Failed to load app store apps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  const handleToggle = async (app: AppStoreApp) => {
    setTogglingId(app.id);
    try {
      const result = await toggleVisibility(app.id, app.hidden);
      // Update local state with new hidden status
      setApps(prev =>
        prev.map(a => ({
          ...a,
          hidden: result.hiddenAppIds.includes(a.id),
        })),
      );
    } catch (error) {
      console.error('Failed to toggle app visibility:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const visibleCount = apps.filter(a => !a.hidden).length;
  const hiddenCount = apps.filter(a => a.hidden).length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('App Store Visibility')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('Control which apps appear on the public')} <code className="text-xs bg-muted px-1 py-0.5 rounded">/apps</code> {t('page')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/apps" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              {t('Open Store')}
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm">
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
          <Eye className="w-3 h-3 mr-1" /> {visibleCount} {t('visible')}
        </Badge>
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
          <EyeOff className="w-3 h-3 mr-1" /> {hiddenCount} {t('hidden')}
        </Badge>
      </div>

      {/* App list */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t('Loading apps...')}</div>
      ) : apps.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {t('No apps discovered. Deploy SMART apps to the')} <code className="bg-muted px-1 py-0.5 rounded text-xs">public/apps/</code> {t('directory.')}
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg divide-y divide-border/50">
          {apps.map(app => (
            <div
              key={app.id}
              className={`flex items-center justify-between px-4 py-3 transition-colors ${app.hidden ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-sm">
                  {getCategoryEmoji(app.category)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {app.client_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {app.client_id} · {app.category}
                  </div>
                </div>
              </div>
              <Button
                variant={app.hidden ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToggle(app)}
                disabled={togglingId === app.id}
                className="shrink-0 ml-3"
              >
                {app.hidden ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    {t('Show')}
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    {t('Hide')}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'clinical': return '🏥';
    case 'genomics': return '🧬';
    case 'imaging': return '📷';
    case 'patient': return '👤';
    case 'admin': return '⚙️';
    case 'consent': return '📋';
    default: return '📱';
  }
}
