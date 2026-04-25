import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ---------------------------------------------------------------------------
// Mock @opendataloader/pdf before importing the adapter
// ---------------------------------------------------------------------------

type ConvertFn = (paths: string[], opts: { outputDir: string; [key: string]: unknown }) => Promise<string>

const convertMock = mock<ConvertFn>(() => Promise.resolve(''))

mock.module('@opendataloader/pdf', () => ({
  convert: convertMock,
}))

// NOTE: mock.module is global in Bun — partial mocks leak to other test files.
// Use a Proxy so every namespace (server, consent, fhir, …) and top-level
// method (info, debug, …) resolves to a no-op, keeping other suites safe.
const noop = () => {}
const noopCategory = { error: noop, warn: noop, info: noop, debug: noop, trace: noop }
const noopLogger = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    if (typeof prop === 'string') {
      if (['error', 'warn', 'info', 'debug', 'trace'].includes(prop)) return noop
      return noopCategory
    }
    return undefined
  },
})
mock.module('@/lib/logger', () => ({
  logger: noopLogger,
  createLogger: () => noopLogger,
  PerformanceTimer: class { start() {} stop() {} },
  createRequestLogger: () => ({ request: noop, response: noop }),
}))

// Import the adapter AFTER mocking
const { extractTextFromPdf } = await import('@/lib/pdf-extract-opendataloader')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a real temp dir and write a fake markdown file into it */
function _setupOutputDir(baseName: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'odl-test-'))
  fs.writeFileSync(path.join(dir, `${baseName}.md`), content, 'utf-8')
  return dir
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pdf-extract-opendataloader', () => {
  // Track temp dirs created by mkdtempSync so we can clean up
  const _originalMkdtempSync = fs.mkdtempSync
  let capturedOutputDir: string | null = null

  beforeEach(() => {
    convertMock.mockReset()
    capturedOutputDir = null
  })

  afterEach(() => {
    // Clean up any leftover temp dirs
    if (capturedOutputDir && fs.existsSync(capturedOutputDir)) {
      fs.rmSync(capturedOutputDir, { recursive: true, force: true })
    }
  })

  it('should return markdown and engine name on success', async () => {
    const mdContent = '# Lab Report\n\nPatient: John Doe\nDate: 2026-04-13\n\n## Results\n\nHemoglobin: 14.2 g/dL'

    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      // Simulate OpenDataLoader writing a .md file
      fs.writeFileSync(path.join(opts.outputDir, 'test-report.md'), mdContent, 'utf-8')
      return ''
    })

    const result = await extractTextFromPdf('/tmp/test-report.pdf')

    expect(result.engine).toBe('opendataloader')
    expect(result.markdown).toBe(mdContent)
    expect(result.pages).toBeGreaterThanOrEqual(1)
  })

  it('should estimate page count from --- markers', async () => {
    const mdContent = 'Page 1 content\n\n---\n\nPage 2 content\n\n---\n\nPage 3 content'

    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      fs.writeFileSync(path.join(opts.outputDir, 'multi-page.md'), mdContent, 'utf-8')
      return ''
    })

    const result = await extractTextFromPdf('/tmp/multi-page.pdf')

    expect(result.pages).toBe(3)
  })

  it('should handle single page with no separators', async () => {
    const mdContent = '# Simple Document\n\nJust one page of content.'

    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      fs.writeFileSync(path.join(opts.outputDir, 'single.md'), mdContent, 'utf-8')
      return ''
    })

    const result = await extractTextFromPdf('/tmp/single.pdf')

    expect(result.pages).toBe(1)
    expect(result.markdown).toContain('Simple Document')
  })

  it('should find fallback .md file when basename does not match', async () => {
    const mdContent = '# Fallback Content'

    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      // Write .md with a different name than the input basename
      fs.writeFileSync(path.join(opts.outputDir, 'unexpected-name.md'), mdContent, 'utf-8')
      return ''
    })

    const result = await extractTextFromPdf('/tmp/original-name.pdf')

    expect(result.engine).toBe('opendataloader')
    expect(result.markdown).toBe(mdContent)
  })

  it('should throw when no markdown output is produced', async () => {
    convertMock.mockImplementation(async () => {
      // Don't write any files
      return ''
    })

    expect(extractTextFromPdf('/tmp/empty.pdf')).rejects.toThrow('OpenDataLoader produced no markdown output')
  })

  it('should clean up temp dir even on failure', async () => {
    let outputDirUsed: string | null = null

    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      outputDirUsed = opts.outputDir
      throw new Error('Java not found')
    })

    expect(extractTextFromPdf('/tmp/fail.pdf')).rejects.toThrow('Java not found')

    // Give the finally block a tick to run
    await new Promise(r => setTimeout(r, 50))

    if (outputDirUsed) {
      expect(fs.existsSync(outputDirUsed)).toBe(false)
    }
  })

  it('should pass correct options to convert()', async () => {
    convertMock.mockImplementation(async (_paths: string[], opts: { outputDir: string }) => {
      fs.writeFileSync(path.join(opts.outputDir, 'check-opts.md'), '# test', 'utf-8')
      return ''
    })

    await extractTextFromPdf('/tmp/check-opts.pdf')

    expect(convertMock).toHaveBeenCalledTimes(1)

    const [paths, opts] = convertMock.mock.calls[0]
    expect(paths).toEqual(['/tmp/check-opts.pdf'])
    expect(opts.format).toEqual(['markdown'])
    expect(opts.quiet).toBe(true)
    expect(typeof opts.outputDir).toBe('string')
  })
})
