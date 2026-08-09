// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Generated-client factories plus the shared auth-recovery behaviour every admin
 * call goes through.
 *
 * Two rules hold everything together:
 *   1. Bearer tokens are resolved PER REQUEST from `getValidAccessToken`, never
 *      captured when a client is built — a client constructed before the session
 *      is restored, or before a refresh, must not send a stale/absent token.
 *   2. A 401/403 refreshes once and REPLAYS the call. Only a failed refresh is a
 *      real auth failure and reaches the logout handler.
 */

import { config } from '@/config';
import { attemptTokenRefresh, getValidAccessToken } from './tokenRefresh';
import { logger } from '@/lib/logger';
import {
  AdminApi,
  AppStoreApi,
  AuthFlowsApi,
  AuthenticationApi,
  ClientPoliciesApi,
  FhirMonitoringApi,
  HealthcareUsersApi,
  IdentityProvidersApi,
  OauthMonitoringApi,
  OrganizationsApi,
  RolesApi,
  ScopeSetsApi,
  SmartAppsApi,
  ServersApi,
  ServerApi,
  UserFederationApi,
  Configuration,
  ResponseError
} from './api-client';

// Auth error handler to automatically logout on authentication failures
let onAuthError: (() => void) | null = null;
let logoutTriggered = false;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
  // A newly registered handler means a live session again — re-arm logout.
  logoutTriggered = false;
};

/**
 * Only 401 is recoverable by refreshing. A 403 means the token was accepted and the
 * GRANT is insufficient, so a newly minted token is exactly as insufficient — treating
 * it as refreshable turns a missing role into an endless refresh/retry loop.
 */
const REFRESHABLE_STATUS = 401;

/** Pull a status off the several error shapes the generated client can surface. */
const authStatusOf = (error: unknown): number | null => {
  if (error instanceof ResponseError) return error.response.status;
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const status =
      (err.status as number) ||
      ((err.response as Record<string, unknown>)?.status as number) ||
      ((err.responseData as Record<string, unknown>)?.status as number);
    if (typeof status === 'number') return status;
  }
  return null;
};

const isAuthError = (error: unknown): boolean => authStatusOf(error) === REFRESHABLE_STATUS;

/** Hand off to the app's logout, at most once per session. */
const triggerLogout = () => {
  if (logoutTriggered || !onAuthError) return;
  logoutTriggered = true;
  onAuthError();
};

/**
 * Recover from an auth failure. Resolves true when a refresh succeeded and the
 * caller should replay its request; false once logout has been handed off.
 */
const recoverFromAuthError = async (): Promise<boolean> => {
  if (logoutTriggered) return false;
  if (await attemptTokenRefresh()) return true;
  logger.info('apiClient: refresh failed on auth error, logging out');
  triggerLogout();
  return false;
};

/**
 * Handle an auth error for callers outside the wrapped clients (raw fetch paths).
 * Non-auth errors are rethrown untouched.
 */
export const handleApiError = async (error: unknown): Promise<void> => {
  if (!isAuthError(error)) throw error;
  await recoverFromAuthError();
};

/**
 * Client configuration. `accessToken` is a resolver the generated client awaits on
 * every request; an explicit token is only honoured for callers that already hold
 * one for a specific purpose.
 */
const createConfig = (token?: string) =>
  new Configuration({
    basePath: config.api.baseUrl,
    accessToken: token
      ? async () => token
      : async () => (await getValidAccessToken()) ?? '',
  });

// Create individual client APIs
export const createAdminApi = (token?: string) => new AdminApi(createConfig(token));
export const createAppStoreApi = (token?: string) => new AppStoreApi(createConfig(token));
export const createClientPoliciesApi = (token?: string) => new ClientPoliciesApi(createConfig(token));
export const createAuthApi = (token?: string) => new AuthenticationApi(createConfig(token));
export const createHealthcareUsersApi = (token?: string) => new HealthcareUsersApi(createConfig(token));
export const createIdentityProvidersApi = (token?: string) => new IdentityProvidersApi(createConfig(token));
export const createOauthMonitoringApi = (token?: string) => new OauthMonitoringApi(createConfig(token));
export const createRolesApi = (token?: string) => new RolesApi(createConfig(token));
export const createSmartAppsApi = (token?: string) => new SmartAppsApi(createConfig(token));
export const createServersApi = (token?: string) => new ServersApi(createConfig(token));
export const createServerApi = (token?: string) => new ServerApi(createConfig(token));
export const createFhirMonitoringApi = (token?: string) => new FhirMonitoringApi(createConfig(token));
export const createUserFederationApi = (token?: string) => new UserFederationApi(createConfig(token));
export const createOrganizationsApi = (token?: string) => new OrganizationsApi(createConfig(token));
export const createAuthFlowsApi = (token?: string) => new AuthFlowsApi(createConfig(token));
export const createScopeSetsApi = (token?: string) => new ScopeSetsApi(createConfig(token));

/**
 * Wrap every method of a generated client so an auth failure refreshes and replays
 * the call once. The replay picks up the new token because the config resolves it
 * per request.
 */
const wrapApiClient = <T extends object>(client: T): T =>
  new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (error) {
          if (!isAuthError(error)) throw error;
          if (!(await recoverFromAuthError())) throw error;
          return await value.apply(target, args);
        }
      };
    }
  });

/** All clients, sharing the live token resolver and auth recovery. */
export const createClientApis = () => ({
  admin: wrapApiClient(createAdminApi()),
  appStore: wrapApiClient(createAppStoreApi()),
  auth: wrapApiClient(createAuthApi()),
  clientPolicies: wrapApiClient(createClientPoliciesApi()),
  fhirMonitoring: wrapApiClient(createFhirMonitoringApi()),
  healthcareUsers: wrapApiClient(createHealthcareUsersApi()),
  identityProviders: wrapApiClient(createIdentityProvidersApi()),
  oauthMonitoring: wrapApiClient(createOauthMonitoringApi()),
  roles: wrapApiClient(createRolesApi()),
  smartApps: wrapApiClient(createSmartAppsApi()),
  servers: wrapApiClient(createServersApi()),
  server: wrapApiClient(createServerApi()),
  userFederation: wrapApiClient(createUserFederationApi()),
  organizations: wrapApiClient(createOrganizationsApi()),
  authFlows: wrapApiClient(createAuthFlowsApi()),
  scopeSets: wrapApiClient(createScopeSetsApi()),
});

export type ClientApis = ReturnType<typeof createClientApis>;

/**
 * The single client set for the app. Stable identity by design: clients no longer
 * hold a token, so there is nothing to rebuild when the session changes, and
 * effects keyed on `clientApis.*` stop re-firing on every token rotation.
 */
export const clientApis: ClientApis = createClientApis();

/**
 * The bearer token for hand-rolled fetch calls, renewed when it is expired or
 * about to be. Shares the single-flight refresh with the generated clients.
 */
export const getStoredToken = async (): Promise<string | null> => getValidAccessToken();
