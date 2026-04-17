/**
 * ValueSet: allergyintolerance-verification
 * URL: http://hl7.org/fhir/ValueSet/allergyintolerance-verification
 * Size: 4 concepts
 */
export const AllergyintoleranceVerificationConcepts = [
    { code: "unconfirmed", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", display: "Unconfirmed" },
    { code: "confirmed", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", display: "Confirmed" },
    { code: "refuted", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", display: "Refuted" },
    { code: "entered-in-error", system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllergyintoleranceVerificationCode(code) {
    return AllergyintoleranceVerificationConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllergyintoleranceVerificationConcept(code) {
    return AllergyintoleranceVerificationConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllergyintoleranceVerificationCodes = AllergyintoleranceVerificationConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllergyintoleranceVerificationCode() {
    return AllergyintoleranceVerificationCodes[Math.floor(Math.random() * AllergyintoleranceVerificationCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllergyintoleranceVerificationConcept() {
    return AllergyintoleranceVerificationConcepts[Math.floor(Math.random() * AllergyintoleranceVerificationConcepts.length)];
}
