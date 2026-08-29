// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp/prefab - Schema-derived UIs for generated tools
 *
 * Every tool this package generates already carries what a UI needs: the route
 * declares its shape and the executor has the payload in hand. This turns that
 * into a view without a line of per-route UI code — a list renders as a table
 * and a record as a detail card.
 *
 * `toolForm` is the other half: the form a tool's own input schema describes,
 * whose submit action calls that same tool. The form and the validation it will
 * face come from one declaration, so they cannot drift.
 *
 * prefab is an OPTIONAL peer: importing this module is the opt-in. Nothing in
 * `@max-health-inc/elysia-mcp` itself reaches for it, so a server that serves
 * JSON and nothing else never installs it.
 *
 * @example
 * ```ts
 * import { prefabView } from '@max-health-inc/elysia-mcp/prefab'
 * import { registerViewerResource, PREFAB_RESOURCE_URI } from '@maxhealth.tech/prefab'
 *
 * registerViewerResource(server)
 * server.registerTool(name, { description, inputSchema, _meta: uiToolMeta() }, (args) =>
 *   executeTool(name, meta, args, token, decorators, { view: prefabView() }))
 * ```
 */

import {
  PrefabApp,
  autoDetail,
  autoForm,
  autoTable,
  fieldsFromJsonSchema,
  PREFAB_RESOURCE_URI,
  type AutoFormField,
  type Component,
} from '@maxhealth.tech/prefab'
import type { ToolMetadata } from './types'
import type { StructuredContent, ToolView, ToolViewContext } from './executor'
import { getMergedInputSchema, typeboxToJsonSchema } from './typebox-schema'

// ── Tool _meta ───────────────────────────────────────────────────────────────

/**
 * The `_meta` that points an MCP Apps host at the renderer resource.
 *
 * It belongs on the tool DEFINITION, not on a result: the host resolves the
 * `ui://` resource once, when it lists tools, and loads it into the sandboxed
 * iframe before any call is made.
 */
export function uiToolMeta(resourceUri: string = PREFAB_RESOURCE_URI): { ui: { resourceUri: string } } {
  return { ui: { resourceUri } }
}

// ── Titles ───────────────────────────────────────────────────────────────────

/** Verb prefixes `pathToToolName` produces, stripped so a title reads as a noun. */
const TOOL_VERBS = new Set(['create', 'update', 'delete', 'list', 'get', 'read', 'search'])

/**
 * `list_admin_smart-apps` → `Admin smart apps`.
 *
 * The tool name is the only human-readable label a generated tool has, and it
 * was built from the route path, so it names the thing on screen.
 */
export function titleFromToolName(toolName: string): string {
  const parts = toolName.split('_').filter(p => p.length > 0)
  const stripped = TOOL_VERBS.has(parts[0] ?? '') ? parts.slice(1) : parts
  // A name that is only a verb (`search`) has nothing left to strip to.
  const words = stripped.length > 0 ? stripped : parts
  const text = words.join(' ').replace(/-/g, ' ')
  return text.length === 0 ? toolName : text.charAt(0).toUpperCase() + text.slice(1)
}

/** `create_admin_smart-apps` → `Create admin smart apps`. Keeps the verb, which a form needs. */
export function labelFromToolName(toolName: string): string {
  const text = toolName.split('_').join(' ').replace(/-/g, ' ').trim()
  return text.length === 0 ? toolName : text.charAt(0).toUpperCase() + text.slice(1)
}

/** The verb a tool name starts with, when it starts with one. */
function verbOf(toolName: string): string | undefined {
  const first = toolName.split('_')[0]
  return first !== undefined && TOOL_VERBS.has(first) ? first : undefined
}

// ── Payload shapes ───────────────────────────────────────────────────────────

/** A record a detail view or a table row can be built from. */
type Row = Record<string, unknown>

