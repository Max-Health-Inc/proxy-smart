import { FhirClient, FhirReadClient, FhirWriteClient } from "./fhir-client.js";
import { SmartAuth } from "./smart-auth.js";
import type { SmartConfig, SmartToken, LaunchMode } from "./smart-auth.js";
export type { SmartConfig, SmartToken, LaunchMode };
/**
 * SMART on FHIR enabled FHIR Client.
 *
 * Combines `SmartAuth` (PKCE, discovery, token management) with the typed
 * `FhirClient` so every request is automatically authenticated.
 *
 * @example
 * const smart = new SmartFhirClient({
 *   clientId: "my-app",
 *   redirectUri: "http://localhost:3000/callback",
 *   fhirBaseUrl: "https://fhir.example.com/fhir",
 *   scopes: "openid fhirUser patient/*.read",
 * });
 *
 * // On page load — either handle callback or start auth
 * if (smart.isCallback()) {
 *   await smart.handleCallback();
 * } else if (!smart.isAuthenticated()) {
 *   await smart.authorize(); // redirects
 *   return;
 * }
 *
 * // Use the typed FHIR client — auth headers injected automatically
 * const patient = await smart.client.read().patient().read("123");
 */
export declare class SmartFhirClient {
    /** The underlying SMART auth manager */
    readonly auth: SmartAuth;
    /** The typed FHIR client with automatic auth headers */
    readonly client: FhirClient;
    constructor(config: SmartConfig);
    /** Start the authorization flow (auto-detects standalone vs EHR launch) */
    authorize(): Promise<void>;
    /** Check if the current page is an OAuth callback */
    isCallback(): boolean;
    /** Handle the OAuth callback and store the token */
    handleCallback(): Promise<SmartToken>;
    /** Check if the user has a stored token */
    isAuthenticated(): boolean;
    /** Get the current token (null if not authenticated) */
    getToken(): SmartToken | null;
    /** Get the launch mode (standalone or ehr) */
    getLaunchMode(): LaunchMode;
    /** Full logout — clears local state and ends the IdP session */
    logout(postLogoutRedirectUri?: string): Promise<void>;
    /** Get the read client (all requests are authenticated) */
    read(): FhirReadClient;
    /** Get the write client (all requests are authenticated) */
    write(): FhirWriteClient;
}
