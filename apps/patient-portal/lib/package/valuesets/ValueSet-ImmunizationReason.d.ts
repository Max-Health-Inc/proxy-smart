/**
 * ValueSet: immunization-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-reason
 * Size: 2 concepts
 */
export declare const ImmunizationReasonConcepts: readonly [{
    readonly code: "429060002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Procedure to meet occupational requirement (regime/therapy)";
}, {
    readonly code: "281657000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Travel vaccinations";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationReasonCode = "429060002" | "281657000";
/** Type representing a concept from this ValueSet */
export type ImmunizationReasonConcept = typeof ImmunizationReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationReasonCode(code: string): code is ImmunizationReasonCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationReasonConcept(code: string): ImmunizationReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationReasonCodes: ("429060002" | "281657000")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationReasonCode(): ImmunizationReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationReasonConcept(): ImmunizationReasonConcept;
