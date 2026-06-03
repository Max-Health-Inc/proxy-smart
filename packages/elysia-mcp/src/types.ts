/**
 * @max-health-inc/elysia-mcp - Core Types
 *
 * Type definitions for the Elysia-to-MCP bridge.
 */

import type { TSchema } from '@sinclair/typebox'

// ── Route Introspection Types ────────────────────────────────────────────────

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
  /** Whether tool requires no authentication */
  public?: boolean
  /** Whether tool is read-only (GET route) */
  readOnly?: boolean
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

// ── Plugin Configuration ─────────────────────────────────────────────────────

/** Options for the elysia-mcp plugin */
export interface ElysiaMcpOptions {
  /**
   * MCP endpoint path (default: '/mcp')
   */
  path?: string

  /**
   * Route prefixes to introspect for tool/resource generation.
   * Only routes matching these prefixes will be exposed.
   * @default ['/admin/', '/api/']
   */
  prefixes?: string[]

  /**
   * Server name reported in MCP initialize handshake
   */
  name?: string

  /**
   * Server version reported in MCP initialize handshake
   */
  version?: string

  /**
   * Authentication function. Return user roles or throw/return null to reject.
   * If omitted, all requests are unauthenticated (public).
   */
  authenticate?: (request: Request) => Promise<AuthResult | null>

  /**
   * Filter which tools are exposed. Return true to include.
   * Called after introspection, before registration.
   */
  toolFilter?: (toolName: string, meta: ToolMetadata) => boolean

  /**
   * Filter which resources are exposed. Return true to include.
   */
  resourceFilter?: (resourceName: string, meta: ResourceMetadata) => boolean

  /**
   * Whether to also expose GET resources as callable tools (with readOnlyHint).
   * @default false
   */
  exposeResourcesAsTools?: boolean

  /**
   * Additional context injected into the synthetic Elysia context when executing tools.
   * Use this to provide decorators that route handlers expect (e.g. `getAdmin`, `db`).
   */
  contextDecorators?: Record<string, unknown>

  /**
   * Maximum number of concurrent sessions.
   * @default 100
   */
  maxSessions?: number

  /**
   * Session TTL in milliseconds.
   * @default 1_800_000 (30 minutes)
   */
  sessionTtlMs?: number

  /**
   * Custom tool name generator. Converts (path, method) to a tool name.
   * @default built-in pathToToolName
   */
  toolNameGenerator?: (path: string, method: string) => string

  /**
   * Custom resource name generator. Converts path to a resource name.
   * @default built-in pathToResourceName
   */
  resourceNameGenerator?: (path: string) => string

  /**
   * URI scheme for resource URIs.
   * @default 'app'
   */
  resourceUriScheme?: string

  /**
   * Logger. If omitted, logs to console at info level.
   */
  logger?: Logger
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResult {
  /** User roles (used for permission filtering) */
  roles: string[]
  /** Subject / user ID */
  sub?: string
  /** Raw bearer token (forwarded to route handlers) */
  token?: string
}

// ── Logger ───────────────────────────────────────────────────────────────────

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  debug?(message: string, data?: Record<string, unknown>): void
}

// ── Session ──────────────────────────────────────────────────────────────────

export interface McpSession {
  transport: unknown
  server: unknown
  /** Mutable token ref -- updated on every authenticated request */
  tokenRef: { current?: string }
  /** Timestamp of last activity (for TTL eviction) */
  lastActivity: number
  /** Subject (user ID) bound at creation -- prevents session hijacking */
  boundSub?: string
}
