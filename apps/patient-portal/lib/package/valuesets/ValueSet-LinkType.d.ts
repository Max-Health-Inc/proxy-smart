/**
 * ValueSet: link-type
 * URL: http://hl7.org/fhir/ValueSet/link-type
 * Size: 4 concepts
 */
export declare const LinkTypeConcepts: readonly [{
    readonly code: "replaced-by";
    readonly system: "http://hl7.org/fhir/link-type";
    readonly display: "Replaced-by";
}, {
    readonly code: "replaces";
    readonly system: "http://hl7.org/fhir/link-type";
    readonly display: "Replaces";
}, {
    readonly code: "refer";
    readonly system: "http://hl7.org/fhir/link-type";
    readonly display: "Refer";
}, {
    readonly code: "seealso";
    readonly system: "http://hl7.org/fhir/link-type";
    readonly display: "See also";
}];
/** Union type of all valid codes in this ValueSet */
export type LinkTypeCode = "replaced-by" | "replaces" | "refer" | "seealso";
/** Type representing a concept from this ValueSet */
export type LinkTypeConcept = typeof LinkTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidLinkTypeCode(code: string): code is LinkTypeCode;
/**
 * Get concept details by code
 */
export declare function getLinkTypeConcept(code: string): LinkTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const LinkTypeCodes: ("replaces" | "replaced-by" | "refer" | "seealso")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomLinkTypeCode(): LinkTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomLinkTypeConcept(): LinkTypeConcept;
