import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Label } from '@proxy-smart/shared-ui';
import {
  Check,
  AlertCircle,
  Server,
  Shield,
  Info
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { createClientApis } from '@/lib/apiClient';
import { useTranslation } from 'react-i18next';

interface KeycloakConfigFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function KeycloakConfigForm({ onSuccess, onCancel }: KeycloakConfigFormProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [realm, setRealm] = useState('');
  const [adminClientId, setAdminClientId] = useState('');
  const [adminClientSecret, setAdminClientSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const clientApis = useMemo(() => createClientApis(), []); // No auth needed for these endpoints

  // Pre-populate form with current Keycloak configuration
  useEffect(() => {
    clientApis.admin.getAdminKeycloakConfigStatus().then((status) => {
      if (status.baseUrl) setBaseUrl(status.baseUrl);
      if (status.realm) setRealm(status.realm);
      if (status.adminClientId) setAdminClientId(status.adminClientId);
    }).catch(() => {
      // Fallback defaults if status endpoint is unreachable
      setBaseUrl((prev) => prev || 'http://localhost:8080');
      setRealm((prev) => prev || 'proxy-smart');
    });
  }, [clientApis]);

  const handleTest = async () => {
    if (!baseUrl.trim() || !realm.trim()) {
      setError('Please enter both Keycloak URL and realm name');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await clientApis.admin.postAdminKeycloakConfigTest({
        testKeycloakConnectionRequest: {
          baseUrl: baseUrl.trim(),
          realm: realm.trim()
        }
      });

      setTestResult({
        success: result.success,
        message: result.message || result.error || 'Test completed'
      });
    } catch (err) {
      console.error('Failed to test Keycloak connection:', err);
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check the URL and try again.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim() || !realm.trim()) {
      setError('Please enter both Keycloak URL and realm name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await clientApis.admin.postAdminKeycloakConfigConfigure({
        saveKeycloakConfigRequest: {
          baseUrl: baseUrl.trim(),
          realm: realm.trim(),
          adminClientId: adminClientId.trim() || undefined,
          adminClientSecret: adminClientSecret.trim() || undefined
        }
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save Keycloak configuration:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-background min-h-full">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center shadow-2xl">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
            {t('Keycloak Configuration')}
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            {t('Configure your identity provider to enable secure authentication')}
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

      {/* Configuration Form */}
      <div className="bg-card/70 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-border/50 shadow-lg space-y-8">
        {/* Server Configuration */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{t('Server Configuration')}</h3>
              <p className="text-muted-foreground">{t('Basic connection settings for your Keycloak server')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="baseUrl" className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>{t('Keycloak Base URL')}</span>
              </Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="http://localhost:8080"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={testing || saving}
                className="h-12 rounded-xl border-border/50 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground flex items-start space-x-2">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{t('The complete URL where your Keycloak server is running')}</span>
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="realm" className="text-sm font-semibold text-foreground">
                {t('Realm Name')}
              </Label>
              <Input
                id="realm"
                placeholder="proxy-smart"
                value={realm}
                onChange={(e) => setRealm(e.target.value)}
                disabled={testing || saving}
                className="h-12 rounded-xl border-border/50 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground flex items-start space-x-2">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{t('The Keycloak realm that contains your users and clients')}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Admin Client Configuration */}
        <div className="border-t border-border/30 pt-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{t('Admin Client')} 
                <span className="text-sm font-normal text-muted-foreground ml-2">({t('Optional')})</span>
              </h3>
              <p className="text-muted-foreground">{t('Required for dynamic client registration and advanced features')}</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">{t('Optional Configuration')}</h4>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  {t('You can skip this section and configure it later. The admin client is only needed for automatic SMART app registration.')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="adminClientId" className="text-sm font-semibold text-foreground">
                {t('Admin Client ID')}
              </Label>
              <Input
                id="adminClientId"
                placeholder="admin-client"
                value={adminClientId}
                onChange={(e) => setAdminClientId(e.target.value)}
                disabled={testing || saving}
                className="h-12 rounded-xl border-border/50 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                {t('Client ID with admin permissions for dynamic registration')}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="adminClientSecret" className="text-sm font-semibold text-foreground">
                {t('Admin Client Secret')}
              </Label>
              <Input
                id="adminClientSecret"
                type="password"
                placeholder={t('Enter client secret...')}
                value={adminClientSecret}
                onChange={(e) => setAdminClientSecret(e.target.value)}
                disabled={testing || saving}
                className="h-12 rounded-xl border-border/50 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                {t('Secret for the admin client (keep this secure)')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <LoadingButton
          variant="outline"
          onClick={handleTest}
          loading={testing}
          loadingText={t('Testing Connection...')}
          disabled={saving || !baseUrl.trim() || !realm.trim()}
          className="flex-1 h-14 rounded-xl text-base font-semibold border-border/50 bg-background/50 hover:bg-accent/50 transition-all duration-200"
        >
          <Server className="w-5 h-5 mr-3" />
          {t('Test Connection')}
        </LoadingButton>

        <LoadingButton
          onClick={handleSave}
          loading={saving}
          loadingText={t('Saving Configuration...')}
          disabled={testing || !baseUrl.trim() || !realm.trim()}
          className="flex-1 h-14 rounded-xl text-base font-semibold transition-all duration-200"
        >
          <Shield className="w-5 h-5 mr-3" />
          {t('Save & Connect')}
        </LoadingButton>

        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={testing || saving}
          className="h-14 px-8 rounded-xl text-base font-semibold hover:bg-accent/50 transition-all duration-200"
        >
          {t('Cancel')}
        </Button>
      </div>
    </div>
  );
}