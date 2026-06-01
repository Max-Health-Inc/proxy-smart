/**
 * Document Import Handler
 *
 * Shared logic for processing PDF documents via AI + OCR + FHIR validation.
 * Used by both admin and patient-facing routes.
 */

import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { importDocument } from '@/lib/document-import'

export interface DocumentImportInput {
  file: File
  patientId: string
  engine?: 'opendataloader'
}

export interface DocumentImportResult {
  success: true
  fileName: string
  pagesProcessed: number
  engine: 'opendataloader'
  resources: Array<{
    resourceType: string
    resource: unknown
    retriesNeeded: number
    warnings: string[]
  }>
  failed: Array<{
    resourceType: string
    errors: string[]
    warnings: string[]
    retriesAttempted: number
  }>
  documentReference: unknown
  processingTimeMs: number
}

/**
 * Process a PDF document import: write to temp, run AI extraction, map result.
 * Callers are responsible for auth validation and AI config check.
 */
export async function processDocumentImport(input: DocumentImportInput): Promise<DocumentImportResult> {
  const { file, patientId, engine } = input

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
    throw error
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}
