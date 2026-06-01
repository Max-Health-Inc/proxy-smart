/**
 * Admin routes for Scope Sets — reusable named scope collections.
 *
 * CRUD:
 *  - GET    /admin/scope-sets       → list all
 *  - GET    /admin/scope-sets/:id   → get one
 *  - POST   /admin/scope-sets       → create
 *  - PUT    /admin/scope-sets/:id   → update
 *  - DELETE /admin/scope-sets/:id   → delete
 */

import { Elysia, t } from 'elysia'
import { validateToken } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  ScopeSet,
  ScopeSetListResponse,
  CreateScopeSetRequest,
  UpdateScopeSetRequest,
  ErrorResponse,
} from '@/schemas'
import {
  loadScopeSets,
  getScopeSet,
  createScopeSet,
  updateScopeSet,
  deleteScopeSet,
} from '@/lib/scope-sets-store'

export const scopeSetsAdminRoutes = new Elysia({
  prefix: '/scope-sets',
  tags: ['scope-sets'],
})
  .get('/', async ({ headers }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const scopeSets = loadScopeSets()
    return { scopeSets, total: scopeSets.length }
  }, {
    detail: {
      summary: 'List scope sets',
      description: 'Returns all persisted scope sets (templates + custom).',
      tags: ['scope-sets'],
    },
    response: { 200: ScopeSetListResponse, 401: ErrorResponse },
  })

  .get('/:id', async ({ headers, params }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const scopeSet = getScopeSet(params.id)
    if (!scopeSet) {
      throw new Error('Scope set not found')
    }
    return scopeSet
  }, {
    params: t.Object({ id: t.String() }),
    detail: {
      summary: 'Get scope set by ID',
      description: 'Returns a single scope set.',
      tags: ['scope-sets'],
    },
    response: { 200: ScopeSet, 401: ErrorResponse, 404: ErrorResponse },
  })

  .post('/', async ({ headers, body }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const created = createScopeSet(body)
    logger.server.info('Scope set created', { id: created.id, name: created.name, scopeCount: created.scopes.length })
    return created
  }, {
    body: CreateScopeSetRequest,
    detail: {
      summary: 'Create scope set',
      description: 'Create a new reusable scope set.',
      tags: ['scope-sets'],
    },
    response: { 200: ScopeSet, 401: ErrorResponse },
  })

  .put('/:id', async ({ headers, params, body }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const updated = updateScopeSet(params.id, body)
    if (!updated) {
      throw new Error('Scope set not found or is a template (cannot edit)')
    }
    logger.server.info('Scope set updated', { id: updated.id, name: updated.name })
    return updated
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateScopeSetRequest,
    detail: {
      summary: 'Update scope set',
      description: 'Update an existing scope set. Templates cannot be edited.',
      tags: ['scope-sets'],
    },
    response: { 200: ScopeSet, 401: ErrorResponse, 404: ErrorResponse },
  })

  .delete('/:id', async ({ headers, params }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const deleted = deleteScopeSet(params.id)
    if (!deleted) {
      throw new Error('Scope set not found or is a template (cannot delete)')
    }
    logger.server.info('Scope set deleted', { id: params.id })
    return { success: true, message: 'Scope set deleted' }
  }, {
    params: t.Object({ id: t.String() }),
    detail: {
      summary: 'Delete scope set',
      description: 'Delete a scope set. Built-in templates cannot be deleted.',
      tags: ['scope-sets'],
    },
    response: { 200: t.Object({ success: t.Boolean(), message: t.String() }), 401: ErrorResponse, 404: ErrorResponse },
  })
