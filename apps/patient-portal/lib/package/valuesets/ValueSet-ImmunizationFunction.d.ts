/**
 * ValueSet: immunization-function
 * URL: http://hl7.org/fhir/ValueSet/immunization-function
 * Size: 2 concepts
 */
export declare const ImmunizationFunctionConcepts: readonly [{
    readonly code: "OP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0443";
    readonly display: "Ordering Provider";
}, {
    readonly code: "AP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0443";
    readonly display: "Administering Provider";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationFunctionCode = "OP" | "AP";
/** Type representing a concept from this ValueSet */
export type ImmunizationFunctionConcept = typeof ImmunizationFunctionConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationFunctionCode(code: string): code is ImmunizationFunctionCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationFunctionConcept(code: string): ImmunizationFunctionConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationFunctionCodes: ("OP" | "AP")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationFunctionCode(): ImmunizationFunctionCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationFunctionConcept(): ImmunizationFunctionConcept;
