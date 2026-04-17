/**
 * ValueSet: composition-status
 * URL: http://hl7.org/fhir/ValueSet/composition-status
 * Size: 4 concepts
 */
export const CompositionStatusConcepts = [
    { code: "preliminary", system: "http://hl7.org/fhir/composition-status", display: "Preliminary" },
    { code: "final", system: "http://hl7.org/fhir/composition-status", display: "Final" },
    { code: "amended", system: "http://hl7.org/fhir/composition-status", display: "Amended" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/composition-status", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidCompositionStatusCode(code) {
    return CompositionStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getCompositionStatusConcept(code) {
    return CompositionStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const CompositionStatusCodes = CompositionStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomCompositionStatusCode() {
    return CompositionStatusCodes[Math.floor(Math.random() * CompositionStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomCompositionStatusConcept() {
    return CompositionStatusConcepts[Math.floor(Math.random() * CompositionStatusConcepts.length)];
}
