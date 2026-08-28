// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Document Import Route
 *
 * POST /admin/document-import
 *
 * Accepts a PDF, runs OCR + AI + babelfhir-ts validation, and returns
 * the validated FHIR resources to the client. The client (patient portal)
 * then POSTs them through the FHIR proxy using its own SMART access token
 * so that scope enforcement, consent, and audit all apply correctly.
 *
 * Admin-authenticated twin of /api/document-import; the import itself and the
 * response contract are shared.
 */

import { Elysia } from 'elysia'
import { extractBearerToken } from '@/lib/admin-utils'
import { validateAdminToken } from '@/lib/auth'
import { respondToDocumentImport } from '@/lib/document-import-handler'
import { DocumentImportBody, DocumentImportResponses } from '@/schemas/document-import'

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

      return respondToDocumentImport(body, set)
    },
    {
      body: DocumentImportBody,
      response: DocumentImportResponses,
      detail: {
        summary: 'Import Document',
        description: 'Upload a PDF, extract clinical data using AI + OCR (OpenDataLoader), validate against IPS FHIR profiles (babelfhir-ts) with up to 10 self-healing retries. Returns validated FHIR resources for the client to POST through the FHIR proxy.',
        tags: ['admin', 'document-import'],
      },
    },
  )
