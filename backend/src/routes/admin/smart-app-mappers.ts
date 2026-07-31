// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import {
  CommonErrorResponses,
  SuccessResponse,
  ClientIdParam,
  ProtocolMapperResponse,
  CreateProtocolMapperRequest,
  UpdateProtocolMapperRequest,
  AddAudienceMapperRequest,
  AddAudienceMapperResponse,
  type ProtocolMapperResponseType,
  type AddAudienceMapperResponseType,
  type SuccessResponseType,
  type ErrorResponseType
} from '@/schemas'
import { handleAdminError } from '@/lib/admin-error-handler'
import { extractBearerToken } from '@/lib/admin-utils'
import { findClientByClientId, resolveClientInternalId } from '@/lib/keycloak-client-lookup'
import { invalidateClientConfig } from '@/lib/smart-client-config-cache'
import { logger } from '@/lib/logger'
import type ProtocolMapperRepresentation from '@keycloak/keycloak-admin-client/lib/defs/protocolMapperRepresentation.js'

/**
 * Protocol mapper management for SMART app clients.
 *
 * A client's protocol mappers decide what its tokens actually contain, so they
 * are the difference between a launch that works and one that fails with an
 * audience or a missing-claim error. Managing them used to mean reaching past
 * this API into Keycloak's admin REST endpoints directly; these routes make the
 * same operations first-class, auditable, and reachable with a normal admin
 * token — including resolving the client id to Keycloak's internal UUID, which
 * is the step every hand-written call had to repeat.
 *
 * Lives beside smart-apps.ts rather than inside it: that file is already at the
 * limit of what one module should hold, and mappers are a self-contained
 * sub-resource.
 */

/** Keycloak's mapper type for putting an entry in the token audience. */
export const AUDIENCE_MAPPER_TYPE = 'oidc-audience-mapper'

/** Config key used when the audience is another client in the realm. */
export const INCLUDED_CLIENT_AUDIENCE = 'included.client.audience'

/** Config key used when the audience is a literal value (typically a URL). */
export const INCLUDED_CUSTOM_AUDIENCE = 'included.custom.audience'

/** Default protocol for SMART app mappers. */
const OPENID_CONNECT = 'openid-connect'

const mapperParams = t.Object({
  clientId: t.String({ description: 'OAuth2 client ID' }),
  mapperId: t.String({ description: 'Protocol mapper ID' })
})

/**
 * Normalize a Keycloak mapper for the API.
 *
 * Keycloak types the config as `Record<string, any>`; it is a flat string map
 * in practice, and coercing here keeps that assumption in exactly one place
 * instead of letting `any` leak into every consumer.
 */
function normalizeMapper(mapper: ProtocolMapperRepresentation): ProtocolMapperResponseType {
  const config: Record<string, string> = {}
  for (const [key, value] of Object.entries(mapper.config ?? {})) {
    if (value === undefined || value === null) continue
    config[key] = String(value)
  }
  return {
    id: mapper.id,
    name: mapper.name,
    protocol: mapper.protocol,
    protocolMapper: mapper.protocolMapper,
    config
  }
}

/** Read the audience an audience-mapper emits, whichever key it was stored under. */
function audienceOf(mapper: ProtocolMapperRepresentation): string | undefined {
  const config = mapper.config as Record<string, string> | undefined
  return config?.[INCLUDED_CLIENT_AUDIENCE] || config?.[INCLUDED_CUSTOM_AUDIENCE] || undefined
}

