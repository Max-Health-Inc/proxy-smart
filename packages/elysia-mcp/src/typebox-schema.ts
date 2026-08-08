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
 * Convert a TypeBox schema to the Standard Schema `registerTool` expects.
 *
 * Returns undefined when the schema is not an object type or cannot be read, so
 * the caller registers the tool with no input schema rather than a broken one.
 */
export function typeboxToSchema(schema: unknown): StandardSchemaWithJSON | undefined {
  try {
    // JSON roundtrip strips TypeBox's Symbol metadata, yielding pure JSON Schema
    const jsonSchema = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
    if (jsonSchema.type !== 'object' || !jsonSchema.properties) return undefined
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

  // Override the required array to include both sets
  const allRequired = [...new Set([...paramsRequired, ...bodyRequired])]
  if (allRequired.length > 0) {
    ;(merged as unknown as { required: string[] }).required = allRequired
  } else {
    delete (merged as unknown as { required?: string[] }).required
  }

  return merged
}
