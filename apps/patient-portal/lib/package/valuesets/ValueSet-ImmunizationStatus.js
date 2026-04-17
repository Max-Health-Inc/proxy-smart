/**
 * ValueSet: immunization-status
 * URL: http://hl7.org/fhir/ValueSet/immunization-status
 * Size: 3 concepts
 */
export const ImmunizationStatusConcepts = [
    { code: "completed", system: "http://hl7.org/fhir/event-status", display: "Completed" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/event-status", display: "Entered in Error" },
    { code: "not-done", system: "http://hl7.org/fhir/event-status", display: "Not Done" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationStatusCode(code) {
    return ImmunizationStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationStatusConcept(code) {
    return ImmunizationStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationStatusCodes = ImmunizationStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationStatusCode() {
    return ImmunizationStatusCodes[Math.floor(Math.random() * ImmunizationStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationStatusConcept() {
    return ImmunizationStatusConcepts[Math.floor(Math.random() * ImmunizationStatusConcepts.length)];
}
