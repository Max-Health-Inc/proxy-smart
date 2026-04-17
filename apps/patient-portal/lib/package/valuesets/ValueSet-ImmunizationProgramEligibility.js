/**
 * ValueSet: immunization-program-eligibility
 * URL: http://hl7.org/fhir/ValueSet/immunization-program-eligibility
 * Size: 2 concepts
 */
export const ImmunizationProgramEligibilityConcepts = [
    { code: "ineligible", system: "http://terminology.hl7.org/CodeSystem/immunization-program-eligibility", display: "Not Eligible" },
    { code: "uninsured", system: "http://terminology.hl7.org/CodeSystem/immunization-program-eligibility", display: "Uninsured" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationProgramEligibilityCode(code) {
    return ImmunizationProgramEligibilityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationProgramEligibilityConcept(code) {
    return ImmunizationProgramEligibilityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationProgramEligibilityCodes = ImmunizationProgramEligibilityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationProgramEligibilityCode() {
    return ImmunizationProgramEligibilityCodes[Math.floor(Math.random() * ImmunizationProgramEligibilityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationProgramEligibilityConcept() {
    return ImmunizationProgramEligibilityConcepts[Math.floor(Math.random() * ImmunizationProgramEligibilityConcepts.length)];
}
