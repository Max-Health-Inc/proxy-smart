/**
 * ValueSet: v3.SubstanceAdminSubstitutionReason
 * URL: http://terminology.hl7.org/ValueSet/v3-SubstanceAdminSubstitutionReason
 * Size: 4 concepts
 */
export declare const V3SubstanceAdminSubstitutionReasonConcepts: readonly [{
    readonly code: "CT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "continuing therapy";
}, {
    readonly code: "FP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "formulary policy";
}, {
    readonly code: "OS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "out of stock";
}, {
    readonly code: "RR";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "regulatory requirement";
}];
/** Union type of all valid codes in this ValueSet */
export type V3SubstanceAdminSubstitutionReasonCode = "CT" | "FP" | "OS" | "RR";
/** Type representing a concept from this ValueSet */
export type V3SubstanceAdminSubstitutionReasonConcept = typeof V3SubstanceAdminSubstitutionReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidV3SubstanceAdminSubstitutionReasonCode(code: string): code is V3SubstanceAdminSubstitutionReasonCode;
/**
 * Get concept details by code
 */
export declare function getV3SubstanceAdminSubstitutionReasonConcept(code: string): V3SubstanceAdminSubstitutionReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const V3SubstanceAdminSubstitutionReasonCodes: ("FP" | "CT" | "RR" | "OS")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomV3SubstanceAdminSubstitutionReasonCode(): V3SubstanceAdminSubstitutionReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomV3SubstanceAdminSubstitutionReasonConcept(): V3SubstanceAdminSubstitutionReasonConcept;
