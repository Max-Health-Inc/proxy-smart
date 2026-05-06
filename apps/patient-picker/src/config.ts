/**
 * Patient picker app config.
 *
 * The FHIR base URL comes from the `aud` query parameter, which is the
 * FHIR server URL from the original authorize request (SMART App Launch
 * spec §2.1.9). This app does NOT use SMART auth — it's shown mid-OAuth-flow
 * before any token exists.
 */

/** Fallback FHIR base URL for dev mode (when no aud param is available). */
export const devFhirBaseUrl = import.meta.env.VITE_FHIR_BASE_URL ?? `${window.location.origin}/proxy-smart-backend/hapi-fhir-server/R4`
