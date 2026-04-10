/**
 * Shared SMART app configuration factory.
 * Each app provides only its unique defaults (clientId, scopes);
 * everything else is resolved identically from Vite env vars.
 */
export interface SmartAppConfig {
  proxyBase: string
  proxyPrefix: string
  fhirServerId: string
  fhirVersion: string
  clientId: string
  redirectUri: string
  scopes: string
}

interface SmartAppDefaults {
  clientId: string
  scopes: string
}

export function createSmartAppConfig(defaults: SmartAppDefaults): SmartAppConfig {
  return {
    proxyBase: import.meta.env.VITE_PROXY_BASE ?? window.location.origin,
    proxyPrefix: import.meta.env.VITE_PROXY_PREFIX ?? 'proxy-smart-backend',
    fhirServerId: import.meta.env.VITE_FHIR_SERVER_ID ?? 'hapi-fhir-server',
    fhirVersion: import.meta.env.VITE_FHIR_VERSION ?? 'R4',
    clientId: import.meta.env.VITE_CLIENT_ID ?? defaults.clientId,
    redirectUri: import.meta.env.VITE_REDIRECT_URI ?? `${window.location.origin}${import.meta.env.BASE_URL}callback`,
    scopes: import.meta.env.VITE_SCOPES ?? defaults.scopes,
  }
}
