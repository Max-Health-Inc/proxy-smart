// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { t, type Static } from 'elysia'

/**
 * MCP-related schemas (authorization discovery and HTTP transport payloads)
 */

// ============== OAuth Discovery (RFC 9728 / RFC 8414) ==============

export const ProtectedResourceMetadata = t.Object({
  resource: t.String({ description: 'Canonical URI of the protected resource (this server)' }),
  authorization_servers: t.Array(t.String(), { description: 'URIs of authorization servers' }),
  bearer_methods_supported: t.Array(t.String(), { description: 'Bearer presentation methods (e.g., ["header"])' }),
  resource_signing_alg_values_supported: t.Optional(
    t.Array(t.String({ description: 'Signing algorithms supported for token validation' }))
  ),
  resource_documentation: t.Optional(t.String({ description: 'URI for human-readable documentation' })),
  scopes_supported: t.Optional(t.Array(t.String({ description: 'OAuth scopes supported by this resource server' })))
}, { title: 'ProtectedResourceMetadata' })

export type ProtectedResourceMetadataType = Static<typeof ProtectedResourceMetadata>

export const AuthorizationServerMetadata = t.Object({
  issuer: t.String({ description: 'Authorization server identifier' }),
  authorization_endpoint: t.String({ description: 'OAuth authorization endpoint' }),
  token_endpoint: t.String({ description: 'OAuth token endpoint' }),
  jwks_uri: t.String({ description: 'JSON Web Key Set endpoint' }),
  registration_endpoint: t.Optional(t.String({ description: 'Dynamic client registration endpoint' })),
  scopes_supported: t.Optional(t.Array(t.String(), { description: 'Supported OAuth scopes' })),
  response_types_supported: t.Array(t.String(), { description: 'Supported OAuth response types' }),
  grant_types_supported: t.Array(t.String(), { description: 'Supported OAuth grant types' }),
  token_endpoint_auth_methods_supported: t.Array(t.String(), { description: 'Supported token endpoint auth methods' }),
  code_challenge_methods_supported: t.Array(t.String(), { description: 'Supported PKCE methods' })
}, { title: 'AuthorizationServerMetadata' })

export type AuthorizationServerMetadataType = Static<typeof AuthorizationServerMetadata>

// ===================== MCP HTTP Transport =====================

// Request: listTools | callTool
export const McpRequest = t.Union([
  t.Object({
    type: t.Literal('listTools')
  }),
  t.Object({
    type: t.Literal('callTool'),
    name: t.String(),
    args: t.Optional(t.Record(t.String(), t.Any())),
    id: t.Optional(t.String())
  })
], { title: 'McpRequest' })

export type McpRequestType = Static<typeof McpRequest>

// Tool definition (OpenAI-style) returned by our executor
export const McpToolFunction = t.Object({
  name: t.String(),
  description: t.String(),
  parameters: t.Any(),
  strict: t.Optional(t.Boolean())
}, { title: 'McpToolFunction' })

export const McpToolDefinition = t.Object({
  type: t.Literal('function'),
  function: McpToolFunction
}, { title: 'McpToolDefinition' })

export type McpToolDefinitionType = Static<typeof McpToolDefinition>

export const McpToolListResponse = t.Object({
  tools: t.Array(McpToolDefinition)
}, { title: 'McpToolListResponse' })

export type McpToolListResponseType = Static<typeof McpToolListResponse>

// callTool success payload (MCP-ish content array with text)
export const McpCallToolSuccess = t.Object({
  content: t.Array(t.Object({
    type: t.Literal('text'),
    text: t.String()
  })),
  duration: t.Number()
}, { title: 'McpCallToolSuccess' })

export type McpCallToolSuccessType = Static<typeof McpCallToolSuccess>

// ===================== MCP-Specific Error Responses =====================

export const McpUnauthorizedError = t.Object({
  error: t.Literal('unauthorized'),
  code: t.Optional(t.String({ description: 'Error code (e.g., invalid_audience)' }))
}, { title: 'McpUnauthorizedError' })

export type McpUnauthorizedErrorType = Static<typeof McpUnauthorizedError>

export const McpInsufficientScopeError = t.Object({
  error: t.Literal('insufficient_scope'),
  code: t.String({ description: 'Required scope' })
}, { title: 'McpInsufficientScopeError' })

export type McpInsufficientScopeErrorType = Static<typeof McpInsufficientScopeError>

export const McpToolNotFoundError = t.Object({
  error: t.Literal('tool_not_found'),
  code: t.String({ description: 'Tool name that was not found' })
}, { title: 'McpToolNotFoundError' })

export type McpToolNotFoundErrorType = Static<typeof McpToolNotFoundError>

export const McpForbiddenError = t.Object({
  error: t.Literal('forbidden'),
  code: t.String({ description: 'Reason code (e.g., admin_required)' })
}, { title: 'McpForbiddenError' })

export type McpForbiddenErrorType = Static<typeof McpForbiddenError>

export const McpExecutionFailedError = t.Object({
  error: t.Literal('execution_failed'),
  details: t.String({ description: 'Error message from execution' })
}, { title: 'McpExecutionFailedError' })

export type McpExecutionFailedErrorType = Static<typeof McpExecutionFailedError>
