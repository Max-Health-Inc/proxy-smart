import { t, type Static } from 'elysia'

/**
 * Keycloak Configuration schemas
 */

export const TestKeycloakConnectionRequest = t.Object({
  baseUrl: t.String({ format: 'uri', description: 'Keycloak base URL' }),
  realm: t.String({ description: 'Keycloak realm name' })
}, { title: 'TestKeycloakConnectionRequest' })

export const TestKeycloakConnectionResponse = t.Object({
  success: t.Boolean({ description: 'Whether the connection test succeeded' }),
  message: t.Optional(t.String({ description: 'Success message' })),
  error: t.Optional(t.String({ description: 'Error message if connection failed' }))
}, { title: 'TestKeycloakConnectionResponse' })

export const SaveKeycloakConfigRequest = t.Object({
  baseUrl: t.String({ format: 'uri', description: 'Keycloak base URL' }),
  realm: t.String({ description: 'Keycloak realm name' }),
  adminClientId: t.Optional(t.String({ description: 'Admin client ID for API access' })),
  adminClientSecret: t.Optional(t.String({ description: 'Admin client secret for API access' }))
}, { title: 'SaveKeycloakConfigRequest' })

export const SaveKeycloakConfigResponse = t.Object({
  success: t.Boolean({ description: 'Whether the configuration was saved successfully' }),
  message: t.Optional(t.String({ description: 'Success message' })),
  error: t.Optional(t.String({ description: 'Error message if save failed' })),
  restartRequired: t.Optional(t.Boolean({ description: 'Whether a service restart is required' }))
}, { title: 'SaveKeycloakConfigResponse' })

// ==================== Response Schemas ====================

export const KeycloakConfigResponse = t.Object({
  baseUrl: t.Union([t.String(), t.Null()], { description: 'Keycloak base URL' }),
  realm: t.Union([t.String(), t.Null()], { description: 'Keycloak realm name' }),
  hasAdminClient: t.Boolean({ description: 'Whether admin client credentials are configured' }),
  adminClientId: t.Union([t.String(), t.Null()], { description: 'Admin client ID (if configured)' })
}, { title: 'KeycloakConfigResponse' })

// ==================== Frontend URL (Backend Services audience) ====================

export const KeycloakFrontendUrlResponse = t.Object({
  frontendUrl: t.Union([t.String(), t.Null()], { description: 'Keycloak realm frontend URL (used as canonical token endpoint base for aud validation)' }),
  effectiveTokenEndpoint: t.Union([t.String(), t.Null()], { description: 'The effective token endpoint URL Keycloak uses for audience matching' }),
  realm: t.Union([t.String(), t.Null()], { description: 'Current realm name' })
}, { title: 'KeycloakFrontendUrlResponse' })

export const SetKeycloakFrontendUrlRequest = t.Object({
  frontendUrl: t.String({ format: 'uri', description: 'Frontend URL to set on the Keycloak realm (e.g. https://proxy.example.com/auth). Set empty string to clear.' })
}, { title: 'SetKeycloakFrontendUrlRequest' })

export const SetKeycloakFrontendUrlResponse = t.Object({
  success: t.Boolean({ description: 'Whether the frontend URL was updated successfully' }),
  message: t.Optional(t.String({ description: 'Success or info message' })),
  error: t.Optional(t.String({ description: 'Error message if update failed' })),
  frontendUrl: t.Optional(t.Union([t.String(), t.Null()], { description: 'The new frontend URL value' }))
}, { title: 'SetKeycloakFrontendUrlResponse' })

// TypeScript type inference helpers
export type TestKeycloakConnectionRequestType = Static<typeof TestKeycloakConnectionRequest>
export type TestKeycloakConnectionResponseType = Static<typeof TestKeycloakConnectionResponse>
export type SaveKeycloakConfigRequestType = Static<typeof SaveKeycloakConfigRequest>
export type SaveKeycloakConfigResponseType = Static<typeof SaveKeycloakConfigResponse>
export type KeycloakConfigResponseType = Static<typeof KeycloakConfigResponse>
export type KeycloakFrontendUrlResponseType = Static<typeof KeycloakFrontendUrlResponse>
export type SetKeycloakFrontendUrlRequestType = Static<typeof SetKeycloakFrontendUrlRequest>
export type SetKeycloakFrontendUrlResponseType = Static<typeof SetKeycloakFrontendUrlResponse>
