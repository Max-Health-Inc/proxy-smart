/**
 * Centralized output + error formatting for the CLI.
 *
 * Keeping all stdout/stderr/exit behavior here means commands never call
 * `console.log` / `process.exit` directly, so output stays consistent and the
 * command handlers remain easy to reason about.
 */

/** A user-facing error that should print cleanly (no stack trace). */
export class CliError extends Error {
  constructor(
    message: string,
    /** Process exit code to use (default 1). */
    public readonly exitCode = 1,
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/** Print a value as pretty JSON on stdout. */
export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

/** Print a plain informational line on stdout. */
export function printLine(line = ''): void {
  process.stdout.write(`${line}\n`)
}

/** Print an error line on stderr. */
export function printError(line: string): void {
  process.stderr.write(`${line}\n`)
}

/** Cap on auto-derived columns, to keep default tables readable. */
const MAX_DERIVED_COLUMNS = 6

/** A scalar value renders cleanly in a single table cell. */
function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Derive table columns from the data: the union of top-level keys whose value
 * is scalar (string/number/boolean/null) in at least one row, in first-seen
 * order, capped at {@link MAX_DERIVED_COLUMNS}. This keeps human-readable
 * output decoupled from the generated model's full field list, so it never
 * drifts when the schema changes.
 */
export function deriveColumns(rows: Array<Record<string, unknown>>): string[] {
  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (seen.has(key) || !isScalar(value)) continue
      seen.add(key)
      columns.push(key)
      if (columns.length >= MAX_DERIVED_COLUMNS) return columns
    }
  }
  return columns
}

/**
 * Render a list of records as a simple aligned table on stdout.
 *
 * When `columns` is omitted, they are auto-derived from the data via
 * {@link deriveColumns}. Missing values render as an empty cell.
 */
export function printTable(rows: Array<Record<string, unknown>>, columns?: string[]): void {
  if (rows.length === 0) {
    printLine('(no results)')
    return
  }
  const cols = columns ?? deriveColumns(rows)
  if (cols.length === 0) {
    printLine('(no columns to display)')
    return
  }
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }
  const widths = cols.map((col) =>
    Math.max(col.length, ...rows.map((row) => cell(row[col]).length)),
  )
  const formatRow = (values: string[]): string =>
    values.map((value, index) => value.padEnd(widths[index]!)).join('  ')

  printLine(formatRow(cols))
  printLine(widths.map((width) => '-'.repeat(width)).join('  '))
  for (const row of rows) {
    printLine(formatRow(cols.map((col) => cell(row[col]))))
  }
}

/**
 * Convert an unknown thrown value into a human-readable message. Unwraps the
 * generated client's ResponseError so HTTP failures report status + body.
 */
export async function describeError(error: unknown): Promise<string> {
  if (error instanceof CliError) return error.message

  // The generated openapi-ts-fetch client throws a ResponseError carrying the
  // raw Response. Surface the status and body to make failures actionable.
  if (isResponseError(error)) {
    const { response } = error
    let body = ''
    try {
      body = await response.text()
    } catch {
      /* ignore body read failures */
    }
    const trimmed = body.trim()
    return `HTTP ${response.status} ${response.statusText}${trimmed ? `: ${trimmed}` : ''}`
  }

  if (error instanceof Error) return error.message
  return String(error)
}

/** Structural check for the generated client's ResponseError (avoids import). */
function isResponseError(error: unknown): error is { response: Response } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    error.response instanceof Response
  )
}
