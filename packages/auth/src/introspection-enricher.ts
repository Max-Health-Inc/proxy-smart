/**
 * @proxy-smart/auth — Introspection Enricher
 *
 * Enriches IdP introspection responses with SMART-standard claim names.
 * Derives `patient` from `fhirUser` when the user is a Patient and no
 * explicit patient claim exists. Normalizes fhir_user → fhirUser.
 */

import { extractPatientFromFhirUser } from './fhir-user'
import { canReturnPatient, parseScopes } from './smart-scopes'

export interface IntrospectionData {
  active?: boolean
  fhir_user?: string
  fhirUser?: string
  patient?: string
  encounter?: string
  scope?: string
  [key: string]: unknown
}

/**
 * Enrich an introspection response with SMART-standard top-level claims.
 * Mutates and returns the same object for convenience.
 */
export function enrichIntrospection(data: IntrospectionData): IntrospectionData {
  if (!data.active) return data

  if (data.fhirUser === undefined && data.fhir_user) {
    data.fhirUser = data.fhir_user
  }

  // Derive patient from fhirUser when no explicit patient claim exists
  // (mirrors token-enricher fallback for Patient users)
  if (!data.patient && data.fhirUser) {
    const grantedScopes = parseScopes(data.scope || '')
    if (canReturnPatient(grantedScopes)) {
      const patientId = extractPatientFromFhirUser(data.fhirUser)
      if (patientId) data.patient = patientId
    }
  }

  return data
}
