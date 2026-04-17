/**
 * ValueSet: ProblemTypeLoinc
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/problem-type-loinc
 * Size: 1 concepts
 */
export declare const ProblemTypeLoincConcepts: readonly [{
    readonly code: "75326-9";
    readonly system: "http://loinc.org";
    readonly display: "Problem";
}];
/** Union type of all valid codes in this ValueSet */
export type ProblemTypeLoincCode = "75326-9";
/** Type representing a concept from this ValueSet */
export type ProblemTypeLoincConcept = typeof ProblemTypeLoincConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidProblemTypeLoincCode(code: string): code is ProblemTypeLoincCode;
/**
 * Get concept details by code
 */
export declare function getProblemTypeLoincConcept(code: string): ProblemTypeLoincConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ProblemTypeLoincCodes: "75326-9"[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomProblemTypeLoincCode(): ProblemTypeLoincCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomProblemTypeLoincConcept(): ProblemTypeLoincConcept;
