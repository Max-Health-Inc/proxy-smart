import { useState, useEffect, useCallback } from 'react';
import {
  Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Input, Label, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue,
} from '@max-health-inc/shared-ui';
import { Eye, EyeOff, RefreshCw, ExternalLink, Store, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import type { AppStoreApp, PublishedApp, SmartApp } from '@/lib/api-client';

export function AppStoreManagement() {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const [apps, setApps] = useState<AppStoreApp[]>([]);
  const [registeredApps, setRegisteredApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishForm, setPublishForm] = useState<Partial<PublishedApp>>({});
  const [publishing, setPublishing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      const [storeData, registered] = await Promise.all([
        clientApis.appStore.getAdminAppStore(),
        clientApis.smartApps.getAdminSmartApps(),
      ]);
      setApps(storeData.apps);
      setRegisteredApps(registered);
    } catch (error) {
      console.error('Failed to load app store apps:', error);
    } finally {
      setLoading(false);
    }
  }, [clientApis.appStore, clientApis.smartApps]);

  useEffect(() => {
    Promise.all([
      clientApis.appStore.getAdminAppStore(),
      clientApis.smartApps.getAdminSmartApps(),
    ])
      .then(([storeData, registered]) => {
        setApps(storeData.apps);
        setRegisteredApps(registered);
      })
      .catch(error => console.error('Failed to load app store apps:', error))
      .finally(() => setLoading(false));
  }, [clientApis.appStore, clientApis.smartApps]);

  const handleToggle = async (app: AppStoreApp) => {
    setTogglingId(app.id);
    try {
      if (app.hidden) {
        await clientApis.appStore.postAdminAppStoreByAppIdShow({ appId: app.id });
      } else {
        await clientApis.appStore.postAdminAppStoreByAppIdHide({ appId: app.id });
      }
      await loadApps();
    } catch (error) {
      console.error('Failed to toggle app visibility:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnpublish = async (appId: string) => {
    setTogglingId(appId);
    try {
      await clientApis.appStore.postAdminAppStoreByAppIdUnpublish({ appId });
      await loadApps();
    } catch (error) {
      console.error('Failed to unpublish app:', error);
    } finally {
      setTogglingId(null);
    }
  };

  // Apps already in the store (filesystem or published)
  const storeAppIds = new Set(apps.map(a => a.clientId));
  // Registered apps not yet in the store
  const publishableApps = registeredApps.filter(a => a.clientId && !storeAppIds.has(a.clientId));

  const handleSelectApp = (clientId: string) => {
    setSelectedAppId(clientId);
    const app = registeredApps.find(a => a.clientId === clientId);
    if (app) {
      setPublishForm({
        clientId: app.clientId!,
        name: app.name || app.clientId!,
        description: app.description || '',
        launchUrl: app.launchUrl || '',
        category: 'clinical',
        logoUri: app.logoUri || '',
      });
    }
  };

  const handlePublish = async () => {
    if (!publishForm.clientId || !publishForm.name || !publishForm.launchUrl) return;
    setPublishing(true);
    try {
      await clientApis.appStore.postAdminAppStorePublish({
        publishedApp: publishForm as PublishedApp,
      });
      setShowPublishDialog(false);
      setPublishForm({});
      setSelectedAppId('');
      await loadApps();
    } catch (error) {
      console.error('Failed to publish app:', error);
    } finally {
      setPublishing(false);
    }
  };

  const visibleCount = apps.filter(a => !a.hidden).length;
  const hiddenCount = apps.filter(a => a.hidden).length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" onClick={() => setShowPublishDialog(true)} disabled={publishableApps.length === 0}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('Publish App')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('Refresh')}</span>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/apps" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Open Store')}</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-sm">
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
          <p className="mb-2">{t('No apps in the store yet.')}</p>
          <p className="text-xs">{t('Deploy apps to')} <code className="bg-muted px-1 py-0.5 rounded">public/apps/</code> {t('or publish a registered app.')}</p>
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
                  <div className="font-medium text-sm text-foreground truncate flex items-center gap-2">
                    {app.clientName}
                    {app.source === 'registered' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {t('registered')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {app.clientId} · {app.category}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {app.source === 'registered' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnpublish(app.id)}
                    disabled={togglingId === app.id}
                    title={t('Unpublish from store')}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
                <Button
                  variant={app.hidden ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggle(app)}
                  disabled={togglingId === app.id}
                >
                  {app.hidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('Show')}</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('Hide')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Publish App to Store')}</DialogTitle>
            <DialogDescription>
              {t('Select a registered app to publish to the public app store.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Registered App')}</Label>
              <Select value={selectedAppId} onValueChange={handleSelectApp}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select an app...')} />
                </SelectTrigger>
                <SelectContent>
                  {publishableApps.map(app => (
                    <SelectItem key={app.clientId} value={app.clientId!}>
                      {app.name || app.clientId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAppId && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('Display Name')}</Label>
                    <Input
                      value={publishForm.name || ''}
                      onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Category')}</Label>
                    <Select
                      value={publishForm.category || 'clinical'}
                      onValueChange={(v) => setPublishForm(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinical">{getCategoryEmoji('clinical')} {t('Clinical')}</SelectItem>
                        <SelectItem value="administrative">{getCategoryEmoji('admin')} {t('Administrative')}</SelectItem>
                        <SelectItem value="patient">{getCategoryEmoji('patient')} {t('Patient')}</SelectItem>
                        <SelectItem value="imaging">{getCategoryEmoji('imaging')} {t('Imaging')}</SelectItem>
                        <SelectItem value="genomics">{getCategoryEmoji('genomics')} {t('Genomics')}</SelectItem>
                        <SelectItem value="other">{getCategoryEmoji('other')} {t('Other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('Launch URL')}</Label>
                  <Input
                    value={publishForm.launchUrl || ''}
                    onChange={(e) => setPublishForm(prev => ({ ...prev, launchUrl: e.target.value }))}
                    placeholder="https://myapp.example.com/launch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Description')}</Label>
                  <Input
                    value={publishForm.description || ''}
                    onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('Brief description of the app')}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || !publishForm.clientId || !publishForm.launchUrl}
            >
              {publishing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('Publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'clinical': return '\u{1F3E5}';
    case 'genomics': return '\u{1F9EC}';
    case 'imaging': return '\u{1F4F7}';
    case 'patient': return '\u{1F464}';
    case 'admin':
    case 'administrative': return '\u2699\uFE0F';
    case 'consent': return '\u{1F4CB}';
    default: return '\u{1F4F1}';
  }
}
