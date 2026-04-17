/**
 * SMART on FHIR Authorization Module
 *
 * Implements SMART App Launch Framework (v2) with PKCE.
 * Works in any browser environment — no framework dependencies.
 *
 * @see https://hl7.org/fhir/smart-app-launch/
 */
// ── PKCE helpers ─────────────────────────────────────────────────────────────
function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, length);
}
async function sha256(plain) {
    const encoder = new TextEncoder();
    return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}
function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// ── Storage keys ─────────────────────────────────────────────────────────────
function storageKeys(prefix) {
    return {
        token: `${prefix}token`,
        verifier: `${prefix}code_verifier`,
        state: `${prefix}state`,
        expiresAt: `${prefix}expires_at`,
        launchMode: `${prefix}launch_mode`,
    };
}
// ── Discovery ────────────────────────────────────────────────────────────────
/**
 * Discover SMART authorization endpoints from a FHIR server.
 * Tries `.well-known/smart-configuration` first, falls back to CapabilityStatement.
 */
export async function discoverEndpoints(fhirBaseUrl) {
    const smartUrl = `${fhirBaseUrl}/.well-known/smart-configuration`;
    try {
        const res = await fetch(smartUrl);
        if (res.ok)
            return (await res.json());
    }
    catch {
        // fallthrough to CapabilityStatement
    }
    const metaUrl = `${fhirBaseUrl}/metadata`;
    const res = await fetch(metaUrl, {
        headers: { Accept: "application/fhir+json" },
    });
    if (!res.ok) {
        throw new Error(`Failed to discover SMART endpoints from ${metaUrl}`);
    }
    const meta = await res.json();
    const security = meta.rest?.[0]?.security;
    const oauthExt = security?.extension?.find((e) => e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris");
    const findExt = (url) => oauthExt?.extension?.find((e) => e.url === url)?.valueUri;
    const authorization_endpoint = findExt("authorize");
    const token_endpoint = findExt("token");
    if (!authorization_endpoint || !token_endpoint) {
        throw new Error("Could not find SMART authorization/token endpoints in CapabilityStatement");
    }
    return { authorization_endpoint, token_endpoint };
}
// ── SmartAuth class ──────────────────────────────────────────────────────────
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
export class SmartAuth {
    constructor(config) {
        this.config = config;
        this.storage = config.storage ?? sessionStorage;
        this.keys = storageKeys(config.storagePrefix ?? "smart_");
    }
    // ── Launch ───────────────────────────────────────────────────────────
    /** Detect launch mode from current URL parameters */
    detectLaunchMode() {
        const params = new URLSearchParams(window.location.search);
        return params.has("launch") && params.has("iss") ? "ehr" : "standalone";
    }
    /** Start standalone SMART launch (redirects the browser) */
    async authorize() {
        const mode = this.detectLaunchMode();
        if (mode === "ehr") {
            const params = new URLSearchParams(window.location.search);
            await this.startEhrLaunch(params.get("launch"), params.get("iss"));
        }
        else {
            await this.startStandaloneLaunch();
        }
    }
    /** Start standalone SMART launch */
    async startStandaloneLaunch() {
        const endpoints = await discoverEndpoints(this.config.fhirBaseUrl);
        const { codeChallenge, codeVerifier, state } = await this.preparePkce();
        this.storage.setItem(this.keys.launchMode, "standalone");
        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: this.config.scopes,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            aud: this.config.fhirBaseUrl,
        });
        window.location.href = `${endpoints.authorization_endpoint}?${params}`;
    }
    /** Start EHR SMART launch */
    async startEhrLaunch(launch, iss) {
        const endpoints = await discoverEndpoints(this.config.fhirBaseUrl);
        const { codeChallenge, codeVerifier, state } = await this.preparePkce();
        this.storage.setItem(this.keys.launchMode, "ehr");
        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: this.config.scopes,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            aud: iss,
            launch,
        });
        window.location.href = `${endpoints.authorization_endpoint}?${params}`;
    }
    // ── Callback ─────────────────────────────────────────────────────────
    /** Check if the current URL is an OAuth callback */
    isCallback() {
        const params = new URLSearchParams(window.location.search);
        return params.has("code") || params.has("error");
    }
    /** Handle the OAuth callback — exchanges code for token */
    async handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");
        if (error) {
            throw new Error(`Authorization error: ${error} — ${params.get("error_description") ?? ""}`);
        }
        if (!code) {
            throw new Error("Missing authorization code in callback");
        }
        const savedState = this.storage.getItem(this.keys.state);
        if (state !== savedState) {
            throw new Error("State mismatch — possible CSRF");
        }
        const codeVerifier = this.storage.getItem(this.keys.verifier);
        if (!codeVerifier) {
            throw new Error("Missing PKCE code_verifier");
        }
        const endpoints = await discoverEndpoints(this.config.fhirBaseUrl);
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            code_verifier: codeVerifier,
        });
        const res = await fetch(endpoints.token_endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Token exchange failed (${res.status}): ${text}`);
        }
        const token = await res.json();
        // Extract fhirUser from id_token claims
        if (token.id_token) {
            try {
                const payload = JSON.parse(atob(token.id_token.split(".")[1]));
                token.fhirUser = payload.fhirUser ?? payload.profile;
            }
            catch {
                // id_token decode failed — non-critical
            }
        }
        // Clean up PKCE state
        this.storage.removeItem(this.keys.verifier);
        this.storage.removeItem(this.keys.state);
        // Save token + expiry
        this.storage.setItem(this.keys.token, JSON.stringify(token));
        if (token.expires_in) {
            const expiresAt = Date.now() + (token.expires_in - 60) * 1000;
            this.storage.setItem(this.keys.expiresAt, String(expiresAt));
        }
        return token;
    }
    // ── Token management ─────────────────────────────────────────────────
    /** Get the stored token, or null if not authenticated */
    getToken() {
        const raw = this.storage.getItem(this.keys.token);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    /** Get the stored launch mode */
    getLaunchMode() {
        return this.storage.getItem(this.keys.launchMode) ?? "standalone";
    }
    /** Check if the user is authenticated */
    isAuthenticated() {
        return this.getToken() !== null;
    }
    /** Check if the current token is expired */
    isTokenExpired() {
        const expiresAt = this.storage.getItem(this.keys.expiresAt);
        if (!expiresAt)
            return false;
        return Date.now() >= Number(expiresAt);
    }
    /** Clear stored token and auth state */
    clearToken() {
        this.storage.removeItem(this.keys.token);
        this.storage.removeItem(this.keys.expiresAt);
        this.storage.removeItem(this.keys.launchMode);
    }
    /**
     * Full logout — clears local state and redirects to the IdP's
     * end_session_endpoint so the Keycloak / OAuth2 session is terminated.
     *
     * Falls back to just clearing local state if no end_session_endpoint
     * is advertised by the server.
     */
    async logout(postLogoutRedirectUri) {
        const token = this.getToken();
        this.clearToken();
        try {
            const endpoints = await discoverEndpoints(this.config.fhirBaseUrl);
            if (endpoints.end_session_endpoint) {
                const params = new URLSearchParams({
                    post_logout_redirect_uri: postLogoutRedirectUri ??
                        this.config.postLogoutRedirectUri ??
                        window.location.origin,
                    client_id: this.config.clientId,
                });
                if (token?.id_token) {
                    params.set("id_token_hint", token.id_token);
                }
                window.location.href = `${endpoints.end_session_endpoint}?${params}`;
                return;
            }
        }
        catch {
            // discovery failed — fall through to local-only logout
        }
        // No end_session_endpoint — just reload to the app root
        window.location.href = postLogoutRedirectUri ?? this.config.postLogoutRedirectUri ?? window.location.origin;
    }
    /** Refresh the access token using the refresh_token grant */
    async refreshAccessToken() {
        const token = this.getToken();
        if (!token?.refresh_token)
            return null;
        try {
            const endpoints = await discoverEndpoints(this.config.fhirBaseUrl);
            const body = new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: token.refresh_token,
                client_id: this.config.clientId,
            });
            const res = await fetch(endpoints.token_endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            });
            if (!res.ok)
                return null;
            const newToken = await res.json();
            // Preserve context from previous token if not in the new one
            if (!newToken.fhirUser && token.fhirUser)
                newToken.fhirUser = token.fhirUser;
            if (!newToken.refresh_token && token.refresh_token)
                newToken.refresh_token = token.refresh_token;
            if (!newToken.patient && token.patient)
                newToken.patient = token.patient;
            if (!newToken.encounter && token.encounter)
                newToken.encounter = token.encounter;
            this.storage.setItem(this.keys.token, JSON.stringify(newToken));
            if (newToken.expires_in) {
                const expiresAt = Date.now() + (newToken.expires_in - 60) * 1000;
                this.storage.setItem(this.keys.expiresAt, String(expiresAt));
            }
            return newToken;
        }
        catch {
            return null;
        }
    }
    /** Get a valid (non-expired) token, refreshing if needed */
    async getValidToken() {
        const token = this.getToken();
        if (!token)
            return null;
        if (!this.isTokenExpired())
            return token;
        return this.refreshAccessToken();
    }
    // ── Authenticated fetch ──────────────────────────────────────────────
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
    createAuthenticatedFetch() {
        const self = this;
        return async function authenticatedFetch(input, init) {
            const token = await self.getValidToken();
            if (!token) {
                throw new Error("No valid SMART token available — authorize first");
            }
            const headers = new Headers(init?.headers);
            headers.set("Authorization", `Bearer ${token.access_token}`);
            const response = await fetch(input, { ...init, headers });
            // Auto-retry once on 401 with a refreshed token
            if (response.status === 401 && token.refresh_token) {
                const refreshed = await self.refreshAccessToken();
                if (refreshed) {
                    headers.set("Authorization", `Bearer ${refreshed.access_token}`);
                    return fetch(input, { ...init, headers });
                }
            }
            return response;
        };
    }
    // ── Internal ─────────────────────────────────────────────────────────
    async preparePkce() {
        const codeVerifier = generateRandomString(64);
        const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
        const state = generateRandomString(32);
        this.storage.setItem(this.keys.verifier, codeVerifier);
        this.storage.setItem(this.keys.state, state);
        return { codeVerifier, codeChallenge, state };
    }
}
