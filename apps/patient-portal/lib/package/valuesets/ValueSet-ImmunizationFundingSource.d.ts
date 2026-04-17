/**
 * ValueSet: immunization-funding-source
 * URL: http://hl7.org/fhir/ValueSet/immunization-funding-source
 * Size: 2 concepts
 */
export declare const ImmunizationFundingSourceConcepts: readonly [{
    readonly code: "private";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-funding-source";
    readonly display: "Private";
}, {
    readonly code: "public";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-funding-source";
    readonly display: "Public";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationFundingSourceCode = "private" | "public";
/** Type representing a concept from this ValueSet */
export type ImmunizationFundingSourceConcept = typeof ImmunizationFundingSourceConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationFundingSourceCode(code: string): code is ImmunizationFundingSourceCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationFundingSourceConcept(code: string): ImmunizationFundingSourceConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationFundingSourceCodes: ("private" | "public")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationFundingSourceCode(): ImmunizationFundingSourceCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationFundingSourceConcept(): ImmunizationFundingSourceConcept;
