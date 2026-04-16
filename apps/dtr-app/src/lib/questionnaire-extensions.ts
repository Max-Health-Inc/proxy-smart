/**
 * DTR Questionnaire-level Extension Helpers
 *
 * Extracts IG-specific metadata from Questionnaire.extension[] using
 * the typed extension interfaces from the generated DTR package.
 * These are used in the QuestionnaireBrowser to show richer UX hints.
 */
import type { Extension, Questionnaire } from "fhir/r4"
import type { SignatureRequired } from "hl7.fhir.us.davinci-dtr-generated"

// ── Extension URLs (discriminant literals from the generated types) ──────────

const EXT_SIGNATURE_REQUIRED = "http://hl7.org/fhir/StructureDefinition/questionnaire-signatureRequired" satisfies SignatureRequired["url"]
const EXT_CQF_LIBRARY = "http://hl7.org/fhir/StructureDefinition/cqf-library"
const EXT_LAUNCH_CONTEXT = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"
const EXT_ASSEMBLE_EXPECTATION = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembleExpectation"
const EXT_ENTRY_MODE = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-entryMode"
const EXT_ENDPOINT = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-endpoint"

// ── Helpers ──────────────────────────────────────────────────────────────────

function findExt(q: Questionnaire, url: string): Extension | undefined {
  return q.extension?.find(e => e.url === url)
}

function hasExt(q: Questionnaire, url: string): boolean {
  return q.extension?.some(e => e.url === url) ?? false
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Whether the questionnaire requires a digital signature */
export function isSignatureRequired(q: Questionnaire): boolean {
  return hasExt(q, EXT_SIGNATURE_REQUIRED)
}

/** Whether the questionnaire references CQL libraries for pre-population */
export function hasCqlLibraries(q: Questionnaire): boolean {
  return hasExt(q, EXT_CQF_LIBRARY)
}

/** Number of CQL library references */
export function getCqlLibraryCount(q: Questionnaire): number {
  return q.extension?.filter(e => e.url === EXT_CQF_LIBRARY).length ?? 0
}

/** Get canonical URLs of referenced CQL libraries */
export function getCqlLibraryUrls(q: Questionnaire): string[] {
  return q.extension
    ?.filter(e => e.url === EXT_CQF_LIBRARY)
    .map(e => e.valueCanonical)
    .filter((v): v is string => !!v) ?? []
}

/** Whether the questionnaire declares launch context requirements */
export function hasLaunchContext(q: Questionnaire): boolean {
  return hasExt(q, EXT_LAUNCH_CONTEXT)
}

/** Get the launch context names (e.g., "patient", "encounter", "user") */
export function getLaunchContextNames(q: Questionnaire): string[] {
  return q.extension
    ?.filter(e => e.url === EXT_LAUNCH_CONTEXT)
    .flatMap(e => e.extension?.filter(sub => sub.url === "name").map(sub => sub.valueCoding?.code) ?? [])
    .filter((v): v is string => !!v) ?? []
}

/** Whether this is an assembly-expectation questionnaire (modular) */
export function isModular(q: Questionnaire): boolean {
  return hasExt(q, EXT_ASSEMBLE_EXPECTATION)
}

/** Get the questionnaire entry mode (e.g., "sequential", "prior-edit", "random") */
export function getEntryMode(q: Questionnaire): string | undefined {
  return findExt(q, EXT_ENTRY_MODE)?.valueCode
}

/** Whether the questionnaire defines a submission endpoint */
export function hasEndpoint(q: Questionnaire): boolean {
  return hasExt(q, EXT_ENDPOINT)
}

/** All questionnaire-level SDC/DTR metadata at once */
export function getQuestionnaireMetadata(q: Questionnaire) {
  return {
    signatureRequired: isSignatureRequired(q),
    cqlLibraryCount: getCqlLibraryCount(q),
    hasCql: hasCqlLibraries(q),
    hasLaunchContext: hasLaunchContext(q),
    launchContextNames: getLaunchContextNames(q),
    modular: isModular(q),
    entryMode: getEntryMode(q),
    hasEndpoint: hasEndpoint(q),
  }
}

export type QuestionnaireMetadata = ReturnType<typeof getQuestionnaireMetadata>
