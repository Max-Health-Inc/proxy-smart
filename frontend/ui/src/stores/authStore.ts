// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { openidService } from '../service/openid-service';
import { clientApis, setAuthErrorHandler, type ClientApis } from '@/lib/apiClient';
import {
  registerRefreshHandler,
  readStoredTokens as getStoredTokens,
  getValidAccessToken,
  needsRenewal,
  TOKEN_STORAGE_KEY,
  type StoredTokens as TokenData,
} from '../lib/tokenRefresh';
import {
  storeItem,
  removeItem,
  setSessionItem,
  removeSessionItem,
  clearAllAuthData,
  clearAuthorizationCodeData
} from '@/lib/storage';
import type { UserProfile } from '@/lib/types/api';
import { logger } from '@/lib/logger';

const storeTokens = async (tokens: TokenData): Promise<void> => {
  await storeItem(TOKEN_STORAGE_KEY, tokens);
};

const clearTokens = async (): Promise<void> => {
  await removeItem(TOKEN_STORAGE_KEY);
};

/** Usable without a round trip to the token endpoint (renewal skew included). */
const isTokenValid = (tokens: TokenData): boolean => !needsRenewal(tokens);

const transformUserProfile = (userInfo: Record<string, unknown>): UserProfile => {
  const safeString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  };

  return {
    id: safeString(userInfo.sub) || '',
    name: [{ text: safeString(userInfo.name || userInfo.preferred_username || userInfo.email) || 'User' }],
    username: safeString(userInfo.preferred_username || userInfo.email) || '',
    email: safeString(userInfo.email) || '',
    firstName: safeString(userInfo.given_name) || '',
    lastName: safeString(userInfo.family_name) || '',
    roles: Array.isArray(userInfo.roles) ? userInfo.roles.map(String) : [],
  };
};

interface AuthState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  /**
   * The shared client set. Stable across the session — clients resolve their
   * bearer token per request, so there is nothing to rebuild when tokens change.
   */
  clientApis: ClientApis;
  isInitializing: boolean; // Add flag to track initialization

  initiateLogin: (idpHint?: string) => Promise<void>;
  exchangeCodeForToken: (code: string, codeVerifier: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
  /** @internal */
  _doInitialize: () => Promise<void>;
}

