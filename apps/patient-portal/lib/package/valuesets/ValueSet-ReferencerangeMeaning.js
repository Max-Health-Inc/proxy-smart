/**
 * ValueSet: referencerange-meaning
 * URL: http://hl7.org/fhir/ValueSet/referencerange-meaning
 * Size: 2 concepts
 */
export const ReferencerangeMeaningConcepts = [
    { code: "type", system: "http://terminology.hl7.org/CodeSystem/referencerange-meaning", display: "Type" },
    { code: "endocrine", system: "http://terminology.hl7.org/CodeSystem/referencerange-meaning", display: "Endocrine" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidReferencerangeMeaningCode(code) {
    return ReferencerangeMeaningConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getReferencerangeMeaningConcept(code) {
    return ReferencerangeMeaningConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ReferencerangeMeaningCodes = ReferencerangeMeaningConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomReferencerangeMeaningCode() {
    return ReferencerangeMeaningCodes[Math.floor(Math.random() * ReferencerangeMeaningCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomReferencerangeMeaningConcept() {
    return ReferencerangeMeaningConcepts[Math.floor(Math.random() * ReferencerangeMeaningConcepts.length)];
}