function isRow(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isRowList(value: unknown): value is Row[] {
  return Array.isArray(value) && value.length > 0 && value.every(isRow)
}

/**
 * Find the list inside a wrapped list response.
 *
 * REST list endpoints answer in two shapes — a bare array, or an envelope
 * (`{ items: [...], total: 42 }`, `{ users: [...] }`) — and the envelope is the
 * one an auto-renderer would otherwise show as a detail card with one
 * unreadable cell. Only an envelope with exactly one array is unwrapped;
 * anything else is a record that happens to contain a list, and rendering one
 * of its arrays as THE table would be a guess.
 */
function unwrapList(payload: Row): Row[] | undefined {
  const lists = Object.values(payload).filter(isRowList)
  return lists.length === 1 ? lists[0] : undefined
}

// ── Default view ─────────────────────────────────────────────────────────────

export interface PrefabViewOptions {
  /**
   * Rows past this many are dropped before the table is built. A tool that
   * answers with thousands of records would otherwise ship all of them into the
   * iframe. @default 500
   */
  maxRows?: number
  /**
   * Build the view for a tool. Return undefined to fall through to the default
   * (table / detail card), which is what makes this an override for a few tools
   * rather than an all-or-nothing replacement.
   */
  render?: (payload: StructuredContent, context: ToolViewContext) => Component | PrefabApp | undefined
  /**
   * Called when a tool's payload has no view — the fallthrough is silent
   * otherwise, and a payload shape nobody anticipated is worth knowing about.
   */
  onSkipped?: (context: ToolViewContext) => void
}

/**
 * The view a payload gets when nothing more specific is asked for.
 *
 * A list becomes a table, a record becomes a detail card, and anything else
 * (a bare string, a number, an empty array) becomes nothing: a scalar reads
 * better as the text block it already is than as a card containing one word.
 */
export function defaultView(
  payload: StructuredContent,
  context: ToolViewContext,
  options?: PrefabViewOptions,
): Component | undefined {
  const title = titleFromToolName(context.toolName)
  const maxRows = options?.maxRows ?? 500

  if (isRowList(payload)) return autoTable(payload.slice(0, maxRows), { title })

  if (isRow(payload)) {
    const list = unwrapList(payload)
    if (list !== undefined) return autoTable(list.slice(0, maxRows), { title })
    if (Object.keys(payload).length > 0) return autoDetail(payload, { title })
  }

  return undefined
}

// ── toolForm() ───────────────────────────────────────────────────────────────

export interface ToolFormOptions {
  /** Form heading. @default the humanized tool name */
  title?: string
  /** Submit button text. @default the tool's own verb (`Create`, `Update`, …) */
  submitLabel?: string
  /** Argument names to leave out entirely. */
  exclude?: string[]
  /**
   * Pre-filled values, keyed by argument name. This is how a form for a route
   * that acts on one record (`/admin/users/:userId`) is bound to it: the path
   * param is a required argument of the call, so it stays a field, and the
   * caller supplies which record it is about.
   */
  values?: Record<string, string | number | boolean | string[]>
}

/**
 * Build the form a tool's own input schema describes.
 *
 * The submit action calls that same tool, so what the form asks for and what
 * the call validates come from one declaration. Path params are included, not
 * dropped: they are required arguments of the call, and a form that omitted
 * them would submit something the tool rejects.
 *
 * Returns undefined when the schema describes nothing a flat form can ask for —
 * a tool taking no arguments, or only nested ones.
 */
export function toolForm(
  toolName: string,
  meta: ToolMetadata,
  options?: ToolFormOptions,
): Component | undefined {
  const jsonSchema = typeboxToJsonSchema(getMergedInputSchema(meta))
  if (jsonSchema === undefined) return undefined

  const fields = fieldsFromJsonSchema(jsonSchema, {
    ...(options?.exclude !== undefined && { exclude: options.exclude }),
  })
  if (fields.length === 0) return undefined

  const values = options?.values
  const prefilled: AutoFormField[] = values === undefined
    ? fields
    : fields.map(f => (values[f.name] === undefined ? f : { ...f, default: values[f.name] }))

  const verb = verbOf(toolName)
  return autoForm(prefilled, toolName, {
    title: options?.title ?? labelFromToolName(toolName),
    submitLabel: options?.submitLabel ?? (verb === undefined ? 'Submit' : verb.charAt(0).toUpperCase() + verb.slice(1)),
  })
}

// ── prefabView() ─────────────────────────────────────────────────────────────

/**
 * A {@link ToolView} that renders tool payloads as prefab UIs.
 *
 * Pass it to `executeTool` as `options.view`. Tools it declines to render (a
 * scalar payload, an empty body) keep their JSON `structuredContent`, so
 * enabling it globally is safe — a tool either gains a UI or is left exactly as
 * it was.
 */
export function prefabView(options?: PrefabViewOptions): ToolView {
  return (payload, context) => {
    const built = options?.render?.(payload, context) ?? defaultView(payload, context, options)
    if (built === undefined) {
      options?.onSkipped?.(context)
      return undefined
    }
    const app = built instanceof PrefabApp
      ? built
      : new PrefabApp({ title: titleFromToolName(context.toolName), view: built })
    return app.toJSON() as unknown as StructuredContent
  }
}
