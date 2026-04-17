/* tslint:disable */
 
/**
 * Type definitions and re-exports for the SMART on FHIR Proxy API client
 */

// Re-export all models from the API client
export * from '../api-client/models';

// Re-export API classes and request types
export * from '../api-client/apis';

// Import types needed for extending
import type { 
  FhirServerListServersInner, 
  SmartApp as ApiSmartApp,
  CreateSmartAppRequest,
  CreateHealthcareUserRequest,
  IdentityProviderResponse,
  CreateIdentityProviderRequest,
  IdentityProviderConfig
} from '../api-client/models';

// Additional type aliases for compatibility
export type {
  ClientRegistrationSettings,
  FhirServer,
  FhirServerList,
  HealthcareUser,
  PublicIdentityProvider,
  OAuthEvent,
  UserInfoResponse as UserProfile,
  ChatResponse,
  TokenResponse,
  CreateSmartAppRequest,
  UpdateSmartAppRequest,
  CreateHealthcareUserRequest,
  UpdateHealthcareUserRequest,
} from '../api-client/models';

// Extended SmartApp with UI-specific properties ONLY (not in backend)
export interface SmartApp extends ApiSmartApp {
  status?: 'active' | 'inactive';  // Computed from enabled field
  lastUsed?: string;  // UI tracking only
}

// Extended FhirServerWithState with UI-specific properties
export interface FhirServerWithState extends FhirServerListServersInner {
  connectionStatus?: string;
  loading?: boolean;
  error?: string;
}

// Additional custom types not directly from OpenAPI

// HealthcareUserFormData extends from generated CreateHealthcareUserRequest with UI-specific additions
export interface HealthcareUserFormData extends CreateHealthcareUserRequest {
  // UI-specific fields (NOT sent to backend API)
  primaryRole?: string; // UI helper for role selection
}

// SmartAppFormData - Extends CreateSmartAppRequest with UI-only fields
// authenticationType is UI-only - backend infers from jwksUri/publicKey/secret presence
export interface SmartAppFormData extends CreateSmartAppRequest {
  authenticationType?: 'asymmetric' | 'symmetric' | 'none'; // UI-only field for form UX
}

export interface ScopeSet {
  id: string;
  name: string;
  description?: string;
  scopes: string[];
}

export interface ContextSet {
  id: string;
  name: string;
  description?: string;
  contexts: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

// Import and re-export the API client's enum types
import type { SmartAppAppTypeEnum } from '../api-client/models';
import { SmartAppAppTypeEnum as SmartAppTypeEnum } from '../api-client/models';
export type SmartAppType = SmartAppAppTypeEnum;
export { SmartAppTypeEnum };
// Use the generated ClientType enum from backend instead of custom AuthenticationType
export type { CreateSmartAppRequestClientTypeEnum as ClientType } from '../api-client/models';

/**
 * FHIR server details response - uses generated type from OpenAPI spec
 */
export type { FhirServerDetails } from '../api-client/models';

export interface DashboardData {
  loading: boolean;
  error: string | null;
  stats: {
    totalApps: number;
    activeUsers: number;
    connectedServers: number;
    todayRequests: number;
  };
  serverStatus: {
    keycloak: 'healthy' | 'unhealthy' | 'unknown';
    fhir: 'healthy' | 'unhealthy' | 'unknown';
    database: 'healthy' | 'unhealthy' | 'unknown';
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
  smartAppsCount: number;
  usersCount: number;
  serversCount: number;
  identityProvidersCount: number;
}

// Additional missing types
export type { FhirServerList as FhirServersListResponse } from '../api-client/models';
export type { KeycloakConfigResponse } from '../api-client/models';
export type { SystemStatusResponse } from '../api-client/models';
export type { OAuthAnalyticsResponse } from '../api-client/models';
export type { OAuthEventsResponse as OAuthEventsListResponse } from '../api-client/models';

// Identity Provider UI extensions

export interface IdentityProviderWithStats extends IdentityProviderResponse {
  config?: IdentityProviderConfig;
  vendorName?: string;
  status?: 'active' | 'inactive';
  userCount?: number;
  lastUsed?: string;
}

export interface IdentityProviderFormData extends CreateIdentityProviderRequest {
  config: IdentityProviderConfig;
  vendorName?: string;
}
