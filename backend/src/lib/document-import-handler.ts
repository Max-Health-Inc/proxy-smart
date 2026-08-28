// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Document Import Handler
 *
 * The half of the pipeline that has to run here: a PDF becomes markdown, which
 * needs Java and a filesystem. The markdown then goes to the clinical narrative
 * importer in `@max-health-inc/connect-engine` (see `@/lib/ai-import`), which
 * owns the extraction prompt, the IPS validation loop, and the model.
 *
 * Shared by the admin and patient-facing routes, which differ only in how they
 * authenticate the caller.
 */

import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { extractTextFromPdf } from '@/lib/pdf-extract-opendataloader'
import {
  createNarrativeImporter,
  type FailedResourceShape,
  type ImportedResourceShape,
  type ImporterUnavailable,
} from '@/lib/ai-import'

export interface DocumentImportInput {
  file: File
  patientId: string
  engine?: 'opendataloader'
  /** BCP-47 tag of the document, when the caller knows it (e.g. `fr`). */
  language?: string
}

export interface DocumentImportResult {
  success: true
  fileName: string
  pagesProcessed: number
  engine: 'opendataloader'
  resources: ImportedResourceShape[]
  failed: FailedResourceShape[]
  documentReference: unknown
  processingTimeMs: number
}

/** Either the import ran, or the AI side is not available to run it. */
export type DocumentImportOutcome =
  | { ok: true; result: DocumentImportResult }
  | ({ ok: false } & ImporterUnavailable)

/**
 * Process a PDF import: write to temp, extract text, hand the text to the
 * importer, map the result onto the route's response shape.
 *
 * Callers validate auth first; a `{ ok: false }` outcome is a 503, since neither
 * cause is fixable by retrying or by sending a different body.
 */
export async function processDocumentImport(
  input: DocumentImportInput,
): Promise<DocumentImportOutcome> {
  const { file, patientId, engine = 'opendataloader', language } = input

  const importer = await createNarrativeImporter()
  if (!importer.ok) {
    return { ok: false, reason: importer.reason, detail: importer.detail }
  }

  const tempDir = join(tmpdir(), 'proxy-smart-doc-import')
  await mkdir(tempDir, { recursive: true })
  const tempPath = join(tempDir, `${randomUUID()}.pdf`)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempPath, buffer)

    const { markdown, pages } = await extractTextFromPdf(tempPath)

    const imported = await importer.importer.importDocument(markdown, {
      patientId,
      fileName: file.name,
      pdfBase64: buffer.toString('base64'),
      pagesProcessed: pages,
      language,
    })

    return {
      ok: true,
      result: {
        success: true,
        fileName: file.name,
        pagesProcessed: pages,
        engine,
        resources: imported.resources,
        failed: imported.failed,
        documentReference: imported.documentReference,
        processingTimeMs: imported.processingTimeMs,
      },
    }
  } catch (error) {
    logger.server.error('Document import failed', { error })
    throw error
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}

export interface ScribeResult {
  success: true
  resources: ImportedResourceShape[]
  failed: FailedResourceShape[]
  processingTimeMs: number
}

export type ScribeOutcome =
  | { ok: true; result: ScribeResult }
  | ({ ok: false } & ImporterUnavailable)

/** Turn free text a patient wrote into reviewable FHIR. No document involved. */
export async function processScribe(input: {
  text: string
  patientId: string
  language?: string
}): Promise<ScribeOutcome> {
  const importer = await createNarrativeImporter()
  if (!importer.ok) {
    return { ok: false, reason: importer.reason, detail: importer.detail }
  }

  const imported = await importer.importer.importText(input.text, {
    patientId: input.patientId,
    language: input.language,
  })

  return {
    ok: true,
    result: {
      success: true,
      resources: imported.resources,
      failed: imported.failed,
      processingTimeMs: imported.processingTimeMs,
    },
  }
}

/** Minimal view of Elysia's `set`, so this stays free of framework types. */
interface ResponseStatus {
  status?: number | string
}

/** Error envelope both document-import planes return. */
interface DocumentImportError {
  error: string
  details?: string
}

/**
 * Run an import for an already-authenticated caller and map the outcome onto the
 * route response. Both document-import planes share this so their status codes
 * and error envelopes cannot drift; only the auth guard differs between them.
 */
export async function respondToDocumentImport(
  input: DocumentImportInput,
  set: ResponseStatus,
): Promise<DocumentImportResult | DocumentImportError> {
  if (input.file.type !== 'application/pdf') {
    set.status = 400
    return { error: 'Invalid file type', details: 'Only PDF files are supported' }
  }

  try {
    const outcome = await processDocumentImport(input)
    if (!outcome.ok) {
      set.status = 503
      return { error: 'AI not configured', details: outcome.detail }
    }
    return outcome.result
  } catch (error) {
    set.status = 500
    return { error: 'Document import failed', details: error instanceof Error ? error.message : String(error) }
  }
}
