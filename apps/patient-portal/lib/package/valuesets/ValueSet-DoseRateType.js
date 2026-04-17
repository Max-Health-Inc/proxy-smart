/**
 * ValueSet: dose-rate-type
 * URL: http://hl7.org/fhir/ValueSet/dose-rate-type
 * Size: 2 concepts
 */
export const DoseRateTypeConcepts = [
    { code: "calculated", system: "http://terminology.hl7.org/CodeSystem/dose-rate-type", display: "Calculated" },
    { code: "ordered", system: "http://terminology.hl7.org/CodeSystem/dose-rate-type", display: "Ordered" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDoseRateTypeCode(code) {
    return DoseRateTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDoseRateTypeConcept(code) {
    return DoseRateTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DoseRateTypeCodes = DoseRateTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDoseRateTypeCode() {
    return DoseRateTypeCodes[Math.floor(Math.random() * DoseRateTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDoseRateTypeConcept() {
    return DoseRateTypeConcepts[Math.floor(Math.random() * DoseRateTypeConcepts.length)];
}
