/**
 * ValueSet: specimen-status
 * URL: http://hl7.org/fhir/ValueSet/specimen-status
 * Size: 4 concepts
 */
export const SpecimenStatusConcepts = [
    { code: "available", system: "http://hl7.org/fhir/specimen-status", display: "Available" },
    { code: "unavailable", system: "http://hl7.org/fhir/specimen-status", display: "Unavailable" },
    { code: "unsatisfactory", system: "http://hl7.org/fhir/specimen-status", display: "Unsatisfactory" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/specimen-status", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSpecimenStatusCode(code) {
    return SpecimenStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSpecimenStatusConcept(code) {
    return SpecimenStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SpecimenStatusCodes = SpecimenStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSpecimenStatusCode() {
    return SpecimenStatusCodes[Math.floor(Math.random() * SpecimenStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSpecimenStatusConcept() {
    return SpecimenStatusConcepts[Math.floor(Math.random() * SpecimenStatusConcepts.length)];
}
