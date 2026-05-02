import { Elysia, t } from 'elysia'
import { keycloakPlugin } from '@/lib/keycloak-plugin'
import { 
  CommonErrorResponses,
  SetFhirContextRequest,
  SetIntentRequest,
  SetNeedPatientBannerRequest,
  SetSmartStyleUrlRequest,
  SetTenantRequest,
  LaunchContextUser,
  SuccessResponse
} from '@/schemas'
import { extractBearerToken, UNAUTHORIZED_RESPONSE, getValidatedAdmin, getUserAttribute, getUserAttributeBoolean, setUserAttribute } from '@/lib/admin-utils'
import { handleAdminError } from '@/lib/admin-error-handler'
import { logger } from '@/lib/logger'

/**
 * SMART Launch Context Management - handles patient/encounter/user contexts per SMART App Launch spec
 * 
 * Core SMART context attributes (per SMART App Launch Framework 2.2.0 specification):
 * - fhirUser: The FHIR resource representing the current user (Practitioner, Patient, Person, RelatedPerson)
 * - patient: The patient in context
 * - encounter: The encounter in context  
 * - fhirContext: Array of FHIR resources in context (objects with reference, canonical, or identifier)
 * 
 * Extended attributes aligned with SMART specifications:
 * - intent: Intent string for workflow context (e.g., reconcile-medications)
 * - smart_style_url: URL to CSS stylesheet for branding (per User-access Brands and Endpoints)
 * - tenant: Tenant identifier for multi-tenant deployments
 * - need_patient_banner: Boolean indicating whether patient banner is required
 * 
 * Note: The "locations" parameter in SMART specifications refers to FHIR server endpoints for 
 * multi-server authorization (authorization_details), not physical location context. Physical
 * locations would be included in fhirContext as Location resources if needed.
 */
