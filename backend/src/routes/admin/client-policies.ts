import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import {
  CommonErrorResponses,
  ClientProfilesResponse,
  ClientProfile,
  ClientPoliciesResponse,
  ClientPolicy,
  CimdSetupRequest,
  CimdSetupResponse,
  CimdStatusResponse,
  type ClientProfilesResponseType,
  type ClientPoliciesResponseType,
  type CimdSetupResponseType,
  type CimdStatusResponseType,
  type ErrorResponseType,
} from '@/schemas'
import { handleAdminError } from '@/lib/admin-error-handler'
import { extractBearerToken } from '@/lib/admin-utils'
import { logger } from '@/lib/logger'

const CIMD_EXECUTOR_ID = 'client-id-metadata-document'
const CIMD_CONDITION_ID = 'client-id-uri'
const DEFAULT_PROFILE_NAME = 'cimd-profile'
const DEFAULT_POLICY_NAME = 'cimd-policy'

/**
 * Client Policies & CIMD Management
 *
 * Wraps Keycloak's client-policies admin API and provides a convenience
 * endpoint for one-click CIMD (OAuth Client ID Metadata Document) setup.
 */
export const clientPoliciesRoutes = new Elysia({ prefix: '/client-policies', tags: ['client-policies'] })
  .use(keycloakPlugin)

  // ── Profiles CRUD ────────────────────────────────────────────────────────

  .get('/profiles', async ({ getAdmin, headers, set, query }): Promise<ClientProfilesResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)
      const includeGlobal = query.includeGlobal === 'true'
      const result = await admin.clientPolicies.listProfiles({ includeGlobalProfiles: includeGlobal })
      return result
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: t.Object({
      includeGlobal: t.Optional(t.String({ description: 'Include global built-in profiles ("true"/"false")' })),
    }),
    response: { 200: ClientProfilesResponse, ...CommonErrorResponses },
    detail: {
      summary: 'List Client Profiles',
      description: 'List all client profiles (optionally including built-in global profiles)',
      tags: ['client-policies'],
    },
  })

  .put('/profiles', async ({ getAdmin, headers, set, body }): Promise<ClientProfilesResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)
      // Keycloak PUT replaces the full list — merge with existing to avoid wiping
      const existing = await admin.clientPolicies.listProfiles({ includeGlobalProfiles: false })
      const existingProfiles = existing.profiles || []

      // Merge: update by name, or append new
      const updated = [...existingProfiles]
      for (const incoming of body.profiles || []) {
        const idx = updated.findIndex(p => p.name === incoming.name)
        if (idx >= 0) updated[idx] = incoming
        else updated.push(incoming)
      }

      await admin.clientPolicies.createProfiles({ profiles: updated })
      const result = await admin.clientPolicies.listProfiles({ includeGlobalProfiles: false })
      return result
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: t.Object({ profiles: t.Array(ClientProfile) }),
    response: { 200: ClientProfilesResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Update Client Profiles',
      description: 'Create or update client profiles (merges with existing by name)',
      tags: ['client-policies'],
    },
  })

  // ── Policies CRUD ────────────────────────────────────────────────────────

  .get('/policies', async ({ getAdmin, headers, set, query }): Promise<ClientPoliciesResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)
      const includeGlobal = query.includeGlobal === 'true'
      const result = await admin.clientPolicies.listPolicies({ includeGlobalPolicies: includeGlobal })
      return result
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: t.Object({
      includeGlobal: t.Optional(t.String({ description: 'Include global built-in policies ("true"/"false")' })),
    }),
    response: { 200: ClientPoliciesResponse, ...CommonErrorResponses },
    detail: {
      summary: 'List Client Policies',
      description: 'List all client policies (optionally including built-in global policies)',
      tags: ['client-policies'],
    },
  })

  .put('/policies', async ({ getAdmin, headers, set, body }): Promise<ClientPoliciesResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)
      const existing = await admin.clientPolicies.listPolicies({ includeGlobalPolicies: false })
      const existingPolicies = existing.policies || []

      const updated = [...existingPolicies]
      for (const incoming of body.policies || []) {
        const idx = updated.findIndex(p => p.name === incoming.name)
        if (idx >= 0) updated[idx] = incoming
        else updated.push(incoming)
      }

      await admin.clientPolicies.updatePolicy({ policies: updated })
      const result = await admin.clientPolicies.listPolicies({ includeGlobalPolicies: false })
      return result
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: t.Object({ policies: t.Array(ClientPolicy) }),
    response: { 200: ClientPoliciesResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Update Client Policies',
      description: 'Create or update client policies (merges with existing by name)',
      tags: ['client-policies'],
    },
  })

  // ── CIMD Convenience Endpoints ───────────────────────────────────────────

  .get('/cimd/status', async ({ getAdmin, headers, set }): Promise<CimdStatusResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)

      // Find CIMD profile (has the client-id-metadata-document executor)
      const profiles = await admin.clientPolicies.listProfiles({ includeGlobalProfiles: false })
      const cimdProfile = (profiles.profiles || []).find(p =>
        p.executors?.some(e => e.executor === CIMD_EXECUTOR_ID)
      )

      // Find CIMD policy (has the client-id-uri condition)
      const policies = await admin.clientPolicies.listPolicies({ includeGlobalPolicies: false })
      const cimdPolicy = (policies.policies || []).find(p =>
        p.conditions?.some(c => c.condition === CIMD_CONDITION_ID)
      )

      if (!cimdProfile && !cimdPolicy) {
        return { enabled: false }
      }

      const executor = cimdProfile?.executors?.find(e => e.executor === CIMD_EXECUTOR_ID)
      const condition = cimdPolicy?.conditions?.find(c => c.condition === CIMD_CONDITION_ID)

      // Trusted domains from either the executor or condition config
      const execDomains = (executor?.configuration as Record<string, unknown>)?.['trusted-domains'] as string[] | undefined
      const condDomains = (condition?.configuration as Record<string, unknown>)?.['trusted-domains'] as string[] | undefined

      return {
        enabled: (cimdPolicy?.enabled ?? false) && !!cimdProfile,
        profileName: cimdProfile?.name,
        policyName: cimdPolicy?.name,
        trustedDomains: execDomains || condDomains || [],
        executorConfig: executor?.configuration as Record<string, unknown> | undefined,
      }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    response: { 200: CimdStatusResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Get CIMD Status',
      description: 'Check whether CIMD (OAuth Client ID Metadata Document) is configured and active',
      tags: ['client-policies'],
    },
  })

  .post('/cimd/configure', async ({ getAdmin, headers, set, body }): Promise<CimdSetupResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return { error: 'Authorization header required' } }

      const admin = await getAdmin(token)
      const profileName = body.profileName || DEFAULT_PROFILE_NAME
      const policyName = body.policyName || DEFAULT_POLICY_NAME
      const uriSchemes = body.uriSchemes || ['https']

      logger.admin.info('Configuring CIMD client policy', { profileName, policyName, trustedDomains: body.trustedDomains })

      // ── 1. Upsert the CIMD profile ──────────────────────────────────────
      const existingProfiles = await admin.clientPolicies.listProfiles({ includeGlobalProfiles: false })
      const profiles = existingProfiles.profiles || []

      const cimdProfile = {
        name: profileName,
        description: 'OAuth Client ID Metadata Document (CIMD) profile for MCP clients',
        executors: [{
          executor: CIMD_EXECUTOR_ID,
          configuration: {
            'is-allow-http-scheme': body.allowHttpScheme ?? false,
            'trusted-domains': body.trustedDomains,
            'is-restrict-same-domain': body.restrictSameDomain ?? false,
            'is-only-allow-confidential-client': body.onlyConfidentialClients ?? false,
          },
        }],
      }

      const profileIdx = profiles.findIndex(p => p.name === profileName)
      if (profileIdx >= 0) profiles[profileIdx] = cimdProfile
      else profiles.push(cimdProfile)

      await admin.clientPolicies.createProfiles({ profiles })

      // ── 2. Upsert the CIMD policy ──────────────────────────────────────
      const existingPolicies = await admin.clientPolicies.listPolicies({ includeGlobalPolicies: false })
      const policies = existingPolicies.policies || []

      const cimdPolicy = {
        name: policyName,
        description: 'Triggers CIMD processing when client_id is a URL matching trusted domains',
        enabled: true,
        conditions: [{
          condition: CIMD_CONDITION_ID,
          configuration: {
            'uri-scheme': uriSchemes,
            'trusted-domains': body.trustedDomains,
          },
        }],
        profiles: [profileName],
      }

      const policyIdx = policies.findIndex(p => p.name === policyName)
      if (policyIdx >= 0) policies[policyIdx] = cimdPolicy
      else policies.push(cimdPolicy)

      await admin.clientPolicies.updatePolicy({ policies })

      logger.admin.info('CIMD configured successfully', { profileName, policyName, trustedDomains: body.trustedDomains })

      return {
        success: true,
        message: `CIMD configured: profile "${profileName}" + policy "${policyName}" with trusted domains [${body.trustedDomains.join(', ')}]`,
        profileName,
        policyName,
        trustedDomains: body.trustedDomains,
      }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: CimdSetupRequest,
    response: { 200: CimdSetupResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Configure CIMD',
      description: 'One-click setup of OAuth Client ID Metadata Document (CIMD) for MCP 2025-11-25. Creates/updates the Keycloak client profile + policy for CIMD processing.',
      tags: ['client-policies'],
    },
  })
