import { t, type Static } from 'elysia'

/**
 * Authentication Flow Management schemas
 * Exposes Keycloak authentication flows and executions for admin management.
 */

// ── Execution ────────────────────────────────────────────────────────────────

export const AuthFlowExecution = t.Object({
  id: t.Optional(t.String({ description: 'Execution ID' })),
  authenticator: t.Optional(t.String({ description: 'Authenticator provider ID (e.g. client-secret, federated-jwt)' })),
  displayName: t.Optional(t.String({ description: 'Human-readable name' })),
  requirement: t.Optional(t.String({ description: 'REQUIRED | ALTERNATIVE | DISABLED | CONDITIONAL' })),
  requirementChoices: t.Optional(t.Array(t.String(), { description: 'Valid requirement values' })),
  configurable: t.Optional(t.Boolean({ description: 'Whether this execution can be configured' })),
  authenticationFlow: t.Optional(t.Boolean({ description: 'Whether this is a sub-flow reference' })),
  flowId: t.Optional(t.String({ description: 'Referenced flow ID (if authenticationFlow=true)' })),
  alias: t.Optional(t.String({ description: 'Flow alias (if sub-flow)' })),
  level: t.Optional(t.Number({ description: 'Nesting level' })),
  index: t.Optional(t.Number({ description: 'Position within the flow' })),
  providerId: t.Optional(t.String({ description: 'Provider type' })),
  authenticationConfig: t.Optional(t.String({ description: 'Config ID if configured' })),
}, { title: 'AuthFlowExecution' })

export type AuthFlowExecutionType = Static<typeof AuthFlowExecution>

// ── Flow ─────────────────────────────────────────────────────────────────────

export const AuthFlow = t.Object({
  id: t.Optional(t.String({ description: 'Flow ID' })),
  alias: t.Optional(t.String({ description: 'Flow alias (unique name)' })),
  description: t.Optional(t.String({ description: 'Flow description' })),
  providerId: t.Optional(t.String({ description: 'Provider type (basic-flow, client-flow)' })),
  topLevel: t.Optional(t.Boolean({ description: 'Whether this is a top-level flow' })),
  builtIn: t.Optional(t.Boolean({ description: 'Whether this is a built-in flow' })),
}, { title: 'AuthFlow' })

export type AuthFlowType = Static<typeof AuthFlow>

// ── Requests ─────────────────────────────────────────────────────────────────

export const AddExecutionRequest = t.Object({
  provider: t.String({ description: 'Authenticator provider ID to add (e.g. federated-jwt)' }),
}, { title: 'AddExecutionRequest' })

export type AddExecutionRequestType = Static<typeof AddExecutionRequest>

export const UpdateExecutionRequest = t.Object({
  id: t.String({ description: 'Execution ID' }),
  requirement: t.String({ description: 'REQUIRED | ALTERNATIVE | DISABLED | CONDITIONAL' }),
}, { title: 'UpdateExecutionRequest' })

export type UpdateExecutionRequestType = Static<typeof UpdateExecutionRequest>

// ── Provider Info ────────────────────────────────────────────────────────────

export const AuthenticatorProvider = t.Object({
  id: t.Optional(t.String({ description: 'Provider ID' })),
  displayName: t.Optional(t.String({ description: 'Display name' })),
  description: t.Optional(t.String({ description: 'Description' })),
}, { title: 'AuthenticatorProvider' })

export type AuthenticatorProviderType = Static<typeof AuthenticatorProvider>
