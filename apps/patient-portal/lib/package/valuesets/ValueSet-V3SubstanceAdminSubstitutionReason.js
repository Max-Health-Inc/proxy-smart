/**
 * ValueSet: v3.SubstanceAdminSubstitutionReason
 * URL: http://terminology.hl7.org/ValueSet/v3-SubstanceAdminSubstitutionReason
 * Size: 4 concepts
 */
export const V3SubstanceAdminSubstitutionReasonConcepts = [
    { code: "CT", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "continuing therapy" },
    { code: "FP", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "formulary policy" },
    { code: "OS", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "out of stock" },
    { code: "RR", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "regulatory requirement" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidV3SubstanceAdminSubstitutionReasonCode(code) {
    return V3SubstanceAdminSubstitutionReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getV3SubstanceAdminSubstitutionReasonConcept(code) {
    return V3SubstanceAdminSubstitutionReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const V3SubstanceAdminSubstitutionReasonCodes = V3SubstanceAdminSubstitutionReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomV3SubstanceAdminSubstitutionReasonCode() {
    return V3SubstanceAdminSubstitutionReasonCodes[Math.floor(Math.random() * V3SubstanceAdminSubstitutionReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomV3SubstanceAdminSubstitutionReasonConcept() {
    return V3SubstanceAdminSubstitutionReasonConcepts[Math.floor(Math.random() * V3SubstanceAdminSubstitutionReasonConcepts.length)];
}
