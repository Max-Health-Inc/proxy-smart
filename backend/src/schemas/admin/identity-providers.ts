// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

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
  hideOnLogin: t.Optional(t.Boolean({ description: 'Hide this provider from the login page' })),
  // Organization linking
  organizationId: t.Optional(t.String({ description: 'Link this IdP to a Keycloak organization (users brokered through it auto-join the org)' }))
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
  hideOnLogin: t.Optional(t.Boolean({ description: 'Hide this provider from the login page' })),
  // Organization linking
  organizationId: t.Optional(t.String({ description: 'Link this IdP to a Keycloak organization (users brokered through it auto-join the org)' }))
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

// ==================== Identity Provider Mappers ====================

/**
 * Claim/assertion mappers attached to an identity provider. These write the
 * custom user attributes (fhirUser, organization) that SMART launches depend
 * on when a user is brokered through an external IdP.
 */

export const IdentityProviderMapperResponse = t.Object({
  id: t.Optional(t.String({ description: 'Keycloak mapper ID' })),
  name: t.String({ description: 'Mapper name' }),
  identityProviderMapper: t.String({ description: 'Keycloak mapper type ID (e.g. oidc-user-attribute-idp-mapper)' }),
  userAttribute: t.Optional(t.String({ description: 'Target Keycloak user attribute' })),
  externalName: t.Optional(t.String({ description: 'Source claim (OIDC) or assertion attribute (SAML)' })),
  syncMode: t.Optional(t.String({ description: 'Sync mode (INHERIT, IMPORT, LEGACY, FORCE)' })),
  config: t.Record(t.String(), t.String(), { description: 'Raw mapper configuration' })
}, { title: 'IdentityProviderMapperResponse' })

export const IdentityProviderMapperDefinition = t.Object({
  name: t.String({ description: 'Mapper name provisioned in Keycloak' }),
  userAttribute: t.String({ description: 'Keycloak user attribute written by this mapper' }),
  externalName: t.String({ description: 'Claim or assertion attribute read from the external identity' }),
  required: t.Boolean({ description: 'Whether a provider is only healthy when this mapper exists' }),
  syncMode: t.String({ description: 'Sync mode used when provisioning' }),
  description: t.String({ description: 'Why this mapper is needed' })
}, { title: 'IdentityProviderMapperDefinition' })

export const IdentityProviderMapperStatus = t.Object({
  alias: t.String({ description: 'Provider alias' }),
  providerId: t.String({ description: 'Provider type' }),
  displayName: t.Optional(t.String({ description: 'Display name' })),
  enabled: t.Boolean({ description: 'Whether the provider is enabled' }),
  attributeMapperType: t.Union([t.String(), t.Null()], {
    description: 'Mapper type used for attribute imports, null when the provider supports none'
  }),
  mappers: t.Array(IdentityProviderMapperResponse, { description: 'Mappers currently attached to the provider' }),
  missingRequired: t.Array(t.String(), { description: 'Names of required mappers that are missing' }),
  missingOptional: t.Array(t.String(), { description: 'Names of optional mappers that are missing' }),
  healthy: t.Boolean({ description: 'Whether all required attribute imports are present' }),
  unsupported: t.Boolean({ description: 'Whether the provider supports attribute-import mappers at all' }),
  userFacing: t.Boolean({
    description: 'False for machine trust anchors (client-assertion federation), where user attributes do not apply'
  })
}, { title: 'IdentityProviderMapperStatus' })

export const IdentityProviderMapperStatusResponse = t.Object({
  status: t.Array(IdentityProviderMapperStatus),
  definitions: t.Array(IdentityProviderMapperDefinition, {
    description: 'Mappers the proxy expects on every identity provider'
  }),
  timestamp: t.String()
}, { title: 'IdentityProviderMapperStatusResponse' })

