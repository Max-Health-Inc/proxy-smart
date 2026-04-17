/**
 * ValueSet: referencerange-meaning
 * URL: http://hl7.org/fhir/ValueSet/referencerange-meaning
 * Size: 2 concepts
 */
export declare const ReferencerangeMeaningConcepts: readonly [{
    readonly code: "type";
    readonly system: "http://terminology.hl7.org/CodeSystem/referencerange-meaning";
    readonly display: "Type";
}, {
    readonly code: "endocrine";
    readonly system: "http://terminology.hl7.org/CodeSystem/referencerange-meaning";
    readonly display: "Endocrine";
}];
/** Union type of all valid codes in this ValueSet */
export type ReferencerangeMeaningCode = "type" | "endocrine";
/** Type representing a concept from this ValueSet */
export type ReferencerangeMeaningConcept = typeof ReferencerangeMeaningConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidReferencerangeMeaningCode(code: string): code is ReferencerangeMeaningCode;
/**
 * Get concept details by code
 */
export declare function getReferencerangeMeaningConcept(code: string): ReferencerangeMeaningConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ReferencerangeMeaningCodes: ("type" | "endocrine")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomReferencerangeMeaningCode(): ReferencerangeMeaningCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomReferencerangeMeaningConcept(): ReferencerangeMeaningConcept;
