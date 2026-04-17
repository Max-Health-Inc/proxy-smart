/**
 * ValueSet: marital-status
 * URL: http://hl7.org/fhir/ValueSet/marital-status
 * Size: 11 concepts
 */
export const MaritalStatusConcepts = [
    { code: "A", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Annulled" },
    { code: "D", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Divorced" },
    { code: "I", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Interlocutory" },
    { code: "L", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Legally Separated" },
    { code: "M", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Married" },
    { code: "P", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Polygamous" },
    { code: "S", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Never Married" },
    { code: "T", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Domestic partner" },
    { code: "U", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "unmarried" },
    { code: "W", system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", display: "Widowed" },
    { code: "UNK", system: "http://terminology.hl7.org/CodeSystem/v3-NullFlavor", display: "unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMaritalStatusCode(code) {
    return MaritalStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMaritalStatusConcept(code) {
    return MaritalStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MaritalStatusCodes = MaritalStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMaritalStatusCode() {
    return MaritalStatusCodes[Math.floor(Math.random() * MaritalStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMaritalStatusConcept() {
    return MaritalStatusConcepts[Math.floor(Math.random() * MaritalStatusConcepts.length)];
}
