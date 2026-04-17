/**
 * ValueSet: allergy-intolerance-category
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-category
 * Size: 4 concepts
 */
export const AllergyIntoleranceCategoryConcepts = [
    { code: "food", system: "http://hl7.org/fhir/allergy-intolerance-category", display: "Food" },
    { code: "medication", system: "http://hl7.org/fhir/allergy-intolerance-category", display: "Medication" },
    { code: "environment", system: "http://hl7.org/fhir/allergy-intolerance-category", display: "Environment" },
    { code: "biologic", system: "http://hl7.org/fhir/allergy-intolerance-category", display: "Biologic" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllergyIntoleranceCategoryCode(code) {
    return AllergyIntoleranceCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllergyIntoleranceCategoryConcept(code) {
    return AllergyIntoleranceCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllergyIntoleranceCategoryCodes = AllergyIntoleranceCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllergyIntoleranceCategoryCode() {
    return AllergyIntoleranceCategoryCodes[Math.floor(Math.random() * AllergyIntoleranceCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllergyIntoleranceCategoryConcept() {
    return AllergyIntoleranceCategoryConcepts[Math.floor(Math.random() * AllergyIntoleranceCategoryConcepts.length)];
}
