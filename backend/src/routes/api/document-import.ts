// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Patient-facing Document Import Route (SMART-authenticated)
 *
 * POST /api/document-import
 *
 * Accepts a PDF + patientId, validates the caller's SMART access token,
 * runs OCR + AI + babelfhir-ts validation, and returns the validated
 * FHIR resources for the patient portal to review and POST through the
 * FHIR proxy (which enforces scope, consent, and audit).
 *
 * SMART-authenticated twin of /admin/document-import; the import itself and the
 * response contract are shared.
 */

import { Elysia } from 'elysia'
import { logger } from '@/lib/logger'
import { validateToken } from '@/lib/auth'
import { extractBearerToken } from '@/lib/admin-utils'
import { respondToDocumentImport } from '@/lib/document-import-handler'
import { DocumentImportBody, DocumentImportResponses } from '@/schemas/document-import'

export const patientDocumentImportRoutes = new Elysia({ prefix: '/document-import' })
  .post(
    '/',
    async ({ body, set, headers }) => {
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

      const tokenPatientId = tokenPayload.patient || tokenPayload.sub
      if (tokenPatientId && tokenPatientId !== body.patientId) {
        logger.server.warn('Document import: patient ID mismatch', {
          tokenPatient: tokenPatientId,
          requestedPatient: body.patientId,
        })
      }

      return respondToDocumentImport(body, set)
    },
    {
      body: DocumentImportBody,
      response: DocumentImportResponses,
      detail: {
        summary: 'Import Document (SMART)',
        description: 'Upload a PDF, extract FHIR resources via AI, and return them for review. Requires SMART access token.',
        tags: ['fhir'],
        security: [{ BearerAuth: [] }],
      },
    },
  )
