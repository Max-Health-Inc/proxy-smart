/**
 * FHIR coded value translation utilities
 *
 * Uses multilingual display maps from the IPS generated package to translate
 * FHIR coding displays into the user's language. Falls back to the English
 * display value when no translation is available.
 *
 * Available translations: de, fr, es (varies per valueset / code)
 */

import { useTranslation } from "react-i18next"
import { useCallback } from "react"

// Import the getXxxDisplay helpers from valuesets that have translations
import { getDocSectionCodesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DocSectionCodes"
import { getDocumentClasscodesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DocumentClasscodes"
import { getFHIRDocumentTypeCodesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-FHIRDocumentTypeCodes"
import { getLOINCCodesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-LOINCCodes"
import { getLOINCDiagnosticReportCodesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-LOINCDiagnosticReportCodes"
import { getDiagnosticServiceSectionsDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DiagnosticServiceSections"
import { getLanguagesDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-Languages"
import { getPatientContactRelationshipDisplay } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-PatientContactRelationship"

type DisplayLookup = (code: string, lang: string) => string | undefined

/** Lookup functions grouped by code system */
const LOINC_LOOKUPS: DisplayLookup[] = [
  getDocSectionCodesDisplay,
  getDocumentClasscodesDisplay,
  getFHIRDocumentTypeCodesDisplay,
  getLOINCCodesDisplay,
  getLOINCDiagnosticReportCodesDisplay,
]

const SYSTEM_LOOKUPS: Record<string, DisplayLookup[]> = {
  "http://loinc.org": LOINC_LOOKUPS,
  "http://terminology.hl7.org/CodeSystem/v2-0074": [getDiagnosticServiceSectionsDisplay],
  "http://terminology.hl7.org/CodeSystem/v2-0131": [getPatientContactRelationshipDisplay],
  "urn:ietf:bcp:47": [getLanguagesDisplay],
}

/** All lookups combined for system-agnostic search */
const ALL_LOOKUPS: DisplayLookup[] = [
  ...LOINC_LOOKUPS,
  getDiagnosticServiceSectionsDisplay,
  getLanguagesDisplay,
  getPatientContactRelationshipDisplay,
]

/**
 * Translate a FHIR coded value display into the given language.
 * Returns the translation if found, otherwise undefined.
 */
export function getFhirTranslation(
  code: string,
  lang: string,
  system?: string,
): string | undefined {
  if (lang === "en") return undefined // English is already the canonical display

  const lookups = system && SYSTEM_LOOKUPS[system]
    ? SYSTEM_LOOKUPS[system]
    : ALL_LOOKUPS

  for (const lookup of lookups) {
    const result = lookup(code, lang)
    if (result) return result
  }
  return undefined
}

/**
 * Translate a FHIR coding, falling back to the English display.
 */
export function translateCoding(
  coding: { code?: string; system?: string; display?: string } | undefined,
  lang: string,
): string | undefined {
  if (!coding?.code) return coding?.display
  return getFhirTranslation(coding.code, lang, coding.system) ?? coding.display
}

/**
 * React hook that returns a translateCoding function bound to the current i18n language.
 */
export function useFhirTranslation() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.split("-")[0] ?? "en" // normalize "de-AT" → "de"

  const tc = useCallback(
    (coding: { code?: string; system?: string; display?: string } | undefined) =>
      translateCoding(coding, lang),
    [lang],
  )

  return { translateCoding: tc, lang }
}
