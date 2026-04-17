/**
 * ValueSet: condition-severity
 * URL: http://hl7.org/fhir/ValueSet/condition-severity
 * Size: 3 concepts
 */
export const ConditionSeverityConcepts = [
    { code: "24484000", system: "http://snomed.info/sct", display: "Severe" },
    { code: "6736007", system: "http://snomed.info/sct", display: "Moderate" },
    { code: "255604002", system: "http://snomed.info/sct", display: "Mild" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidConditionSeverityCode(code) {
    return ConditionSeverityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getConditionSeverityConcept(code) {
    return ConditionSeverityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ConditionSeverityCodes = ConditionSeverityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomConditionSeverityCode() {
    return ConditionSeverityCodes[Math.floor(Math.random() * ConditionSeverityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomConditionSeverityConcept() {
    return ConditionSeverityConcepts[Math.floor(Math.random() * ConditionSeverityConcepts.length)];
}
