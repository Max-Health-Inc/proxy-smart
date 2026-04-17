/**
 * ValueSet: list-empty-reason
 * URL: http://hl7.org/fhir/ValueSet/list-empty-reason
 * Size: 6 concepts
 */
export const ListEmptyReasonConcepts = [
    { code: "nilknown", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Nil Known" },
    { code: "notasked", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Not Asked" },
    { code: "withheld", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Information Withheld" },
    { code: "unavailable", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Unavailable" },
    { code: "notstarted", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Not Started" },
    { code: "closed", system: "http://terminology.hl7.org/CodeSystem/list-empty-reason", display: "Closed" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidListEmptyReasonCode(code) {
    return ListEmptyReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getListEmptyReasonConcept(code) {
    return ListEmptyReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ListEmptyReasonCodes = ListEmptyReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomListEmptyReasonCode() {
    return ListEmptyReasonCodes[Math.floor(Math.random() * ListEmptyReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomListEmptyReasonConcept() {
    return ListEmptyReasonConcepts[Math.floor(Math.random() * ListEmptyReasonConcepts.length)];
}
