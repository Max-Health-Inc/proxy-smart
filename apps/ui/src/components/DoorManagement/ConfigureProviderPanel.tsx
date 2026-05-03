import { useState } from 'react';
import { useAuth } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  DoorOpen,
  Check,
  AlertCircle,
  Server,
  Key,
  Globe,
  User,
  Lock,
} from 'lucide-react';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import type {
  TestAccessControlConfigResponse,
} from '../../lib/api-client';
import { TestAccessControlConfigRequestProviderEnum } from '../../lib/api-client';

type ProviderType = 'kisi' | 'unifi-access';

interface ConfigureProviderPanelProps {
  onSuccess: () => void;
}

export function ConfigureProviderPanel({ onSuccess }: ConfigureProviderPanelProps) {
  const { clientApis } = useAuth();
  const { t } = useTranslation();

  const [provider, setProvider] = useState<ProviderType>('kisi');

  // Kisi fields
  const [kisiApiKey, setKisiApiKey] = useState('');
  const [kisiBaseUrl, setKisiBaseUrl] = useState('https://api.kisi.io');

  // UniFi fields
  const [unifiHost, setUnifiHost] = useState('');
  const [unifiUsername, setUnifiUsername] = useState('');
  const [unifiPassword, setUnifiPassword] = useState('');

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; capabilities?: TestAccessControlConfigResponse['capabilities'] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = provider === 'kisi'
    ? kisiApiKey.trim().length > 0
    : unifiHost.trim().length > 0 && unifiUsername.trim().length > 0 && unifiPassword.trim().length > 0;

  const buildPayload = () => ({
    provider: provider === 'kisi'
      ? TestAccessControlConfigRequestProviderEnum.Kisi
      : TestAccessControlConfigRequestProviderEnum.UnifiAccess,
    ...(provider === 'kisi'
      ? { kisiApiKey: kisiApiKey.trim(), kisiBaseUrl: kisiBaseUrl.trim() || undefined }
      : { unifiHost: unifiHost.trim(), unifiUsername: unifiUsername.trim(), unifiPassword: unifiPassword.trim() }),
  });

  const handleTest = async () => {
    if (!clientApis || !isValid) return;

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await clientApis.admin.postAdminAccessControlConfigTest({
        testAccessControlConfigRequest: buildPayload(),
      });

      setTestResult({
        success: result.success,
        message: result.message || result.error || 'Test completed',
        capabilities: result.capabilities,
      });
    } catch (err) {
      console.error('Config test failed:', err);
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check your credentials.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!clientApis || !isValid) return;

    setSaving(true);
    setError(null);

    try {
      const result = await clientApis.admin.postAdminAccessControlConfigConfigure({
        testAccessControlConfigRequest: buildPayload(),
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Config save failed:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center shadow-2xl">
          <DoorOpen className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            {t('Configure Door Management')}
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            {t('Connect a physical access control provider to manage doors')}
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">{t('Configuration Error')}</h4>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div className={`${
          testResult.success
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
        } border rounded-2xl p-4`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              testResult.success
                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                : 'bg-red-100 dark:bg-red-900/50'
            }`}>
              {testResult.success ? (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h4 className={`font-semibold ${
                testResult.success
                  ? 'text-emerald-800 dark:text-emerald-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {testResult.success ? t('Connection Successful') : t('Connection Failed')}
              </h4>
              <p className={`text-sm ${
                testResult.success
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {testResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card/70 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-border/50 shadow-lg space-y-8">
        {/* Provider Selection */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Server className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{t('Provider')}</h3>
              <p className="text-muted-foreground">{t('Select the access control system you want to connect')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="provider" className="text-sm font-semibold text-foreground">
              {t('Provider Type')}
            </Label>
            <Select value={provider} onValueChange={(v: string) => { setProvider(v as ProviderType); setTestResult(null); setError(null); }}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kisi">{t('Kisi (Cloud)')}</SelectItem>
                <SelectItem value="unifi-access">{t('UniFi Access (Local)')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Provider-specific fields */}
        {provider === 'kisi' ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{t('Kisi Credentials')}</h3>
                <p className="text-muted-foreground">{t('Enter your Kisi API key from the Kisi dashboard')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="kisiApiKey" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Key className="w-4 h-4" />
                <span>{t('API Key')}</span>
              </Label>
              <Input
                id="kisiApiKey"
                type="password"
                placeholder={t('Enter your Kisi API key')}
                value={kisiApiKey}
                onChange={(e) => setKisiApiKey(e.target.value)}
                disabled={testing || saving}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="kisiBaseUrl" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>{t('Base URL')} ({t('optional')})</span>
              </Label>
              <Input
                id="kisiBaseUrl"
                type="url"
                placeholder="https://api.kisi.io"
                value={kisiBaseUrl}
                onChange={(e) => setKisiBaseUrl(e.target.value)}
                disabled={testing || saving}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{t('UniFi Access Credentials')}</h3>
                <p className="text-muted-foreground">{t('Enter your UniFi Access controller details')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="unifiHost" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>{t('Controller Host')}</span>
              </Label>
              <Input
                id="unifiHost"
                type="text"
                placeholder="https://192.168.1.1:12443"
                value={unifiHost}
                onChange={(e) => setUnifiHost(e.target.value)}
                disabled={testing || saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="unifiUsername" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>{t('Username')}</span>
                </Label>
                <Input
                  id="unifiUsername"
                  type="text"
                  placeholder="admin"
                  value={unifiUsername}
                  onChange={(e) => setUnifiUsername(e.target.value)}
                  disabled={testing || saving}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="unifiPassword" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>{t('Password')}</span>
                </Label>
                <Input
                  id="unifiPassword"
                  type="password"
                  placeholder={t('Enter password')}
                  value={unifiPassword}
                  onChange={(e) => setUnifiPassword(e.target.value)}
                  disabled={testing || saving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/50">
          <LoadingButton
            variant="outline"
            onClick={handleTest}
            disabled={!isValid || saving}
            loading={testing}
            loadingText={t('Testing...')}
          >
            <Server className="w-4 h-4 mr-2" />{t('Test Connection')}
          </LoadingButton>

          <LoadingButton
            onClick={handleSave}
            disabled={!isValid}
            loading={saving}
            loadingText={t('Saving...')}
          >
            <Check className="w-4 h-4 mr-2" />{t('Save & Connect')}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
