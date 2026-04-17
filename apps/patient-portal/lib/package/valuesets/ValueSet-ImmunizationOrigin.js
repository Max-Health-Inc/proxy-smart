/**
 * ValueSet: immunization-origin
 * URL: http://hl7.org/fhir/ValueSet/immunization-origin
 * Size: 4 concepts
 */
export const ImmunizationOriginConcepts = [
    { code: "provider", system: "http://terminology.hl7.org/CodeSystem/immunization-origin", display: "Other Provider" },
    { code: "record", system: "http://terminology.hl7.org/CodeSystem/immunization-origin", display: "Written Record" },
    { code: "recall", system: "http://terminology.hl7.org/CodeSystem/immunization-origin", display: "Parent/Guardian/Patient Recall" },
    { code: "school", system: "http://terminology.hl7.org/CodeSystem/immunization-origin", display: "School Record" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationOriginCode(code) {
    return ImmunizationOriginConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationOriginConcept(code) {
    return ImmunizationOriginConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationOriginCodes = ImmunizationOriginConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationOriginCode() {
    return ImmunizationOriginCodes[Math.floor(Math.random() * ImmunizationOriginCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationOriginConcept() {
    return ImmunizationOriginConcepts[Math.floor(Math.random() * ImmunizationOriginConcepts.length)];
}
