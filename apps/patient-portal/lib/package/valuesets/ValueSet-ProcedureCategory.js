/**
 * ValueSet: procedure-category
 * URL: http://hl7.org/fhir/ValueSet/procedure-category
 * Size: 7 concepts
 */
export const ProcedureCategoryConcepts = [
    { code: "24642003", system: "http://snomed.info/sct", display: "Psychiatry procedure or service" },
    { code: "409063005", system: "http://snomed.info/sct", display: "Counseling (regime/therapy)" },
    { code: "409073007", system: "http://snomed.info/sct", display: "Education (regime/therapy)" },
    { code: "387713003", system: "http://snomed.info/sct", display: "Surgical procedure (procedure)" },
    { code: "103693007", system: "http://snomed.info/sct", display: "Diagnostic procedure" },
    { code: "46947000", system: "http://snomed.info/sct", display: "Chiropractic manipulation" },
    { code: "410606002", system: "http://snomed.info/sct", display: "Social service procedure (procedure)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidProcedureCategoryCode(code) {
    return ProcedureCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getProcedureCategoryConcept(code) {
    return ProcedureCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ProcedureCategoryCodes = ProcedureCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomProcedureCategoryCode() {
    return ProcedureCategoryCodes[Math.floor(Math.random() * ProcedureCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomProcedureCategoryConcept() {
    return ProcedureCategoryConcepts[Math.floor(Math.random() * ProcedureCategoryConcepts.length)];
}
