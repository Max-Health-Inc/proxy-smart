/**
 * ValueSet: flag-status
 * URL: http://hl7.org/fhir/ValueSet/flag-status
 * Size: 3 concepts
 */
export const FlagStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/flag-status", display: "Active" },
    { code: "inactive", system: "http://hl7.org/fhir/flag-status", display: "Inactive" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/flag-status", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidFlagStatusCode(code) {
    return FlagStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getFlagStatusConcept(code) {
    return FlagStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const FlagStatusCodes = FlagStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomFlagStatusCode() {
    return FlagStatusCodes[Math.floor(Math.random() * FlagStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomFlagStatusConcept() {
    return FlagStatusConcepts[Math.floor(Math.random() * FlagStatusConcepts.length)];
}
