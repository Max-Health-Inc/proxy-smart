import { t, type Static } from 'elysia'

/**
 * Dynamic Client Registration schemas (RFC 7591)
 * Used for OAuth 2.0 Dynamic Client Registration Protocol
 */

// ==================== Client Registration Request ====================

export const ClientRegistrationRequest = t.Object({
  redirect_uris: t.Array(t.String({ format: 'uri' }), { description: 'Array of redirect URIs for the client' }),
  client_name: t.Optional(t.String({ description: 'Human-readable client name' })),
  client_uri: t.Optional(t.String({ format: 'uri', description: 'Client home page URL' })),
  logo_uri: t.Optional(t.String({ format: 'uri', description: 'Client logo URL' })),
  scope: t.Optional(t.String({ description: 'Requested scopes (space-separated)' })),
  contacts: t.Optional(t.Array(t.String(), { description: 'Contact email addresses' })),
  tos_uri: t.Optional(t.String({ format: 'uri', description: 'Terms of service URL' })),
  policy_uri: t.Optional(t.String({ format: 'uri', description: 'Privacy policy URL' })),
  jwks_uri: t.Optional(t.String({ format: 'uri', description: 'JWKS endpoint URL' })),
  jwks: t.Optional(t.Object({}, { description: 'JSON Web Key Set' })),
  software_id: t.Optional(t.String({ description: 'Software identifier' })),
  software_version: t.Optional(t.String({ description: 'Software version' })),
  // RFC 7591 standard fields
  grant_types: t.Optional(t.Array(t.String(), { description: 'Requested grant types' })),
  response_types: t.Optional(t.Array(t.String(), { description: 'Requested response types' })),
  token_endpoint_auth_method: t.Optional(t.String({ description: 'Token endpoint authentication method' })),
  // SMART extensions
  fhir_versions: t.Optional(t.Array(t.String(), { description: 'Supported FHIR versions' })),
  launch_uris: t.Optional(t.Array(t.String({ format: 'uri' }), { description: 'EHR launch URLs' }))
}, { title: 'ClientRegistrationRequest', additionalProperties: true })
export type ClientRegistrationRequestType = Static<typeof ClientRegistrationRequest>

// ==================== Client Registration Response ====================

export const ClientRegistrationResponse = t.Object({
  client_id: t.String({ description: 'OAuth2 client ID' }),
  client_secret: t.Optional(t.String({ description: 'OAuth2 client secret (for confidential clients)' })),
  client_id_issued_at: t.Number({ description: 'Client ID issuance timestamp (Unix time)' }),
  client_secret_expires_at: t.Optional(t.Number({ description: 'Client secret expiration timestamp (0 = never expires)' })),
  redirect_uris: t.Array(t.String({ format: 'uri' }), { description: 'Registered redirect URIs' }),
  grant_types: t.Array(t.String(), { description: 'Allowed grant types' }),
  response_types: t.Array(t.String(), { description: 'Allowed response types' }),
  client_name: t.Optional(t.String({ description: 'Human-readable client name' })),
  client_uri: t.Optional(t.String({ format: 'uri', description: 'Client home page URL' })),
  logo_uri: t.Optional(t.String({ format: 'uri', description: 'Client logo URL' })),
  scope: t.Optional(t.String({ description: 'Granted scopes (space-separated)' })),
  contacts: t.Optional(t.Array(t.String(), { description: 'Contact email addresses' })),
  tos_uri: t.Optional(t.String({ format: 'uri', description: 'Terms of service URL' })),
  policy_uri: t.Optional(t.String({ format: 'uri', description: 'Privacy policy URL' })),
  jwks_uri: t.Optional(t.String({ format: 'uri', description: 'JWKS endpoint URL' })),
  jwks: t.Optional(t.Object({}, { description: 'JSON Web Key Set' })),
  token_endpoint_auth_method: t.String({ description: 'Token endpoint authentication method' }),
  // SMART extensions
  fhir_versions: t.Optional(t.Array(t.String(), { description: 'Supported FHIR versions' })),
  launch_uris: t.Optional(t.Array(t.String({ format: 'uri' }), { description: 'EHR launch URLs' }))
}, { title: 'ClientRegistrationResponse' })
export type ClientRegistrationResponseType = Static<typeof ClientRegistrationResponse>

// ==================== Client Registration Error Response ====================

export const ClientRegistrationErrorResponse = t.Object({
  error: t.String({ description: 'Error code (invalid_redirect_uri, invalid_client_metadata, invalid_scope, etc.)' }),
  error_description: t.Optional(t.String({ description: 'Human-readable error description' }))
}, { title: 'ClientRegistrationErrorResponse' })
export type ClientRegistrationErrorResponseType = Static<typeof ClientRegistrationErrorResponse>

// ==================== Client Registration Settings ====================

export const ClientRegistrationSettings = t.Object({
  enabled: t.Boolean({ description: 'Whether dynamic client registration is enabled' }),
  requireHttps: t.Boolean({ description: 'Whether HTTPS is required for redirect URIs' }),
  allowedScopes: t.Array(t.String({ description: 'Scopes that can be requested during registration' })),
  maxClientLifetime: t.Number({ description: 'Maximum client lifetime in days (0 = no limit)' }),
  requireTermsOfService: t.Boolean({ description: 'Whether terms of service URI is required' }),
  requirePrivacyPolicy: t.Boolean({ description: 'Whether privacy policy URI is required' }),
  allowPublicClients: t.Boolean({ description: 'Whether public clients are allowed' }),
  allowConfidentialClients: t.Boolean({ description: 'Whether confidential clients are allowed' }),
  allowBackendServices: t.Boolean({ description: 'Whether backend service clients are allowed' }),
  adminApprovalRequired: t.Boolean({ description: 'Whether admin approval is required for new registrations' }),
  rateLimitPerMinute: t.Number({ description: 'Rate limit for registration requests per minute' }),
  maxRedirectUris: t.Number({ description: 'Maximum number of redirect URIs allowed per client' }),
  allowedRedirectUriPatterns: t.Array(t.String({ description: 'Allowed redirect URI regex patterns' })),
  notificationEmail: t.Optional(t.String({ format: 'email', description: 'Email to notify of new registrations' }))
}, { title: 'ClientRegistrationSettings' })
export type ClientRegistrationSettingsType = Static<typeof ClientRegistrationSettings>
