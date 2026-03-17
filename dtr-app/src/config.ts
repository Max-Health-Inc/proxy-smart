/**
 * DTR App configuration — resolved from env vars at build time.
 */
export const config = {
  /** Proxy Smart base URL */
  proxyBase: import.meta.env.VITE_PROXY_BASE ?? "http://localhost:8445",

  /** FHIR proxy route prefix */
  proxyPrefix: import.meta.env.VITE_PROXY_PREFIX ?? "proxy-smart-backend",

  /** FHIR server ID registered in Proxy Smart */
  fhirServerId: import.meta.env.VITE_FHIR_SERVER_ID ?? "hapi-fhir-server",

  /** FHIR version */
  fhirVersion: (import.meta.env.VITE_FHIR_VERSION ?? "R4") as "R4" | "R5",

  /** SMART client ID registered in Keycloak */
  clientId: import.meta.env.VITE_CLIENT_ID ?? "dtr-app",

  /** Redirect URI for SMART callback */
  redirectUri: import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}/callback`,

  /** Scopes to request — includes user/*.read for practitioner access and patient/*.read */
  scopes: import.meta.env.VITE_SCOPES ?? "openid fhirUser launch user/*.read patient/*.read",
} as const