export const launchContextRoutes = new Elysia({ prefix: '/launch-contexts' })
  .use(keycloakPlugin)
  
  .get('/', async ({ getAdmin, headers, set }) => {
    logger.admin.info('Fetching users with launch context attributes')
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized access attempt - no bearer token provided')
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      // Get users with SMART launch context attributes
      const admin = await getValidatedAdmin(getAdmin, token)
      logger.admin.debug('Successfully validated admin token for launch contexts request')
      
      const users = await admin.users.find()
      const filteredUsers = users
        .filter(user => 
          user.attributes?.['fhirUser'] || 
          user.attributes?.['smart_patient'] || 
          user.attributes?.['smart_encounter'] ||
          user.attributes?.['smart_fhir_context'] ||
          user.attributes?.['smart_intent'] ||
          user.attributes?.['smart_style_url'] ||
          user.attributes?.['smart_tenant'] ||
          user.attributes?.['smart_need_patient_banner'] ||
          // Legacy support
          user.attributes?.['launch_patient'] ||
          user.attributes?.['launch_encounter']
        )
        .map(user => ({
          userId: user.id ?? '',
          username: user.username ?? '',
          fhirUser: getUserAttribute(user, 'fhirUser'),
          patient: getUserAttribute(user, 'smart_patient'),
          encounter: getUserAttribute(user, 'smart_encounter'),
          fhirContext: getUserAttribute(user, 'smart_fhir_context'),
          intent: getUserAttribute(user, 'smart_intent'),
          smartStyleUrl: getUserAttribute(user, 'smart_style_url'),
          tenant: getUserAttribute(user, 'smart_tenant'),
          needPatientBanner: getUserAttributeBoolean(user, 'smart_need_patient_banner'),
          // Legacy support for existing attributes
          launchPatient: getUserAttribute(user, 'launch_patient'),
          launchEncounter: getUserAttribute(user, 'launch_encounter')
        }))
      
      logger.admin.info('Successfully retrieved launch context users', { 
        totalUsers: users.length, 
        usersWithContexts: filteredUsers.length 
      })
      
      return filteredUsers
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to fetch launch contexts', { error: errorMessage }, error instanceof Error ? error : undefined)
      return handleAdminError(error, set)
    }
  }, {
    response: {
      200: t.Array(LaunchContextUser),
      ...CommonErrorResponses
    },
    detail: {
      summary: 'List Launch Contexts',
      description: 'Get all users with launch context attributes',
      tags: ['launch-contexts']
    }
  })
  
  // SMART on FHIR context management routes
  .post('/:userId/fhir-user/:fhirUserId', async ({ getAdmin, params, headers, set }) => {
    logger.admin.info('Setting FHIR user context', { userId: params.userId, fhirUserId: params.fhirUserId })
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized attempt to set FHIR user context', { userId: params.userId })
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      await setUserAttribute(admin, params.userId, 'fhirUser', params.fhirUserId)
      
      logger.admin.info('Successfully set FHIR user context', { 
        userId: params.userId, 
        fhirUserId: params.fhirUserId 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to set FHIR user context', { 
        userId: params.userId, 
        fhirUserId: params.fhirUserId,
        error: errorMessage 
      }, error instanceof Error ? error : undefined)
      return handleAdminError(error, set)
    }
  }, {    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' }),
      fhirUserId: t.String({ description: 'FHIR User reference (e.g. Patient/123, Practitioner/456)' })
    }),    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set FHIR User Context',
      description: 'Set the fhirUser context for a user (e.g., Practitioner/123)',
      tags: ['launch-contexts']
    }
  })

  .post('/:userId/patient/:patientId', async ({ getAdmin, params, headers, set }) => {
    logger.admin.info('Setting patient context', { userId: params.userId, patientId: params.patientId })
    
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        logger.admin.warn('Unauthorized attempt to set patient context', { userId: params.userId })
        set.status = 401
        return UNAUTHORIZED_RESPONSE
      }

      const admin = await getValidatedAdmin(getAdmin, token)
      // Set both new and legacy attributes for backwards compatibility
      await setUserAttribute(admin, params.userId, 'smart_patient', params.patientId, 'launch_patient')
      
      logger.admin.info('Successfully set patient context', { 
        userId: params.userId, 
        patientId: params.patientId 
      })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.admin.error('Failed to set patient context', { 
        userId: params.userId, 
        patientId: params.patientId,
        error: errorMessage 
      }, error instanceof Error ? error : undefined)
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' }),
      patientId: t.String({ description: 'FHIR Patient resource ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Patient Context',
      description: 'Set the patient context for a user',
      tags: ['launch-contexts']
    }
  })
  
  .post('/:userId/encounter/:encounterId', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { 
          smart_encounter: [params.encounterId],
          // Keep legacy attribute for backwards compatibility
          launch_encounter: [params.encounterId]
        } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' }),
      encounterId: t.String({ description: 'FHIR Encounter resource ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Encounter Context',
      description: 'Set the encounter context for a user',
      tags: ['launch-contexts']
    }
  })
  
  .post('/:userId/fhir-context', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      
      // Validate fhirContext format - should be array of objects
      let fhirContextArray
      try {
        fhirContextArray = JSON.parse(body.fhirContext)
        if (!Array.isArray(fhirContextArray)) {
          throw new Error('fhirContext must be an array')
        }
        
        // Validate each context object has required properties
        for (const contextItem of fhirContextArray) {
          if (!contextItem.reference && !contextItem.canonical && !contextItem.identifier) {
            throw new Error('Each fhirContext item must have at least one of: reference, canonical, or identifier')
          }
        }
      } catch {
        set.status = 400
        return { error: 'Invalid fhirContext format. Must be JSON array of objects with reference, canonical, or identifier properties' }
      }

      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_fhir_context: [body.fhirContext] } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    body: SetFhirContextRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set FHIR Context',
      description: 'Set additional FHIR resources in context as per SMART 2.2.0 spec',
      tags: ['launch-contexts']
    }
  })

  // Delete routes for new SMART attributes
  .delete('/:userId/fhir-user', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.fhirUser
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove FHIR User Context',
      description: 'Remove the fhirUser context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/patient', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        // Clean up both new and legacy attributes
        delete user.attributes.smart_patient
        delete user.attributes.launch_patient
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Patient Context',
      description: 'Remove the patient context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/encounter', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        // Clean up both new and legacy attributes
        delete user.attributes.smart_encounter
        delete user.attributes.launch_encounter
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Encounter Context',
      description: 'Remove the encounter context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/fhir-context', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_fhir_context
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove FHIR Context',
      description: 'Remove additional FHIR resources in context',
      tags: ['launch-contexts']
    }
  })

  // Additional SMART context attributes routes
  .put('/:userId/intent', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_intent: [body.intent] } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    body: SetIntentRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Intent Context',
      description: 'Set the intent context for a user',
      tags: ['launch-contexts']
    }
  })

  .put('/:userId/need-patient-banner', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_need_patient_banner: [body.needPatientBanner.toString()] } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    body: SetNeedPatientBannerRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Need Patient Banner Context',
      description: 'Set whether patient banner is required for a user',
      tags: ['launch-contexts']
    }
  })

  .put('/:userId/smart-style-url', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_style_url: [body.styleUrl] } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    body: SetSmartStyleUrlRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Smart Style URL Context',
      description: 'Set the smart-style-url context for a user',
      tags: ['launch-contexts']
    }
  })

  .put('/:userId/tenant', async ({ getAdmin, params, body, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      await admin.users.update(
        { id: params.userId },
        { attributes: { smart_tenant: [body.tenant] } }
      )
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    body: SetTenantRequest,
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Set Tenant Context',
      description: 'Set the tenant context for a user',
      tags: ['launch-contexts']
    }
  })

  // Delete routes for additional SMART context attributes
  .delete('/:userId/intent', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_intent
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Intent Context',
      description: 'Remove the intent context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/need-patient-banner', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_need_patient_banner
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Need Patient Banner Context',
      description: 'Remove the need-patient-banner context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/smart-style-url', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_style_url
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Smart Style URL Context',
      description: 'Remove the smart-style-url context for a user',
      tags: ['launch-contexts']
    }
  })

  .delete('/:userId/tenant', async ({ getAdmin, params, headers, set }) => {
    try {
      // Extract user's token from Authorization header
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }

      const admin = await getAdmin(token)
      const user = await admin.users.findOne({ id: params.userId })
      if (user?.attributes) {
        delete user.attributes.smart_tenant
        await admin.users.update({ id: params.userId }, { attributes: user.attributes })
      }
      return { success: true }
    } catch (error) {
      return handleAdminError(error, set)
    }
  }, {
    params: t.Object({
      userId: t.String({ description: 'Keycloak user ID' })
    }),
    response: {
      200: SuccessResponse,
      ...CommonErrorResponses
    },
    detail: {
      summary: 'Remove Tenant Context',
      description: 'Remove the tenant context for a user',
      tags: ['launch-contexts']
    }
  })
