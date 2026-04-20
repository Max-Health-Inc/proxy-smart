/**
 * FHIR client for the SHL viewer.
 * Uses the generated IPS FhirClient with a simple bearer-token fetch.
 * No SMART auth flow — the token comes from the decrypted SHL manifest.
 */

import { FhirClient } from "hl7.fhir.uv.ips-generated/fhir-client"
import type {
  PatientUvIps,
  ConditionUvIps,
  AllergyIntoleranceUvIps,
  MedicationStatementIPS,
  MedicationRequestIPS,
  ImmunizationUvIps,
  ObservationResultsLaboratoryPathologyUvIps,
  ProcedureUvIps,
} from "hl7.fhir.uv.ips-generated"
import type { Observation } from "fhir/r4"
import type { ConditionClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionClinical"
import type { AllergyintoleranceClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyintoleranceClinical"
import type { MedicationStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-MedicationStatus"
import type { MedicationrequestStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-MedicationrequestStatus"
import type { ObservationCategoryCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ObservationCategory"

// Re-export types for consumers
export type { PatientUvIps as Patient } from "hl7.fhir.uv.ips-generated"
export type { ConditionUvIps as Condition } from "hl7.fhir.uv.ips-generated"
export type { AllergyIntoleranceUvIps as AllergyIntolerance } from "hl7.fhir.uv.ips-generated"
export type { MedicationStatementIPS as MedicationStatement } from "hl7.fhir.uv.ips-generated"
export type { MedicationRequestIPS as MedicationRequest } from "hl7.fhir.uv.ips-generated"
export type { ImmunizationUvIps as Immunization } from "hl7.fhir.uv.ips-generated"
export type { ObservationResultsLaboratoryPathologyUvIps as LabResult } from "hl7.fhir.uv.ips-generated"
export type { ProcedureUvIps as Procedure } from "hl7.fhir.uv.ips-generated"
export type { Observation } from "fhir/r4"

// ── Client factory ──────────────────────────────────────────────────────────

export interface ShlFhirConfig {
  baseUrl: string
  accessToken: string
}

/** Create a bearer-token authenticated fetch function */
function createShlFetch(accessToken: string): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> || {}),
        Authorization: `Bearer ${accessToken}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any
}

/** Create a typed IPS FhirClient from SHL access credentials */
export function createFhirClient(config: ShlFhirConfig) {
  return new FhirClient(config.baseUrl, createShlFetch(config.accessToken))
}

// ── Query functions (pass client, not singleton) ────────────────────────────

export async function getPatient(client: FhirClient, patientId: string): Promise<PatientUvIps> {
  return client.read().patientUvIps().read(patientId)
}

export async function searchConditions(client: FhirClient, patientId: string): Promise<ConditionUvIps[]> {
  return client.read().conditionUvIps().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active" satisfies ConditionClinicalCode,
    _count: 50,
    _sort: "-onset-date",
  })
}

export async function searchAllergies(client: FhirClient, patientId: string): Promise<AllergyIntoleranceUvIps[]> {
  return client.read().allergyIntoleranceUvIps().searchAll({
    patient: `Patient/${patientId}`,
    "clinical-status": "active" satisfies AllergyintoleranceClinicalCode,
    _count: 50,
  })
}

export async function searchMedications(client: FhirClient, patientId: string): Promise<MedicationStatementIPS[]> {
  return client.read().medicationStatementIPS().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies MedicationStatusCode,
    _count: 50,
    _sort: "-effective",
  })
}

export async function searchMedicationRequests(client: FhirClient, patientId: string): Promise<MedicationRequestIPS[]> {
  return client.read().medicationRequestIPS().searchAll({
    patient: `Patient/${patientId}`,
    status: "active" satisfies MedicationrequestStatusCode,
    _count: 50,
    _sort: "-authoredon",
  })
}

export async function searchImmunizations(client: FhirClient, patientId: string): Promise<ImmunizationUvIps[]> {
  return client.read().immunizationUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}

export async function searchVitals(client: FhirClient, patientId: string): Promise<Observation[]> {
  // Vitals use base R4 Observation (not IPS-profiled), use raw fetch
  return client.read().observation().searchAll({
    patient: `Patient/${patientId}`,
    category: "vital-signs" satisfies ObservationCategoryCode,
    _count: 20,
    _sort: "-date",
  })
}

export async function searchLabs(client: FhirClient, patientId: string): Promise<ObservationResultsLaboratoryPathologyUvIps[]> {
  return client.read().observationResultsLaboratoryPathologyUvIps().searchAll({
    patient: `Patient/${patientId}`,
    category: "laboratory" satisfies ObservationCategoryCode,
    _count: 50,
    _sort: "-date",
  })
}

export async function searchProcedures(client: FhirClient, patientId: string): Promise<ProcedureUvIps[]> {
  return client.read().procedureUvIps().searchAll({
    patient: `Patient/${patientId}`,
    _count: 50,
    _sort: "-date",
  })
}
