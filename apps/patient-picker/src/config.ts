/**
 * Patient picker app config.
 *
 * This app does NOT use SMART auth — it's shown mid-OAuth-flow before any
 * token exists. It only needs the FHIR proxy base URL for Patient search.
 */
export const config = {
  /** Backend base URL (same origin in production, configurable for dev) */
  proxyBase: import.meta.env.VITE_PROXY_BASE ?? window.location.origin,
  /** FHIR proxy path prefix */
  proxyPrefix: import.meta.env.VITE_PROXY_PREFIX ?? 'fhir/proxy-smart-backend',
  /** FHIR server ID */
  fhirServerId: import.meta.env.VITE_FHIR_SERVER_ID ?? 'default',
  /** FHIR version */
  fhirVersion: import.meta.env.VITE_FHIR_VERSION ?? 'R4',
}

/** FHIR base URL for Patient search */
export const fhirBaseUrl = `${config.proxyBase}/${config.proxyPrefix}/${config.fhirServerId}/${config.fhirVersion}`
