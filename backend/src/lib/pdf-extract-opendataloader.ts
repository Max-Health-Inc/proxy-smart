/**
 * PDF text extraction adapter — OpenDataLoader
 *
 * Uses @opendataloader/pdf (Apache 2.0) for local, deterministic PDF-to-markdown.
 * No cloud calls, no API keys required. Requires Java 11+ at runtime.
 *
 * @see https://github.com/opendataloader-project/opendataloader-pdf
 */
import { convert } from '@opendataloader/pdf'
import { logger } from '@/lib/logger'
import type { PdfExtractResult } from '@/lib/pdf-extract-types'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

export async function extractTextFromPdf(filePath: string): Promise<PdfExtractResult> {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'odl-'))

  try {
    logger.server.info('📄 Starting local PDF extraction (OpenDataLoader)', { filePath })

    await convert([filePath], { outputDir, format: ['markdown'], quiet: true })

    // OpenDataLoader writes <basename>.md in the output dir
    const baseName = path.basename(filePath, path.extname(filePath))
    const mdPath = path.join(outputDir, `${baseName}.md`)

    if (!fs.existsSync(mdPath)) {
      // Fallback: grab any .md file produced
      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'))
      if (files.length === 0) throw new Error('OpenDataLoader produced no markdown output')
      const fallback = path.join(outputDir, files[0])
      const markdown = fs.readFileSync(fallback, 'utf-8')
      const pages = (markdown.match(/---/g) || []).length + 1
      logger.server.info('📄 OpenDataLoader extraction complete', { pages, chars: markdown.length })
      return { markdown, pages, engine: 'opendataloader' }
    }

    const markdown = fs.readFileSync(mdPath, 'utf-8')
    // Estimate page count from page-break markers (--- separators) in the output
    const pages = (markdown.match(/---/g) || []).length + 1
    logger.server.info('📄 OpenDataLoader extraction complete', { pages, chars: markdown.length })
    return { markdown, pages, engine: 'opendataloader' }
  } finally {
    // Clean up temp output dir
    fs.rmSync(outputDir, { recursive: true, force: true })
  }
}
