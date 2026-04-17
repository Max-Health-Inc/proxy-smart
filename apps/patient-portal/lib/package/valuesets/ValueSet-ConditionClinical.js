/**
 * ValueSet: condition-clinical
 * URL: http://hl7.org/fhir/ValueSet/condition-clinical
 * Size: 2 concepts
 */
export const ConditionClinicalConcepts = [
    { code: "active", system: "http://terminology.hl7.org/CodeSystem/condition-clinical", display: "Active" },
    { code: "inactive", system: "http://terminology.hl7.org/CodeSystem/condition-clinical", display: "Inactive" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidConditionClinicalCode(code) {
    return ConditionClinicalConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getConditionClinicalConcept(code) {
    return ConditionClinicalConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ConditionClinicalCodes = ConditionClinicalConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomConditionClinicalCode() {
    return ConditionClinicalCodes[Math.floor(Math.random() * ConditionClinicalCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomConditionClinicalConcept() {
    return ConditionClinicalConcepts[Math.floor(Math.random() * ConditionClinicalConcepts.length)];
}
