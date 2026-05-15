/**
 * Environment configuration for e2e tests.
 * Resolves URLs based on E2E_TARGET (local | alpha | beta).
 */

export type TargetEnv = "local" | "beta"

export interface E2EEnv {
  target: TargetEnv
  baseURL: string
  keycloakURL: string
  /** Full URL to patient-portal app */
  patientPortalURL: string
  /** Full URL to consent-app */
  consentAppURL: string
  /** Full URL to the admin UI */
  adminURL: string
  /** FHIR proxy base path */
  fhirProxyPath: string
}

const target = (process.env.E2E_TARGET ?? "beta") as TargetEnv

const envMap: Record<TargetEnv, Omit<E2EEnv, "target" | "patientPortalURL" | "consentAppURL" | "adminURL" | "fhirProxyPath">> = {
  local: {
    baseURL: "http://localhost:8445",
    keycloakURL: "http://localhost:8080",
  },
  beta: {
    baseURL: "https://beta.proxy-smart.com",
    keycloakURL: "https://beta.proxy-smart.com/auth",
  },
}

const base = envMap[target]

export const env: E2EEnv = {
  ...base,
  target,
  patientPortalURL: `${base.baseURL}/apps/patient-portal/`,
  consentAppURL: `${base.baseURL}/apps/consent/`,
  adminURL: `${base.baseURL}/webapp/`,
  fhirProxyPath: "proxy-smart-backend/hapi-fhir-server/R4",
}

/** Test user credentials */
export const testUsers = {
  patient: {
    username: process.env.E2E_PATIENT_USER ?? "testuser",
    password: process.env.E2E_PATIENT_PASS ?? "testpass",
    fhirUser: "Patient/test-patient",
    patientId: "test-patient",
  },
  practitioner: {
    username: process.env.E2E_PRACTITIONER_USER ?? "doctor",
    password: process.env.E2E_PRACTITIONER_PASS ?? "doctor123",
    fhirUser: "Practitioner/example-practitioner",
    smartPatient: "test-patient",
  },
  admin: {
    username: process.env.E2E_ADMIN_USER ?? "admin",
    password: process.env.E2E_ADMIN_PASS ?? "admin",
  },
} as const
