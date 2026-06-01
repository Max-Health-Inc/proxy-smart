/**
 * Document Import Route
 *
 * POST /admin/document-import
 *
 * Accepts a PDF, runs OCR + AI + babelfhir-ts validation, and returns
 * the validated FHIR resources to the client. The client (patient portal)
 * then POSTs them through the FHIR proxy using its own SMART access token
 * so that scope enforcement, consent, and audit all apply correctly.
 */

import { Elysia, t } from 'elysia'
import { config } from '@/config'
import { ErrorResponse } from '@/schemas'
import { extractBearerToken } from '@/lib/admin-utils'
import { validateAdminToken } from '@/lib/auth'
import { processDocumentImport } from '@/lib/document-import-handler'

export const documentImportRoutes = new Elysia({ prefix: '/document-import' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Authorization header required' }
      }
      await validateAdminToken(token)

      if (!config.ai.openaiApiKey) {
        set.status = 503
        return { error: 'AI not configured', details: 'OPENAI_API_KEY is required for document import' }
      }

      const { file, patientId, engine } = body

      if (file.type !== 'application/pdf') {
        set.status = 400
        return { error: 'Invalid file type', details: 'Only PDF files are supported' }
      }

      try {
        return await processDocumentImport({ file, patientId, engine })
      } catch (error) {
        set.status = 500
        return { error: 'Document import failed', details: error instanceof Error ? error.message : String(error) }
      }
    },
    {
      body: t.Object({
        file: t.File({ description: 'PDF document to import' }),
        patientId: t.String({ description: 'FHIR Patient ID to associate resources with' }),
        engine: t.Optional(t.Literal('opendataloader', { default: 'opendataloader', description: 'PDF extraction engine' })),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          fileName: t.String(),
          pagesProcessed: t.Number(),
          engine: t.Literal('opendataloader'),
          resources: t.Array(t.Object({
            resourceType: t.String(),
            resource: t.Any({ description: 'Validated FHIR R4 resource — POST to your FHIR proxy' }),
            retriesNeeded: t.Number(),
            warnings: t.Array(t.String()),
          })),
          failed: t.Array(t.Object({
            resourceType: t.String(),
            errors: t.Array(t.String()),
            warnings: t.Array(t.String()),
            retriesAttempted: t.Number(),
          })),
          documentReference: t.Any({ description: 'FHIR DocumentReference wrapping the original PDF' }),
          processingTimeMs: t.Number(),
        }),
        400: ErrorResponse,
        500: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: 'Import Document',
        description: 'Upload a PDF, extract clinical data using AI + OCR (OpenDataLoader), validate against IPS FHIR profiles (babelfhir-ts) with up to 10 self-healing retries. Returns validated FHIR resources for the client to POST through the FHIR proxy.',
        tags: ['admin', 'document-import'],
      },
    },
  )
