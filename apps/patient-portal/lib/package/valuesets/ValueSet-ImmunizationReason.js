/**
 * ValueSet: immunization-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-reason
 * Size: 2 concepts
 */
export const ImmunizationReasonConcepts = [
    { code: "429060002", system: "http://snomed.info/sct", display: "Procedure to meet occupational requirement (regime/therapy)" },
    { code: "281657000", system: "http://snomed.info/sct", display: "Travel vaccinations" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationReasonCode(code) {
    return ImmunizationReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationReasonConcept(code) {
    return ImmunizationReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationReasonCodes = ImmunizationReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationReasonCode() {
    return ImmunizationReasonCodes[Math.floor(Math.random() * ImmunizationReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationReasonConcept() {
    return ImmunizationReasonConcepts[Math.floor(Math.random() * ImmunizationReasonConcepts.length)];
}
