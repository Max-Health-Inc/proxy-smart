import { t, type Static } from 'elysia'

/**
 * Identity Provider Management schemas for external authentication
 * Uses Keycloak's official IdentityProviderRepresentation type
 */

/**
 * Identity Provider configuration schema for OIDC/SAML providers
 */
export const IdentityProviderConfig = t.Object({
  // Common fields
  displayName: t.Optional(t.String({ description: 'Display name for UI' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether the provider is enabled', default: true })),
  
  // OIDC/OAuth2 specific fields
  clientSecret: t.Optional(t.String({ description: 'OAuth2 client secret' })),
  tokenUrl: t.Optional(t.String({ description: 'Token endpoint URL' })),
  userInfoUrl: t.Optional(t.String({ description: 'UserInfo endpoint URL' })),
  issuer: t.Optional(t.String({ description: 'OIDC issuer URL' })),
  defaultScopes: t.Optional(t.String({ description: 'Default OAuth2 scopes' })),
  logoutUrl: t.Optional(t.String({ description: 'Logout endpoint URL' })),
  
  // SAML specific fields
  entityId: t.Optional(t.String({ description: 'SAML entity ID' })),
  singleSignOnServiceUrl: t.Optional(t.String({ description: 'SAML SSO URL' })),
  singleLogoutServiceUrl: t.Optional(t.String({ description: 'SAML SLO URL' })),
  metadataDescriptorUrl: t.Optional(t.String({ description: 'SAML metadata URL' })),
  signatureAlgorithm: t.Optional(t.String({ description: 'SAML signature algorithm' })),
  nameIdPolicyFormat: t.Optional(t.String({ description: 'SAML NameID format' })),
  signingCertificate: t.Optional(t.String({ description: 'SAML signing certificate' })),
  validateSignature: t.Optional(t.Boolean({ description: 'Validate SAML signatures' })),
  wantAuthnRequestsSigned: t.Optional(t.Boolean({ description: 'Require signed AuthN requests' })),
  
  // Allow additional configuration
  additionalConfig: t.Optional(t.Record(t.String(), t.Any()))
}, { title: 'IdentityProviderConfig' })

export const IdentityProvider = t.Object({
  alias: t.Optional(t.String({ description: 'Provider alias (unique identifier)' })),
  providerId: t.Optional(t.String({ description: 'Provider type (oidc, saml, etc.)' })),
  displayName: t.Optional(t.String({ description: 'Display name' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether the provider is enabled' })),
  config: t.Optional(t.Record(t.String(), t.Any({ description: 'Provider configuration' }))),
  addReadTokenRoleOnCreate: t.Optional(t.Boolean()),
  firstBrokerLoginFlowAlias: t.Optional(t.String()),
  internalId: t.Optional(t.String()),
  linkOnly: t.Optional(t.Boolean()),
  hideOnLogin: t.Optional(t.Boolean()),
  postBrokerLoginFlowAlias: t.Optional(t.String()),
  storeToken: t.Optional(t.Boolean()),
  trustEmail: t.Optional(t.Boolean()),
  organizationId: t.Optional(t.String())
}, { title: 'IdentityProvider' })

export const CreateIdentityProviderRequest = t.Object({
  alias: t.String({ description: 'Provider alias (unique identifier)' }),
  providerId: t.String({ description: 'Provider type (oidc, saml, etc.)' }),
  displayName: t.Optional(t.String({ description: 'Display name for UI' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether to enable the provider', default: true })),
  config: IdentityProviderConfig,
  // Identity linking / broker flow settings
  firstBrokerLoginFlowAlias: t.Optional(t.String({ description: 'Authentication flow for first broker login (e.g. "first broker login")' })),
  postBrokerLoginFlowAlias: t.Optional(t.String({ description: 'Authentication flow to run after broker login' })),
  trustEmail: t.Optional(t.Boolean({ description: 'Trust email provided by this identity provider for automatic account linking' })),
  linkOnly: t.Optional(t.Boolean({ description: 'If true, users cannot log in through this provider, only link existing accounts' })),
  hideOnLogin: t.Optional(t.Boolean({ description: 'Hide this provider from the login page' }))
}, { title: 'CreateIdentityProviderRequest' })

export const UpdateIdentityProviderRequest = t.Object({
  displayName: t.Optional(t.String({ description: 'Display name' })),
  enabled: t.Optional(t.Boolean({ description: 'Enable or disable the provider' })),
  config: t.Optional(IdentityProviderConfig),
  // Identity linking / broker flow settings
  firstBrokerLoginFlowAlias: t.Optional(t.String({ description: 'Authentication flow for first broker login (e.g. "first broker login")' })),
  postBrokerLoginFlowAlias: t.Optional(t.String({ description: 'Authentication flow to run after broker login' })),
  trustEmail: t.Optional(t.Boolean({ description: 'Trust email provided by this identity provider for automatic account linking' })),
  linkOnly: t.Optional(t.Boolean({ description: 'If true, users cannot log in through this provider, only link existing accounts' })),
  hideOnLogin: t.Optional(t.Boolean({ description: 'Hide this provider from the login page' }))
}, { title: 'UpdateIdentityProviderRequest' })

// ==================== Response Schemas ====================

export const IdentityProviderResponse = t.Object({
  alias: t.Optional(t.String({ description: 'Provider alias' })),
  providerId: t.Optional(t.String({ description: 'Provider type' })),
  displayName: t.Optional(t.String({ description: 'Display name' })),
  enabled: t.Optional(t.Boolean({ description: 'Whether provider is enabled' })),
  config: t.Optional(t.Record(t.String(), t.Any({ description: 'Provider configuration' }))),
  addReadTokenRoleOnCreate: t.Optional(t.Boolean()),
  firstBrokerLoginFlowAlias: t.Optional(t.String()),
  internalId: t.Optional(t.String()),
  linkOnly: t.Optional(t.Boolean()),
  hideOnLogin: t.Optional(t.Boolean()),
  postBrokerLoginFlowAlias: t.Optional(t.String()),
  storeToken: t.Optional(t.Boolean()),
  trustEmail: t.Optional(t.Boolean()),
  organizationId: t.Optional(t.String()),
  userCount: t.Optional(t.Number({ description: 'Number of users linked via this identity provider' }))
}, { title: 'IdentityProviderResponse' })

// TypeScript type inference helpers
export type IdentityProviderType = Static<typeof IdentityProvider>
export type IdentityProviderConfigType = Static<typeof IdentityProviderConfig>
export type CreateIdentityProviderRequestType = Static<typeof CreateIdentityProviderRequest>
export type UpdateIdentityProviderRequestType = Static<typeof UpdateIdentityProviderRequest>
export type IdentityProviderResponseType = Static<typeof IdentityProviderResponse>
