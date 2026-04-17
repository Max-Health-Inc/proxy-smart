/**
 * ValueSet: immunization-subpotent-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-subpotent-reason
 * Size: 3 concepts
 */
export declare const ImmunizationSubpotentReasonConcepts: readonly [{
    readonly code: "partial";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason";
    readonly display: "Partial Dose";
}, {
    readonly code: "coldchainbreak";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason";
    readonly display: "Cold Chain Break";
}, {
    readonly code: "recall";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-subpotent-reason";
    readonly display: "Manufacturer Recall";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationSubpotentReasonCode = "partial" | "coldchainbreak" | "recall";
/** Type representing a concept from this ValueSet */
export type ImmunizationSubpotentReasonConcept = typeof ImmunizationSubpotentReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationSubpotentReasonCode(code: string): code is ImmunizationSubpotentReasonCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationSubpotentReasonConcept(code: string): ImmunizationSubpotentReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationSubpotentReasonCodes: ("partial" | "recall" | "coldchainbreak")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationSubpotentReasonCode(): ImmunizationSubpotentReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationSubpotentReasonConcept(): ImmunizationSubpotentReasonConcept;
