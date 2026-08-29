// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp - TypeBox to Standard Schema Bridge
 *
 * Converts TypeBox schemas (Elysia's type system) into the Standard Schema the
 * MCP SDK's `registerTool` takes, via the JSON Schema both sides already speak.
 *
 * TypeBox schemas ARE valid JSON Schema, carrying extra Symbol metadata that a
 * JSON roundtrip strips. So the conversion is a roundtrip and a handoff — there
 * is nothing to translate.
 *
 * This used to walk the properties itself, calling `z.fromJSONSchema` per field
 * and re-deriving `.optional()` from `required` and `.describe()` from
 * `description` — rebuilding, field by field, semantics the JSON Schema already
 * carried. It also produced a raw Zod shape, which is the DEPRECATED form of
 * `registerTool`'s `inputSchema` in SDK v2 and only worked because the SDK
 * auto-wraps it.
 */

import { fromJsonSchema, type StandardSchemaWithJSON } from '@modelcontextprotocol/server'
import type { TSchema, TProperties } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'
import type { ToolMetadata } from './types'

/**
 * `format` values Elysia emits as coercion hints rather than as JSON Schema
 * formats. `t.Integer()` compiles to
 * `anyOf: [{ type: 'string', format: 'integer' }, { type: 'integer' }]` so a
 * query string can carry a number; the format marks the branch to coerce.
 *
 * Ajv, which the SDK compiles advertised schemas with, does not know them and
 * logs `unknown format "integer" ignored` for every occurrence — once per
 * schema per registration, so a few hundred lines at boot on a surface this
 * size. It ignores the keyword anyway, which is what makes dropping it lossless
 * rather than a change of validation semantics.
 *
 * Only these four. `t.Date()` also yields string branches, but its `date` and
 * `date-time` are real JSON Schema formats that a client should keep.
 */
const ELYSIA_COERCION_FORMATS = new Set(['numeric', 'integer', 'boolean', 'ArrayString'])

/**
 * Drop Elysia's coercion-hint formats, in place, from an already-cloned schema.
 * Guarded on the string branch so a genuine format on another type is untouched.
 */
function stripCoercionFormats(node: unknown): void {
  if (node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) stripCoercionFormats(item)
    return
  }
  const record = node as Record<string, unknown>
  if (
    record.type === 'string' &&
    typeof record.format === 'string' &&
    ELYSIA_COERCION_FORMATS.has(record.format)
  ) {
    delete record.format
  }
  for (const value of Object.values(record)) stripCoercionFormats(value)
}

/** JSON roundtrip to strip TypeBox's Symbol metadata, then de-noise the result. */
function toPlainJsonSchema(schema: unknown): Record<string, unknown> {
  const jsonSchema = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
  stripCoercionFormats(jsonSchema)
  return jsonSchema
}

/**
 * Convert a TypeBox schema to plain JSON Schema.
 *
 * The same conversion `typeboxToSchema` performs before handing the result to
 * the SDK, exposed for consumers that need the JSON Schema itself rather than a
 * Standard Schema wrapper — deriving a form from a route's input schema, for
 * one. Returns undefined for anything unreadable.
 */
export function typeboxToJsonSchema(schema: unknown): Record<string, unknown> | undefined {
  if (schema === null || schema === undefined) return undefined
  try {
    return toPlainJsonSchema(schema)
  } catch {
    return undefined
  }
}

/**
 * Convert a TypeBox schema to the Standard Schema `registerTool` expects.
 *
 * Returns undefined when the schema is not an object type or cannot be read, so
 * the caller registers the tool with no input schema rather than a broken one.
 */
export function typeboxToSchema(schema: unknown): StandardSchemaWithJSON | undefined {
  try {
    const jsonSchema = toPlainJsonSchema(schema)
    if (jsonSchema.type !== 'object' || !jsonSchema.properties) return undefined
    return fromJsonSchema(jsonSchema)
  } catch {
    return undefined
  }
}

/**
 * Convert a TypeBox schema to the Standard Schema `registerTool` takes as its
 * `outputSchema`.
 *
 * Unlike an input schema, this does NOT require an object root. A list route
 * declares `200: t.Array(Role)`, and an array root is legal to advertise: the
 * SDK's `projectCallToolResult` reconciles it with the wire shape, wrapping the
 * value as `{result:…}` for a 2025-era client and passing it through on 2026.
 * Rejecting non-object roots here would drop exactly the list endpoints whose
 * responses are largest.
 *
 * Returns undefined for anything unreadable, so the tool registers without an
 * output schema rather than with a broken one.
 */
export function typeboxToOutputSchema(schema: unknown): StandardSchemaWithJSON | undefined {
  if (schema === null || schema === undefined) return undefined
  try {
    const jsonSchema = toPlainJsonSchema(schema)
    // A schema with no `type` and no combinator carries nothing a client could
    // validate against; advertising it would only invite a false rejection.
    if (!jsonSchema.type && !jsonSchema.anyOf && !jsonSchema.oneOf && !jsonSchema.allOf && !jsonSchema.$ref) {
      return undefined
    }
    return fromJsonSchema(jsonSchema)
  } catch {
    return undefined
  }
}

/**
 * Merge body and path-params TypeBox schemas into a single input schema.
 * Both are TypeBox t.Object() -- we combine their properties so MCP/OpenAI
 * clients see a flat object with all required fields.
 */
export function getMergedInputSchema(meta: ToolMetadata): TSchema | undefined {
  const { schema: bodySchema, paramsSchema } = meta
  if (!bodySchema && !paramsSchema) return undefined
  if (!paramsSchema) return bodySchema
  if (!bodySchema) return paramsSchema

  // Both exist -- merge their properties
  const bodyProps = (bodySchema as { properties?: TProperties }).properties ?? {}
  const paramsProps = (paramsSchema as { properties?: TProperties }).properties ?? {}

  const bodyRequired = (bodySchema as { required?: readonly string[] }).required ?? []
  const paramsRequired = (paramsSchema as { required?: readonly string[] }).required ?? []

  // Path params take priority (they're always required)
  const mergedProps: TProperties = { ...bodyProps, ...paramsProps }

  const merged = Type.Object(mergedProps, { additionalProperties: false })

  // TypeBox rederives `required` from property optionality, which would drop
  // whichever source's required list did not survive the spread. Replace it with
  // the union of both, or omit it entirely when neither side required anything.
  const allRequired = [...new Set([...paramsRequired, ...bodyRequired])]
  const { required: _rederived, ...withoutRequired } = merged

  return allRequired.length > 0
    ? { ...withoutRequired, required: allRequired }
    : withoutRequired
}
