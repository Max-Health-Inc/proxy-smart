/**
 * ValueSet: SNOMEDCTFormCodes
 * URL: http://hl7.org/fhir/ValueSet/medication-form-codes
 * Size: 1 concepts
 */
export declare const SNOMEDCTFormCodesConcepts: readonly [{
    readonly code: "421967003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug dose form (product)";
}];
/** Union type of all valid codes in this ValueSet */
export type SNOMEDCTFormCodesCode = "421967003";
/** Type representing a concept from this ValueSet */
export type SNOMEDCTFormCodesConcept = typeof SNOMEDCTFormCodesConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSNOMEDCTFormCodesCode(code: string): code is SNOMEDCTFormCodesCode;
/**
 * Get concept details by code
 */
export declare function getSNOMEDCTFormCodesConcept(code: string): SNOMEDCTFormCodesConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SNOMEDCTFormCodesCodes: "421967003"[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSNOMEDCTFormCodesCode(): SNOMEDCTFormCodesCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSNOMEDCTFormCodesConcept(): SNOMEDCTFormCodesConcept;
