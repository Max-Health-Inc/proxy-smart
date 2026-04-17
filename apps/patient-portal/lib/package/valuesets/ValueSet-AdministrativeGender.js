/**
 * ValueSet: administrative-gender
 * URL: http://hl7.org/fhir/ValueSet/administrative-gender
 * Size: 4 concepts
 */
export const AdministrativeGenderConcepts = [
    { code: "male", system: "http://hl7.org/fhir/administrative-gender", display: "Male" },
    { code: "female", system: "http://hl7.org/fhir/administrative-gender", display: "Female" },
    { code: "other", system: "http://hl7.org/fhir/administrative-gender", display: "Other" },
    { code: "unknown", system: "http://hl7.org/fhir/administrative-gender", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAdministrativeGenderCode(code) {
    return AdministrativeGenderConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAdministrativeGenderConcept(code) {
    return AdministrativeGenderConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AdministrativeGenderCodes = AdministrativeGenderConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAdministrativeGenderCode() {
    return AdministrativeGenderCodes[Math.floor(Math.random() * AdministrativeGenderCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAdministrativeGenderConcept() {
    return AdministrativeGenderConcepts[Math.floor(Math.random() * AdministrativeGenderConcepts.length)];
}
