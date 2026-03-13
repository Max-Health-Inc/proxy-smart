import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { openidService } from '../service/openid-service';
import { createClientApis, setAuthErrorHandler } from '../lib/apiClient';
import { registerRefreshHandler } from '../lib/tokenRefresh';
import { 
  getItem, 
  storeItem, 
  removeItem, 
  setSessionItem, 
  removeSessionItem,
  clearAllAuthData,
  clearAuthorizationCodeData
} from '../lib/storage';
import type { UserProfile } from '@/lib/types/api';

interface TokenData {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

const TOKEN_STORAGE_KEY = 'openid_tokens';

const getStoredTokens = async (): Promise<TokenData | null> => {
  try {
    return await getItem<TokenData>(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeTokens = async (tokens: TokenData): Promise<void> => {
  await storeItem(TOKEN_STORAGE_KEY, tokens);
};

const clearTokens = async (): Promise<void> => {
  await removeItem(TOKEN_STORAGE_KEY);
};

const isTokenValid = (tokens: TokenData): boolean => {
  if (!tokens.access_token) return false;
  if (!tokens.expires_at) return true; // If no expiry, assume valid
  return Date.now() < tokens.expires_at * 1000;
};

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
  clientApis: ReturnType<typeof createClientApis>;
  isInitializing: boolean; // Add flag to track initialization
  
  initiateLogin: (idpHint?: string) => Promise<void>;
  exchangeCodeForToken: (code: string, codeVerifier: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateClientApis: () => Promise<void>;
  initialize: () => Promise<void>; // Add explicit initialization method
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      isInitializing: true,
      clientApis: {} as ReturnType<typeof createClientApis>, // Will be properly initialized in initialize()

      // Proper initialization method that handles all auth setup
      initialize: async () => {
        if (!get().isInitializing) return; // Already initialized
        
        // If there's an active OAuth callback (code+state in URL), don't interfere —
        // let LoginForm handle the code exchange with the stored PKCE verifier.
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') && urlParams.has('state')) {
          set({
            isAuthenticated: false,
            isInitializing: false,
            loading: false,
            clientApis: createClientApis()
          });
          return;
        }
        
        set({ isInitializing: true, loading: true });
        
        // Register refresh handler for apiClient to use (breaks circular dependency)
        registerRefreshHandler(async () => {
          await get().refreshTokens();
        });
        
        try {
          const tokens = await getStoredTokens();
          
          if (!tokens) {
            // No tokens found
            set({ 
              isAuthenticated: false, 
              profile: null,
              isInitializing: false,
              loading: false,
              clientApis: createClientApis()
            });
            return;
          }

          if (isTokenValid(tokens)) {
            // Valid tokens found
            set({ 
              isAuthenticated: true,
              clientApis: createClientApis(tokens.access_token),
              isInitializing: false,
              loading: false
            });
            
            // Set up auth error handler
            setAuthErrorHandler(async () => {
              if (import.meta.env.DEV) console.log('Auth error handler triggered, logging out...');
              await get().logout();
            });
            
            // Fetch profile if needed
            if (!get().profile) {
              await get().fetchProfile();
            }
            return;
          }

          // Tokens expired, try to refresh if we have refresh token
          if (tokens.refresh_token) {
            if (import.meta.env.DEV) console.log('🔄 Tokens expired, attempting refresh...');
            try {
              await get().refreshTokens();
              set({ isInitializing: false });
              
              // Fetch profile after successful refresh
              if (!get().profile) {
                await get().fetchProfile();
              }
            } catch (refreshError) {
              console.warn('❌ Token refresh failed during initialization:', refreshError);
              
              // Check if this is an invalid_grant error (tokens are completely invalid)
              const isInvalidGrant = refreshError instanceof Error && 
                (refreshError.message.includes('invalid_grant') || 
                 refreshError.message.includes('Token is not active'));
              
              if (isInvalidGrant) {
                if (import.meta.env.DEV) console.warn('🗑️ Tokens are invalid, clearing auth state');
                // Clear everything — user will see the login page and can re-authenticate
                await clearAllAuthData();
                set({ 
                  isAuthenticated: false, 
                  profile: null,
                  isInitializing: false,
                  loading: false,
                  clientApis: createClientApis()
                });
              } else {
                // Other error, just clear tokens and stay on page
                await clearTokens();
                set({ 
                  isAuthenticated: false, 
                  profile: null,
                  isInitializing: false,
                  loading: false,
                  clientApis: createClientApis()
                });
              }
            }
          } else {
            // No refresh token, clear everything
            if (import.meta.env.DEV) console.log('❌ No refresh token available, clearing auth state');
            await clearTokens();
            set({ 
              isAuthenticated: false, 
              profile: null,
              isInitializing: false,
              loading: false,
              clientApis: createClientApis()
            });
          }
        } catch (error) {
          console.error('❌ Error during auth initialization:', error);
          await clearTokens();
          set({ 
            isAuthenticated: false, 
            profile: null,
            isInitializing: false,
            loading: false,
            error: 'Initialization failed',
            clientApis: createClientApis()
          });
        }
      },

      // Helper function to update client APIs with current token
      updateClientApis: async () => {
        const tokens = await getStoredTokens();
        const token = tokens?.access_token || undefined;
        set({ clientApis: createClientApis(token) });
        
        // Set up auth error handler each time we update clients
        setAuthErrorHandler(async () => {
          if (import.meta.env.DEV) console.log('Auth error handler triggered, logging out...');
          await get().logout();
        });
      },      // Actions
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
          
          // Update client APIs with new token
          await get().updateClientApis();
          
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
        const tokens = await getStoredTokens();
        if (!tokens || !isTokenValid(tokens)) {
          set({ profile: null, isAuthenticated: false });
          await clearTokens();
          return;
        }

        set({ loading: true, error: null });

        try {
          const userInfo = await openidService.fetchUserInfo(tokens.access_token);
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
          
          // Update API clients with refreshed token
          await get().updateClientApis();
          
          if (import.meta.env.DEV) console.debug('✅ Tokens refreshed successfully');
        } catch (error) {
          console.error('❌ Token refresh failed:', error);
          set({ loading: false });
          // Don't automatically logout here - let the API client handle that
          // This prevents competing logout calls
          throw error;
        }
      },

      logout: async () => {
        const tokens = await getStoredTokens();
        
        if (import.meta.env.DEV) console.log('🚪 Initiating logout with tokens:', {
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
        
        // Update client APIs to have no token
        await get().updateClientApis();
        
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
          state.clientApis = createClientApis(); // Start with no token
          
          // Trigger initialization after rehydration is complete
          setTimeout(() => {
            useAuthStore.getState().initialize();
          }, 0);
        }
      },
    }
  )
);

// Custom hook that properly initializes auth state
export const useAuth = () => {
  const store = useAuthStore();
  
  React.useEffect(() => {
    // Only initialize if we haven't started initialization yet
    if (store.isInitializing && !store.loading) {
      store.initialize();
    }
  }, [store]);

  return store;
};
