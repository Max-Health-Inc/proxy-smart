/**
 * ValueSet: composition-status
 * URL: http://hl7.org/fhir/ValueSet/composition-status
 * Size: 4 concepts
 */
export declare const CompositionStatusConcepts: readonly [{
    readonly code: "preliminary";
    readonly system: "http://hl7.org/fhir/composition-status";
    readonly display: "Preliminary";
}, {
    readonly code: "final";
    readonly system: "http://hl7.org/fhir/composition-status";
    readonly display: "Final";
}, {
    readonly code: "amended";
    readonly system: "http://hl7.org/fhir/composition-status";
    readonly display: "Amended";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/composition-status";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type CompositionStatusCode = "preliminary" | "final" | "amended" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type CompositionStatusConcept = typeof CompositionStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidCompositionStatusCode(code: string): code is CompositionStatusCode;
/**
 * Get concept details by code
 */
export declare function getCompositionStatusConcept(code: string): CompositionStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const CompositionStatusCodes: ("entered-in-error" | "final" | "preliminary" | "amended")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomCompositionStatusCode(): CompositionStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomCompositionStatusConcept(): CompositionStatusConcept;
