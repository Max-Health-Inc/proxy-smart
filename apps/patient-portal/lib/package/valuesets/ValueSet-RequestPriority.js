/**
 * ValueSet: request-priority
 * URL: http://hl7.org/fhir/ValueSet/request-priority
 * Size: 4 concepts
 */
export const RequestPriorityConcepts = [
    { code: "routine", system: "http://hl7.org/fhir/request-priority", display: "Routine" },
    { code: "urgent", system: "http://hl7.org/fhir/request-priority", display: "Urgent" },
    { code: "asap", system: "http://hl7.org/fhir/request-priority", display: "ASAP" },
    { code: "stat", system: "http://hl7.org/fhir/request-priority", display: "STAT" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidRequestPriorityCode(code) {
    return RequestPriorityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getRequestPriorityConcept(code) {
    return RequestPriorityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const RequestPriorityCodes = RequestPriorityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomRequestPriorityCode() {
    return RequestPriorityCodes[Math.floor(Math.random() * RequestPriorityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomRequestPriorityConcept() {
    return RequestPriorityConcepts[Math.floor(Math.random() * RequestPriorityConcepts.length)];
}
