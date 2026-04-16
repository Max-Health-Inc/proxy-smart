/**
 * DTR Questionnaire Extension Helpers
 *
 * Extracts SDC/DTR extensions from DTRStdQuestionnaireItem.extension[]
 * using the standard FHIR extension URLs defined in the Da Vinci DTR IG.
 */
import type { Extension, QuestionnaireItem } from "fhir/r4"

// ── Extension URL constants ──────────────────────────────────────────────────

const EXT_HIDDEN = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden"
const EXT_ITEM_CONTROL = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
const EXT_COLLAPSIBLE = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible"
const EXT_DISPLAY_CATEGORY = "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory"
const EXT_ENTRY_FORMAT = "http://hl7.org/fhir/StructureDefinition/entryFormat"
const EXT_CHOICE_ORIENTATION = "http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation"
const EXT_MIN_VALUE = "http://hl7.org/fhir/StructureDefinition/minValue"
const EXT_MAX_VALUE = "http://hl7.org/fhir/StructureDefinition/maxValue"
const EXT_MIN_LENGTH = "http://hl7.org/fhir/StructureDefinition/minLength"
const EXT_MAX_DECIMAL_PLACES = "http://hl7.org/fhir/StructureDefinition/maxDecimalPlaces"
const EXT_SLIDER_STEP = "http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue"
const EXT_SHORT_TEXT = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText"
const EXT_SUPPORT_LINK = "http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink"
const EXT_UNIT = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"

// ── Helpers ──────────────────────────────────────────────────────────────────

function findExt(item: QuestionnaireItem, url: string): Extension | undefined {
  return item.extension?.find(e => e.url === url)
}

function findAllExt(item: QuestionnaireItem, url: string): Extension[] {
  return item.extension?.filter(e => e.url === url) ?? []
}

/** Whether the item is marked as hidden */
export function isHidden(item: QuestionnaireItem): boolean {
  return findExt(item, EXT_HIDDEN)?.valueBoolean === true
}

/** Item control code (e.g. "radio-button", "check-box", "drop-down", "slider", "autocomplete") */
export function getItemControl(item: QuestionnaireItem): string | undefined {
  return findExt(item, EXT_ITEM_CONTROL)?.valueCodeableConcept?.coding?.[0]?.code
}

/** Whether this group is collapsible, and if so whether default-open or default-closed */
export function getCollapsible(item: QuestionnaireItem): "default-open" | "default-closed" | undefined {
  const ext = findExt(item, EXT_COLLAPSIBLE)
  return ext?.valueCode as "default-open" | "default-closed" | undefined
}

/** Display category: "instructions", "security", "help" */
export function getDisplayCategory(item: QuestionnaireItem): string | undefined {
  return findExt(item, EXT_DISPLAY_CATEGORY)?.valueCodeableConcept?.coding?.[0]?.code
}

/** Entry format hint (e.g. "MM/DD/YYYY", "NNN-NN-NNNN") */
export function getEntryFormat(item: QuestionnaireItem): string | undefined {
  return findExt(item, EXT_ENTRY_FORMAT)?.valueString
}

/** Choice orientation: "horizontal" or "vertical" */
export function getChoiceOrientation(item: QuestionnaireItem): "horizontal" | "vertical" | undefined {
  return findExt(item, EXT_CHOICE_ORIENTATION)?.valueCode as "horizontal" | "vertical" | undefined
}

/** Minimum value for numeric items */
export function getMinValue(item: QuestionnaireItem): number | undefined {
  const ext = findExt(item, EXT_MIN_VALUE)
  return ext?.valueInteger ?? ext?.valueDecimal
}

/** Maximum value for numeric items */
export function getMaxValue(item: QuestionnaireItem): number | undefined {
  const ext = findExt(item, EXT_MAX_VALUE)
  return ext?.valueInteger ?? ext?.valueDecimal
}

/** Minimum length for string/text items */
export function getMinLength(item: QuestionnaireItem): number | undefined {
  return findExt(item, EXT_MIN_LENGTH)?.valueInteger
}

/** Maximum decimal places for decimal items */
export function getMaxDecimalPlaces(item: QuestionnaireItem): number | undefined {
  return findExt(item, EXT_MAX_DECIMAL_PLACES)?.valueInteger
}

/** Slider step value */
export function getSliderStep(item: QuestionnaireItem): number | undefined {
  return findExt(item, EXT_SLIDER_STEP)?.valueInteger
}

/** Short text alternative for the item (for compact display) */
export function getShortText(item: QuestionnaireItem): string | undefined {
  return findExt(item, EXT_SHORT_TEXT)?.valueString
}

/** Support links (URLs to documentation/help) */
export function getSupportLinks(item: QuestionnaireItem): string[] {
  return findAllExt(item, EXT_SUPPORT_LINK)
    .map(e => e.valueUri)
    .filter((v): v is string => !!v)
}

/** Unit for numeric items (e.g. "mg", "mL") */
export function getUnit(item: QuestionnaireItem): { code?: string; display?: string } | undefined {
  const ext = findExt(item, EXT_UNIT)
  if (!ext?.valueCoding) return undefined
  return { code: ext.valueCoding.code, display: ext.valueCoding.display }
}

/** Extract all rendering-relevant metadata from an item at once */
export function getItemExtensions(item: QuestionnaireItem) {
  return {
    hidden: isHidden(item),
    itemControl: getItemControl(item),
    collapsible: getCollapsible(item),
    displayCategory: getDisplayCategory(item),
    entryFormat: getEntryFormat(item),
    choiceOrientation: getChoiceOrientation(item),
    minValue: getMinValue(item),
    maxValue: getMaxValue(item),
    minLength: getMinLength(item),
    maxDecimalPlaces: getMaxDecimalPlaces(item),
    sliderStep: getSliderStep(item),
    shortText: getShortText(item),
    supportLinks: getSupportLinks(item),
    unit: getUnit(item),
  }
}

export type ItemExtensions = ReturnType<typeof getItemExtensions>
