/**
 * ValueSet: common-tags
 * URL: http://hl7.org/fhir/ValueSet/common-tags
 * Size: 1 concepts
 */
export const CommonTagsConcepts = [
    { code: "actionable", system: "http://terminology.hl7.org/CodeSystem/common-tags", display: "Actionable" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidCommonTagsCode(code) {
    return CommonTagsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getCommonTagsConcept(code) {
    return CommonTagsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const CommonTagsCodes = CommonTagsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomCommonTagsCode() {
    return CommonTagsCodes[Math.floor(Math.random() * CommonTagsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomCommonTagsConcept() {
    return CommonTagsConcepts[Math.floor(Math.random() * CommonTagsConcepts.length)];
}
