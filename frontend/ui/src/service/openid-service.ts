// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { config } from '@/config';
import { AuthenticationApi, Configuration } from '@max-health-inc/proxy-smart-client';
import type { TokenRequest } from '@max-health-inc/proxy-smart-client';
import { logger } from '@/lib/logger';

interface OpenIDConfig {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string;
}

/**
 * The shape the generated client throws on an HTTP failure: an Error, plus the
 * original Response for a non-2xx. Declared narrowly rather than as `any`, so
 * reading any field off it stays a deliberate act.
 */
interface ApiCallError {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusText?: unknown;
  url?: unknown;
  response?: { text?: () => Promise<string> };
}

/**
 * Turn a failed OAuth call into an error that names the reason.
 *
 * The client's own message is generic — the OAuth error and description are in the
 * response body, so read that when it is present. The token-exchange and refresh
 * paths did this identically with a copy each; `prefix` is the only thing that
 * differed between them.
 */
async function enrichOAuthError(error: unknown, prefix: string, label: string): Promise<Error | null> {
  if (!error || typeof error !== 'object') return null;
  const err = error as ApiCallError;

  let enriched: Error | null = null;
  const response = err.response;
  if (response && typeof response.text === 'function') {
    try {
      const body = await response.text();
      console.error(`${label} error response body:`, body);
      try {
        const details: unknown = JSON.parse(body);
        if (details && typeof details === 'object' && 'error' in details) {
          const parsed = details as { error?: unknown; error_description?: unknown };
          const description =
            typeof parsed.error_description === 'string' ? ` - ${parsed.error_description}` : '';
          enriched = new Error(`${prefix}: ${String(parsed.error)}${description}`);
        }
      } catch (parseError) {
        console.error(`Could not parse error response as JSON (${label}):`, parseError);
      }
    } catch (textError) {
      console.error(`Could not read error response text (${label}):`, textError);
    }
  }

  try {
    console.error('Error object details:', {
      name: err.name,
      message: err.message,
      status: err.status,
      statusText: err.statusText,
      url: err.url,
      keys: Object.keys(error),
    });
  } catch {
    // ignore structured log errors
  }

  return enriched;
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

    logger.debug('OpenID service configured', this.config);

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
      logger.debug('Using identity provider hint', { idpHint });
    }

    logger.debug('Generated authorization URL', { url: authUrl.href });
    logger.debug('Redirect URI', { redirectUri: this.config.redirectUri });

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
    logger.debug('Starting token exchange');
    logger.debug('Token exchange request', {
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

      logger.debug('Token response received', {
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

      const enrichedError = await enrichOAuthError(error, 'OAuth error', 'Token exchange');

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
    logger.debug('Starting token refresh');
    
    try {
      const response = await this.authApi.postAuthToken({
        tokenRequest: {
          grantType: 'refresh_token',
          refreshToken,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        },
      });

      logger.debug('Refresh token response received', {
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

      const enrichedError = await enrichOAuthError(error, 'Token refresh failed', 'Token refresh');

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
