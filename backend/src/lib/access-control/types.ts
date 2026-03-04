/**
 * Access Control Provider Interface
 * 
 * Vendor-agnostic abstraction for physical access control systems.
 * Implementations exist for Kisi (cloud API) and UniFi Access (local controller).
 * 
 * The interface splits capabilities into required (core) and optional (provider-specific)
 * so routes can degrade gracefully when a feature isn't supported.
 */

// ==================== Common Domain Types ====================

export interface AccessLocation {
  id: string
  name: string
  address?: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface AccessDoor {
  id: string
  name: string
  locationId: string
  description?: string
  online: boolean
  locked?: boolean
  type?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface AccessGroup {
  id: string
  name: string
  description?: string
  locationId?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface AccessMember {
  id: string
  name?: string
  email: string
  groupIds?: string[]
  confirmed?: boolean
  enabled?: boolean
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface AccessGroupDoor {
  id: string
  groupId: string
  doorId: string
  createdAt?: string
  updatedAt?: string
}

export interface AccessEvent {
  id: string
  action: string
  actorType?: string
  actorId?: string
  actorEmail?: string
  objectType?: string
  objectId?: string
  doorId?: string
  message?: string
  createdAt?: string
}

// ==================== Query / Pagination ====================

export interface ListParams {
  limit?: number
  offset?: number
  query?: string
  [key: string]: string | number | boolean | undefined
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    offset: number
    limit: number
    count: number
  }
}

// ==================== Keycloak Sync ====================

export interface KeycloakUserIdentity {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  roles?: string[]
}

export interface RoleMappingRule {
  /** Keycloak role name (or pattern) */
  keycloakRole: string
  /** Provider group ID to assign when the role matches */
  groupId: string
}

export interface SyncResult {
  created: string[]
  skipped: string[]
  failed: Array<{ email: string; error: string }>
}

// ==================== Overview ====================

export interface AccessOverview {
  locations: PaginatedResponse<AccessLocation>
  doors: PaginatedResponse<AccessDoor>
  groups: PaginatedResponse<AccessGroup>
  members: PaginatedResponse<AccessMember>
}

// ==================== Provider Capabilities ====================

/** Flags indicating which optional features a provider supports */
export interface ProviderCapabilities {
  /** Can manage access groups (Kisi: yes, UniFi: no) */
  groups: boolean
  /** Can manage individual members (Kisi: yes, UniFi: no) */
  members: boolean
  /** Can sync users from Keycloak (requires members) */
  sync: boolean
  /** Can query audit events (Kisi: yes, UniFi: via WebSocket only) */
  events: boolean
  /** Can assign doors to groups */
  groupDoors: boolean
  /** Supports real-time event streaming */
  realtime: boolean
}

// ==================== Provider Interface ====================

export interface AccessControlProvider {
  /** Provider identifier (e.g. 'kisi', 'unifi-access') */
  readonly name: string
  /** Human-readable provider label */
  readonly displayName: string
  /** Capability flags */
  readonly capabilities: ProviderCapabilities

  // ---- Core (required) ----

  /** Check if the provider backend is reachable */
  isHealthy(): Promise<boolean>

  /** List all locations / places / floors */
  getLocations(params?: ListParams): Promise<PaginatedResponse<AccessLocation>>
  /** Get a single location by ID */
  getLocation(id: string): Promise<AccessLocation>

  /** List all doors / locks */
  getDoors(params?: ListParams): Promise<PaginatedResponse<AccessDoor>>
  /** Get a single door by ID */
  getDoor(id: string): Promise<AccessDoor>
  /** Unlock a door */
  unlock(doorId: string): Promise<{ message: string }>

  // ---- Optional: Groups ----

  getGroups?(params?: ListParams): Promise<PaginatedResponse<AccessGroup>>
  getGroup?(id: string): Promise<AccessGroup>
  createGroup?(name: string, description?: string): Promise<AccessGroup>
  deleteGroup?(id: string): Promise<void>

  // ---- Optional: Group ↔ Door assignments ----

  getGroupDoors?(params?: ListParams): Promise<PaginatedResponse<AccessGroupDoor>>
  assignDoorToGroup?(groupId: string, doorId: string): Promise<AccessGroupDoor>
  removeDoorFromGroup?(id: string): Promise<void>

  // ---- Optional: Members ----

  getMembers?(params?: ListParams): Promise<PaginatedResponse<AccessMember>>
  getMember?(id: string): Promise<AccessMember>
  createMember?(email: string, name?: string): Promise<AccessMember>
  deleteMember?(id: string): Promise<void>

  // ---- Optional: Events / Audit ----

  getEvents?(params?: ListParams): Promise<PaginatedResponse<AccessEvent>>

  // ---- Optional: Keycloak Sync ----

  syncUsersFromKeycloak?(
    users: KeycloakUserIdentity[],
    roleMappings?: RoleMappingRule[]
  ): Promise<SyncResult>

  // ---- Optional: Overview (convenience) ----

  getOverview?(): Promise<AccessOverview>
}
