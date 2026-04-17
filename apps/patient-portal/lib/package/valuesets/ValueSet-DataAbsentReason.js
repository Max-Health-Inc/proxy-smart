/**
 * ValueSet: data-absent-reason
 * URL: http://hl7.org/fhir/ValueSet/data-absent-reason
 * Size: 8 concepts
 */
export const DataAbsentReasonConcepts = [
    { code: "unknown", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Unknown" },
    { code: "masked", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Masked" },
    { code: "not-applicable", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Not Applicable" },
    { code: "unsupported", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Unsupported" },
    { code: "as-text", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "As Text" },
    { code: "error", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Error" },
    { code: "not-performed", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Not Performed" },
    { code: "not-permitted", system: "http://terminology.hl7.org/CodeSystem/data-absent-reason", display: "Not Permitted" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDataAbsentReasonCode(code) {
    return DataAbsentReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDataAbsentReasonConcept(code) {
    return DataAbsentReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DataAbsentReasonCodes = DataAbsentReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDataAbsentReasonCode() {
    return DataAbsentReasonCodes[Math.floor(Math.random() * DataAbsentReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDataAbsentReasonConcept() {
    return DataAbsentReasonConcepts[Math.floor(Math.random() * DataAbsentReasonConcepts.length)];
}
