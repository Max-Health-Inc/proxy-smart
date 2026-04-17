/**
 * ValueSet: immunization-subpotent-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-subpotent-reason
 * Size: 3 concepts
 */
export const ImmunizationSubpotentReasonConcepts = [
    { code: "partial", system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason", display: "Partial Dose" },
    { code: "coldchainbreak", system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason", display: "Cold Chain Break" },
    { code: "recall", system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason", display: "Manufacturer Recall" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationSubpotentReasonCode(code) {
    return ImmunizationSubpotentReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationSubpotentReasonConcept(code) {
    return ImmunizationSubpotentReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationSubpotentReasonCodes = ImmunizationSubpotentReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationSubpotentReasonCode() {
    return ImmunizationSubpotentReasonCodes[Math.floor(Math.random() * ImmunizationSubpotentReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationSubpotentReasonConcept() {
    return ImmunizationSubpotentReasonConcepts[Math.floor(Math.random() * ImmunizationSubpotentReasonConcepts.length)];
}
