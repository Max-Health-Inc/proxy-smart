/**
 * @proxy-smart/auth
 *
 * SMART on FHIR STU 2.2.0 server-side authorization proxy library.
 * Framework-agnostic, IdP-pluggable.
 *
 * @example
 * ```ts
 * import {
 *   handleAuthorize,
 *   handleCallback,
 *   handlePatientSelect,
 *   enrichTokenResponse,
 *   enrichIntrospection,
 *   getRewrittenRedirectUri,
 *   MemoryStore,
 *   KeycloakAdapter,
 *   signLaunchCode,
 *   verifyLaunchCode,
 * } from '@proxy-smart/auth'
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  LaunchSession,
  LaunchCodePayload,
  LaunchCodeContext,
  SmartProxyResult,
  AuthorizeParams,
  TokenRequestParams,
  TokenPayload,
  TokenEnrichment,
  SmartProxyConfig,
  SmartProxyLogger,
} from './types'
export { noopLogger } from './types'

// ─── Smart Scopes ───────────────────────────────────────────────────────────
export {
  parseScopes,
  isSmartLaunch,
  isStandaloneLaunch,
  canReturnPatient,
  canReturnEncounter,
  canReturnFhirUser,
} from './smart-scopes'

// ─── Launch Code ────────────────────────────────────────────────────────────
export { signLaunchCode, verifyLaunchCode, type LaunchCodeServiceOptions } from './launch-code'

// ─── Stores ─────────────────────────────────────────────────────────────────
export type { ILaunchContextStore, LaunchContextStoreOptions } from './stores/interface'
export { MemoryStore } from './stores/memory'

// ─── Authorize Interceptor ──────────────────────────────────────────────────
export {
  handleAuthorize,
  type AuthorizeInterceptorDeps,
  type AuthorizeInterceptResult,
} from './authorize-interceptor'

// ─── Callback Handler ───────────────────────────────────────────────────────
export {
  handleCallback,
  handlePatientSelect,
  type CallbackParams,
  type CallbackHandlerDeps,
  type CallbackResult,
} from './callback-handler'

// ─── Token Enricher ─────────────────────────────────────────────────────────
export {
  enrichTokenResponse,
  getRewrittenRedirectUri,
  type TokenEnricherDeps,
  type TokenEnrichInput,
} from './token-enricher'

// ─── Introspection Enricher ─────────────────────────────────────────────────
export { enrichIntrospection, type IntrospectionData } from './introspection-enricher'

// ─── FHIR User Utilities ────────────────────────────────────────────────────
export {
  extractPatientFromFhirUser,
  getFhirUserResourceType,
  isAbsoluteUrl,
  toAbsoluteFhirUser,
} from './fhir-user'

// ─── IdP Adapters ───────────────────────────────────────────────────────────
export type { IdPAdapter } from './idp/interface'
export { KeycloakAdapter, type KeycloakAdapterConfig } from './idp/keycloak'
