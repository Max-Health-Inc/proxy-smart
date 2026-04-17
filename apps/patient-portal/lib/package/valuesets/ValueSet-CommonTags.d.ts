/**
 * ValueSet: common-tags
 * URL: http://hl7.org/fhir/ValueSet/common-tags
 * Size: 1 concepts
 */
export declare const CommonTagsConcepts: readonly [{
    readonly code: "actionable";
    readonly system: "http://terminology.hl7.org/CodeSystem/common-tags";
    readonly display: "Actionable";
}];
/** Union type of all valid codes in this ValueSet */
export type CommonTagsCode = "actionable";
/** Type representing a concept from this ValueSet */
export type CommonTagsConcept = typeof CommonTagsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidCommonTagsCode(code: string): code is CommonTagsCode;
/**
 * Get concept details by code
 */
export declare function getCommonTagsConcept(code: string): CommonTagsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const CommonTagsCodes: "actionable"[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomCommonTagsCode(): CommonTagsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomCommonTagsConcept(): CommonTagsConcept;
