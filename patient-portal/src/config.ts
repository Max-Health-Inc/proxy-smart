/**
 * Patient Portal configuration — resolved from env vars at build time.
 */
export const config = {
  /** Proxy Smart base URL (defaults to same origin for mono-mode deployments) */
  proxyBase: import.meta.env.VITE_PROXY_BASE ?? window.location.origin,

  /** FHIR proxy route prefix */
  proxyPrefix: import.meta.env.VITE_PROXY_PREFIX ?? "proxy-smart-backend",

  /** FHIR server ID registered in Proxy Smart */
  fhirServerId: import.meta.env.VITE_FHIR_SERVER_ID ?? "hapi-fhir-server",

  /** FHIR version */
  fhirVersion: (import.meta.env.VITE_FHIR_VERSION ?? "R4") as "R4" | "R5",

  /** SMART client ID registered in Keycloak */
  clientId: import.meta.env.VITE_CLIENT_ID ?? "patient-portal",

  /** Redirect URI for SMART callback */
  redirectUri: import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}${import.meta.env.BASE_URL}callback`,

  /** Scopes — patient-level access per IPA */
  scopes: import.meta.env.VITE_SCOPES ?? "openid fhirUser patient/*.read",
} as const
