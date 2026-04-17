/**
 * Patient Scribe Route (SMART-authenticated)
 *
 * POST /api/patient-scribe
 *
 * Accepts free text (symptoms, medication info, etc.), validates the caller's
 * SMART access token, runs AI + babelfhir-ts validation, and returns
 * validated FHIR resources for review via ResourceReviewCard.
 */

import { Elysia, t } from 'elysia'
import { logger } from '@/lib/logger'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { ErrorResponse } from '@/schemas'
import { generateFromText } from '@/lib/document-import'

export const patientScribeRoutes = new Elysia({ prefix: '/patient-scribe' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Unauthorized', details: 'Bearer token required' }
      }

      try {
        await validateToken(token)
      } catch {
        set.status = 401
        return { error: 'Unauthorized', details: 'Invalid or expired token' }
      }

      if (!config.ai.openaiApiKey) {
        set.status = 503
        return { error: 'AI not configured', details: 'Patient scribe requires AI to be configured' }
      }

      const { text, patientId } = body

      if (!text.trim()) {
        set.status = 400
        return { error: 'Empty input', details: 'Please provide some text to process' }
      }

      try {
        const result = await generateFromText(text, { patientId })

        return {
          success: true,
          resources: result.resources.map(r => ({
            resourceType: r.resourceType,
            resource: r.resource,
            retriesNeeded: r.retriesNeeded,
            warnings: r.warnings,
          })),
          failed: result.failed.map(f => ({
            resourceType: f.resourceType,
            errors: f.errors,
            warnings: f.warnings,
            retriesAttempted: f.retriesAttempted,
          })),
          processingTimeMs: result.processingTimeMs,
        }
      } catch (error) {
        logger.server.error('Patient scribe failed', { error })
        set.status = 500
        return { error: 'Scribe failed', details: error instanceof Error ? error.message : String(error) }
      }
    },
    {
      body: t.Object({
        text: t.String({ description: 'Free text describing symptoms, medications, etc.', maxLength: 50000 }),
        patientId: t.String({ description: 'FHIR Patient ID to associate resources with' }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          resources: t.Array(t.Object({
            resourceType: t.String(),
            resource: t.Any({ description: 'Validated FHIR R4 resource' }),
            retriesNeeded: t.Number(),
            warnings: t.Array(t.String()),
          })),
          failed: t.Array(t.Object({
            resourceType: t.String(),
            errors: t.Array(t.String()),
            warnings: t.Array(t.String()),
            retriesAttempted: t.Number(),
          })),
          processingTimeMs: t.Number(),
        }),
        400: ErrorResponse,
        401: ErrorResponse,
        500: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: 'Patient Scribe — text to FHIR',
        description: 'Convert free-text patient input into validated FHIR R4 resources',
        tags: ['api', 'patient-scribe'],
      },
    },
  )
