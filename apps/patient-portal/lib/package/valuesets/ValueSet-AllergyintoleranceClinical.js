/**
 * ValueSet: allergyintolerance-clinical
 * URL: http://hl7.org/fhir/ValueSet/allergyintolerance-clinical
 * Size: 2 concepts
 */
export const AllergyintoleranceClinicalConcepts = [
    { code: "active", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", display: "Active" },
    { code: "inactive", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", display: "Inactive" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllergyintoleranceClinicalCode(code) {
    return AllergyintoleranceClinicalConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllergyintoleranceClinicalConcept(code) {
    return AllergyintoleranceClinicalConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllergyintoleranceClinicalCodes = AllergyintoleranceClinicalConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllergyintoleranceClinicalCode() {
    return AllergyintoleranceClinicalCodes[Math.floor(Math.random() * AllergyintoleranceClinicalCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllergyintoleranceClinicalConcept() {
    return AllergyintoleranceClinicalConcepts[Math.floor(Math.random() * AllergyintoleranceClinicalConcepts.length)];
}
