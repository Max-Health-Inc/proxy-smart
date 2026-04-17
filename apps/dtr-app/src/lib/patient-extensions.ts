/**
 * US Core Patient Extension Helpers
 *
 * Type-safe extraction of PAS Beneficiary / US Core extensions from Patient resources.
 * Uses the generated PASBeneficiary, USCoreRaceExtension, USCoreEthnicityExtension,
 * and USCoreBirthSexExtension types for discriminated union matching.
 */
import type { Patient, Extension } from "fhir/r4"
import type {
  PASBeneficiary,
  USCoreRaceExtension,
  USCoreEthnicityExtension,
  USCoreBirthSexExtension,
} from "hl7.fhir.us.davinci-pas-generated"

// ── Extension URL constants ──────────────────────────────────────────────────

const EXT_RACE = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race" satisfies USCoreRaceExtension["url"]
const EXT_ETHNICITY = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity" satisfies USCoreEthnicityExtension["url"]
const EXT_BIRTH_SEX = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex" satisfies USCoreBirthSexExtension["url"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function findPatientExt(patient: Patient, url: string): Extension | undefined {
  return patient.extension?.find(e => e.url === url)
}

/** Extract the "text" sub-extension value from a complex US Core extension */
function getTextFromComplex(ext: Extension | undefined): string | undefined {
  return ext?.extension?.find(e => e.url === "text")?.valueString
}

/** Extract display values from "ombCategory" sub-extensions */
function getOmbCategories(ext: Extension | undefined): string[] {
  return ext?.extension
    ?.filter(e => e.url === "ombCategory")
    .map(e => e.valueCoding?.display)
    .filter((d): d is string => !!d) ?? []
}

/** Extract display values from "detailed" sub-extensions */
function getDetailed(ext: Extension | undefined): string[] {
  return ext?.extension
    ?.filter(e => e.url === "detailed")
    .map(e => e.valueCoding?.display)
    .filter((d): d is string => !!d) ?? []
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface USCoreRaceInfo {
  /** Text description (required by US Core) */
  text?: string
  /** OMB race categories (e.g., "White", "Black or African American") */
  ombCategories: string[]
  /** Detailed race codes (e.g., "Irish", "Jamaican") */
  detailed: string[]
}

export interface USCoreEthnicityInfo {
  text?: string
  ombCategories: string[]
  detailed: string[]
}

/** Extract US Core Race extension data from a Patient */
export function getRace(patient: Patient): USCoreRaceInfo | undefined {
  const ext = findPatientExt(patient, EXT_RACE)
  if (!ext) return undefined
  return {
    text: getTextFromComplex(ext),
    ombCategories: getOmbCategories(ext),
    detailed: getDetailed(ext),
  }
}

/** Extract US Core Ethnicity extension data from a Patient */
export function getEthnicity(patient: Patient): USCoreEthnicityInfo | undefined {
  const ext = findPatientExt(patient, EXT_ETHNICITY)
  if (!ext) return undefined
  return {
    text: getTextFromComplex(ext),
    ombCategories: getOmbCategories(ext),
    detailed: getDetailed(ext),
  }
}

/** Extract US Core Birth Sex extension value */
export function getBirthSex(patient: Patient): string | undefined {
  return findPatientExt(patient, EXT_BIRTH_SEX)?.valueCode
}

/** Convenient display label for birth sex codes */
const BIRTH_SEX_LABELS: Record<string, string> = {
  M: "Male",
  F: "Female",
  UNK: "Unknown",
}

export function getBirthSexDisplay(patient: Patient): string | undefined {
  const code = getBirthSex(patient)
  return code ? (BIRTH_SEX_LABELS[code] ?? code) : undefined
}

/** All US Core demographics in one call */
export function getUSCoreDemographics(patient: Patient) {
  return {
    race: getRace(patient),
    ethnicity: getEthnicity(patient),
    birthSex: getBirthSex(patient),
    birthSexDisplay: getBirthSexDisplay(patient),
  }
}

export type USCoreDemographics = ReturnType<typeof getUSCoreDemographics>

/** Type guard: is this Patient resource a PAS Beneficiary? */
export function isPASBeneficiary(patient: Patient): patient is PASBeneficiary {
  return patient.resourceType === "Patient"
}
