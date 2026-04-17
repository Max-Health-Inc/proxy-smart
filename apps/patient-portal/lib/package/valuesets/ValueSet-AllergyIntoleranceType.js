/**
 * ValueSet: allergy-intolerance-type
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-type
 * Size: 2 concepts
 */
export const AllergyIntoleranceTypeConcepts = [
    { code: "allergy", system: "http://hl7.org/fhir/allergy-intolerance-type", display: "Allergy" },
    { code: "intolerance", system: "http://hl7.org/fhir/allergy-intolerance-type", display: "Intolerance" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllergyIntoleranceTypeCode(code) {
    return AllergyIntoleranceTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllergyIntoleranceTypeConcept(code) {
    return AllergyIntoleranceTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllergyIntoleranceTypeCodes = AllergyIntoleranceTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllergyIntoleranceTypeCode() {
    return AllergyIntoleranceTypeCodes[Math.floor(Math.random() * AllergyIntoleranceTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllergyIntoleranceTypeConcept() {
    return AllergyIntoleranceTypeConcepts[Math.floor(Math.random() * AllergyIntoleranceTypeConcepts.length)];
}