export const IdentityProviderMapperFixResponse = t.Object({
  message: t.String(),
  alias: t.String({ description: 'Provider the mappers were provisioned on' }),
  attributeMapperType: t.Union([t.String(), t.Null()], { description: 'Mapper type used for provisioning' }),
  created: t.Array(t.String(), { description: 'Names of mappers created by this call' }),
  skipped: t.Array(t.String(), { description: 'Names of mappers that already existed' }),
  unsupported: t.Boolean({ description: 'Whether the provider supports attribute-import mappers at all' }),
  userFacing: t.Boolean({ description: 'False when the provider is a machine trust anchor; nothing is provisioned' }),
  errors: t.Array(t.String(), { description: 'Any errors encountered' }),
  timestamp: t.String()
}, { title: 'IdentityProviderMapperFixResponse' })

export const IdentityProviderMapperTypeProperty = t.Object({
  name: t.String({ description: 'Config key' }),
  label: t.Optional(t.String({ description: 'Human readable label' })),
  helpText: t.Optional(t.String({ description: 'Help text' })),
  type: t.Optional(t.String({ description: 'Property type (String, boolean, List, ...)' })),
  defaultValue: t.Optional(t.String({ description: 'Default value, stringified' })),
  options: t.Optional(t.Array(t.String(), { description: 'Allowed values for List properties' })),
  secret: t.Optional(t.Boolean({ description: 'Whether the value is secret' })),
  required: t.Optional(t.Boolean({ description: 'Whether the property must be set' }))
}, { title: 'IdentityProviderMapperTypeProperty' })

export const IdentityProviderMapperTypeResponse = t.Object({
  id: t.String({ description: 'Mapper type ID used as identityProviderMapper' }),
  name: t.Optional(t.String({ description: 'Mapper type display name' })),
  category: t.Optional(t.String({ description: 'Mapper category' })),
  helpText: t.Optional(t.String({ description: 'What this mapper type does' })),
  properties: t.Array(IdentityProviderMapperTypeProperty, { description: 'Configurable properties' })
}, { title: 'IdentityProviderMapperTypeResponse' })

export const CreateIdentityProviderMapperRequest = t.Object({
  name: t.String({ description: 'Mapper name (unique per provider)' }),
  identityProviderMapper: t.String({ description: 'Keycloak mapper type ID (see GET /admin/idps/:alias/mapper-types)' }),
  config: t.Record(t.String(), t.String(), { description: 'Mapper configuration keyed by the type\'s property names' })
}, { title: 'CreateIdentityProviderMapperRequest' })

export const UpdateIdentityProviderMapperRequest = t.Object({
  name: t.Optional(t.String({ description: 'Mapper name' })),
  identityProviderMapper: t.Optional(t.String({ description: 'Keycloak mapper type ID' })),
  config: t.Optional(t.Record(t.String(), t.String(), { description: 'Configuration entries to merge into the mapper' }))
}, { title: 'UpdateIdentityProviderMapperRequest' })

// TypeScript type inference helpers
export type IdentityProviderType = Static<typeof IdentityProvider>
export type IdentityProviderConfigType = Static<typeof IdentityProviderConfig>
export type CreateIdentityProviderRequestType = Static<typeof CreateIdentityProviderRequest>
export type UpdateIdentityProviderRequestType = Static<typeof UpdateIdentityProviderRequest>
export type IdentityProviderResponseType = Static<typeof IdentityProviderResponse>
export type IdentityProviderMapperResponseType = Static<typeof IdentityProviderMapperResponse>
export type IdentityProviderMapperStatusResponseType = Static<typeof IdentityProviderMapperStatusResponse>
export type IdentityProviderMapperFixResponseType = Static<typeof IdentityProviderMapperFixResponse>
export type IdentityProviderMapperTypeResponseType = Static<typeof IdentityProviderMapperTypeResponse>
export type CreateIdentityProviderMapperRequestType = Static<typeof CreateIdentityProviderMapperRequest>
export type UpdateIdentityProviderMapperRequestType = Static<typeof UpdateIdentityProviderMapperRequest>
