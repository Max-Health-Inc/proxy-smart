/**
 * ValueSet: immunization-funding-source
 * URL: http://hl7.org/fhir/ValueSet/immunization-funding-source
 * Size: 2 concepts
 */
export const ImmunizationFundingSourceConcepts = [
    { code: "private", system: "http://terminology.hl7.org/CodeSystem/immunization-funding-source", display: "Private" },
    { code: "public", system: "http://terminology.hl7.org/CodeSystem/immunization-funding-source", display: "Public" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationFundingSourceCode(code) {
    return ImmunizationFundingSourceConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationFundingSourceConcept(code) {
    return ImmunizationFundingSourceConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationFundingSourceCodes = ImmunizationFundingSourceConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationFundingSourceCode() {
    return ImmunizationFundingSourceCodes[Math.floor(Math.random() * ImmunizationFundingSourceCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationFundingSourceConcept() {
    return ImmunizationFundingSourceConcepts[Math.floor(Math.random() * ImmunizationFundingSourceConcepts.length)];
}
