/**
 * ValueSet: observation-status
 * URL: http://hl7.org/fhir/ValueSet/observation-status
 * Size: 7 concepts
 */
export const ObservationStatusConcepts = [
    { code: "registered", system: "http://hl7.org/fhir/observation-status", display: "Registered" },
    { code: "preliminary", system: "http://hl7.org/fhir/observation-status", display: "Preliminary" },
    { code: "final", system: "http://hl7.org/fhir/observation-status", display: "Final" },
    { code: "amended", system: "http://hl7.org/fhir/observation-status", display: "Amended" },
    { code: "cancelled", system: "http://hl7.org/fhir/observation-status", display: "Cancelled" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/observation-status", display: "Entered in Error" },
    { code: "unknown", system: "http://hl7.org/fhir/observation-status", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidObservationStatusCode(code) {
    return ObservationStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getObservationStatusConcept(code) {
    return ObservationStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ObservationStatusCodes = ObservationStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomObservationStatusCode() {
    return ObservationStatusCodes[Math.floor(Math.random() * ObservationStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomObservationStatusConcept() {
    return ObservationStatusConcepts[Math.floor(Math.random() * ObservationStatusConcepts.length)];
}
