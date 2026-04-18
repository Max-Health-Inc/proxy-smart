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
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { config } from '@/config'
import { ErrorResponse } from '@/schemas'
import { importDocument } from '@/lib/document-import'
import { extractBearerToken } from '@/lib/admin-utils'
import { validateAdminToken } from '@/lib/auth'

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

      // Write to temp file for PDF extraction
      const tempDir = join(tmpdir(), 'proxy-smart-doc-import')
      await mkdir(tempDir, { recursive: true })
      const tempPath = join(tempDir, `${randomUUID()}.pdf`)

      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await writeFile(tempPath, buffer)

        const pdfBase64 = buffer.toString('base64')

        const result = await importDocument(tempPath, file.name, pdfBase64, { patientId, engine })

        // Return validated resources — the client POSTs them through the FHIR proxy
        return {
          success: true,
          fileName: result.fileName,
          pagesProcessed: result.pagesProcessed,
          engine: result.engine,
          /** Validated FHIR resources — POST each through your FHIR proxy */
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
          /** DocumentReference wrapping the original PDF — POST this through the FHIR proxy too */
          documentReference: result.documentReference,
          processingTimeMs: result.processingTimeMs,
        }
      } catch (error) {
        logger.server.error('Document import failed', { error })
        set.status = 500
        return { error: 'Document import failed', details: error instanceof Error ? error.message : String(error) }
      } finally {
        await unlink(tempPath).catch(() => {})
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
