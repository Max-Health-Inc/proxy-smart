/**
 * ValueSet: v3-ConfidentialityClassification
 * URL: http://terminology.hl7.org/ValueSet/v3-ConfidentialityClassification
 * Size: 6 concepts
 */
export const V3ConfidentialityClassificationConcepts = [
    { code: "U", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "unrestricted" },
    { code: "L", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "low" },
    { code: "M", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "moderate" },
    { code: "N", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "normal" },
    { code: "R", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "restricted" },
    { code: "V", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "very restricted" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidV3ConfidentialityClassificationCode(code) {
    return V3ConfidentialityClassificationConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getV3ConfidentialityClassificationConcept(code) {
    return V3ConfidentialityClassificationConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const V3ConfidentialityClassificationCodes = V3ConfidentialityClassificationConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomV3ConfidentialityClassificationCode() {
    return V3ConfidentialityClassificationCodes[Math.floor(Math.random() * V3ConfidentialityClassificationCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomV3ConfidentialityClassificationConcept() {
    return V3ConfidentialityClassificationConcepts[Math.floor(Math.random() * V3ConfidentialityClassificationConcepts.length)];
}
