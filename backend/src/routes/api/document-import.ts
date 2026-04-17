/**
 * Patient-facing Document Import Route (SMART-authenticated)
 *
 * POST /api/document-import
 *
 * Accepts a PDF + patientId, validates the caller's SMART access token,
 * runs OCR + AI + babelfhir-ts validation, and returns the validated
 * FHIR resources for the patient portal to review and POST through the
 * FHIR proxy (which enforces scope, consent, and audit).
 */

import { Elysia, t } from 'elysia'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { config } from '@/config'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { ErrorResponse } from '@/schemas'
import { importDocument } from '@/lib/document-import'

export const patientDocumentImportRoutes = new Elysia({ prefix: '/document-import' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      // Validate SMART access token
      const token = extractBearerToken(headers)
      if (!token) {
        set.status = 401
        return { error: 'Unauthorized', details: 'Bearer token required' }
      }

      let tokenPayload
      try {
        tokenPayload = await validateToken(token)
      } catch {
        set.status = 401
        return { error: 'Unauthorized', details: 'Invalid or expired token' }
      }

      if (!config.ai.openaiApiKey) {
        set.status = 503
        return { error: 'AI not configured', details: 'Document import requires AI to be configured' }
      }

      const { file, patientId, engine } = body

      // Verify the token grants access to this patient
      const tokenPatientId = tokenPayload.patient || tokenPayload.sub
      if (tokenPatientId && tokenPatientId !== patientId) {
        logger.server.warn('Document import: patient ID mismatch', {
          tokenPatient: tokenPatientId,
          requestedPatient: patientId,
        })
      }

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

        return {
          success: true,
          fileName: result.fileName,
          pagesProcessed: result.pagesProcessed,
          engine: result.engine,
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
          documentReference: t.Any({ description: 'DocumentReference wrapping the original PDF' }),
          processingTimeMs: t.Number(),
        }),
        400: ErrorResponse,
        401: ErrorResponse,
        500: ErrorResponse,
        503: ErrorResponse,
      },
      detail: {
        summary: 'Import Document (SMART)',
        description: 'Upload a PDF, extract FHIR resources via AI, and return them for review. Requires SMART access token.',
        tags: ['fhir'],
        security: [{ BearerAuth: [] }],
      },
    },
  )
