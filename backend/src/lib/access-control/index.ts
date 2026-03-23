/**
 * Access Control - Module Index
 * 
 * Re-exports the provider interface, factory, plugin, and both providers.
 */

// Core types
export type {
  AccessControlProvider,
  ProviderCapabilities,
  AccessLocation,
  AccessDoor,
  AccessGroup,
  AccessMember,
  AccessGroupDoor,
  AccessEvent,
  AccessOverview,
  ListParams,
  PaginatedResponse,
  KeycloakUserIdentity,
  RoleMappingRule,
  SyncResult,
} from './types'

// Factory
export { createProvider, detectProvider } from './factory'
export type { ProviderType } from './factory'

// Plugin
export { accessControlPlugin, resetAccessControlPlugin } from './plugin'

// Providers
export { KisiAccessProvider } from './providers/kisi'
export { UnifiAccessProvider } from './providers/unifi-access'
