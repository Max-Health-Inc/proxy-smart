// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp - Core Types
 *
 * Type definitions for the Elysia-to-MCP bridge.
 */

import type { TSchema } from '@sinclair/typebox'

// ── Route Introspection Types ────────────────────────────────────────────────

/**
 * MCP tool behavioural hints (per the MCP spec `tools` annotations object).
 * These are UNTRUSTED hints a client MAY use to shape UX (e.g. warn before a
 * destructive call) — they are advisory, not a security boundary.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools
 */
export interface ToolAnnotations {
  /** Human-readable display name for the tool. */
  title?: string
  /** Tool does not modify state. Default (MCP): false. */
  readOnlyHint?: boolean
  /** Tool may perform destructive updates (only meaningful when not read-only). Default (MCP): true. */
  destructiveHint?: boolean
  /** Repeated calls with the same args have no additional effect. Default (MCP): false. */
  idempotentHint?: boolean
  /** Tool interacts with an open/external world (vs. a closed domain). Default (MCP): true. */
  openWorldHint?: boolean
}

/** Metadata extracted from a single Elysia route for use as an MCP tool */
export interface ToolMetadata {
  /** Original route path (e.g. /admin/users/:id) */
  path: string
  /** HTTP method (GET, POST, PUT, DELETE, PATCH) */
  method: string
  /** The route handler function */
  handler: unknown
  /** Body/query schema (TypeBox) */
  schema?: TSchema
  /** Path params schema (TypeBox) */
  paramsSchema?: TSchema
  /**
   * Success-response schema (TypeBox), when the route declares one.
   *
   * Registered as the tool's MCP `outputSchema`, which is what makes
   * `structuredContent` worth its bytes: without it the structured half is an
   * untyped copy of the text block, and a client has no way to validate it.
   *
   * Safe to advertise precisely because Elysia coerces the response to this
   * schema in the pipeline, so the body a tool call returns already conforms —
   * which matters, as the spec requires structured results to match a declared
   * output schema.
   */
  responseSchema?: TSchema
  /** Whether tool requires no authentication */
  public?: boolean
  /** Whether tool is read-only (GET route) */
  readOnly?: boolean
  /** MCP behavioural hints derived from the HTTP method (see `annotationsForMethod`). */
  annotations?: ToolAnnotations
}

/** Metadata extracted from a GET route for use as an MCP resource */
export interface ResourceMetadata {
  /** Original route path */
  path: string
  /** HTTP method (always GET) */
  method: string
  /** The route handler function */
  handler: unknown
  /** Path params schema (TypeBox) */
  paramsSchema?: TSchema
  /** Whether resource requires no authentication */
  public?: boolean
  /** Path param names extracted from route (e.g. ['userId', 'roleName']) */
  pathParams: string[]
}
