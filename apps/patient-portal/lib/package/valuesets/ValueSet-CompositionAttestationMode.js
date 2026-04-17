/**
 * ValueSet: composition-attestation-mode
 * URL: http://hl7.org/fhir/ValueSet/composition-attestation-mode
 * Size: 4 concepts
 */
export const CompositionAttestationModeConcepts = [
    { code: "personal", system: "http://hl7.org/fhir/composition-attestation-mode", display: "Personal" },
    { code: "professional", system: "http://hl7.org/fhir/composition-attestation-mode", display: "Professional" },
    { code: "legal", system: "http://hl7.org/fhir/composition-attestation-mode", display: "Legal" },
    { code: "official", system: "http://hl7.org/fhir/composition-attestation-mode", display: "Official" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidCompositionAttestationModeCode(code) {
    return CompositionAttestationModeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getCompositionAttestationModeConcept(code) {
    return CompositionAttestationModeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const CompositionAttestationModeCodes = CompositionAttestationModeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomCompositionAttestationModeCode() {
    return CompositionAttestationModeCodes[Math.floor(Math.random() * CompositionAttestationModeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomCompositionAttestationModeConcept() {
    return CompositionAttestationModeConcepts[Math.floor(Math.random() * CompositionAttestationModeConcepts.length)];
}
