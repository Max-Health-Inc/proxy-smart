import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { openidService } from '../service/openid-service';
import { getSessionItem, removeSessionItem } from '@/lib/storage';
import type { PublicIdentityProvider } from '../lib/api-client/models';
import { KeycloakConfigForm } from './KeycloakConfigForm';
import { AuthDebugPanel } from './AuthDebugPanel';
import { logger } from '@/lib/logger';
import { 
  Heart, 
  Shield, 
  LogIn, 
  Loader2,
  Lock,
  Stethoscope,
  Globe,
  Building2,
  Users,
  ArrowRight,
  AlertTriangle,
  Settings,
  Bug,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@proxy-smart/shared-ui';
import { useTranslation } from 'react-i18next';

export function LoginForm() {
  const { t } = useTranslation();

  // Parse OAuth callback params + validate PKCE synchronously (runs exactly once)
  const [oauthCallback] = useState<{ error: string } | { code: string; codeVerifier: string } | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const urlError = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (code || urlError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlError) {
      logger.error('LoginForm: OAuth error present in URL', { error: urlError, errorDescription });
      return { error: `Authentication failed: ${errorDescription || urlError}. Please try again or use the troubleshooting panel below.` };
    }

    if (code && state) {
      const codeVerifier = getSessionItem('pkce_code_verifier');
      const storedState = getSessionItem('oauth_state');

      if (!codeVerifier) {
        removeSessionItem('oauth_state');
        return { error: 'Missing PKCE code verifier - please try logging in again' };
      }
      if (state !== storedState) {
        removeSessionItem('pkce_code_verifier');
        removeSessionItem('oauth_state');
        return { error: 'Invalid state parameter - please try logging in again' };
      }

      return { code, codeVerifier };
    }

    return null;
  });

  const pendingCodeExchange = oauthCallback && 'code' in oauthCallback ? oauthCallback : null;

  const [loading, setLoading] = useState(!!pendingCodeExchange);
  const [error, setError] = useState<string | null>(oauthCallback && 'error' in oauthCallback ? oauthCallback.error : null);
  const [availableIdps, setAvailableIdps] = useState<PublicIdentityProvider[]>([]);
  const [loadingIdps, setLoadingIdps] = useState(true);
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const isProcessingCodeExchange = useRef(false);
  const { initiateLogin, exchangeCodeForToken, clientApis } = useAuthStore();

  // Fetch available identity providers
  const fetchAvailableIdps = useCallback(async (signal?: { aborted: boolean }) => {
    try {
      setLoadingIdps(true);
      logger.info('LoginForm: fetching identity providers...');
      const idps = await clientApis.auth.getAuthIdentityProviders();
      if (signal?.aborted) return;
      
      // Filter to only show enabled identity providers
      const enabledIdps = idps.filter((idp: PublicIdentityProvider) => idp.enabled !== false);
      logger.info('LoginForm: identity providers fetched', { count: enabledIdps.length });
      setAvailableIdps(enabledIdps);
    } catch (error) {
      if (signal?.aborted) return;
      console.warn('Could not fetch identity providers (this is normal for public access):', error);
      logger.warn('LoginForm: failed to fetch identity providers', error);
      // Don't show this as an error to users - it's expected when not authenticated
      setAvailableIdps([]);
    } finally {
      if (!signal?.aborted) setLoadingIdps(false);
    }
  }, [clientApis.auth]);

  // Check if authentication is configured
  const checkAuthAvailability = useCallback(async (signal?: { aborted: boolean }) => {
    try {
      logger.info('LoginForm: checking authentication availability...');
      const available = await openidService.isAuthenticationAvailable();
      if (signal?.aborted) return;
      setAuthAvailable(available);
      logger.info('LoginForm: auth availability', { available });
      if (!available) {
        setError('Keycloak is not configured. Please contact your administrator.');
        setLoadingIdps(false); // Stop loading IdPs if auth is not available
      } else {
        setError(null); // Clear any previous errors
        // Only fetch IdPs if authentication is available
        fetchAvailableIdps(signal);
      }
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Failed to check auth availability:', error);
      logger.error('LoginForm: auth availability check failed', error);
      setAuthAvailable(false);
      setError('Unable to verify authentication configuration. Please try again later.');
      setLoadingIdps(false); // Stop loading IdPs on error
    }
  }, [fetchAvailableIdps]);

  // Handler for successful Keycloak configuration
  const handleConfigSuccess = useCallback(() => {
    setShowConfigForm(false);
    setAuthAvailable(null); // Reset to trigger re-check
    setError(null);
    // Re-check availability and reload IdPs
    checkAuthAvailability();
  }, [checkAuthAvailability]);

  // Handler for canceling Keycloak configuration
  const handleConfigCancel = useCallback(() => {
    setShowConfigForm(false);
  }, []);

  // Load IdPs and check auth availability on component mount
  useEffect(() => {
    const signal = { aborted: false };
    logger.info('LoginForm mounted');

    openidService.isAuthenticationAvailable()
      .then(available => {
        if (signal.aborted) return;
        setAuthAvailable(available);
        logger.info('LoginForm: auth availability', { available });
        if (!available) {
          setError('Keycloak is not configured. Please contact your administrator.');
          setLoadingIdps(false);
          return;
        }
        setError(null);
        return clientApis.auth.getAuthIdentityProviders();
      })
      .then(idps => {
        if (signal.aborted || !idps) return;
        const enabledIdps = idps.filter((idp: PublicIdentityProvider) => idp.enabled !== false);
        logger.info('LoginForm: identity providers fetched', { count: enabledIdps.length });
        setAvailableIdps(enabledIdps);
      })
      .catch(error => {
        if (signal.aborted) return;
        console.error('Failed to check auth availability:', error);
        logger.error('LoginForm: auth availability check failed', error);
        setAuthAvailable(false);
        setError('Unable to verify authentication configuration. Please try again later.');
      })
      .finally(() => {
        if (!signal.aborted) setLoadingIdps(false);
      });

    return () => { signal.aborted = true; };
  }, [clientApis.auth]);

  // Execute OAuth code exchange (all validation already done during init)
  useEffect(() => {
    if (!pendingCodeExchange) return;
    if (isProcessingCodeExchange.current) return;
    isProcessingCodeExchange.current = true;

    logger.info('LoginForm: found code/state in URL – exchanging');
    exchangeCodeForToken(pendingCodeExchange.code, pendingCodeExchange.codeVerifier)
      .then(() => logger.info('LoginForm: code exchange successful'))
      .catch(err => {
        removeSessionItem('pkce_code_verifier');
        removeSessionItem('oauth_state');
        logger.error('LoginForm: code exchange failed', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      })
      .finally(() => {
        setLoading(false);
        isProcessingCodeExchange.current = false;
      });
  }, [exchangeCodeForToken, pendingCodeExchange]);

  const handleLogin = async (idpAlias?: string) => {
    // Check if authentication is available before proceeding
    if (authAvailable === false) {
      setError('Authentication is not configured. Please contact your administrator.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      logger.info('LoginForm: initiating login', { idpAlias });
      // Pass the IdP alias as a hint to the authentication service
      await initiateLogin(idpAlias);
    } catch (err) {
      logger.error('LoginForm: initiateLogin failed', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setLoading(false);
    }
  };

  // If the configuration form is shown, render it instead
  if (showConfigForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <KeycloakConfigForm 
          onSuccess={handleConfigSuccess}
          onCancel={handleConfigCancel}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-6 border border-border rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-foreground animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">{t('Authenticating')}</h3>
            <p className="text-muted-foreground text-sm">{t('Please wait while we verify your credentials...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto mb-6 border border-border rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground mb-1">{t('Proxy Smart')}</h1>
          <p className="text-muted-foreground text-sm">{t('Healthcare Administration')}</p>
        </div>
        
        {/* Content */}
        <div className="space-y-6">
          {error && (
            <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state for IdPs */}
          {(loadingIdps || authAvailable === null) && (
            <div className="text-center py-6">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('Loading authentication options...')}</p>
            </div>
          )}

          {/* Authentication not configured */}
          {authAvailable === false && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-4 border border-border rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">{t('Authentication Not Configured')}</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {t('Keycloak is not yet configured on this server.')}
              </p>
              
              <Button
                onClick={() => setShowConfigForm(true)}
                className="w-full py-3"
              >
                <Settings className="w-4 h-4" />
                {t('Configure Keycloak')}
              </Button>
            </div>
          )}

          {/* Authentication available - show login options */}
          {authAvailable === true && (
            <>
              {/* Available Identity Providers */}
              {availableIdps.length > 0 && (
                <div className="space-y-3">
                  {availableIdps.map((idp) => (
                    <Button
                      key={idp.alias}
                      variant="outline"
                      onClick={() => handleLogin(idp.alias)}
                      className="w-full py-3 h-auto justify-between group"
                      disabled={loading}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                          {idp.providerId === 'saml' && <Building2 className="w-4 h-4" />}
                          {idp.providerId === 'oidc' && <Globe className="w-4 h-4" />}
                          {idp.providerId === 'google' && <Users className="w-4 h-4" />}
                          {!['saml', 'oidc', 'google'].includes(idp.providerId) && <Shield className="w-4 h-4" />}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">
                            {idp.displayName || idp.alias}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {idp.providerId}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                  ))}
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 bg-background text-muted-foreground text-xs">or</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Default OpenID Connect Login */}
              <Button
                onClick={() => handleLogin()}
                className="w-full py-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('Signing in...')}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {availableIdps.length > 0 ? 'Default Authentication' : 'Sign in with OpenID Connect'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
        
        {/* Security info */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('Secure authentication via OpenID Connect. Your credentials are never stored on this application.')}
            </p>
          </div>
        </div>
        
        {/* Features */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{t('FHIR Compliant')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>{t('SMART on FHIR')}</span>
          </div>
        </div>

        {/* Debug Panel Toggle */}
        <div className="mt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <Bug className="w-3 h-3" />
            Troubleshooting
            {showDebugPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          
          {showDebugPanel && (
            <div className="mt-4">
              <AuthDebugPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
