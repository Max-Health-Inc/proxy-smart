/**
 * ValueSet: procedure-outcome
 * URL: http://hl7.org/fhir/ValueSet/procedure-outcome
 * Size: 3 concepts
 */
export const ProcedureOutcomeConcepts = [
    { code: "385669000", system: "http://snomed.info/sct", display: "Successful (qualifier value)" },
    { code: "385671000", system: "http://snomed.info/sct", display: "Unsuccessful (qualifier value)" },
    { code: "385670004", system: "http://snomed.info/sct", display: "Partially successful (qualifier value)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidProcedureOutcomeCode(code) {
    return ProcedureOutcomeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getProcedureOutcomeConcept(code) {
    return ProcedureOutcomeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ProcedureOutcomeCodes = ProcedureOutcomeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomProcedureOutcomeCode() {
    return ProcedureOutcomeCodes[Math.floor(Math.random() * ProcedureOutcomeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomProcedureOutcomeConcept() {
    return ProcedureOutcomeConcepts[Math.floor(Math.random() * ProcedureOutcomeConcepts.length)];
}
