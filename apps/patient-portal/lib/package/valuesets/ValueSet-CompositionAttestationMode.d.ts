/**
 * ValueSet: composition-attestation-mode
 * URL: http://hl7.org/fhir/ValueSet/composition-attestation-mode
 * Size: 4 concepts
 */
export declare const CompositionAttestationModeConcepts: readonly [{
    readonly code: "personal";
    readonly system: "http://hl7.org/fhir/composition-attestation-mode";
    readonly display: "Personal";
}, {
    readonly code: "professional";
    readonly system: "http://hl7.org/fhir/composition-attestation-mode";
    readonly display: "Professional";
}, {
    readonly code: "legal";
    readonly system: "http://hl7.org/fhir/composition-attestation-mode";
    readonly display: "Legal";
}, {
    readonly code: "official";
    readonly system: "http://hl7.org/fhir/composition-attestation-mode";
    readonly display: "Official";
}];
/** Union type of all valid codes in this ValueSet */
export type CompositionAttestationModeCode = "personal" | "professional" | "legal" | "official";
/** Type representing a concept from this ValueSet */
export type CompositionAttestationModeConcept = typeof CompositionAttestationModeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidCompositionAttestationModeCode(code: string): code is CompositionAttestationModeCode;
/**
 * Get concept details by code
 */
export declare function getCompositionAttestationModeConcept(code: string): CompositionAttestationModeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const CompositionAttestationModeCodes: ("professional" | "personal" | "legal" | "official")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomCompositionAttestationModeCode(): CompositionAttestationModeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomCompositionAttestationModeConcept(): CompositionAttestationModeConcept;
