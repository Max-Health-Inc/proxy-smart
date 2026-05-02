import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { 
  SuccessResponse,
  CommonErrorResponses,
  PaginationQuery,
  HealthcareUser, 
  CreateHealthcareUserRequest,
  UpdateHealthcareUserRequest,
  UserIdParam,
  FederatedIdentity,
  LinkFederatedIdentityRequest,
  type HealthcareUserType,
  type SuccessResponseType,
  type ErrorResponseType
} from '@/schemas'
import type { LinkFederatedIdentityRequestType } from '@/schemas'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin, mapHealthcareUser } from '@/lib/admin-utils'
import { handleAdminError } from '@/lib/admin-error-handler'
import { logger } from '@/lib/logger'

/**
 * Healthcare User Management - specialized for healthcare professionals
 */
export const healthcareUsersRoutes = new Elysia({ prefix: '/healthcare-users' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin, query, set, headers }): Promise<HealthcareUserType[] | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      logger.admin.debug('Healthcare users request - token present', { tokenPresent: !!token })
      
      if (!token) {
        logger.admin.warn('No token found in healthcare users request')
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      logger.admin.debug('Attempting to get admin client with token...')
      const admin = await getValidatedAdmin(getAdmin, token)
      logger.admin.debug('Admin client obtained successfully')
      
      logger.admin.debug('Fetching users from Keycloak...')
      const allUsers = await admin.users.find({
        max: Number(query.limit) || 50,
        first: Number(query.offset) || 0
      })
      
      logger.admin.info(`Found ${allUsers.length} users`)
      
      // Fetch complete user details (including timestamps) for each user
      const completeUsers = await Promise.all(
        allUsers.map(async (user) => {
          try {
            // Get complete user details including timestamps
            const completeUser = await admin.users.findOne({ id: user.id! })
            logger.admin.debug(`Complete user data for ${user.username}`, {
              id: completeUser?.id,
              username: completeUser?.username,
              createdTimestamp: completeUser?.createdTimestamp,
              created: completeUser?.createdTimestamp ? new Date(completeUser.createdTimestamp).toISOString() : 'null/undefined'
            })
            return completeUser || user
          } catch (error) {
            logger.admin.warn(`Failed to get complete details for user ${user.username}`, { error })
            return user
          }
        })
      )
      
      // Filter for healthcare users and map them with role information
      const healthcareUsers = await Promise.all(completeUsers.map(async (user) => {
        const profile = mapHealthcareUser(user)
        
        // Try to get user sessions for last login info
        let lastLogin: number | null = null
        try {
          const sessions = await admin.users.listSessions({ id: user.id! })
          if (sessions && sessions.length > 0) {
            // Find the most recent session
            const latestSession = sessions.reduce((latest, session) => 
              (session.lastAccess || 0) > (latest.lastAccess || 0) ? session : latest
            )
            lastLogin = latestSession.lastAccess || null
          }
        } catch (sessionError) {
          logger.admin.warn(`Could not get sessions for user ${user.username}`, { error: sessionError })
        }
        
        // Get user's realm roles and client roles
        let realmRoles: string[] = []
        const clientRoles: Record<string, string[]> = {}
        try {
          const userRoles = await admin.users.listRealmRoleMappings({ id: user.id! })
          realmRoles = userRoles.map(role => role.name || '').filter(Boolean)
          
          // Get client role mappings for admin-ui client
          try {
            const clients = await admin.clients.find({ clientId: 'admin-ui' })
            if (clients.length > 0) {
              const clientId = clients[0].id!
              const userClientRoles = await admin.users.listClientRoleMappings({ id: user.id!, clientUniqueId: clientId })
              clientRoles['admin-ui'] = userClientRoles.map(role => role.name || '').filter(Boolean)
            }
          } catch (clientRoleError) {
            logger.admin.warn(`Could not get client roles for user ${user.username}`, { error: clientRoleError })
          }
        } catch (roleError) {
          logger.admin.warn(`Could not get roles for user ${user.username}`, { error: roleError })
        }
        
        // Use custom attributes for additional info
        const organization = user.attributes?.organization?.[0] || ''

        // Get federated identity links
        let federatedIdentities: { identityProvider: string; userId: string; userName: string }[] = []
        try {
          const links = await admin.users.listFederatedIdentities({ id: user.id! })
          federatedIdentities = links.map(link => ({
            identityProvider: link.identityProvider ?? '',
            userId: link.userId ?? '',
            userName: link.userName ?? ''
          }))
        } catch (fedError) {
          logger.admin.warn(`Could not get federated identities for user ${user.username}`, { error: fedError })
        }
        
        return {
          ...profile,
          realmRoles,
          clientRoles,
          organization,
          lastLogin: lastLogin,
          federatedIdentities
        }
      }))
      
      logger.admin.info(`Returning ${healthcareUsers.length} healthcare users`)
      return healthcareUsers
    } catch (error) {
      logger.admin.error('Error in healthcare users endpoint', { error })
      return handleAdminError(error, set)
    }
  }, {
    query: PaginationQuery,
    response: {
      200: t.Array(HealthcareUser),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List Healthcare Users',
      description: 'Get all healthcare users with optional pagination',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })
  
  .post('/', async ({ getAdmin, body, set, headers }): Promise<HealthcareUserType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const userData = {
        username: body.username,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        enabled: body.enabled !== undefined ? body.enabled : true,
        emailVerified: body.emailVerified,
        attributes: {
          organization: body.organization ? [body.organization] : [],
          ...(body.fhirPersons && body.fhirPersons.length > 0 && { 
            fhir_persons: [JSON.stringify(body.fhirPersons)]
          }),
          ...(body.fhirUser && { fhirUser: [body.fhirUser] })
        },
        credentials: body.password ? [{
          type: 'password',
          value: body.password,
          temporary: body.temporaryPassword || false
        }] : []
      }
      
      const admin = await getValidatedAdmin(getAdmin, token)
      const result = await admin.users.create(userData)
      
      // Assign roles if specified
      if (result.id && (body.realmRoles || body.clientRoles)) {
        try {
          // Assign realm roles
          if (body.realmRoles && body.realmRoles.length > 0) {
            const allRealmRoles = await admin.roles.find()
            const rolesToAssign = allRealmRoles.filter(role => 
              body.realmRoles!.includes(role.name || '')
            ).map(role => ({ id: role.id!, name: role.name! }))
            if (rolesToAssign.length > 0) {
              await admin.users.addRealmRoleMappings({
                id: result.id,
                roles: rolesToAssign
              })
            }
          }
          
          // Assign client roles
          if (body.clientRoles) {
            for (const [clientId, roleNames] of Object.entries(body.clientRoles)) {
              try {
                const clients = await admin.clients.find({ clientId })
                if (clients.length > 0) {
                  const client = clients[0]
                  const clientRoles = await admin.clients.listRoles({ id: client.id! })
                  const rolesToAssign = clientRoles.filter(role => 
                    (roleNames as string[]).includes(role.name || '')
                  ).map(role => ({ id: role.id!, name: role.name! }))
                  if (rolesToAssign.length > 0) {
                    await admin.users.addClientRoleMappings({
                      id: result.id,
                      clientUniqueId: client.id!,
                      roles: rolesToAssign
                    })
                  }
                }
              } catch (clientError) {
                logger.admin.warn(`Could not assign client roles for ${clientId}`, { clientId, error: clientError })
              }
            }
          }
        } catch (roleError) {
          logger.admin.warn('Could not assign roles', { error: roleError })
        }
      }
      
      // Return the created user object (fetch by id)
      const created = result.id ? await admin.users.findOne({ id: result.id }) : undefined
      return created ? mapHealthcareUser(created) : { error: 'Failed to retrieve created user' }
    } catch (error) {
      logger.admin.error('Error creating healthcare user', { error })
      return handleAdminError(error, set)
    }
  }, {
    body: CreateHealthcareUserRequest,
    response: {
      200: HealthcareUser,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Create Healthcare User',
      description: 'Create a new healthcare user',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })
  
  .get('/:userId', async ({ getAdmin, params, set, headers }): Promise<HealthcareUserType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      const user = await admin.users.findOne({ id: params.userId })
      if (!user) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return mapHealthcareUser(user)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: UserIdParam,
    response: {
      200: HealthcareUser,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Get Healthcare User',
      description: 'Get a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })
  
  .put('/:userId', async ({ getAdmin, params, body, set, headers }): Promise<HealthcareUserType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      
      // Fetch existing user to merge — Keycloak PUT replaces the entire representation
      const existingUser = await admin.users.findOne({ id: params.userId })
      if (!existingUser) {
        set.status = 404
        return { error: 'User not found' }
      }

      const existingAttrs = existingUser.attributes || {}
      const mergedAttributes = {
        ...existingAttrs,
        ...(body.organization !== undefined && { organization: body.organization ? [body.organization] : undefined }),
        ...(body.fhirPersons && body.fhirPersons.length > 0 && { 
          fhir_persons: [JSON.stringify(body.fhirPersons)]
        }),
        ...(body.fhirUser !== undefined && { fhirUser: body.fhirUser ? [body.fhirUser] : undefined })
      }

      const updateData = {
        firstName: body.firstName ?? existingUser.firstName,
        lastName: body.lastName ?? existingUser.lastName,
        email: body.email ?? existingUser.email,
        enabled: body.enabled ?? existingUser.enabled,
        emailVerified: body.emailVerified ?? existingUser.emailVerified,
        attributes: mergedAttributes
      }
      
      await admin.users.update({ id: params.userId }, updateData)
      
      // Handle role updates if specified
      if (body.realmRoles !== undefined || body.clientRoles !== undefined) {
        try {
          // Update realm roles
          if (body.realmRoles !== undefined) {
            // Remove all existing realm roles
            const existingRoles = await admin.users.listRealmRoleMappings({ id: params.userId })
            if (existingRoles.length > 0) {
              await admin.users.delRealmRoleMappings({
                id: params.userId,
                roles: existingRoles.map(role => ({ id: role.id!, name: role.name! }))
              })
            }
            
            // Add new realm roles
            if (body.realmRoles.length > 0) {
              const allRealmRoles = await admin.roles.find()
              const rolesToAssign = allRealmRoles.filter(role => 
                body.realmRoles!.includes(role.name || '')
              ).map(role => ({ id: role.id!, name: role.name! }))
              if (rolesToAssign.length > 0) {
                await admin.users.addRealmRoleMappings({
                  id: params.userId,
                  roles: rolesToAssign
                })
              }
            }
          }
          
          // Update client roles
          if (body.clientRoles !== undefined) {
            for (const [clientId, roleNames] of Object.entries(body.clientRoles)) {
              try {
                const clients = await admin.clients.find({ clientId })
                if (clients.length > 0) {
                  const client = clients[0]
                  
                  // Remove existing client roles
                  const existingClientRoles = await admin.users.listClientRoleMappings({ 
                    id: params.userId, 
                    clientUniqueId: client.id! 
                  })
                  if (existingClientRoles.length > 0) {
                    await admin.users.delClientRoleMappings({
                      id: params.userId,
                      clientUniqueId: client.id!,
                      roles: existingClientRoles.map(role => ({ id: role.id!, name: role.name! }))
                    })
                  }
                  
                  // Add new client roles
                  if ((roleNames as string[]).length > 0) {
                    const clientRoles = await admin.clients.listRoles({ id: client.id! })
                    const rolesToAssign = clientRoles.filter(role => 
                      (roleNames as string[]).includes(role.name || '')
                    ).map(role => ({ id: role.id!, name: role.name! }))
                    if (rolesToAssign.length > 0) {
                      await admin.users.addClientRoleMappings({
                        id: params.userId,
                        clientUniqueId: client.id!,
                        roles: rolesToAssign
                      })
                    }
                  }
                }
              } catch (clientError) {
                logger.admin.warn(`Could not update client roles for ${clientId}`, { clientId, userId: params.userId, error: clientError })
              }
            }
          }
        } catch (roleError) {
          logger.admin.warn('Could not update roles', { userId: params.userId, error: roleError })
        }
      }
      
      // Return the updated user object
      const updated = await admin.users.findOne({ id: params.userId })
      if (!updated) {
        set.status = 404
        return { error: 'Healthcare user not found' }
      }
      return mapHealthcareUser(updated)
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: UserIdParam,
    body: UpdateHealthcareUserRequest,
    response: {
      200: HealthcareUser,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Update Healthcare User',
      description: 'Update a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })
  
  .delete('/:userId', async ({ getAdmin, params, set, headers }): Promise<SuccessResponseType | ErrorResponseType> => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      await admin.users.del({ id: params.userId })
      return { success: true, message: 'Healthcare user deleted successfully' }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: UserIdParam,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Delete Healthcare User',
      description: 'Delete a healthcare user by userId',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })

  // ── Federated Identity (IdP Link) Management ──────────────────────────

  .get('/:userId/federated-identities', async ({ getAdmin, params, set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }

      const admin = await getValidatedAdmin(getAdmin, token)
      const identities = await admin.users.listFederatedIdentities({ id: params.userId })
      return identities.map(id => ({
        identityProvider: id.identityProvider ?? '',
        userId: id.userId ?? '',
        userName: id.userName ?? ''
      }))
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: UserIdParam,
    response: { 200: t.Array(FederatedIdentity), ...CommonErrorResponses },
    detail: {
      summary: 'List Federated Identities',
      description: 'Get all identity provider links for a user',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })

  .post('/:userId/federated-identities/:provider', async ({ getAdmin, params, body, set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }

      const admin = await getValidatedAdmin(getAdmin, token)
      const linkBody = body as LinkFederatedIdentityRequestType
      await admin.users.addToFederatedIdentity({
        id: params.userId,
        federatedIdentityId: params.provider,
        federatedIdentity: {
          identityProvider: params.provider,
          userId: linkBody.userId,
          userName: linkBody.userName
        }
      })
      return { success: true, message: `Linked identity provider '${params.provider}'` }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'User ID' }),
      provider: t.String({ description: 'Identity provider alias' })
    }),
    body: LinkFederatedIdentityRequest,
    response: { 200: SuccessResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Link Federated Identity',
      description: 'Link an identity provider account to a user',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })

  .delete('/:userId/federated-identities/:provider', async ({ getAdmin, params, set, headers }) => {
    try {
      const token = extractBearerToken(headers)
      if (!token) { set.status = 401; return UNAUTHORIZED_RESPONSE }

      const admin = await getValidatedAdmin(getAdmin, token)
      await admin.users.delFromFederatedIdentity({
        id: params.userId,
        federatedIdentityId: params.provider
      })
      return { success: true, message: `Unlinked identity provider '${params.provider}'` }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'User ID' }),
      provider: t.String({ description: 'Identity provider alias' })
    }),
    response: { 200: SuccessResponse, ...CommonErrorResponses },
    detail: {
      summary: 'Unlink Federated Identity',
      description: 'Remove an identity provider link from a user',
      tags: ['healthcare-users'],
      security: [{ BearerAuth: [] }]
    }
  })
