// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { 
  CommonErrorResponses, 
  CreateRoleRequest, 
  UpdateRoleRequest,
  RoleResponse,
  SuccessResponse,
  ClientRoleParams,
  type RoleResponseType,
  type SuccessResponseType,
  type ErrorResponseType
} from '@/schemas'
import { handleAdminError } from '@/lib/admin-error-handler'
import { extractBearerToken } from '@/lib/admin-utils'
import { enrichRole, isTechnicalRole } from '@/lib/role-metadata'
import { buildRoleAttributes, mergeRoleUpdate } from '@/lib/role-payload'
import { resolveClientInternalId } from '@/lib/keycloak-client-lookup'
import { logger } from '@/lib/logger'

/**
 * Healthcare Roles & Permissions Management
 *
 * All routes now use the user's access token to perform operations,
 * acting as a secure proxy for Keycloak admin operations.
 *
 * Roles carry DESCRIPTIVE metadata only: a role may reference a scope set as a
 * human-readable label of the "typical scopes it represents". This is never used
 * for FHIR/MCP access enforcement (that stays scope-based in smart-access-control.ts).
 */
export const rolesRoutes = new Elysia({ prefix: '/roles' })
  .use(keycloakPlugin)

  .get('/', async ({ getAdmin, headers, query, set }): Promise<RoleResponseType[] | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const realmRoles = await admin.roles.find()

      // Hide plumbing roles (offline_access, default-roles-*, uma_authorization)
      // by default. Pass ?includeTechnical=true to include them.
      const includeTechnical = query.includeTechnical === 'true'
      const filtered = includeTechnical
        ? realmRoles
        : realmRoles.filter(role => !isTechnicalRole(role))

      return filtered.map(enrichRole)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    query: t.Object({
      includeTechnical: t.Optional(t.String({ description: 'Set to "true" to include technical/plumbing roles (default hides them)' }))
    }),
    response: {
      200: t.Array(RoleResponse),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List All Roles',
      description: 'Get all realm roles, enriched with descriptive metadata (isTechnical flag + represented scope set). Technical/plumbing roles are hidden unless ?includeTechnical=true.',
      tags: ['roles']
    }
  })

  .post('/', async ({ getAdmin, body, headers, set }): Promise<RoleResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.roles.create({
        name: body.name,
        description: body.description,
        attributes: buildRoleAttributes(body)
      })
      // Return the created role object (fetch by name), enriched with metadata.
      const created = await admin.roles.findOneByName({ name: body.name })
      return created ? enrichRole(created) : {}
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    body: CreateRoleRequest,
    response: {
      200: RoleResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Create Healthcare Role',
      description: 'Create a new healthcare-specific role',
      tags: ['roles']
    }
  })

  .get('/:roleName', async ({ getAdmin, params, headers, set }): Promise<RoleResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const role = await admin.roles.findOneByName({ name: params.roleName })

      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      return enrichRole(role)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      roleName: t.String({ description: 'Role name' })
    }),
    response: {
      200: RoleResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get Healthcare Role',
      description: 'Get a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .put('/:roleName', async ({ getAdmin, params, body, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const role = await admin.roles.findOneByName({ name: params.roleName })

      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      await admin.roles.updateByName({ name: params.roleName }, mergeRoleUpdate(role, body))
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      roleName: t.String({ description: 'Role name' })
    }),
    body: UpdateRoleRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update Healthcare Role',
      description: 'Update a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  .delete('/:roleName', async ({ getAdmin, params, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)

      // Check if role exists before deletion
      const role = await admin.roles.findOneByName({ name: params.roleName })
      if (!role) {
        set.status = 404
        return { error: 'Role not found' }
      }

      await admin.roles.delByName({ name: params.roleName })
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      roleName: t.String({ description: 'Role name' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete Healthcare Role',
      description: 'Delete a healthcare-specific role by name',
      tags: ['roles']
    }
  })

  // ─── Client Roles ───────────────────────────────────────────────────────────

  .get('/clients/:clientId', async ({ getAdmin, params, headers, set }): Promise<RoleResponseType[] | ErrorResponseType> => {
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

      const clientRoles = await admin.clients.listRoles({ id: internalId })
      return clientRoles.map(enrichRole)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      clientId: t.String({ description: 'Keycloak client ID' })
    }),
    response: {
      200: t.Array(RoleResponse),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List Client Roles',
      description: 'Get all roles for a specific Keycloak client (e.g., admin-ui)',
      tags: ['roles']
    }
  })

  .post('/clients/:clientId', async ({ getAdmin, params, body, headers, set }): Promise<RoleResponseType | ErrorResponseType> => {
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

      const existing = await admin.clients.findRole({ id: internalId, roleName: body.name })
      if (existing) {
        set.status = 409
        return { error: `Role '${body.name}' already exists on client '${params.clientId}'` }
      }

      await admin.clients.createRole({
        id: internalId,
        name: body.name,
        description: body.description,
        attributes: buildRoleAttributes(body)
      })

      logger.admin.info('Created client role', { clientId: params.clientId, role: body.name })

      const created = await admin.clients.findRole({ id: internalId, roleName: body.name })
      return created ? enrichRole(created) : {}
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      clientId: t.String({ description: 'Keycloak client ID' })
    }),
    body: CreateRoleRequest,
    response: {
      200: RoleResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Create Client Role',
      description: 'Create a role scoped to a specific Keycloak client, resolved by client id',
      tags: ['roles']
    }
  })

  .get('/clients/:clientId/:roleName', async ({ getAdmin, params, headers, set }): Promise<RoleResponseType | ErrorResponseType> => {
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

      const role = await admin.clients.findRole({ id: internalId, roleName: params.roleName })
      if (!role) {
        set.status = 404
        return { error: `Role '${params.roleName}' not found on client '${params.clientId}'` }
      }

      return enrichRole(role)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientRoleParams,
    response: {
      200: RoleResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get Client Role',
      description: 'Get a single role on a specific Keycloak client',
      tags: ['roles']
    }
  })

  .put('/clients/:clientId/:roleName', async ({ getAdmin, params, body, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
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

      const role = await admin.clients.findRole({ id: internalId, roleName: params.roleName })
      if (!role) {
        set.status = 404
        return { error: `Role '${params.roleName}' not found on client '${params.clientId}'` }
      }

      await admin.clients.updateRole(
        { id: internalId, roleName: params.roleName },
        mergeRoleUpdate(role, body)
      )

      logger.admin.info('Updated client role', { clientId: params.clientId, role: params.roleName })

      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientRoleParams,
    body: UpdateRoleRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update Client Role',
      description: 'Update a role on a specific Keycloak client. Same descriptive metadata as realm roles.',
      tags: ['roles']
    }
  })

  .delete('/clients/:clientId/:roleName', async ({ getAdmin, params, headers, set }): Promise<SuccessResponseType | ErrorResponseType> => {
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

      const role = await admin.clients.findRole({ id: internalId, roleName: params.roleName })
      if (!role) {
        set.status = 404
        return { error: `Role '${params.roleName}' not found on client '${params.clientId}'` }
      }

      await admin.clients.delRole({ id: internalId, roleName: params.roleName })

      logger.admin.info('Deleted client role', { clientId: params.clientId, role: params.roleName })

      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: ClientRoleParams,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete Client Role',
      description: 'Delete a role from a specific Keycloak client',
      tags: ['roles']
    }
  })
