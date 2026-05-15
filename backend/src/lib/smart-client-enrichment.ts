import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation'
import { toTokenEndpointAuthMethod } from './auth-method-mapping'
import { logger } from './logger'
import type { SmartAppType } from '@/schemas'

/** Valid literal values for schema-validated enums */
const VALID_APP_TYPES = new Set(['standalone-app', 'ehr-launch', 'backend-service', 'agent'])
const VALID_SERVER_ACCESS_TYPES = new Set(['all-servers', 'selected-servers', 'user-person-servers'])

/** SMART scopes that are valid but don't match the resource-level regex */
export const SMART_LAUNCH_SCOPES = [
  'openid', 'profile', 'email', 'fhirUser',
  'launch', 'launch/patient', 'launch/encounter',
  'offline_access', 'online_access',
]

/** SMART v2 scope pattern: context/Resource.permissions */
export const SMART_SCOPE_PATTERN = /^(patient|user|system|agent)\/([\w*]+)\.(([cruds]+)|\*|read|write)$/

/** Returns true if the name is a recognised SMART scope (launch-level OR resource-level) */
export function isSMARTScope(name: string): boolean {
  return SMART_SCOPE_PATTERN.test(name) || SMART_LAUNCH_SCOPES.includes(name)
}

/** Safely read a Keycloak client attribute (handles both string and string[] formats) */
export function getAttr(attrs: Record<string, string | string[]> | undefined, key: string): string | undefined {
  const val = attrs?.[key]
  if (Array.isArray(val)) return val[0]
  return typeof val === 'string' ? val : undefined
}

/**
 * Fetch the actual scope names assigned to a client via the Keycloak
 * `default-client-scopes` / `optional-client-scopes` sub-resources.
 *
 * These endpoints return objects with `{ id, name }`, which is the only
 * reliable way to get scope IDs — the top-level `clients.findOne()`
 * representation returns scope **names** in `defaultClientScopes`, not IDs.
 */
export async function fetchClientScopeNames(
  admin: KcAdminClient,
  clientInternalId: string,
): Promise<{ defaultScopeNames: string[]; optionalScopeNames: string[] }> {
  const [defaultScopes, optionalScopes] = await Promise.all([
    admin.clients.listDefaultClientScopes({ id: clientInternalId }),
    admin.clients.listOptionalClientScopes({ id: clientInternalId }),
  ])

  return {
    defaultScopeNames: defaultScopes.map(s => s.name!).filter(Boolean),
    optionalScopeNames: optionalScopes.map(s => s.name!).filter(Boolean),
  }
}

/**
 * Enrich a raw Keycloak ClientRepresentation into a SmartAppType for the API.
 *
 * Fetches scope names via the list sub-resources and maps every Keycloak
 * attribute to the corresponding API field.
 */
export async function enrichClient(
  admin: KcAdminClient,
  client: ClientRepresentation,
  options: { maskSecret?: boolean } = {},
): Promise<SmartAppType> {
  const fullClient = await admin.clients.findOne({ id: client.id! })
  if (!fullClient) throw new Error(`Client ${client.clientId} not found`)

  const { defaultScopeNames, optionalScopeNames } = await fetchClientScopeNames(admin, fullClient.id!)

  const clientType = fullClient.attributes?.['client_type']
  const appType = Array.isArray(clientType) ? clientType[0] : clientType
  const hasOfflineAccess = optionalScopeNames.includes('offline_access')

  return {
    ...fullClient,
    defaultClientScopes: defaultScopeNames,
    optionalClientScopes: optionalScopeNames,
    appType: (VALID_APP_TYPES.has(appType!) ? appType : undefined) || (fullClient.serviceAccountsEnabled ? 'backend-service' : 'standalone-app'),
    clientType: (fullClient.serviceAccountsEnabled ? 'backend-service' : (fullClient.publicClient ? 'public' : 'confidential')) as 'backend-service' | 'public' | 'confidential',
    tokenEndpointAuthMethod: toTokenEndpointAuthMethod(fullClient),

    // Client secret
    ...(fullClient.secret && { secret: options.maskSecret !== false ? '**********' : fullClient.secret }),

    // Metadata fields from attributes
    launchUrl: getAttr(fullClient.attributes, 'launch_url'),
    logoUri: getAttr(fullClient.attributes, 'logo_uri'),
    tosUri: getAttr(fullClient.attributes, 'tos_uri'),
    policyUri: getAttr(fullClient.attributes, 'policy_uri'),
    contacts: getAttr(fullClient.attributes, 'contacts')?.split(',').filter(Boolean),

    // Server access control
    serverAccessType: (VALID_SERVER_ACCESS_TYPES.has(getAttr(fullClient.attributes, 'server_access_type')!) ? getAttr(fullClient.attributes, 'server_access_type') : undefined) as 'all-servers' | 'selected-servers' | 'user-person-servers' | undefined,
    allowedServerIds: getAttr(fullClient.attributes, 'allowed_server_ids')?.split(',').filter(Boolean),

    // Organization assignment
    organizationIds: getAttr(fullClient.attributes, 'organization_ids')?.split(',').filter(Boolean) || [],

    // Scope set reference
    scopeSetId: getAttr(fullClient.attributes, 'scope_set_id'),

    // PKCE and offline access
    requirePkce: getAttr(fullClient.attributes, 'pkce.code.challenge.method')?.includes('S256'),
    allowOfflineAccess: hasOfflineAccess,

    // Token exchange & access token lifespan
    tokenExchangeEnabled: getAttr(fullClient.attributes, 'standard.token.exchange.enabled') === 'true',
    accessTokenLifespan: getAttr(fullClient.attributes, 'access.token.lifespan') ? Number(getAttr(fullClient.attributes, 'access.token.lifespan')) : undefined,

    // Audience mappers
    audienceClients: fullClient.protocolMappers
      ?.filter((m) => m.protocolMapper === 'oidc-audience-mapper')
      ?.map((m) => m.config?.['included.client.audience'])
      ?.filter(Boolean) || [],

    // User type & role restrictions
    allowedFhirUserTypes: getAttr(fullClient.attributes, 'allowed_fhir_user_types')?.split(',').filter(Boolean) || [],
    requiredRoles: getAttr(fullClient.attributes, 'required_roles')?.split(',').filter(Boolean) || [],

    // fhirUser resolution
    patientFacing: getAttr(fullClient.attributes, 'patient_facing') === 'true' ? true
      : getAttr(fullClient.attributes, 'patient_facing') === 'false' ? false
      : undefined,

    // Consent & scope settings
    consentRequired: fullClient.consentRequired ?? false,
    fullScopeAllowed: fullClient.fullScopeAllowed ?? true,

    // Session timeout settings
    clientSessionIdleTimeout: getAttr(fullClient.attributes, 'client.session.idle.timeout') ? Number(getAttr(fullClient.attributes, 'client.session.idle.timeout')) : undefined,
    clientSessionMaxLifespan: getAttr(fullClient.attributes, 'client.session.max.lifespan') ? Number(getAttr(fullClient.attributes, 'client.session.max.lifespan')) : undefined,

    // Logout settings
    backchannelLogoutUrl: getAttr(fullClient.attributes, 'backchannel.logout.url') || undefined,
    frontChannelLogoutUrl: getAttr(fullClient.attributes, 'frontchannel.logout.url') || undefined,
  } as SmartAppType
}