// Module-level lock to prevent overlapping initialize() calls (StrictMode, rehydration + effect, etc.)
let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      isInitializing: true,
      clientApis,

      // Proper initialization method that handles all auth setup
      initialize: async () => {
        if (!get().isInitializing) return; // Already initialized
        // Deduplicate: if an init is already in flight, wait for it instead of starting a new one
        if (initPromise) return initPromise;
        initPromise = (async () => {
          try {
            await get()._doInitialize();
          } finally {
            initPromise = null;
          }
        })();
        return initPromise;
      },

      // Internal initialization logic (called only once via initialize())
      _doInitialize: async () => {
        
        // If there's an active OAuth callback (code+state in URL), don't interfere —
        // let LoginForm handle the code exchange with the stored PKCE verifier.
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') && urlParams.has('state')) {
          set({
            isAuthenticated: false,
            isInitializing: false,
            loading: false
          });
          return;
        }

        set({ isInitializing: true, loading: true });

        try {
          const tokens = await getStoredTokens();

          if (!tokens) {
            // No tokens found
            set({
              isAuthenticated: false,
              profile: null,
              isInitializing: false,
              loading: false
            });
            return;
          }

          if (isTokenValid(tokens)) {
            // Valid tokens found
            set({
              isAuthenticated: true,
              isInitializing: false,
              loading: false
            });

            // Fetch profile if needed
            if (!get().profile) {
              await get().fetchProfile();
            }
            return;
          }

          // Tokens expired, try to refresh if we have refresh token
          if (tokens.refresh_token) {
            logger.info('Tokens expired, attempting refresh');
            try {
              await get().refreshTokens();
              set({ isInitializing: false });
              
              // Fetch profile after successful refresh
              if (!get().profile) {
                await get().fetchProfile();
              }
            } catch (refreshError) {
              console.warn('Token refresh failed during initialization:', refreshError);
              
              // Check if this is an invalid_grant error (tokens are completely invalid)
              const isInvalidGrant = refreshError instanceof Error && 
                (refreshError.message.includes('invalid_grant') || 
                 refreshError.message.includes('Token is not active'));
              
              if (isInvalidGrant) {
                if (import.meta.env.DEV) console.warn('Tokens are invalid, clearing auth state');
                // Clear everything — user will see the login page and can re-authenticate
                await clearAllAuthData();
              } else {
                // Other error, just clear tokens and stay on page
                await clearTokens();
              }
              set({
                isAuthenticated: false,
                profile: null,
                isInitializing: false,
                loading: false
              });
            }
          } else {
            // No refresh token, clear everything
            logger.info('No refresh token available, clearing auth state');
            await clearTokens();
            set({
              isAuthenticated: false,
              profile: null,
              isInitializing: false,
              loading: false
            });
          }
        } catch (error) {
          console.error('Error during auth initialization:', error);
          await clearTokens();
          set({
            isAuthenticated: false,
            profile: null,
            isInitializing: false,
            loading: false,
            error: 'Initialization failed'
          });
        }
      },

      // Actions
      initiateLogin: async (idpHint?: string) => {
        set({ loading: true, error: null });
        
        try {
          // Clean up any existing session data before starting new login
          removeSessionItem('pkce_code_verifier');
          removeSessionItem('oauth_state');
          
          const { url, codeVerifier, state } = await openidService.getAuthorizationUrl(idpHint);
          
          // Store PKCE parameters for callback
          setSessionItem('pkce_code_verifier', codeVerifier);
          setSessionItem('oauth_state', state);
          
          // Redirect to authorization server
          window.location.href = url;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initiate login';
          // Clean up on error
          removeSessionItem('pkce_code_verifier');
          removeSessionItem('oauth_state');
          set({ loading: false, error: errorMessage });
        }
      },

      exchangeCodeForToken: async (code: string, codeVerifier: string) => {
        set({ loading: true, error: null });

        try {
          const tokens = await openidService.exchangeCodeForTokens(code, codeVerifier);
          
          const tokenData: TokenData = {
            access_token: tokens.access_token,
            id_token: tokens.id_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
          };
          
          await storeTokens(tokenData);
          set({ isAuthenticated: true });
          
          // Immediately clear authorization code data to prevent reuse
          clearAuthorizationCodeData();

          // Fetch user profile
          await get().fetchProfile();
          
          // Clear session storage
          removeSessionItem('pkce_code_verifier');
          removeSessionItem('oauth_state');
          
        } catch (error) {
          console.error('Token exchange failed:', error);
          
          // IMPORTANT: Clean up session data even on error to prevent contamination
          removeSessionItem('pkce_code_verifier');
          removeSessionItem('oauth_state');
          
          const errorMessage = error instanceof Error ? error.message : 'Token exchange failed';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          await clearTokens();
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      fetchProfile: async () => {
        // Renews first when the token is expiring: an about-to-expire token is a
        // reason to refresh, not to drop the session.
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          set({ profile: null, isAuthenticated: false });
          await clearTokens();
          return;
        }

        set({ loading: true, error: null });

        try {
          const userInfo = await openidService.fetchUserInfo(accessToken);
          const profile = transformUserProfile(userInfo);
          
          set({ 
            profile, 
            isAuthenticated: true, 
            loading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user profile';
          set({ 
            profile: null, 
            isAuthenticated: false, 
            loading: false, 
            error: errorMessage 
          });
          await clearTokens();
        }
      },

      refreshTokens: async () => {
        const tokens = await getStoredTokens();
        if (!tokens?.refresh_token) {
          console.warn('No refresh token available');
          throw new Error('No refresh token available');
        }

        set({ loading: true, error: null });

        try {
          const newTokens = await openidService.refreshToken(tokens.refresh_token);
          
          const tokenData: TokenData = {
            access_token: newTokens.access_token,
            id_token: newTokens.id_token || tokens.id_token,
            refresh_token: newTokens.refresh_token || tokens.refresh_token,
            expires_at: newTokens.expires_in ? Math.floor(Date.now() / 1000) + newTokens.expires_in : undefined,
          };
          
          await storeTokens(tokenData);
          set({ isAuthenticated: true, loading: false });

          logger.debug('Tokens refreshed successfully');
        } catch (error) {
          console.error('Token refresh failed:', error);
          set({ loading: false });
          // Don't automatically logout here - let the API client handle that
          // This prevents competing logout calls
          throw error;
        }
      },

      logout: async () => {
        const tokens = await getStoredTokens();
        
        logger.info('Initiating logout with tokens', {
          hasAccessToken: !!tokens?.access_token,
          hasIdToken: !!tokens?.id_token,
          hasRefreshToken: !!tokens?.refresh_token
        });
        
        // Clear all auth state immediately
        set({ 
          profile: null, 
          isAuthenticated: false, 
          error: null, 
          loading: false,
          isInitializing: true // Reset to allow fresh initialization
        });

        // Clear all stored tokens and session data using the centralized utility
        await clearAllAuthData();
        
        // Add a small delay to ensure all cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Generate logout URL with additional parameters for better cleanup
        const logoutUrl = openidService.getLogoutUrl(tokens?.id_token);
        
        // Force a complete page reload after logout to ensure clean state
        window.location.href = logoutUrl;
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist profile and isAuthenticated, not loading/error states or clientApis
      partialize: (state) => ({ 
        profile: state.profile, 
        isAuthenticated: state.isAuthenticated 
      }),
      // On rehydration, just trigger initialization
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset initialization flag and trigger proper initialization
          state.isInitializing = true;

          // Trigger initialization after rehydration is complete
          setTimeout(() => {
            useAuthStore.getState().initialize();
          }, 0);
        }
      },
    }
  )
);

// Wire the token plumbing at module scope, not inside initialize(): `isAuthenticated`
// is rehydrated synchronously from localStorage while initialize() is deferred, so
// components can fire authenticated requests before it ever runs. Both handlers must
// already be in place when they do.
registerRefreshHandler(async () => {
  await useAuthStore.getState().refreshTokens();
});

setAuthErrorHandler(() => {
  logger.info('Auth error handler triggered, logging out');
  void useAuthStore.getState().logout();
});

// Custom hook that properly initializes auth state
export const useAuth = () => {
  const store = useAuthStore();
  // Initialization is triggered solely by onRehydrateStorage.
  // No extra useEffect needed — the module-level lock in initialize()
  // ensures it's idempotent even if called from multiple places.

  // Handle bfcache restoration (e.g., pressing Back from Keycloak login page).
  // When the browser restores a page from bfcache, the in-memory state still has
  // loading: true from initiateLogin() but nothing will ever resolve it.
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        const state = useAuthStore.getState();
        if (state.loading && !state.isInitializing) {
          // Reset stuck loading state and re-initialize
          useAuthStore.setState({ loading: false, isInitializing: true });
          useAuthStore.getState().initialize();
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return store;
};
