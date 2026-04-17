import { FhirClient } from "./fhir-client.js";
import { SmartAuth } from "./smart-auth.js";
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
export class SmartFhirClient {
    constructor(config) {
        this.auth = new SmartAuth(config);
        this.client = new FhirClient(config.fhirBaseUrl, this.auth.createAuthenticatedFetch());
    }
    // ── Convenience delegates ────────────────────────────────────────────
    /** Start the authorization flow (auto-detects standalone vs EHR launch) */
    async authorize() {
        return this.auth.authorize();
    }
    /** Check if the current page is an OAuth callback */
    isCallback() {
        return this.auth.isCallback();
    }
    /** Handle the OAuth callback and store the token */
    async handleCallback() {
        return this.auth.handleCallback();
    }
    /** Check if the user has a stored token */
    isAuthenticated() {
        return this.auth.isAuthenticated();
    }
    /** Get the current token (null if not authenticated) */
    getToken() {
        return this.auth.getToken();
    }
    /** Get the launch mode (standalone or ehr) */
    getLaunchMode() {
        return this.auth.getLaunchMode();
    }
    /** Full logout — clears local state and ends the IdP session */
    async logout(postLogoutRedirectUri) {
        return this.auth.logout(postLogoutRedirectUri);
    }
    // ── Typed read/write access ──────────────────────────────────────────
    /** Get the read client (all requests are authenticated) */
    read() {
        return this.client.read();
    }
    /** Get the write client (all requests are authenticated) */
    write() {
        return this.client.write();
    }
}
