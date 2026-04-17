import { config } from '@/config';
import { getItem } from './storage';
import { attemptTokenRefresh } from './tokenRefresh';
import {
  AdminApi,
  AiToolsApi,
  AppStoreApi,
  AuthenticationApi,
  FhirMonitoringApi,
  HealthcareUsersApi,
  IdentityProvidersApi,
  LaunchContextsApi,
  McpManagementApi,
  OauthMonitoringApi,
  OrganizationsApi,
  RolesApi,
  SmartAppsApi,
  ServersApi,
  ServerApi,
  UserFederationApi,
  Configuration,
  ResponseError
} from './api-client';

// Auth error handler to automatically logout on authentication failures
let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
};

// Global flags to prevent multiple simultaneous operations
let isRefreshing = false;
let hasLoggedOut = false;

// Wrapper function to handle authentication errors with refresh attempt
export const handleApiError = async (error: unknown) => {
  // If already logged out, don't process any more auth errors
  if (hasLoggedOut) {
    throw error;
  }

  let shouldTryRefresh = false;

  // Check for ResponseError first
  if (error instanceof ResponseError) {
    if (error.response.status === 401 || error.response.status === 403) {
      shouldTryRefresh = true;
    }
  }

  // Check for other error formats that might contain status
  if (!shouldTryRefresh && error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const status = (err.status as number) ||
      ((err.response as Record<string, unknown>)?.status as number) ||
      ((err.responseData as Record<string, unknown>)?.status as number);
    if (status === 401 || status === 403) {
      shouldTryRefresh = true;
    }
  }

  // Attempt refresh if we detected an auth error and not already refreshing
  if (shouldTryRefresh && !isRefreshing) {
    isRefreshing = true;
    
    try {
      const refreshed = await attemptTokenRefresh();
      
      if (refreshed) {
        const newToken = await getStoredToken();
        if (newToken) {
          isRefreshing = false;
          throw new Error('TOKEN_REFRESHED'); // Signal caller to retry
        }
      }
    } catch (refreshError) {
      if (refreshError instanceof Error && refreshError.message === 'TOKEN_REFRESHED') {
        throw refreshError;
      }
    } finally {
      isRefreshing = false;
    }
    
    // Refresh failed - trigger logout once
    hasLoggedOut = true;
    if (onAuthError) {
      onAuthError();
      // Return instead of throwing to prevent further error propagation
      return;
    }
  } else if (shouldTryRefresh && isRefreshing) {
    // Another refresh is in progress, just wait and don't throw
    return;
  }

  throw error;
};

// Create API client configuration
const createConfig = (token?: string) => {
  const basePath = config.api.baseUrl;
  return new Configuration({
    basePath,
    accessToken: token,
  });
};

// Create individual client APIs
export const createAdminApi = (token?: string) => new AdminApi(createConfig(token));
export const createAppStoreApi = (token?: string) => new AppStoreApi(createConfig(token));
export const createAuthApi = (token?: string) => new AuthenticationApi(createConfig(token));
export const createHealthcareUsersApi = (token?: string) => new HealthcareUsersApi(createConfig(token));
export const createIdentityProvidersApi = (token?: string) => new IdentityProvidersApi(createConfig(token));
export const createLaunchContextsApi = (token?: string) => new LaunchContextsApi(createConfig(token));
export const createMcpManagementApi = (token?: string) => new McpManagementApi(createConfig(token));
export const createOauthMonitoringApi = (token?: string) => new OauthMonitoringApi(createConfig(token));
export const createRolesApi = (token?: string) => new RolesApi(createConfig(token));
export const createSmartAppsApi = (token?: string) => new SmartAppsApi(createConfig(token));
export const createServersApi = (token?: string) => new ServersApi(createConfig(token));
export const createServerApi = (token?: string) => new ServerApi(createConfig(token));
export const createAiToolsApi = (token?: string) => new AiToolsApi(createConfig(token));
export const createFhirMonitoringApi = (token?: string) => new FhirMonitoringApi(createConfig(token));
export const createUserFederationApi = (token?: string) => new UserFederationApi(createConfig(token));
export const createOrganizationsApi = (token?: string) => new OrganizationsApi(createConfig(token));

// Create a wrapper that automatically handles auth errors for any API method
const wrapApiClient = <T extends object>(client: T): T => {
  // Create a Proxy that intercepts method calls
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // If it's a function, wrap it with error handling
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          try {
            const result = await value.apply(target, args);
            return result;
          } catch (error) {
            try {
              await handleApiError(error);
              // If handleApiError doesn't throw, rethrow original error
              throw error;
            } catch (handlerError) {
              // Check if this is our special token refresh indicator
              if (handlerError instanceof Error && handlerError.message === 'TOKEN_REFRESHED') {
                // Token was refreshed, we could retry the request here
                // For now, just throw the original error and let the caller handle retry
                throw error;
              }
              // Otherwise, throw the handler error (logout was triggered)
              throw handlerError;
            }
          }
        };
      }

      // For non-functions, return as-is
      return value;
    }
  });
};

// Create all client APIs at once with automatic auth error handling
export const createClientApis = (token?: string) => ({
  admin: wrapApiClient(createAdminApi(token)),
  aiTools: wrapApiClient(createAiToolsApi(token)),
  appStore: wrapApiClient(createAppStoreApi(token)),
  auth: wrapApiClient(createAuthApi(token)),
  fhirMonitoring: wrapApiClient(createFhirMonitoringApi(token)),
  healthcareUsers: wrapApiClient(createHealthcareUsersApi(token)),
  identityProviders: wrapApiClient(createIdentityProvidersApi(token)),
  launchContexts: wrapApiClient(createLaunchContextsApi(token)),
  mcpManagement: wrapApiClient(createMcpManagementApi(token)),
  oauthMonitoring: wrapApiClient(createOauthMonitoringApi(token)),
  roles: wrapApiClient(createRolesApi(token)),
  smartApps: wrapApiClient(createSmartAppsApi(token)),
  servers: wrapApiClient(createServersApi(token)),
  server: wrapApiClient(createServerApi(token)),
  userFederation: wrapApiClient(createUserFederationApi(token)),
  organizations: wrapApiClient(createOrganizationsApi(token)),
});

// Helper to get token from encrypted storage (always returns stored token)
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const tokens = await getItem<{access_token: string}>('openid_tokens');
    return tokens?.access_token || null;
    // Note: We return the token even if expired - let the server decide validity
    // The API error handler will catch 401s and trigger refresh if needed
  } catch (error) {
    console.error('❌ Error retrieving stored token:', error);
    return null;
  }
};

// Create authenticated client APIs using stored token
export const createAuthenticatedClientApis = async () => {
  const token = await getStoredToken();
  return createClientApis(token || undefined);
  // Note: Even if token is expired, we pass it along
  // The API wrapper will catch 401s and handle refresh automatically
};
