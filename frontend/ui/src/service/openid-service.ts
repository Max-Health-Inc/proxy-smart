import { config } from '@/config';
import { AuthenticationApi, Configuration } from '../lib/api-client';
import type { TokenRequest } from '../lib/api-client';

interface OpenIDConfig {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string;
}

class OpenIDService {
  private readonly config: OpenIDConfig;
  private readonly authApi: AuthenticationApi;

  constructor() {
    this.config = {
      baseUrl: config.api.baseUrl,
      clientId: 'admin-ui',
      redirectUri: window.location.origin + config.app.baseUrl,
      scope: 'openid profile email',
    };

    console.debug('OpenID Service Config:', this.config);

    // Create API client
    const apiConfig = new Configuration({
      basePath: this.config.baseUrl,
    });
    this.authApi = new AuthenticationApi(apiConfig);
  }

  async getAuthorizationUrl(idpHint?: string): Promise<{ url: string; codeVerifier: string; state: string }> {
    // Check if authentication is configured
    try {
      const authConfig = await this.authApi.getAuthConfig();
      if (!authConfig.keycloak.isConfigured) {
        throw new Error('Authentication is not configured. Please contact your administrator.');
      }
    } catch (error) {
      console.error('Failed to check auth configuration:', error);
      throw new Error('Unable to verify authentication configuration. Please try again later.', { cause: error });
    }

    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Use the generated API client to get the authorization URL
    const authUrl = new URL('/auth/authorize', this.config.baseUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authUrl.searchParams.set('scope', this.config.scope);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    // Add IdP hint if provided (Keycloak-specific parameter)
    if (idpHint) {
      authUrl.searchParams.set('kc_idp_hint', idpHint);
      console.debug('Using Identity Provider hint:', idpHint);
    }

    console.debug('Generated Authorization URL:', authUrl.href);
    console.debug('Redirect URI:', this.config.redirectUri);

    return {
      url: authUrl.href,
      codeVerifier,
      state,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<{
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    console.debug('OpenID Service: Starting token exchange...');
    console.debug('Token exchange request details:', {
      codeLength: code.length,
      codeVerifierLength: codeVerifier.length,
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      hasClientSecret: !!this.config.clientSecret
    });
    
    const tokenRequest: TokenRequest = {
      grantType: 'authorization_code',
      code,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
      codeVerifier,
    };

    try {
      const response = await this.authApi.postAuthToken({
        tokenRequest: tokenRequest,
      });

      console.debug('Token response received:', {
        hasAccessToken: !!response.accessToken,
        hasIdToken: !!response.idToken,
        hasRefreshToken: !!response.refreshToken,
        expiresIn: response.expiresIn
      });

      return {
        access_token: response.accessToken || '',
        id_token: response.idToken || undefined,
        refresh_token: response.refreshToken,
        expires_in: response.expiresIn,
      };
    } catch (error) {
      console.error('Token exchange API call failed:', error);

      let enrichedError: Error | null = null;

      // Try to extract more detailed error information
      if (error && typeof error === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = error as any;

        // Check if it's a ResponseError with response details
        if (errorObj.response) {
          try {
            const responseText = await errorObj.response.text();
            console.error('🚨 Token exchange error response body:', responseText);

            // Try to parse as JSON
            try {
              const errorDetails = JSON.parse(responseText);
              console.error('📋 Parsed error details:', errorDetails);

              // Create a more descriptive error message
              if (errorDetails.error) {
                const message = `OAuth error: ${errorDetails.error}${errorDetails.error_description ? ` - ${errorDetails.error_description}` : ''}`;
                enrichedError = new Error(message);
              }
            } catch (parseError) {
              console.error('Could not parse error response as JSON (token exchange):', parseError);
            }
          } catch (textError) {
            console.error('Could not read error response text (token exchange):', textError);
          }
        }

        // Log the error structure for debugging
        try {
          console.error('🔍 Error object details:', {
            name: errorObj.name,
            message: errorObj.message,
            status: errorObj.status,
            statusText: errorObj.statusText,
            url: errorObj.url,
            keys: Object.keys(errorObj)
          });
        } catch {
          // ignore structured log errors
        }
      }

      throw (enrichedError ?? error);
    }
  }

  async fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await this.authApi.getAuthUserinfo({
      authorization: `Bearer ${accessToken}`,
    });

    // Convert the typed response to a generic object
    return response as unknown as Record<string, unknown>;
  }

  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    console.debug('OpenID Service: Starting token refresh...');
    
    try {
      const response = await this.authApi.postAuthToken({
        tokenRequest: {
          grantType: 'refresh_token',
          refreshToken,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        },
      });

      console.debug('Refresh token response received:', {
        hasAccessToken: !!response.accessToken,
        hasIdToken: !!response.idToken,
        hasRefreshToken: !!response.refreshToken,
        expiresIn: response.expiresIn
      });

      return {
        access_token: response.accessToken || '',
        id_token: response.idToken,
        refresh_token: response.refreshToken,
        expires_in: response.expiresIn,
      };
    } catch (error) {
      console.error('Token refresh API call failed:', error);

      let enrichedError: Error | null = null;

      // Try to extract more detailed error information for refresh token errors
      if (error && typeof error === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = error as any;

        if (errorObj.response) {
          try {
            const responseText = await errorObj.response.text();
            console.error('🚨 Token refresh error response body:', responseText);

            try {
              const errorDetails = JSON.parse(responseText);
              console.error('📋 Parsed refresh error details:', errorDetails);

              if (errorDetails.error) {
                const message = `Token refresh failed: ${errorDetails.error}${errorDetails.error_description ? ` - ${errorDetails.error_description}` : ''}`;
                enrichedError = new Error(message);
              }
            } catch (parseError) {
              console.error('Could not parse refresh error response as JSON (token refresh):', parseError);
            }
          } catch (textError) {
            console.error('Could not read refresh error response text (token refresh):', textError);
          }
        }
      }

      throw (enrichedError ?? error);
    }
  }

  getLogoutUrl(idToken?: string): string {
    const logoutUrl = new URL('/auth/logout', this.config.baseUrl);
    logoutUrl.searchParams.set('post_logout_redirect_uri', this.config.redirectUri);
    logoutUrl.searchParams.set('client_id', this.config.clientId);
    
    if (idToken) {
      logoutUrl.searchParams.set('id_token_hint', idToken);
    }
    
    // Add additional parameters to ensure complete logout
    // This helps with Keycloak session cleanup, especially on shared deployments
    logoutUrl.searchParams.set('logout_hint', 'complete');
    
    // Add a timestamp to prevent caching issues
    logoutUrl.searchParams.set('_t', Date.now().toString());
    
    return logoutUrl.href;
  }

  async isAuthenticationAvailable(): Promise<boolean> {
    try {
      const authConfig = await this.authApi.getAuthConfig();
      return authConfig.keycloak.isConfigured;
    } catch (error) {
      console.error('Failed to check auth configuration:', error);
      return false;
    }
  }

  // Helper methods for PKCE
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private base64URLEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const openidService = new OpenIDService();