export const smartAppMapperRoutes = new Elysia({ prefix: '/smart-apps', tags: ['smart-apps'] })
  .use(keycloakPlugin)

  .get('/:clientId/mappers', async ({ getAdmin, params, headers, set }): Promise<ProtocolMapperResponseType[] | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const internalId = await resolveClientInternalId(admin, params.clientId)
      if (!internalId) {
        set.status = 404
        return { error: `Client '${params.clientId}' not found` }
      }

      const mappers = await admin.clients.listProtocolMappers({ id: internalId })
      return mappers.map(normalizeMapper)
    } catch (error) {
      logger.admin.error('Failed to list client protocol mappers', { error, clientId: params.clientId })
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    response: {
      200: t.Array(ProtocolMapperResponse),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List Client Protocol Mappers',
      description: 'Get every protocol mapper attached to a SMART app client, resolved by client id',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .post('/:clientId/mappers', async ({ getAdmin, params, body, headers, set }): Promise<ProtocolMapperResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const internalId = await resolveClientInternalId(admin, params.clientId)
      if (!internalId) {
        set.status = 404
        return { error: `Client '${params.clientId}' not found` }
      }

      // Mapper names are unique per client in Keycloak; rejecting here turns a
      // generic 409 from Keycloak into a message that names the conflict.
      const existing = await admin.clients.listProtocolMappers({ id: internalId })
      if (existing.some(mapper => mapper.name === body.name)) {
        set.status = 409
        return { error: `A protocol mapper named '${body.name}' already exists on client '${params.clientId}'` }
      }

      await admin.clients.addProtocolMapper({ id: internalId }, {
        name: body.name,
        protocol: body.protocol ?? OPENID_CONNECT,
        protocolMapper: body.protocolMapper,
        config: body.config ?? {}
      })

      // The client's token shape just changed; drop any cached view of it.
      invalidateClientConfig(params.clientId)

      logger.admin.info('Created client protocol mapper', {
        clientId: params.clientId,
        mapper: body.name,
        type: body.protocolMapper
      })

      const refreshed = await admin.clients.listProtocolMappers({ id: internalId })
      const created = refreshed.find(mapper => mapper.name === body.name)
      return normalizeMapper(created ?? {
        name: body.name,
        protocol: body.protocol ?? OPENID_CONNECT,
        protocolMapper: body.protocolMapper,
        config: body.config ?? {}
      })
    } catch (error) {
      logger.admin.error('Failed to create client protocol mapper', { error, clientId: params.clientId })
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    body: CreateProtocolMapperRequest,
    response: {
      200: ProtocolMapperResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Create Client Protocol Mapper',
      description: 'Attach a protocol mapper to a SMART app client. Mapper names are unique per client.',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  /**
   * Put an entry in the client's token audience.
   *
   * This is the audience-mapper mechanic spelled out once, in the one place
   * that knows it: pick `included.client.audience` when the audience names a
   * client in the realm and `included.custom.audience` when it does not
   * (Keycloak silently emits nothing if you use the wrong key), default the
   * name, and keep the access-token claim on. Idempotent, so it is safe to run
   * from a deploy or reconcile step.
   */
  .post('/:clientId/mappers/audience', async ({ getAdmin, params, body, headers, set }): Promise<AddAudienceMapperResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const internalId = await resolveClientInternalId(admin, params.clientId)
      if (!internalId) {
        set.status = 404
        return { error: `Client '${params.clientId}' not found` }
      }

      // Already present for this audience? Return it rather than duplicating.
      const existingMappers = await admin.clients.listProtocolMappers({ id: internalId })
      const alreadyThere = existingMappers.find(
        mapper => mapper.protocolMapper === AUDIENCE_MAPPER_TYPE && audienceOf(mapper) === body.audience
      )
      if (alreadyThere) {
        return {
          created: false,
          resolvedAs: alreadyThere.config?.[INCLUDED_CLIENT_AUDIENCE] ? 'client' : 'custom',
          mapper: normalizeMapper(alreadyThere)
        }
      }

      // A realm client id goes in included.client.audience; anything else is a
      // literal audience value and belongs in included.custom.audience.
      const audienceClient = await findClientByClientId(admin, body.audience)
      const resolvedAs = audienceClient ? 'client' : 'custom'
      const audienceKey = audienceClient ? INCLUDED_CLIENT_AUDIENCE : INCLUDED_CUSTOM_AUDIENCE
      const name = body.name ?? `${body.audience}-audience`

      if (existingMappers.some(mapper => mapper.name === name)) {
        set.status = 409
        return { error: `A protocol mapper named '${name}' already exists on client '${params.clientId}'` }
      }

      await admin.clients.addProtocolMapper({ id: internalId }, {
        name,
        protocol: OPENID_CONNECT,
        protocolMapper: AUDIENCE_MAPPER_TYPE,
        config: {
          [audienceKey]: body.audience,
          'access.token.claim': 'true',
          'id.token.claim': body.includeInIdToken ? 'true' : 'false'
        }
      })

      invalidateClientConfig(params.clientId)

      logger.admin.info('Added audience mapper to client', {
        clientId: params.clientId,
        audience: body.audience,
        resolvedAs
      })

      const refreshed = await admin.clients.listProtocolMappers({ id: internalId })
      const created = refreshed.find(mapper => mapper.name === name)
      return {
        created: true,
        resolvedAs,
        mapper: normalizeMapper(created ?? { name, protocol: OPENID_CONNECT, protocolMapper: AUDIENCE_MAPPER_TYPE })
      }
    } catch (error) {
      logger.admin.error('Failed to add audience mapper', { error, clientId: params.clientId })
      return handleAdminError(error, set)
    }
  }, {
    params: ClientIdParam,
    body: AddAudienceMapperRequest,
    response: {
      200: AddAudienceMapperResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Add Audience Mapper',
      description:
        'Idempotently add an oidc-audience-mapper to a SMART app client. The audience may be another realm client id or a literal URL; the route picks the correct Keycloak config key for each.',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .put('/:clientId/mappers/:mapperId', async ({ getAdmin, params, body, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const internalId = await resolveClientInternalId(admin, params.clientId)
      if (!internalId) {
        set.status = 404
        return { error: `Client '${params.clientId}' not found` }
      }

      const existing = await admin.clients.findProtocolMapperById({ id: internalId, mapperId: params.mapperId })
      if (!existing) {
        set.status = 404
        return { error: 'Protocol mapper not found on this client' }
      }

      await admin.clients.updateProtocolMapper({ id: internalId, mapperId: params.mapperId }, {
        ...existing,
        id: params.mapperId,
        name: body.name ?? existing.name,
        // Merge so a caller can flip one key without restating the whole mapper.
        config: body.config ? { ...existing.config, ...body.config } : existing.config
      })

      invalidateClientConfig(params.clientId)

      logger.admin.info('Updated client protocol mapper', { clientId: params.clientId, mapperId: params.mapperId })

      return { success: true }
    } catch (error) {
      logger.admin.error('Failed to update client protocol mapper', { error, ...params })
      return handleAdminError(error, set)
    }
  }, {
    params: mapperParams,
    body: UpdateProtocolMapperRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update Client Protocol Mapper',
      description: 'Update a protocol mapper on a SMART app client. Config entries are merged into the existing configuration.',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })

  .delete('/:clientId/mappers/:mapperId', async ({ getAdmin, params, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const internalId = await resolveClientInternalId(admin, params.clientId)
      if (!internalId) {
        set.status = 404
        return { error: `Client '${params.clientId}' not found` }
      }

      const existing = await admin.clients.findProtocolMapperById({ id: internalId, mapperId: params.mapperId })
      if (!existing) {
        set.status = 404
        return { error: 'Protocol mapper not found on this client' }
      }

      await admin.clients.delProtocolMapper({ id: internalId, mapperId: params.mapperId })

      invalidateClientConfig(params.clientId)

      logger.admin.info('Deleted client protocol mapper', { clientId: params.clientId, mapperId: params.mapperId })

      return { success: true }
    } catch (error) {
      logger.admin.error('Failed to delete client protocol mapper', { error, ...params })
      return handleAdminError(error, set)
    }
  }, {
    params: mapperParams,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete Client Protocol Mapper',
      description: 'Remove a protocol mapper from a SMART app client',
      tags: ['smart-apps'],
      security: [{ BearerAuth: [] }]
    }
  })
