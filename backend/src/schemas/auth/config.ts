import { t, type Static } from 'elysia'

/**
 * Keycloak configuration for public authentication
 */
export const AuthConfigKeycloakResponse = t.Object({
  isConfigured: t.Boolean(),
  baseUrl: t.Union([t.String(), t.Null()]),
  realm: t.Union([t.String(), t.Null()]),
  authorizationEndpoint: t.Union([t.String(), t.Null()]),
  tokenEndpoint: t.Union([t.String(), t.Null()])
}, { title: 'AuthConfigKeycloakResponse' })

export type AuthConfigKeycloakResponseType = Static<typeof AuthConfigKeycloakResponse>

/**
 * Complete authentication configuration
 */
export const AuthConfigResponse = t.Object({
  keycloak: AuthConfigKeycloakResponse
}, { title: 'AuthConfigResponse' })

export type AuthConfigResponseType = Static<typeof AuthConfigResponse>