/**
 * Auto-create missing SMART client scopes in Keycloak.
 *
 * Handles BOTH resource-level scopes (patient/Observation.read) AND
 * launch-level scopes (launch/patient, fhirUser, etc.).
 */
export async function ensureScopesExist(
  admin: KcAdminClient,
  scopeNames: string[],
  existingScopes: { id?: string; name?: string }[],
): Promise<{ id?: string; name?: string }[]> {
  const existingNames = new Set(existingScopes.map(s => s.name))
  const updatedScopes = [...existingScopes]

  for (const name of scopeNames) {
    if (existingNames.has(name)) continue
    if (!isSMARTScope(name)) continue

    try {
      const created = await admin.clientScopes.create({
        name,
        description: `SMART scope: ${name}`,
        protocol: 'openid-connect',
        attributes: {
          'include.in.token.scope': 'true',
          'display.on.consent.screen': 'true',
          'consent.screen.text': name,
        },
      })
      updatedScopes.push({ id: created.id, name })
      existingNames.add(name)
      logger.admin.info('Auto-created missing SMART scope', { name, id: created.id })
    } catch (err) {
      logger.admin.warn('Failed to auto-create SMART scope', { name, error: err })
    }
  }

  return updatedScopes
}

/**
 * Replace all default/optional client scopes on a client with new ones.
 *
 * Uses `listDefaultClientScopes` / `listOptionalClientScopes` to get proper
 * scope IDs for removal (NOT the client representation which returns names).
 */
export async function replaceClientScopes(
  admin: KcAdminClient,
  clientInternalId: string,
  clientId: string,
  allClientScopes: { id?: string; name?: string }[],
  defaultScopes?: string[],
  optionalScopes?: string[],
): Promise<void> {
  if (defaultScopes) {
    // Use the list sub-resource to get scope objects with real IDs
    const existingDefaults = await admin.clients.listDefaultClientScopes({ id: clientInternalId })
    for (const scope of existingDefaults) {
      try {
        await admin.clients.delDefaultClientScope({ id: clientInternalId, clientScopeId: scope.id! })
      } catch (error) {
        logger.admin.warn('Failed to remove existing default scope', { clientId, scopeId: scope.id, scopeName: scope.name, error })
      }
    }

    // Add new default scopes (resolve name → ID from the master list)
    const defaultScopeIds = defaultScopes
      .map((scopeName: string) => allClientScopes.find(s => s.name === scopeName)?.id)
      .filter(Boolean) as string[]

    for (const scopeId of defaultScopeIds) {
      try {
        await admin.clients.addDefaultClientScope({ id: clientInternalId, clientScopeId: scopeId })
      } catch (error) {
        logger.admin.warn('Failed to add new default scope', { clientId, scopeId, error })
      }
    }
  }

  if (optionalScopes) {
    const existingOptionals = await admin.clients.listOptionalClientScopes({ id: clientInternalId })
    for (const scope of existingOptionals) {
      try {
        await admin.clients.delOptionalClientScope({ id: clientInternalId, clientScopeId: scope.id! })
      } catch (error) {
        logger.admin.warn('Failed to remove existing optional scope', { clientId, scopeId: scope.id, scopeName: scope.name, error })
      }
    }

    const optionalScopeIds = optionalScopes
      .map((scopeName: string) => allClientScopes.find(s => s.name === scopeName)?.id)
      .filter(Boolean) as string[]

    for (const scopeId of optionalScopeIds) {
      try {
        await admin.clients.addOptionalClientScope({ id: clientInternalId, clientScopeId: scopeId })
      } catch (error) {
        logger.admin.warn('Failed to add new optional scope', { clientId, scopeId, error })
      }
    }
  }
}
