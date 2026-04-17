/**
 * SMART on FHIR Authorization Module
 *
 * Implements SMART App Launch Framework (v2) with PKCE.
 * Works in any browser environment — no framework dependencies.
 *
 * @see https://hl7.org/fhir/smart-app-launch/
 */
export interface SmartConfig {
    /** OAuth2 client_id registered with the auth server */
    clientId: string;
    /** Redirect URI registered with the auth server */
    redirectUri: string;
    /** FHIR server base URL (used as `aud` param) */
    fhirBaseUrl: string;
    /** Space-separated OAuth2 scopes */
    scopes: string;
    /** Optional storage backend (defaults to sessionStorage) */
    storage?: Storage;
    /** Optional prefix for storage keys (defaults to "smart_") */
    storagePrefix?: string;
    /** Where to redirect after IdP logout (defaults to current origin) */
    postLogoutRedirectUri?: string;
}
export interface SmartToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    id_token?: string;
    refresh_token?: string;
    /** Extracted from id_token or token response */
    fhirUser?: string;
    /** Patient context from EHR launch */
    patient?: string;
    /** Encounter context from EHR launch */
    encounter?: string;
}
export interface SmartConfiguration {
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint?: string;
    introspection_endpoint?: string;
    revocation_endpoint?: string;
    end_session_endpoint?: string;
    capabilities?: string[];
}
export type LaunchMode = "standalone" | "ehr";
/**
 * Discover SMART authorization endpoints from a FHIR server.
 * Tries `.well-known/smart-configuration` first, falls back to CapabilityStatement.
 */
export declare function discoverEndpoints(fhirBaseUrl: string): Promise<SmartConfiguration>;
/**
 * Manages the SMART on FHIR authorization lifecycle.
 *
 * @example
 * const auth = new SmartAuth({
 *   clientId: "my-app",
 *   redirectUri: "http://localhost:3000/callback",
 *   fhirBaseUrl: "https://fhir.example.com/fhir",
 *   scopes: "openid fhirUser patient/*.read",
 * });
 *
 * // Check if this is a callback
 * if (auth.isCallback()) {
 *   const token = await auth.handleCallback();
 * } else {
 *   await auth.authorize(); // redirects to auth server
 * }
 *
 * // Create authenticated fetch
 * const authFetch = auth.createAuthenticatedFetch();
 */
export declare class SmartAuth {
    readonly config: SmartConfig;
    private readonly storage;
    private readonly keys;
    constructor(config: SmartConfig);
    /** Detect launch mode from current URL parameters */
    detectLaunchMode(): LaunchMode;
    /** Start standalone SMART launch (redirects the browser) */
    authorize(): Promise<void>;
    /** Start standalone SMART launch */
    startStandaloneLaunch(): Promise<void>;
    /** Start EHR SMART launch */
    startEhrLaunch(launch: string, iss: string): Promise<void>;
    /** Check if the current URL is an OAuth callback */
    isCallback(): boolean;
    /** Handle the OAuth callback — exchanges code for token */
    handleCallback(): Promise<SmartToken>;
    /** Get the stored token, or null if not authenticated */
    getToken(): SmartToken | null;
    /** Get the stored launch mode */
    getLaunchMode(): LaunchMode;
    /** Check if the user is authenticated */
    isAuthenticated(): boolean;
    /** Check if the current token is expired */
    isTokenExpired(): boolean;
    /** Clear stored token and auth state */
    clearToken(): void;
    /**
     * Full logout — clears local state and redirects to the IdP's
     * end_session_endpoint so the Keycloak / OAuth2 session is terminated.
     *
     * Falls back to just clearing local state if no end_session_endpoint
     * is advertised by the server.
     */
    logout(postLogoutRedirectUri?: string): Promise<void>;
    /** Refresh the access token using the refresh_token grant */
    refreshAccessToken(): Promise<SmartToken | null>;
    /** Get a valid (non-expired) token, refreshing if needed */
    getValidToken(): Promise<SmartToken | null>;
    /**
     * Create a fetch wrapper that injects the Bearer token.
     * Automatically refreshes expired tokens when a refresh_token is available.
     *
     * Pass the returned function to `FhirClient` as the `fetchFn` parameter.
     *
     * @example
     * const auth = new SmartAuth(config);
     * const client = new FhirClient(config.fhirBaseUrl, auth.createAuthenticatedFetch());
     */
    createAuthenticatedFetch(): typeof globalThis.fetch;
    private preparePkce;
}
