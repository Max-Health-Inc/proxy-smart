import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@proxy-smart/shared-ui';
import { PageLoadingState } from '@/components/ui/page-loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Info,
} from 'lucide-react';
import { adminApiCall } from '@/lib/admin-api';
import { useTranslation } from 'react-i18next';

interface FrontendUrlState {
  frontendUrl: string | null;
  effectiveTokenEndpoint: string | null;
  realm: string | null;
}

export function BackendServicesSettings() {
  const { t } = useTranslation();
  const [state, setState] = useState<FrontendUrlState>({ frontendUrl: null, effectiveTokenEndpoint: null, realm: null });
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadFrontendUrl();
  }, []);

  const loadFrontendUrl = async () => {
    try {
      const res = await adminApiCall<FrontendUrlState>('/admin/keycloak-config/frontend-url');
      setState(res);
      setInputUrl(res.frontendUrl || '');
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load frontend URL',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFrontendUrl = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await adminApiCall<{ success: boolean; message?: string; error?: string; frontendUrl?: string | null }>(
        '/admin/keycloak-config/frontend-url',
        'POST',
        { frontendUrl: inputUrl.trim() }
      );
      if (res.success) {
        setMessage({ type: 'success', text: res.message || t('Frontend URL updated successfully') });
        await loadFrontendUrl();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update frontend URL' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save frontend URL',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoadingState message={t('Loading Backend Services settings...')} />;
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          {t('SMART Backend Services (client_credentials + private_key_jwt) requires Keycloak to accept JWTs with an audience matching the proxy\'s token endpoint. Setting the Frontend URL tells Keycloak what its canonical token URL is.')}
        </AlertDescription>
      </Alert>

      {/* Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}
          className={message.type === 'success' ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20' : undefined}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : undefined}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Frontend URL Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-primary" />
            {t('Keycloak Frontend URL')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadFrontendUrl} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('Reload')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="rounded-lg border border-border/50 p-4 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Current Frontend URL')}</span>
              <span className="font-mono text-foreground">
                {state.frontendUrl || <span className="text-muted-foreground italic">{t('Not set')}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Effective Token Endpoint')}</span>
              <span className="font-mono text-xs text-foreground break-all">
                {state.effectiveTokenEndpoint || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Realm')}</span>
              <span className="font-mono text-foreground">{state.realm || '—'}</span>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <Label htmlFor="frontendUrl" className="text-sm font-medium">
              {t('Frontend URL')}
            </Label>
            <Input
              id="frontendUrl"
              type="url"
              placeholder="https://your-proxy.example.com/auth"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              disabled={saving}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('Set this to the base URL that clients use to reach Keycloak via the proxy. For example, if your SMART token endpoint is')}{' '}
              <code className="text-xs bg-muted px-1 rounded">https://proxy.example.com/auth/realms/proxy-smart/protocol/openid-connect/token</code>{' '}
              {t('then set this to')}{' '}
              <code className="text-xs bg-muted px-1 rounded">https://proxy.example.com/auth</code>
            </p>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button onClick={saveFrontendUrl} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? t('Saving...') : t('Save Frontend URL')}
            </Button>
            {inputUrl && (
              <Button variant="outline" onClick={() => { setInputUrl(''); saveFrontendUrl(); }} disabled={saving}>
                {t('Clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it works explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('How Backend Services Authentication Works')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <ol className="list-decimal list-inside space-y-2">
            <li>{t('Client discovers token_endpoint from .well-known/smart-configuration')}</li>
            <li>{t('Client builds a signed JWT with aud set to the discovered token endpoint')}</li>
            <li>{t('Client sends client_assertion to the proxy\'s /auth/token endpoint')}</li>
            <li>{t('Proxy forwards the request to Keycloak\'s real token endpoint')}</li>
            <li>{t('Keycloak validates the JWT audience against its Frontend URL + realm path')}</li>
          </ol>
          <p className="pt-2 border-t border-border/50">
            <strong>{t('If Frontend URL is not set:')}</strong>{' '}
            {t('Keycloak uses its internal URL for audience validation, which won\'t match what clients send. Backend Services requests will fail with "Invalid token audience".')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
