/**
 * ValueSet: SNOMEDCTFormCodes
 * URL: http://hl7.org/fhir/ValueSet/medication-form-codes
 * Size: 1 concepts
 */
export const SNOMEDCTFormCodesConcepts = [
    { code: "421967003", system: "http://snomed.info/sct", display: "Drug dose form (product)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSNOMEDCTFormCodesCode(code) {
    return SNOMEDCTFormCodesConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSNOMEDCTFormCodesConcept(code) {
    return SNOMEDCTFormCodesConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SNOMEDCTFormCodesCodes = SNOMEDCTFormCodesConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSNOMEDCTFormCodesCode() {
    return SNOMEDCTFormCodesCodes[Math.floor(Math.random() * SNOMEDCTFormCodesCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSNOMEDCTFormCodesConcept() {
    return SNOMEDCTFormCodesConcepts[Math.floor(Math.random() * SNOMEDCTFormCodesConcepts.length)];
}
