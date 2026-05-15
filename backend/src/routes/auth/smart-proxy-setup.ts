/**
 * SMART Proxy Setup — instantiates @proxy-smart/auth components with backend config.
 *
 * Single source of truth for the proxy's SMART flow infrastructure.
 * Consumed by oauth.ts route handlers.
 */

import { config } from '@/config'
import { logger } from '@/lib/logger'
import { launchContextStore } from '@/lib/launch-context-store'
import {
  KeycloakAdapter,
  type SmartProxyConfig,
  type SmartProxyLogger,
  type ILaunchContextStore,
  type IdPAdapter,
} from '@proxy-smart/auth'

/** Adapt our structured logger to the lib's flat interface */
const smartLogger: SmartProxyLogger = {
  debug: (msg, meta) => logger.auth.debug(msg, meta),
  info: (msg, meta) => logger.auth.info(msg, meta),
  warn: (msg, meta) => logger.auth.warn(msg, meta),
  error: (msg, meta) => logger.auth.error(msg, meta),
}

/** SMART proxy configuration derived from backend config (uses getters for test compatibility) */
export const smartProxyConfig: SmartProxyConfig = {
  get baseUrl() { return config.baseUrl },
  callbackPath: '/auth/smart-callback',
  get launchCodeSecret() { return config.smart.launchSecret },
  get launchCodeTtlSeconds() { return config.smart.launchCodeTtlSeconds },
}

/** Session store — re-use the existing backend singleton (same ILaunchContextStore interface) */
export const smartStore: ILaunchContextStore = launchContextStore

/** Keycloak IdP adapter (lazy — reads config at call time) */
export const keycloakAdapter: IdPAdapter = {
  getAuthorizationUrl: () => `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/auth`,
  getTokenUrl: () => `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token`,
  getIntrospectionUrl: () => `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/token/introspect`,
  getLogoutUrl: () => `${config.keycloak.publicUrl}/realms/${config.keycloak.realm}/protocol/openid-connect/logout`,
  getLaunchContextParams: (context) => {
    const adapter = new KeycloakAdapter({
      baseUrl: config.keycloak.baseUrl!,
      publicUrl: config.keycloak.publicUrl ?? undefined,
      realm: config.keycloak.realm!,
    })
    return adapter.getLaunchContextParams?.(context)
  },
  getIntrospectionAuth: () => {
    if (config.keycloak.adminClientId && config.keycloak.adminClientSecret) {
      return { clientId: config.keycloak.adminClientId, clientSecret: config.keycloak.adminClientSecret }
    }
    return null
  },
}

export { smartLogger }
