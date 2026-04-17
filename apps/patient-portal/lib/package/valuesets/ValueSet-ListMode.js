/**
 * ValueSet: list-mode
 * URL: http://hl7.org/fhir/ValueSet/list-mode
 * Size: 3 concepts
 */
export const ListModeConcepts = [
    { code: "working", system: "http://hl7.org/fhir/list-mode", display: "Working List" },
    { code: "snapshot", system: "http://hl7.org/fhir/list-mode", display: "Snapshot List" },
    { code: "changes", system: "http://hl7.org/fhir/list-mode", display: "Change List" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidListModeCode(code) {
    return ListModeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getListModeConcept(code) {
    return ListModeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ListModeCodes = ListModeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomListModeCode() {
    return ListModeCodes[Math.floor(Math.random() * ListModeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomListModeConcept() {
    return ListModeConcepts[Math.floor(Math.random() * ListModeConcepts.length)];
}
