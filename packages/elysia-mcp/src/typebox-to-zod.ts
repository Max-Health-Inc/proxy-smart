/**
 * @max-health-inc/elysia-mcp - TypeBox to Zod Bridge
 *
 * Converts TypeBox schemas (Elysia's type system) to Zod schemas
 * (MCP SDK's type system) via the JSON Schema intermediary.
 *
 * TypeBox schemas ARE valid JSON Schema (with extra Symbol metadata).
 * We strip Symbols via JSON roundtrip, then use Zod v4's z.fromJSONSchema().
 */

import type { TSchema, TProperties } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'
import * as z from 'zod'
import type { ToolMetadata } from './types'

/**
 * Convert a TypeBox schema to a Zod shape (Record<string, z.ZodType>)
 * suitable for MCP SDK's `registerTool` inputSchema parameter.
 *
 * Returns undefined if conversion fails or schema isn't an object type.
 */
export function typeboxToZod(schema: unknown): Record<string, z.ZodType> | undefined {
  try {
    // JSON roundtrip strips TypeBox's Symbol metadata, yielding pure JSON Schema
    const jsonSchema = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>
    if (jsonSchema.type !== 'object') return undefined

    const properties = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined
    if (!properties) return undefined

    const required = new Set((jsonSchema.required as string[] | undefined) ?? [])
    const shape: Record<string, z.ZodType> = {}

    for (const [key, propSchema] of Object.entries(properties)) {
      let fieldSchema = z.fromJSONSchema(propSchema)
      if (!required.has(key)) {
        fieldSchema = fieldSchema.optional()
      }
      if (propSchema.description && typeof propSchema.description === 'string') {
        fieldSchema = fieldSchema.describe(propSchema.description)
      }
      shape[key] = fieldSchema
    }

    return shape
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
