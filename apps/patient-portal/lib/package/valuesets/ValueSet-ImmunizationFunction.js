/**
 * ValueSet: immunization-function
 * URL: http://hl7.org/fhir/ValueSet/immunization-function
 * Size: 2 concepts
 */
export const ImmunizationFunctionConcepts = [
    { code: "OP", system: "http://terminology.hl7.org/CodeSystem/v2-0443", display: "Ordering Provider" },
    { code: "AP", system: "http://terminology.hl7.org/CodeSystem/v2-0443", display: "Administering Provider" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationFunctionCode(code) {
    return ImmunizationFunctionConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationFunctionConcept(code) {
    return ImmunizationFunctionConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationFunctionCodes = ImmunizationFunctionConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationFunctionCode() {
    return ImmunizationFunctionCodes[Math.floor(Math.random() * ImmunizationFunctionCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationFunctionConcept() {
    return ImmunizationFunctionConcepts[Math.floor(Math.random() * ImmunizationFunctionConcepts.length)];
}
