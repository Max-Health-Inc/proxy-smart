/**
 * ValueSet: allergy-intolerance-criticality
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality
 * Size: 3 concepts
 */
export const AllergyIntoleranceCriticalityConcepts = [
    { code: "low", system: "http://hl7.org/fhir/allergy-intolerance-criticality", display: "Low Risk" },
    { code: "high", system: "http://hl7.org/fhir/allergy-intolerance-criticality", display: "High Risk" },
    { code: "unable-to-assess", system: "http://hl7.org/fhir/allergy-intolerance-criticality", display: "Unable to Assess Risk" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllergyIntoleranceCriticalityCode(code) {
    return AllergyIntoleranceCriticalityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllergyIntoleranceCriticalityConcept(code) {
    return AllergyIntoleranceCriticalityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllergyIntoleranceCriticalityCodes = AllergyIntoleranceCriticalityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllergyIntoleranceCriticalityCode() {
    return AllergyIntoleranceCriticalityCodes[Math.floor(Math.random() * AllergyIntoleranceCriticalityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllergyIntoleranceCriticalityConcept() {
    return AllergyIntoleranceCriticalityConcepts[Math.floor(Math.random() * AllergyIntoleranceCriticalityConcepts.length)];
}
