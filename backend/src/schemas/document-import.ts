// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { t } from 'elysia'
import { ErrorResponse } from './common'

/**
 * Document import schemas — shared by the admin plane (/admin/document-import)
 * and the patient-facing SMART plane (/api/document-import). The two differ only
 * in how the caller is authenticated, so the contract lives here once.
 */

export const DocumentImportBody = t.Object({
  file: t.File({ description: 'PDF document to import' }),
  patientId: t.String({ description: 'FHIR Patient ID to associate resources with' }),
  engine: t.Optional(t.Literal('opendataloader', { default: 'opendataloader', description: 'PDF extraction engine' })),
  language: t.Optional(t.String({ description: 'BCP-47 tag of the document, e.g. "fr". Kept on the DocumentReference and told to the extractor so it does not translate the wording.' })),
})

export const DocumentImportResponse = t.Object({
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
})

export const DocumentImportResponses = {
  200: DocumentImportResponse,
  400: ErrorResponse,
  401: ErrorResponse,
  500: ErrorResponse,
  503: ErrorResponse,
}

export type DocumentImportBodyType = typeof DocumentImportBody.static
