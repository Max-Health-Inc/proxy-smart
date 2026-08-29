/**
 * Shared helpers for command handlers.
 *
 * Centralizes the bits every domain command repeats: reading a JSON body from
 * `--data` (inline, @file, or stdin) and asserting required positionals.
 */
import { readFileSync } from 'fs'
import { type ParsedArgs, flagString } from '../args'
import { CliError } from '../output'
import { type ApiClient } from '../client'
import { type Session } from '../session'
import { type ResolvedConfig } from '../config'

/** Context handed to every command handler. */
export interface CommandContext {
  args: ParsedArgs
  config: ResolvedConfig
  session: Session
  api: ApiClient
}

/** A command handler resolves once the command has fully run. */
export type CommandHandler = (ctx: CommandContext) => Promise<void>

/**
 * Read a JSON request body from the `--data` flag.
 *   --data '{"a":1}'   inline JSON
 *   --data @file.json  read from a file
 *   --data -           read from stdin
 * Returns undefined when no `--data` was supplied.
 */
export function readJsonData(args: ParsedArgs): unknown {
  const raw = flagString(args.flags, 'data')
  if (raw === undefined) return undefined

  let text: string
  if (raw === '-') {
    text = readFileSync(0, 'utf-8')
  } else if (raw.startsWith('@')) {
    text = readFileSync(raw.slice(1), 'utf-8')
  } else {
    text = raw
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    throw new CliError(`--data is not valid JSON: ${(error as Error).message}`)
  }
}

/** Like readJsonData, but errors when no body was provided. */
export function requireJsonData(args: ParsedArgs): unknown {
  const data = readJsonData(args)
  if (data === undefined) {
    throw new CliError('This command requires a request body. Provide one with --data \'<json>\', --data @file.json, or --data -.')
  }
  return data
}

/**
 * Pull a required positional at `index`, throwing a helpful error otherwise.
 * `index` is relative to the whole positionals array.
 */
export function requirePositional(args: ParsedArgs, index: number, name: string): string {
  const value = args.positionals[index]
  if (value === undefined) {
    throw new CliError(`Missing required argument <${name}>.`)
  }
  return value
}
