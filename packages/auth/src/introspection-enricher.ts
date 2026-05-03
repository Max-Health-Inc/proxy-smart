/**
 * @proxy-smart/auth — Introspection Enricher
 *
 * Enriches IdP introspection responses with SMART-standard claim names.
 * IdPs (like Keycloak) store launch context under vendor-specific keys
 * (smart_patient, fhir_user, etc.) but SMART STU 2.2 expects top-level
 * patient, encounter, fhirUser.
 */

export interface IntrospectionData {
  active?: boolean
  smart_patient?: string
  smart_encounter?: string
  fhir_user?: string
  fhirUser?: string
  patient?: string
  encounter?: string
  [key: string]: unknown
}

/**
 * Enrich an introspection response with SMART-standard top-level claims.
 * Mutates and returns the same object for convenience.
 */
export function enrichIntrospection(data: IntrospectionData): IntrospectionData {
  if (!data.active) return data

  if (data.smart_patient && !data.patient) {
    data.patient = data.smart_patient
  }
  if (data.smart_encounter && !data.encounter) {
    data.encounter = data.smart_encounter
  }
  if (data.fhirUser === undefined && data.fhir_user) {
    data.fhirUser = data.fhir_user
  }

  return data
}
